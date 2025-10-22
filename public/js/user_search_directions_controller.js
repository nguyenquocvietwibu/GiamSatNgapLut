import { map, getUserLocation, showUserLocationOnMap } from '/js/leaflet_map_controller.js';

// Biến để lưu trữ timeout cho tìm kiếm tự động
let searchTimeout;
let searchMarker;

let startingPoint;
let destinationPoint;

console.log(await cachedNoiNgap);
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

// Hàm bật chế độ chọn trên bản đồ (ĐÃ THÊM NÚT THOÁT)
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
    exitButton.style.top = '130px'; // Đặt dưới nút "Xóa đường đi"
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

// Hàm tắt chế độ chọn trên bản đồ (ĐÃ CẬP NHẬT)
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

        // Tự động tìm đường khi có đủ 2 điểm (TRÁNH KHU VỰC NGẬP)
        calculateRouteAvoidFlooded(
            [startingPoint.coordinates.lat, startingPoint.coordinates.lng],
            [destinationPoint.coordinates.lat, destinationPoint.coordinates.lng]
        );
    }
}

// Hàm kiểm tra điểm có nằm trong khu vực ngập không
function isPointInFloodedArea(point, floodedAreas) {
    if (!floodedAreas || !floodedAreas.features) return false;

    for (const area of floodedAreas.features) {
        if (isPointInArea(point, area)) {
            return true;
        }
    }
    return false;
}

// Hàm kiểm tra điểm có trong khu vực không
function isPointInArea(point, area) {
    const bounds = getAreaBounds(area);
    if (!bounds) return false;

    return bounds.contains([point[0], point[1]]);
}

// Hàm lấy bounds của khu vực ngập
function getAreaBounds(area) {
    if (area.geometry.type === 'Point') {
        const coords = area.geometry.coordinates;
        return L.latLngBounds([
            [coords[1] - 0.001, coords[0] - 0.001],
            [coords[1] + 0.001, coords[0] + 0.001]
        ]);
    } else if (area.geometry.type === 'LineString') {
        const coords = area.geometry.coordinates;
        const points = coords.map(coord => [coord[1], coord[0]]);
        return L.latLngBounds(points);
    } else if (area.geometry.type === 'Polygon') {
        const coords = area.geometry.coordinates[0];
        const points = coords.map(coord => [coord[1], coord[0]]);
        return L.latLngBounds(points);
    }
    return null;
}

// Hàm tìm điểm thay thế an toàn gần điểm gốc
function findSafeAlternativePoint(originalPoint, floodedAreas, maxAttempts = 15) {
    let attempts = 0;
    const baseDistance = 0.002; // ~200m

    while (attempts < maxAttempts) {
        // Tạo điểm ngẫu nhiên theo hình xoắn ốc
        const distance = baseDistance * (attempts + 1);
        const angle = attempts * (Math.PI / 6); // 30 độ mỗi bước

        const newLat = originalPoint[0] + Math.sin(angle) * distance;
        const newLng = originalPoint[1] + Math.cos(angle) * distance;
        const newPoint = [newLat, newLng];

        if (!isPointInFloodedArea(newPoint, floodedAreas)) {
            console.log(`✅ Tìm thấy điểm an toàn sau ${attempts + 1} lần thử`);
            return newPoint;
        }

        attempts++;
    }

    console.log('⚠️ Không tìm thấy điểm an toàn, sử dụng điểm gốc');
    return originalPoint;
}

// Hàm tìm các khu vực ngập nằm giữa 2 điểm
function findFloodedAreasBetweenPoints(start, end, floodedAreas) {
    const affectedAreas = [];
    const routeBounds = L.latLngBounds([start, end]);

    if (floodedAreas && floodedAreas.features) {
        floodedAreas.features.forEach(area => {
            const areaBounds = getAreaBounds(area);
            if (areaBounds && routeBounds.intersects(areaBounds)) {
                affectedAreas.push(area);
            }
        });
    }

    console.log(`🔍 Tìm thấy ${affectedAreas.length} khu vực ngập trên tuyến đường`);
    return affectedAreas;
}

// Hàm tạo các waypoint tránh khu vực ngập THÔNG MINH
function createSmartAvoidanceWaypoints(start, end, floodedAreas) {
    const waypoints = [L.latLng(start[0], start[1])];

    // Tìm các khu vực ngập nằm giữa 2 điểm
    const affectedAreas = findFloodedAreasBetweenPoints(start, end, floodedAreas);

    if (affectedAreas.length > 0) {
        // Tạo các điểm tránh xung quanh các khu vực ngập
        affectedAreas.forEach((area, index) => {
            const areaCenter = getAreaBounds(area).getCenter();
            const safePoint = findSafeAlternativePoint([areaCenter.lat, areaCenter.lng], floodedAreas);

            // Chỉ thêm điểm tránh nếu nó không quá gần điểm đầu/cuối
            const distanceToStart = Math.sqrt(
                Math.pow(safePoint[0] - start[0], 2) +
                Math.pow(safePoint[1] - start[1], 2)
            );
            const distanceToEnd = Math.sqrt(
                Math.pow(safePoint[0] - end[0], 2) +
                Math.pow(safePoint[1] - end[1], 2)
            );

            if (distanceToStart > 0.001 && distanceToEnd > 0.001) {
                waypoints.push(L.latLng(safePoint[0], safePoint[1]));
                console.log(`🛡️ Thêm điểm tránh ngập ${index + 1}`);
            }
        });
    }

    waypoints.push(L.latLng(end[0], end[1]));
    return waypoints;
}

// HÀM CHÍNH: Chỉ đường tránh khu vực ngập lụt (ĐÃ SỬA)
function calculateRouteAvoidFlooded(startPosition, endPosition) {
    
    // Xóa route cũ nếu có
    if (window.routingControl) {
        window.routingControl.remove();
        window.routingControl = null;
    }

    console.log('🔄 Đang tính đường tránh khu vực ngập lụt...');

    // Tạo waypoints tránh khu vực ngập THÔNG MINH
    const waypoints = createSmartAvoidanceWaypoints(startPosition, endPosition, cachedNoiNgap);

    console.log('📍 Waypoints:', waypoints);

    // Tạo routing control
    window.routingControl = L.Routing.control({
        waypoints: waypoints,
        router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            profile: 'car',
            language: 'vi'
        }),
        createMarker: function (i, waypoint, n) {
            return null;
        },
        lineOptions: {
            styles: [
                {
                    color: '#10b981',
                    weight: 8,
                    opacity: 0.9,
                    dashArray: '0'
                }
            ]
        },
        showAlternatives: true,
        routeWhileDragging: false,
        addWaypoints: false,
        // KHÔNG dùng container option ở đây vì không hoạt động
        // container: document.getElementById('directions-routes') // ❌ Không hoạt động
    }).addTo(map);

    // QUAN TRỌNG: Di chuyển bảng chỉ đường vào container mong muốn SAU KHI tạo
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
    const bounds = L.latLngBounds([
        [startPosition[0], startPosition[1]],
        [endPosition[0], endPosition[1]]
    ]);
    map.fitBounds(bounds, { padding: [100, 100] });

    // Thêm sự kiện khi route được tính xong
    window.routingControl.on('routesfound', function (e) {
        const routes = e.routes;
        console.log(`✅ Đã tìm thấy ${routes.length} tuyến đường tránh ngập`);

        routes.forEach((route, index) => {
            console.log(`🛣️ Tuyến ${index + 1}: ${(route.summary.totalDistance / 1000).toFixed(2)} km, ${(route.summary.totalTime / 60).toFixed(2)} phút`);
        });

        // Hiển thị thông tin chi tiết về tuyến đường được chọn
        if (routes[0]) {
            const route = routes[0];
            console.log(`📏 Khoảng cách: ${(route.summary.totalDistance / 1000).toFixed(2)} km`);
            console.log(`⏱️ Thời gian: ${(route.summary.totalTime / 60).toFixed(2)} phút`);

            // Hiển thị thông báo cho người dùng
            showRouteInfo(route);
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

    window.routeInfoPopup = L.popup()
        .setLatLng([route.coordinates[0].lat, route.coordinates[0].lng])
        .setContent(`
            <div style="font-weight: bold; color: #10b981;">
                🛣️ TUYẾN ĐƯỜNG AN TOÀN
            </div>
            <div>📏 Quãng đường: ${distance} km</div>
            <div>⏱️ Thời gian: ${time} phút</div>
            <div>🛡️ Đã tránh các khu vực ngập lụt</div>
        `)
        .openOn(map);
}

// Hàm chỉ đường bình thường (dự phòng)
function calculateRoute(startPosition, endPosition) {
    if (window.routingControl) {
        window.routingControl.remove();
        window.routingControl = null;
    }

    window.routingControl = L.Routing.control({
        waypoints: [
            L.latLng(startPosition[0], startPosition[1]),
            L.latLng(endPosition[0], endPosition[1])
        ],
        router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            profile: 'car',
            language: 'vi'
        }),
        createMarker: function () {
            return null;
        },
        lineOptions: {
            styles: [
                { color: 'blue', weight: 6 }
            ]
        }
    }).addTo(map);

    const bounds = L.latLngBounds([startPosition, endPosition]);
    map.fitBounds(bounds, { padding: [50, 50] });
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
            // CHỈ KHI KHÔNG CÓ KẾT QUẢ mới thêm các item mặc định
            addDefaultItems(resultsContainer, searchInputID);
            return;
        }

        // KHI CÓ KẾT QUẢ TÌM KIẾM - CHỈ HIỂN THỊ KẾT QUẢ, KHÔNG THÊM ITEM MẶC ĐỊNH
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
        // KHI CÓ LỖI - thêm các item mặc định
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
        // Xóa các item mặc định
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