let floodLayer;
let editLayer;
let drawTools;
let userLocationMarker = null; // Thêm biến để lưu marker vị trí người dùng

export let map = L.map('map', {
    zoomControl: false
}).setView([21.0278, 105.8342], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


L.control.zoom({
    position: 'topright'
}).addTo(map);




map.whenReady(function () {

    const mapResizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
    });
    mapResizeObserver.observe(document.getElementById('map'));
    console.log("test");
    loadFloodDataToMap();
    setupToggleFloodCheckButtonToMap('toggle-flood-button', 'toggle-flood-checkbox');
    initializeDrawTools();
    setupUserLocator(); // Thêm khởi tạo user locator
});

// Event listeners
window.addEventListener('update_noi_ngap', async function (event) {
    loadFloodDataToMap();
    dispatchClearEditGeoFeatureEvent();
});

window.addEventListener('viewed_flood', async function (event) {
    showPopupById(event.detail.viewedId);
});

window.addEventListener('edit_flood', async function (event) {
    const featureId = event.detail.editedId;
    console.log('Nhận sự kiện edit_flood với ID:', featureId);
    showPopupById(featureId);
    await drawFeatureAndEdit(featureId);
});

window.addEventListener('form_selected_flood_type', function (event) {
    const selectedType = event.detail.selectedType;
    enableEditMode(selectedType);
    dispatchClearEditGeoFeatureEvent();
});



window.addEventListener('clear_edit_geometry', function (event) {
    if (editLayer) {
        map.removeLayer(editLayer);
        editLayer = null;
    }
})

// Thêm event listener cho preview user report flood geometry
window.addEventListener('preview_user_report_flood_geometry', function (event) {
    const feature = event.detail.feature;
    if (feature) {
        previewUserFloodGeometry(feature);
    }
});


// Hàm lấy vị trí người dùng với độ chính xác cao
export async function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Trình duyệt không hỗ trợ Geolocation'));
            return;
        }

        const options = {
            enableHighAccuracy: true, // Bật độ chính xác cao
            timeout: 10000, // Timeout sau 10 giây
            maximumAge: 0 // Không sử dụng vị trí cache
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy // Độ chính xác tính bằng mét
                });
            },
            (error) => {
                let errorMessage = 'Không thể lấy vị trí: ';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Người dùng từ chối cho phép truy cập vị trí';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Thông tin vị trí không khả dụng';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'Yêu cầu vị trí đã hết thời gian chờ';
                        break;
                    default:
                        errorMessage += 'Lỗi không xác định';
                        break;
                }
                reject(new Error(errorMessage));
            },
            options
        );
    });
}

// Hàm hiển thị vị trí người dùng lên bản đồ
export function showUserLocationOnMap(location) {
    // Xóa marker cũ nếu có
    if (userLocationMarker) {
        map.removeLayer(userLocationMarker);
    }

    // Tạo marker cho vị trí người dùng
    const userIcon = L.divIcon({
        html: '<div style="background-color: #4285F4; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
        className: 'user-location-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });

    userLocationMarker = L.marker([location.lat, location.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup(`
            <div style="text-align: center;">
                <strong>📍 Vị trí của bạn</strong><br>
            </div>
        `)
        .openPopup();

    // Di chuyển bản đồ đến vị trí người dùng
    map.setView([location.lat, location.lng], 16);

    console.log('📍 Đã hiển thị vị trí người dùng:', location);
}

// Hàm xử lý sự kiện click cho nút user-locator
function setupUserLocator() {
    const userLocatorButton = document.getElementById('user-locator');
    
    if (userLocatorButton) {
        userLocatorButton.addEventListener('click', async function() {
            try {
                // Hiển thị trạng thái loading
                userLocatorButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                userLocatorButton.disabled = true;
                
                console.log('🔄 Đang lấy vị trí người dùng...');
                
                const userLocation = await getUserLocation();
                console.log('✅ Vị trí người dùng:', userLocation);
                
                showUserLocationOnMap(userLocation);
                
                // Khôi phục trạng thái ban đầu của nút
                userLocatorButton.innerHTML = '<i class="fas fa-location"></i>';
                userLocatorButton.disabled = false;
                
            } catch (error) {
                console.error('❌ Lỗi khi lấy vị trí:', error);
                
                // Hiển thị thông báo lỗi
                alert(error.message || 'Không thể lấy vị trí của bạn. Vui lòng kiểm tra quyền truy cập vị trí.');
                
                // Khôi phục trạng thái ban đầu của nút
                userLocatorButton.innerHTML = '<i class="fas fa-location-arrow"></i>';
                userLocatorButton.disabled = false;
            }
        });
        
        console.log('✅ Đã thiết lập sự kiện cho nút user-locator');
    } else {
        console.warn('⚠️ Không tìm thấy nút user-locator');
    }
}


function previewUserFloodGeometry(feature) {
    console.log('📍 Đang preview user report flood geometry:', feature);
    
    // 1. Clear any existing edit layers
    if (editLayer) {
        map.removeLayer(editLayer);
        editLayer = null;
    }
    
    // 2. Tắt tất cả draw tools
    Object.values(drawTools).forEach(tool => {
        tool.disable();
    });
    
    // 3. Tạo popup content
    const props = feature.properties;
    const popupContent = `
        <div class="flood-popup">
            <h4>📋 Báo cáo từ người dùng</h4>
            <p><strong>Tên:</strong> ${props.ten_noi_ngap || 'Không có tên'}</p>
            <p><strong>Mực nước:</strong> ${props.muc_nuoc_ngap} m</p>
            <p><strong>Loại:</strong> ${props.loai_khong_gian}</p>
            <p><strong>Người gửi:</strong> ${props.ten_nguoi_gui}</p>
            <p><strong>SĐT:</strong> ${props.so_dien_thoai_nguoi_gui}</p>
        </div>
    `;
    
    // 4. Tạo preview layer với popup bind trực tiếp
    editLayer = L.geoJSON(feature, {
        style: {
            color: '#ba3cf9ff',
            weight: 4,
            opacity: 0.9,
            fillOpacity: 0.4,
            fillColor: '#ba3cf9ff'
        },
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 10,
                fillColor: '#ba3cf9ff',
                color: '#000',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });
        },
        onEachFeature: function (feature, layer) {
            // Bind popup vào mỗi layer
            layer.bindPopup(popupContent);
            
            // Tự động mở popup khi layer được thêm vào map
            layer.on('add', function() {
                layer.openPopup();
            });
        }
    }).addTo(map);
    
    // 5. Fit map to feature bounds
    map.fitBounds(editLayer.getBounds());
    
    console.log('✅ Đã preview user report flood geometry');
}
// Thêm hàm clear preview nếu cần
function clearPreview() {
    if (editLayer) {
        map.removeLayer(editLayer);
        editLayer = null;
    }
    map.closePopup();
}


function initializeDrawTools() {
    drawTools = {
        'điểm': new L.Draw.Marker(map),
        'đường': new L.Draw.Polyline(map),
        'vùng': new L.Draw.Polygon(map)
    };
}

function enableEditMode(geometryType, feature = null) {
    // 1. XÓA EDIT LAYER CŨ
    if (editLayer) {
        map.removeLayer(editLayer);
        editLayer = null;
    }

    // 2. TẮT TẤT CẢ MODE
    Object.values(drawTools).forEach(tool => {
        tool.disable();
    });

    // 3. NẾU CÓ FEATURE -> BẬT CHỈNH SỬA FEATURE CÓ SẴN
    if (feature) {
        const floodInfo = {
            floodId: feature.properties.ma,
            floodName: feature.properties.ten,
            floodDepth: feature.properties.muc_nuoc_ngap,
            floodType: feature.properties.loai_khong_gian,

        };

        // Tạo layer với draggable: true - GIỐNG drawFeatureAndEdit
        dispatchEditedFloodInfoToForm(floodInfo);
        editLayer = L.geoJSON(feature, {
            style: {
                color: '#ba3cf9ff',
                weight: 3,
                opacity: 0.8,
                fillOpacity: 0.3
            },
            draggable: true,
        }).addTo(map);
        const firstLayer = editLayer.getLayers()[0];
        dispatchDrawedGeometryEvent(firstLayer.toGeoJSON().geometry);
        console.log(firstLayer);
        // dispatchDrawedGeometryEvent(firstLayer.toGeoJSON().geometry);
        console.log('GeoJSON sau khi thêm mới:', firstLayer.toGeoJSON());
        editLayer.eachLayer(function (layer) {
            // NẾU LÀ POINT THÌ BỎ QUA DRAGSTART
            if (feature.geometry.type !== 'Point') {
                layer.on('dragstart', function (e) {
                    layer.editing.disable();
                })
            }

            layer.on('dragend', function (e) {
                const editedGeoJSON = layer.toGeoJSON();
                console.log('GeoJSON sau khi kéo:', editedGeoJSON);
                dispatchDrawedGeometryEvent(editedGeoJSON.geometry);
                if (layer.editing) {
                    layer.editing.disable();
                    layer.editing.enable();
                }
            });

            if (layer.editing) {
                layer.editing.enable();

                layer.on('edit', function (e) {
                    const editedGeoJSON = layer.toGeoJSON();
                    console.log('GeoJSON sau khi chỉnh sửa:', editedGeoJSON);
                    dispatchDrawedGeometryEvent(editedGeoJSON.geometry);
                });
            }
        });

        map.fitBounds(editLayer.getBounds());
        console.log('🎉 Đã bật chỉnh sửa feature có sẵn!');
    }
    // 4. NẾU KHÔNG CÓ FEATURE -> BẬT CHẾ ĐỘ VẼ MỚI
    else if (drawTools[geometryType]) {
        drawTools[geometryType].enable();
        console.log('🎨 Đã chuyển sang chế độ vẽ:', geometryType);
        map.off('draw:created');
        // THÊM SỰ KIỆN KHI VẼ XONG
        map.once('draw:created', function (e) {
            const createdLayer = e.layer;
            const geometry = createdLayer.toGeoJSON().geometry;
            console.log('GeoJSON sau khi thêm mới:', createdLayer.toGeoJSON());
            dispatchDrawedGeometryEvent(geometry);
            // TẠO EDIT createdLayerMỚI VỚI DRAGGABLE: TRUE
            editLayer = L.geoJSON({
                type: "Feature",
                geometry: geometry,
                properties: {}
            }, {
                style: {
                    color: '#ba3cf9ff',
                    weight: 3,
                    opacity: 0.8,
                    fillOpacity: 0.3
                },
                draggable: true,
            }).addTo(map);

            map.removeLayer(createdLayer);

            // THIẾT LẬP SỰ KIỆN CHO EDIT LAYER
            editLayer.eachLayer(function (editLayer) {
                // NẾU LÀ POINT THÌ BỎ QUA DRAGSTART
                if (geometry.type !== 'Point') {
                    editLayer.on('dragstart', function (e) {
                        editLayer.editing.disable();
                    })
                }

                editLayer.on('dragend', function (e) {
                    const editedGeoJSON = editLayer.toGeoJSON();
                    console.log('GeoJSON sau khi kéo:', editedGeoJSON);
                    dispatchDrawedGeometryEvent(editedGeoJSON.geometry);

                    if (editLayer.editing) {
                        editLayer.editing.disable();
                        editLayer.editing.enable();
                    }
                });

                if (editLayer.editing) {
                    editLayer.editing.enable();

                    editLayer.on('edit', function (e) {
                        const editedGeoJSON = editLayer.toGeoJSON();
                        console.log('GeoJSON sau khi chỉnh sửa:', editedGeoJSON);
                        dispatchDrawedGeometryEvent(editedGeoJSON.geometry);
                    });
                }
            });

            console.log('✅ Đã thêm feature vào bản đồ với chỉnh sửa và drag');
        });
    }
}


async function drawFeatureAndEdit(featureId) {
    try {
        const floodData = await cachedNoiNgap;
        const feature = floodData.features.find(f => f.properties.ma === featureId);

        if (!feature) {
            console.error('Không tìm thấy feature với ID:', featureId);
            return;
        }
        enableEditMode(feature.properties.loai_khong_gian, feature);

    } catch (error) {
        console.error('Lỗi khi vẽ feature để chỉnh sửa:', error);
    }
}

async function loadFloodDataToMap() {
    try {
        const floodData = await cachedNoiNgap;

        if (floodLayer) {
            map.removeLayer(floodLayer);
        }

        floodLayer = L.geoJSON(floodData, {
            style: function (feature) {
                return getStyleByFloodLevel(feature.properties.muc_nuoc_ngap);
            },
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: 8,
                    fillColor: getStyleByFloodLevel(feature.properties.muc_nuoc_ngap),
                    color: '#000',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                });
            },
            onEachFeature: function (feature, layer) {
                if (feature.properties) {
                    const props = feature.properties;
                    let popupContent = `
                        <div class="flood-popup">
                            <h4>${props.ten || 'Không có tên'}</h4>
                            <p><strong>Mực nước ngập:</strong> ${props.muc_nuoc_ngap} m</p>
                            <p><strong>Loại:</strong> ${props.loai_khong_gian}</p>
                        </div>
                    `;
                    layer.bindPopup(popupContent);
                }
            }
        }).addTo(map);

        console.log('Đã hiển thị', floodData.features.length, 'khu vực ngập');

    } catch (error) {
        console.error('Lỗi khi hiển thị khu vực ngập:', error);
    }
}

function getStyleByFloodLevel(floodLevel) {
    let color = '#206100ff';

    if (floodLevel >= 1.5) {
        color = 'rgba(0, 0, 0, 1)'
    }
    else if (floodLevel >= 1) {
        color = 'rgba(191, 0, 0, 1)'
    }
    else if (floodLevel >= 0.5) {
        color = 'rgba(0, 0, 196, 1)'
    }
    return {
        color: color,
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.4,
        fillColor: color
    };
}

function showPopupById(id) {
    if (!floodLayer) return;

    floodLayer.eachLayer(function (layer) {
        const feature = layer.feature;
        if (feature && feature.properties.ma === id) {
            layer.openPopup();
            if (layer.getBounds) {
                map.fitBounds(layer.getBounds());
            } else {
                map.setView(layer.getLatLng(), map.getZoom());
            }
            return;
        }
    });
}

function setupToggleFloodCheckButtonToMap(buttonContainer, checkboxContainer) {
    const button = document.getElementById(buttonContainer);
    const checkbox = document.getElementById(checkboxContainer);

    button.addEventListener('click', function (event) {
        event.stopPropagation();
        checkbox.checked = !checkbox.checked;
        toggleFloodLayer(checkbox.checked);
    });

    checkbox.addEventListener('click', function (event) {
        checkbox.checked = !checkbox.checked;
        toggleFloodLayer(checkbox.checked);
    });

    function toggleFloodLayer(isVisible) {
        if (floodLayer) {
            if (isVisible) {
                map.addLayer(floodLayer);
            } else {
                map.removeLayer(floodLayer);
            }
        }
    }
}