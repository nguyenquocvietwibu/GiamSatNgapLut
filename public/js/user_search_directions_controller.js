import { map, getUserLocation, showUserLocationOnMap } from '/js/leaflet_map_controller.js';

// Biến để lưu trữ timeout cho tìm kiếm tự động
let searchTimeout;
let searchMarker;

let startingPoint;
let destinationPoint;

// Biến điều khiển chỉ đường toàn cục
window.routingControl = null;
window.routeInfoPopup = null;

// Định nghĩa hàm removeWaypoint trong global scope
window.removeWaypoint = function(index) {
    if (window.routingControl) {
        // Lấy waypoints hiện tại
        const currentWaypoints = window.routingControl.getWaypoints();
        
        // Không cho xóa điểm đầu và cuối
        if (index === 0 || index === currentWaypoints.length - 1) {
            alert('Không thể xóa điểm bắt đầu và điểm kết thúc!');
            return;
        }
        
        // Xóa waypoint tại index
        currentWaypoints.splice(index, 1);
        
        // Cập nhật routing control với waypoints mới
        window.routingControl.setWaypoints(currentWaypoints);
        
        console.log(`🗑️ Đã xóa waypoint tại index ${index}`);
    }
};

// Hàm cập nhật vị trí waypoint
window.updateWaypointPosition = function(index, newLatLng) {
    if (window.routingControl) {
        const waypoints = window.routingControl.getWaypoints();
        waypoints[index].latLng = newLatLng;
        window.routingControl.setWaypoints(waypoints);
    }
};

setUpSearchInput('search-starting-point');
setUpSearchInput('search-destination-point');

// Hàm thêm "Vị trí của bạn" và "Chọn trên bản đồ" vào kết quả
function addDefaultItems(resultsContainer, searchInputID) {
    // Xóa items cũ nếu có
    const existingUserItem = resultsContainer.querySelector('.user-location-item');
    const existingMapItem = resultsContainer.querySelector('.map-selection-item');
    if (existingUserItem) existingUserItem.remove();
    if (existingMapItem) existingMapItem.remove();

    // Thêm "Vị trí của bạn"
    const userLocationItem = document.createElement('div');
    userLocationItem.className = 'search-result-item user-location-item';
    userLocationItem.innerHTML = '<strong>📍 Vị trí của bạn</strong>';

    userLocationItem.onclick = async (evt) => {
        evt.stopPropagation();

        try {
            const location = await getUserLocation();
            document.getElementById(searchInputID).value = 'Vị trí của bạn';
            showUserLocationOnMap(location);

            const pointType = searchInputID === 'search-starting-point' ? 'start' : 'destination';
            updatePoint(pointType, 'Vị trí của bạn', { lat: location.lat, lng: location.lng });
            
            resultsContainer.style.display = 'none';
        } catch (error) {
            alert('Không thể lấy vị trí của bạn');
            console.log(error);
        }
    };

    // Thêm "Chọn trên bản đồ"
    const mapSelectionItem = document.createElement('div');
    mapSelectionItem.className = 'search-result-item map-selection-item';
    mapSelectionItem.innerHTML = '<strong>🗺️ Chọn trên bản đồ</strong>';

    mapSelectionItem.onclick = (evt) => {
        evt.stopPropagation();
        
        // Ẩn kết quả tìm kiếm
        resultsContainer.style.display = 'none';
        
        // Hiển thị hướng dẫn
        alert('Vui lòng nhấp vào bản đồ để chọn vị trí');
        
        // Bật chế độ chọn trên bản đồ
        enableMapSelection(searchInputID);
    };

    resultsContainer.appendChild(userLocationItem);
    resultsContainer.appendChild(mapSelectionItem);
}

// Hàm bật chế độ chọn trên bản đồ
function enableMapSelection(searchInputID) {
    // Tạm thời thay đổi cursor để người dùng biết đang ở chế độ chọn
    map.getContainer().style.cursor = 'crosshair';
    
    // Tạo nút thoát chọn điểm
    createExitSelectionButton();
    
    // Lắng nghe sự kiện click trên bản đồ
    function onMapClick(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        // Đặt tên cho vị trí
        const locationName = `Vị trí trên bản đồ (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
        
        // Cập nhật input
        document.getElementById(searchInputID).value = locationName;
        
        // Hiển thị marker trên bản đồ
        if (searchMarker) {
            map.removeLayer(searchMarker);
        }
        
        searchMarker = L.marker([lat, lng])
            .addTo(map)
            .bindPopup(`<b>${locationName}</b>`)
            .openPopup();
        
        // Cập nhật điểm
        const pointType = searchInputID === 'search-starting-point' ? 'start' : 'destination';
        updatePoint(pointType, locationName, { lat: lat, lng: lng });
        
        // Tắt chế độ chọn
        disableMapSelection();
    }
    
    // Lưu hàm xử lý để có thể xóa sau
    window.mapSelectionHandler = onMapClick;
    
    // Thêm sự kiện click
    map.on('click', onMapClick);
}

// Hàm tạo nút thoát chọn điểm
function createExitSelectionButton() {
    // Xóa nút cũ nếu có
    removeExitSelectionButton();
    
    // Tạo nút mới
    const exitButton = document.createElement('button');
    exitButton.textContent = '✕ Thoát chọn điểm';
    exitButton.id = 'exit-selection-button';
    exitButton.style.position = 'absolute';
    exitButton.style.top = '130px';
    exitButton.style.left = '10px';
    exitButton.style.zIndex = '1000';
    exitButton.style.backgroundColor = '#dc2626';
    exitButton.style.color = 'white';
    exitButton.style.border = 'none';
    exitButton.style.padding = '8px 12px';
    exitButton.style.borderRadius = '4px';
    exitButton.style.cursor = 'pointer';
    exitButton.style.fontSize = '14px';
    exitButton.style.fontWeight = 'bold';
    exitButton.className = 'dark-on-hover button-on-map';
    
    exitButton.onclick = () => {
        disableMapSelection();
    };
    
    document.getElementById('map').appendChild(exitButton);
}

// Hàm xóa nút thoát chọn điểm
function removeExitSelectionButton() {
    const existingButton = document.getElementById('exit-selection-button');
    if (existingButton) {
        existingButton.remove();
    }
}

// Hàm tắt chế độ chọn trên bản đồ
function disableMapSelection() {
    // Khôi phục cursor
    map.getContainer().style.cursor = '';
    
    // Xóa sự kiện click nếu có
    if (window.mapSelectionHandler) {
        map.off('click', window.mapSelectionHandler);
        window.mapSelectionHandler = null;
    }
    
    // Xóa nút thoát chọn điểm
    removeExitSelectionButton();
    
    console.log('🔚 Đã thoát chế độ chọn điểm trên bản đồ');
}

// Hàm cập nhật và log điểm đầu/cuối
function updatePoint(type, value, coordinates = null) {
    if (type === 'start') {
        startingPoint = { name: value, coordinates: coordinates };
        console.log('📍 Điểm bắt đầu:', startingPoint);
    } else if (type === 'destination') {
        destinationPoint = { name: value, coordinates: coordinates };
        console.log('🎯 Điểm đích:', destinationPoint);
    }

    // Log cả hai điểm nếu có
    if (startingPoint && destinationPoint) {
        console.log('🗺️ CẢ HAI ĐIỂM:');
        console.log('  - Điểm bắt đầu:', startingPoint);
        console.log('  - Điểm đích:', destinationPoint);
        console.log('---');

        // Tự động tìm đường khi có đủ 2 điểm
        calculateRoute(
            [startingPoint.coordinates.lat, startingPoint.coordinates.lng],
            [destinationPoint.coordinates.lat, destinationPoint.coordinates.lng]
        );
    }
}

// Hàm tạo custom marker với popup xóa waypoint
function createWaypointMarker(i, waypoint, n) {
    // Tạo marker mặc định
    const marker = L.marker(waypoint.latLng, {
        draggable: true,
        autoPan: true
    });

    // Tạo popup với nút xóa
    const popupContent = document.createElement('div');
    popupContent.style.padding = '10px';
    popupContent.style.textAlign = 'center';
    popupContent.style.minWidth = '150px';
    
    let pointName = '';
    if (i === 0) {
        pointName = 'Điểm bắt đầu (A)';
    } else if (i === n - 1) {
        pointName = 'Điểm kết thúc (B)';
    } else {
        pointName = `Điểm dừng ${i}`;
    }
    
    popupContent.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold; color: #333;">
            ${pointName}
        </div>
        <div style="margin-bottom: 8px; font-size: 12px; color: #666;">
            ${waypoint.latLng.lat.toFixed(6)}, ${waypoint.latLng.lng.toFixed(6)}
        </div>
        <button onclick="window.removeWaypoint(${i})" 
                style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%;">
            🗑️ Xóa điểm này
        </button>
    `;

    marker.bindPopup(popupContent, {
        closeButton: true,
        autoClose: false,
        closeOnEscapeKey: true
    });

    // Sự kiện khi kéo marker
    marker.on('dragend', function(e) {
        const newLatLng = marker.getLatLng();
        console.log(`📍 Waypoint ${i} được kéo đến:`, newLatLng);
        
        // Cập nhật waypoint trong routing control
        window.updateWaypointPosition(i, newLatLng);
    });

    return marker;
}

// HÀM CHÍNH: Chỉ đường với waypoints có thể kéo và xóa
function calculateRoute(startPosition, endPosition) {
    
    // Xóa route cũ nếu có
    if (window.routingControl) {
        window.routingControl.remove();
        window.routingControl = null;
    }

    console.log('🔄 Đang tính đường ngắn nhất...');

    const waypoints = [
        L.latLng(startPosition[0], startPosition[1]),
        L.latLng(endPosition[0], endPosition[1])
    ];

    console.log('📍 Waypoints (điểm đầu/cuối):', waypoints);

    // Tạo routing control với custom marker function
    window.routingControl = L.Routing.control({
        waypoints: waypoints,
        router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            profile: 'car',
            language: 'vi',
            serviceUrlParameters: {
                alternatives: 5
            }
        }),
        lineOptions: {
            styles: [
                {
                    color: '#075a79ff',
                    weight: 8,
                    opacity: 0.8
                }
            ]
        },
        showAlternatives: true,
        altLineOptions: {
            styles: [
                {
                    color: '#0999ceff',
                    weight: 6,
                    opacity: 0.6
                }
            ]
        },
        routeWhileDragging: true,
        addWaypoints: true,
        draggableWaypoints: true,
        createMarker: createWaypointMarker // Sử dụng custom marker function
        
    }).addTo(map);

    // Di chuyển bảng chỉ đường vào container mong muốn SAU KHI tạo
    const directionsContainer = document.getElementById('directions-routes');
    const routingContainer = document.querySelector('.leaflet-routing-container');
    
    if (routingContainer && directionsContainer) {
        // Hiển thị container
        directionsContainer.style.display = 'block';
        directionsContainer.innerHTML = ''; // Xóa nội dung cũ
        directionsContainer.appendChild(routingContainer);
        
        // Thêm style để bảng chỉ đường hiển thị đẹp
        routingContainer.style.position = 'relative';
        routingContainer.style.width = '100%';
        routingContainer.style.height = 'auto';
        routingContainer.style.maxHeight = '400px';
        routingContainer.style.overflowY = 'auto';
    }

    // Fit bản đồ để hiển thị cả tuyến đường
    const bounds = L.latLngBounds([startPosition, endPosition]);
    map.fitBounds(bounds, { padding: [100, 100] });

    // Thêm sự kiện khi route được tính xong
    window.routingControl.on('routesfound', function (e) {
        const routes = e.routes;
        console.log(`✅ Đã tìm thấy ${routes.length} tuyến đường`);

        routes.forEach((route, index) => {
            console.log(`🛣️ Tuyến ${index + 1}: ${(route.summary.totalDistance / 1000).toFixed(2)} km, ${(route.summary.totalTime / 60).toFixed(2)} phút`);
        });

        // Hiển thị thông tin chi tiết về tuyến đường được chọn
        if (routes[0]) {
            showRouteInfo(routes[0]);
        }
    });

    // Xử lý lỗi
    window.routingControl.on('routingerror', function (e) {
        console.error('❌ Lỗi tính đường:', e.error);
        alert('Không thể tính đường đi. Vui lòng thử lại với điểm khác.');
    });
}

// Hàm hiển thị thông tin tuyến đường
function showRouteInfo(route) {
    const distance = (route.summary.totalDistance / 1000).toFixed(2);
    const time = (route.summary.totalTime / 60).toFixed(2);

    if (window.routeInfoPopup) {
        window.routeInfoPopup.remove();
    }
    
    // Có thể thêm hiển thị thông tin route ở đây nếu cần
}

// Hàm xóa đường đi
function clearRoute() {
    if (window.routingControl) {
        window.routingControl.remove();
        window.routingControl = null;
        console.log('🗑️ Đã xóa đường đi');
    }

    // Xóa popup thông tin
    if (window.routeInfoPopup) {
        map.removeLayer(window.routeInfoPopup);
        window.routeInfoPopup = null;
    }

    // Xóa search marker nếu có
    if (searchMarker) {
        map.removeLayer(searchMarker);
        searchMarker = null;
    }

    // Tắt chế độ chọn trên bản đồ nếu đang bật
    disableMapSelection();

    // Ẩn bảng chỉ đường
    const directionsContainer = document.getElementById('directions-routes');
    if (directionsContainer) {
        directionsContainer.style.display = 'none';
        directionsContainer.innerHTML = '';
    }
}

// Các hàm còn lại giữ nguyên...
async function searchAddress(query, searchInputID) {
    const resultsContainer = document.getElementById('search-results');

    if (!query.trim()) {
        resultsContainer.innerHTML = '';
        addDefaultItems(resultsContainer, searchInputID);
        resultsContainer.style.display = 'block';
        return;
    }

    resultsContainer.innerHTML = '<div class="loading">Đang tìm kiếm...</div>';
    resultsContainer.style.display = 'block';

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Vietnam')}&countrycodes=vn`
        );
        const data = await response.json();

        resultsContainer.innerHTML = '';

        if (data.length === 0) {
            resultsContainer.innerHTML = '<div class="search-result-item">Không tìm thấy kết quả phù hợp</div>';
            addDefaultItems(resultsContainer, searchInputID);
            return;
        }

        data.forEach(item => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.textContent = item.display_name;

            resultItem.onclick = () => {
                const lat = parseFloat(item.lat);
                const lon = parseFloat(item.lon);

                map.setView([lat, lon], 14);

                if (searchMarker) {
                    map.removeLayer(searchMarker);
                }

                searchMarker = L.marker([lat, lon]).addTo(map)
                    .bindPopup(`<b>${item.display_name}</b>`)
                    .openPopup();

                document.getElementById(searchInputID).value = item.display_name;
                
                const pointType = searchInputID === 'search-starting-point' ? 'start' : 'destination';
                updatePoint(pointType, item.display_name, { lat: lat, lng: lon });
                
                resultsContainer.style.display = 'none';
            };

            resultsContainer.appendChild(resultItem);
        });

    } catch (error) {
        console.error('Lỗi tìm kiếm:', error);
        resultsContainer.innerHTML = '<div class="search-result-item">Có lỗi xảy ra khi tìm kiếm</div>';
        addDefaultItems(resultsContainer, searchInputID);
    }
}

async function setUpSearchInput(searchInputID) {
    const searchInput = document.getElementById(searchInputID);

    searchInput.addEventListener('click', (e) => {
        const resultsContainer = document.getElementById('search-results');
        resultsContainer.innerHTML = '';
        addDefaultItems(resultsContainer, searchInputID);
        resultsContainer.style.display = 'block';
    });

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(() => {
            if (query.length >= 3) {
                searchAddress(query, searchInputID);
            } else {
                const resultsContainer = document.getElementById('search-results');
                resultsContainer.innerHTML = '';
                addDefaultItems(resultsContainer, searchInputID);
                resultsContainer.style.display = 'block';
            }
        }, 500);
    });

    document.getElementById(searchInputID).addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = document.getElementById(searchInputID).value.trim();
            if (query) {
                searchAddress(query, searchInputID);
            }
        }
    });
}

// Đóng kết quả tìm kiếm và xóa items khi click ra ngoài
document.addEventListener('click', (e) => {
    const resultsContainer = document.getElementById('search-results');
    if (!e.target.closest('.search-results-content') && !e.target.closest('.search-in-directions')) {
        resultsContainer.style.display = 'none';
        const userLocationItem = resultsContainer.querySelector('.user-location-item');
        const mapSelectionItem = resultsContainer.querySelector('.map-selection-item');
        if (userLocationItem) userLocationItem.remove();
        if (mapSelectionItem) mapSelectionItem.remove();
    }
});

// Thêm nút xóa đường đi
function addClearRouteButton() {
    const clearButton = document.createElement('button');
    clearButton.textContent = 'Xóa đường đi';
    clearButton.style.position = 'absolute';
    clearButton.style.top = '90px';
    clearButton.style.left = '10px';
    clearButton.style.zIndex = '1000';
    clearButton.className = 'dark-on-hover button-on-map';
    clearButton.onclick = clearRoute;

    document.getElementById('map').appendChild(clearButton);
}

// Gọi hàm thêm nút xóa đường đi
addClearRouteButton();