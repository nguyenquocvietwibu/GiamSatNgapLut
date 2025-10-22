const standardMapStyles = {
    standard: "standard",
    sateline: "standard-satellite",
    streets: "streets-v11"
};


let currentPopup = null;

const map = initializeMap(await cachedMapboxToken, 'map', standardMapStyles.standard, [105.8342, 21.0278], 10);
const drawer = new MapboxDraw({
    displayControlsDefault: false,

});




map.addControl(drawer); // tự động thêm vào vị trí mặc định top-right
map.on('load', async () => {
    loadFloodDataToMap(map, cachedNoiNgap);
})




// SỬA LẠI: dùng map.on thay vì drawer.on
map.on('draw.create', function (event) {
    const feature = event.features[0];

    console.log('🎨 ĐÃ VẼ MỚI:', {
        feature: event.features[0],
    });
    dispatchDrawedGeojsonEvent(feature);

});

map.on('draw.update', function (event) {
    const feature = event.features[0];
    console.log('✏️ ĐÃ CẬP NHẬT VẼ:', {
        feature: event.features[0],
    });
    dispatchDrawedGeojsonEvent(feature);
});


setupToggleFloodCheckButtonToMap('toggle-flood-button', 'toggle-flood-checkbox');



const mapResizeObserver = new ResizeObserver(() => {
    map.resize();
});


mapResizeObserver.observe(document.getElementById('map'));

// Trong map_controller.js
window.addEventListener('update_noi_ngap', async function (event) {
    const existingPopups = document.getElementsByClassName('mapboxgl-popup');
    while (existingPopups.length > 0) {
        existingPopups[0].remove();
    }
    loadFloodDataToMap(map, event.detail.updatedData);
});

window.addEventListener('form_selected_flood_type', function (event) {
    const selectedType = event.detail.selectedType;
    changeDrawMode(selectedType);
});

window.addEventListener('viewed_flood', async function (event) {
    map.setCenter(await getFeatureCenterById(event.detail.viewedId));
    map.setZoom(15);
    showPopupByIdFeature(event.detail.viewedId);
});

window.addEventListener('clear_geofeature_draw', async function () {
    drawer.deleteAll();
});





window.addEventListener('edit_flood', async function (event) {
    const featureId = event.detail.editedId;
    drawer.deleteAll();
    if (!featureId) {
        console.error('Không có editedId trong event edit_flood');
        return;
    }

    console.log(`🔄 Đang xử lý edit_flood với mã: ${featureId}`);

    try {
        // 1. Lấy tọa độ trung tâm và feature data
        const center = await getFeatureCenterById(featureId);
        const floodData = await getDataSource('flood-data');

        if (center && floodData) {
            // 2. Zoom và center đến feature
            map.setCenter(center);
            map.setZoom(15);

            // 3. Tìm feature cần edit
            const targetFeature = floodData.features.find(f =>
                f.properties && f.properties.ma === featureId
            );

            if (targetFeature) {
                // 4. Ẩn feature thật đi
                // hideFeature(featureId);

                // 5. Vẽ lại feature bằng MapboxDraw
                drawer.add(targetFeature);

                // 6. Chuyển sang chế độ simple_select để sửa
                drawer.changeMode('simple_select');

                console.log(`✅ Đã vẽ lại feature ${featureId} và cho phép sửa`);

            } else {
                console.error(`❌ Không tìm thấy feature với mã: ${featureId}`);
            }
        }
    } catch (error) {
        console.error(`❌ Lỗi khi xử lý edit_flood:`, error);
    }
});



// Hàm ẩn feature
function hideFeature(featureId) {
    const floodLayers = ['flood-points', 'flood-lines', 'flood-areas'];
    floodLayers.forEach(layerId => {
        if (map.getLayer(layerId)) {
            map.setFilter(layerId, ['!=', 'ma', featureId]);
        }
    });
}
async function getDataSource(sourceName) {
    // Đợi map load nếu chưa load
    if (!map.isStyleLoaded()) {
        await new Promise(resolve => map.once('load', resolve));
    }

    const source = map.getSource(sourceName);
    if (source) {
        console.log(`✅ Đã lấy được source: ${sourceName}`);
        return source._data;
    } else {
        console.log(`❌ Không tìm thấy source: ${sourceName}`);
        return null;
    }
}


async function getFeatureCenterById(id) {

    // Lấy source flood-data từ map
    const floodData = await getDataSource('flood-data');

    if (!floodData) {
        console.error('Không tìm thấy source flood-data');
        return null;
    }


    if (!floodData || !floodData.features) {
        console.error('Không có dữ liệu features');
        return null;
    }

    // Tìm feature có properties.ma khớp
    const targetFeature = floodData.features.find(feature =>
        feature.properties && feature.properties.ma === id
    );

    if (!targetFeature) {
        console.error(`Không tìm thấy feature với mã: ${id}`);
        return null;
    }

    // Sử dụng Turf.js để tính centroid
    try {
        const center = turf.center(targetFeature);
        return center.geometry.coordinates; // [longitude, latitude]
    } catch (error) {
        console.error('Lỗi khi tính centroid với Turf:', error);
        return null;
    }
}

function changeDrawMode(type) {
    switch (type) {
        case 'điểm':
            drawer.changeMode('draw_point');
            console.log('🎯 Đã bật chế độ vẽ ĐIỂM');
            break;

        case 'đường':
            drawer.changeMode('draw_line_string');
            console.log('🛣️ Đã bật chế độ vẽ ĐƯỜNG');
            break;

        case 'vùng':
            drawer.changeMode('draw_polygon');
            console.log('🗺️ Đã bật chế độ vẽ VÙNG');
            break;

        default:
            drawer.changeMode('simple_select');
            console.log('🔍 Đã tắt chế độ vẽ');
            break;
    }
}

function setupToggleFloodCheckButtonToMap(buttonContainer, checkboxContainer) {
    const button = document.getElementById(buttonContainer);
    const checkbox = document.getElementById(checkboxContainer);

    // Event cho button - toggle cả checkbox và layers
    button.addEventListener('click', function () {
        checkbox.checked = !checkbox.checked;
        toggleFloodLayers(checkbox.checked);
    });

    // Event cho checkbox - chỉ toggle layers
    checkbox.addEventListener('click', function () {
        // toggleFloodLayers(this.checked);
        //toggleFloodLayers(event.target.checked);
        checkbox.checked = !checkbox.checked;
        toggleFloodLayers(checkbox.checked);
    });

    // Hàm chung để toggle layers
    function toggleFloodLayers(isVisible) {
        const floodLayers = ['flood-points', 'flood-lines', 'flood-areas', 'flood-areas-outline'];
        floodLayers.forEach(layerId => {
            if (map.getLayer(layerId)) {
                map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
            }
        });
    }
}

function initializeMap(accessToken, container, style, center, zoom) {
    const map = new mapboxgl.Map({
        container: container,
        style: `mapbox://styles/mapbox/${style}`,
        projection: 'globe',
        zoom: zoom,
        center: center,
        accessToken: accessToken,
    });

    map.addControl(new mapboxgl.NavigationControl());

    map.on('style.load', () => {
        map.setFog({
            range: [0.5, 10],
            color: "white",
            "horizon-blend": 0.01,
            "high-color": "blue",
            "space-color": "#000000",
            "star-intensity": 1
        });
    });

    return map;
}

function getfloodLevelColor(flood_water) {
    if (flood_water >= 1.5) {
        return 'rgba(0, 0, 0, 1)'; // 6 ký tự
    }
    else if (flood_water >= 1) {
        return 'rgba(255, 0, 0, 1)'; // 6 ký tự
    }
    else if (flood_water >= 0.5) {
        return 'rgba(47, 0, 255, 1)'; // 6 ký tự
    }
    else return 'rgba(0, 133, 49, 1)'; // 6 ký tự
}

function loadFloodDataToMap(map, floodData) {
    if (!map || !floodData || !floodData.features) {

        console.error('Dữ liệu không gian ngập không hợp lệ');
        return;
    }
    floodData.features.forEach(feature => {
        feature.properties.mau_muc_do_ngap = getfloodLevelColor(feature.properties.muc_nuoc_ngap);
    })
    const source = map.getSource('flood-data');
    if (source) {
        ['flood-areas', 'flood-lines', 'flood-points'].forEach(id => {
            if (map.getLayer(id)) map.removeLayer(id);
        });
        source.setData(floodData);
    }
    else {
        // Thêm source GeoJSON
        map.addSource('flood-data', {
            type: 'geojson',
            data: floodData
        });
    }


    // Thêm layer cho vùng ngập
    map.addLayer({
        id: 'flood-areas',
        type: 'fill',
        source: 'flood-data',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: {
            'fill-color': ['get', 'mau_muc_do_ngap'],
            'fill-opacity': 0.8
        }
    });



    // Thêm layer cho đường ngập
    map.addLayer({
        id: 'flood-lines',
        type: 'line',
        source: 'flood-data',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: {
            'line-color': ['get', 'mau_muc_do_ngap'],
            'line-width': 4,
            'line-opacity': 0.8
        }
    });

    // Thêm layer cho điểm ngập
    map.addLayer({
        id: 'flood-points',
        type: 'circle',
        source: 'flood-data',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
            'circle-radius': 5,
            'circle-color': ['get', 'mau_muc_do_ngap'],
            'circle-opacity': 0.8,
        }
    });




    map.on('click', (e) => {
        // Lấy TẤT CẢ features tại vị trí click

        const features = map.queryRenderedFeatures(e.point, {
            layers: ['flood-points', 'flood-lines', 'flood-areas']
        });

        const existingPopups = document.getElementsByClassName('mapboxgl-popup');
        while (existingPopups.length > 0) {
            existingPopups[0].remove();
        }

        if (features.length > 0) {
            // Tạo popup với danh sách tất cả features
            const popupContent = createMultiFeaturePopupContent(features);

            new mapboxgl.Popup(
                {
                    closeButton: true, // 🎯 ĐẢM BẢO CÓ CLOSE BUTTON
                    closeOnClick: true, // 🎯 CLOSE KHI CLICK NGOÀI
                }
            )
                .setLngLat(e.lngLat)
                .setHTML(`<div class="flood-popup-wrapper" style="max-height: 200px; overflow-y: auto;">${popupContent}</div>`)
                .setMaxWidth('300px')
                .addTo(map);
        }
    });
    // Thêm hover effect
    map.on('mouseenter', ['flood-points', 'flood-lines', 'flood-areas'], () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', ['flood-points', 'flood-lines', 'flood-areas'], () => {
        map.getCanvas().style.cursor = '';
    });

    console.log('Layer order:');
    map.getStyle().layers.forEach(layer => {
        if (layer.id.includes('points') || layer.id.includes('lines') || layer.id.includes('areas')) {
            console.log(layer.id);
        }
    });
}

function createMultiFeaturePopupContent(features) {
    let content = `
        <div class="flood-popup">
            <div class="popup-list">
    `;
    if (features.length > 1) {
        features.forEach((feature, index) => {
            const props = feature.properties;
            const floodLevel = props.muc_nuoc_ngap || 0;

            content += `
            <div class="popup-item ">
                <div class="item-header">
                    <span class="item-badge"><strong>${index + 1}.</strong></span>
                    <strong>${props.ten || 'Không có tên'}</strong>
                </div>
                <div class="item-details">
                    <span>Mực nước: <strong>${floodLevel}m</strong></span>
                     <span>Loại: <strong>${props.loai_khong_gian}</strong></span>
                </div>
            </div>
            <br>
        `;
        });
    }
    else if (features.length == 1) {
        const props = features[0].properties;
        const floodLevel = props.muc_nuoc_ngap || 0;

        content += `
            <div class="popup-item ">
                <div class="item-header">
                    <strong>${props.ten || 'Không có tên'}</strong>
                </div>
                <div class="item-details">
                    <span>Mực nước: <strong>${floodLevel}m</strong></span>
                    <span>Loại: <strong>${props.loai_khong_gian}</strong></span>
                </div>
            </div>
        `;

    }



    content += `
            </div>

        </div>
    `;

    return content;
}

async function showPopupByIdFeature(id) {
    const source = map.getSource('flood-data');
    if (!source) {
        console.error('Không tìm thấy source flood-data');
        return;
    }

    // Lấy dữ liệu từ source
    const floodData = source._data;
    if (!floodData || !floodData.features) {
        console.error('Không có dữ liệu features');
        return;
    }

    // Tìm feature theo mã
    const targetFeature = floodData.features.find(feature =>
        feature.properties && feature.properties.ma === id
    );

    if (!targetFeature) {
        console.error(`Không tìm thấy feature với mã: ${id}`);
        return;
    }

    // Lấy tọa độ trung tâm
    const center = await getFeatureCenterById(id);
    if (!center) {
        console.error('Không thể lấy tọa độ trung tâm');
        return;
    }

    // Tạo popup content (chỉ 1 feature)
    const popupContent = createSingleFeaturePopupContent(targetFeature);

    // Đóng popup cũ trước
    const existingPopups = document.getElementsByClassName('mapboxgl-popup');
    while (existingPopups.length > 0) {
        existingPopups[0].remove();
    }

    // Tạo và hiển thị popup
    new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: true,
    })
        .setLngLat(center)
        .setHTML(popupContent)
        .setMaxWidth('300px')
        .addTo(map);

    console.log(`✅ Đã hiển thị popup cho feature ${id}`);
}

// Hàm tạo popup content cho single feature
function createSingleFeaturePopupContent(feature) {
    const props = feature.properties;
    const floodLevel = props.muc_nuoc_ngap || 0;

    return `
        <div class="flood-popup">
            <div class="popup-item">
                <div class="item-header">
                    <strong>${props.ten || 'Không có tên'}</strong>
                </div>
                <div class="item-details">
                    <span>Mực nước: <strong>${floodLevel}m</strong></span><br>
                    <span>Loại: <strong>${props.loai_khong_gian}</strong></span>
                    ${props.dia_chi ? `<br><span>Địa chỉ: <strong>${props.dia_chi}</strong></span>` : ''}
                    ${props.mo_ta ? `<br><span>Mô tả: <strong>${props.mo_ta}</strong></span>` : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * Cập nhật dữ liệu không gian ngập
 */
export function updateFloodData(map, newFloodData) {
    if (map.getSource('flood-data')) {
        map.getSource('flood-data').setData(newFloodData);
    } else {
        addFloodDataToMap(map, newFloodData);
    }
}
