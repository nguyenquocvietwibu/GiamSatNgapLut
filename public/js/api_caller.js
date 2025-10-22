let cachedMapboxToken = getMapboxToken();
let cachedNoiNgap = getNoiNgap();
let cachedBaoCaoNgapTuDan = getBaoCaoNgapTuDan();

async function getMapboxToken() {
    try {
        const response = await fetch('/api/get-mapbox-token');
        if (response.ok) {
            const data = await response.json();
            cachedMapboxToken = data.mapbox_token;
            return cachedMapboxToken;
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Failed to get Mapbox token: ', error);
    }
}

async function getNoiNgap() {
    try {
        const response = await fetch('/api/get-noi-ngap');
        if (response.ok) {
            const data = await response.json();
            cachedNoiNgap = data.noiNgap;
            return cachedNoiNgap;
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Failed to get flood data: ', error);
    }
}


async function deleteNoiNgap(deletedId) {

    try {
        if (confirm("Xác nhận xóa mã: " + deletedId)) {
            const response = await fetch(`/api/delete-noi-ngap/${deletedId}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            else {
                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.error);
                }
                else {
                    alert("Xóa thành công mã: " + deletedId);
                    updateNoiNgap();
                }

            }
        }
        else return;




    } catch (error) {
        console.error('Failed to delete flood data:', error);
    }
}

async function updateNoiNgap() {
    try {
        cachedNoiNgap = await getNoiNgap();
        window.dispatchEvent(new CustomEvent('update_noi_ngap', {
            detail: {
                updatedData: cachedNoiNgap
            }
        }));
    } catch (error) {
        console.error('Failed to update flood data:', error);
        return false;
    }
}

async function addNoiNgap(addedFloodInfo) {
    try {
        if (confirm("Xác nhận thêm nơi ngập?")) {
            const response = await fetch('/api/add-noi-ngap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(addedFloodInfo)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                console.log(result.success);
                updateNoiNgap(); // ✅ Gọi hàm cập nhật danh sách
                alert("Thêm thành công");
                dispatchClearEditGeoFeatureEvent();
                return result;
            } else {
                console.log(result.success);
                console.error(result.message);
                throw new Error(result.message);
            }
        }
        dispatchClearEditGeoFeatureEvent();

    } catch (error) {
        console.error(error);
        throw error;
    }
}


async function editNoiNgap(editedFloodInfo) {
    try {
        if (confirm("Xác nhận sửa nơi ngập mã: " + editedFloodInfo.floodId)) {
            const response = await fetch('/api/edit-noi-ngap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editedFloodInfo)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                console.log(result.success);
                updateNoiNgap(); // ✅ Gọi hàm cập nhật danh sách
                alert("Sửa thành công mã: " + editedFloodInfo.floodId);
                dispatchClearEditGeoFeatureEvent();

                return result;
            } else {
                console.log(result.success);
                console.error(result.message);
                throw new Error(result.message);
            }
        }
        dispatchClearEditGeoFeatureEvent();

    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function getBaoCaoNgapTuDan() {
    const response = await fetch('/api/get-bao-cao-ngap-tu-dan');
    if (response.ok) {
        const data = await response.json();
        cachedBaoCaoNgapTuDan = data.baoCaoNgapTuDan;
        if (data.success) {
            return data.baoCaoNgapTuDan;
        }
        else throw new Error(data.error);

    }
    else throw new Error(`HTTP ${response.status}`);
}

async function getAnhNgapTuDanBaoCao(reportFloodID) {
    try {
        let url = '/api/get-anh-ngap-tu-dan-bao-cao';

        // Nếu có reportFloodID thì thêm vào query string
        if (reportFloodID) {
            url += `?maBaoCaoNgapTuDan=${reportFloodID}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            return data.anhNgapTuDanBaoCao;
        } else {
            throw new Error(data.error);
        }

    } catch (error) {
        console.error('Lỗi khi lấy ảnh ngập:', error);
        throw error;
    }
}



async function aproveUserReportFlood(feature) {
    try {
        if (confirm("Xác nhận thêm nơi ngập?")) {
            const response = await fetch('/api/aprove-bao-cao-ngap-tu-dan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    feature: feature // Gửi toàn bộ feature GeoJSON
                })
            });

            if (response.ok) {
                const result = await response.json();

                if (result.success) {
                    alert('✅ Duyệt báo cáo thành công');
                    updateNoiNgap();
                    dispatchUpdateUserReportFloodEvent();
                }
            } else {
                throw new Error('Lỗi khi duyệt báo cáo');
            }
        }

    } catch (error) {
        console.error('❌ Lỗi khi duyệt báo cáo:', error);
        throw error;
    }
}

async function declineUserReportFlood(reportFloodID) {
    try {
        if (confirm("Xác nhận từ chối báo cáo từ người dân mã: " + reportFloodID)) {
            const response = await fetch(`/api/delete-bao-cao-ngap-tu-dan/${reportFloodID}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                alert('Đã từ chối báo cáo thành công!');
                dispatchClearEditGeoFeatureEvent();
                dispatchUpdateUserReportFloodEvent();
            } else {
                alert('Lỗi khi từ chối báo cáo: ' + result.error);
            }
        }
    } catch (error) {
        console.error('Lỗi khi từ chối báo cáo:', error);
        throw new Error('Lỗi khi từ chối báo cáo: ' + error.message);
    }
}
async function sendFlood(sentFloodInfo) {
    try {
        if (!confirm("Xác nhận gửi báo cáo ngập?")) return;

        // Tạo FormData để gửi cả file ảnh
        const formData = new FormData();
        
        // Thêm thông tin text vào formData
        formData.append('senderName', sentFloodInfo.senderName);
        formData.append('senderPhoneNumber', sentFloodInfo.senderPhoneNumber);
        formData.append('floodName', sentFloodInfo.floodName);
        formData.append('floodDepth', sentFloodInfo.floodDepth);
        formData.append('floodType', sentFloodInfo.floodType);
        formData.append('floodGeometry', sentFloodInfo.floodGeometry);
        
        // Thêm tất cả file ảnh vào formData
        for (let i = 0; i < sentFloodInfo.floodImages.length; i++) {
            formData.append('floodImages', sentFloodInfo.floodImages[i]);
        }

        // Gọi API gửi báo cáo
        const response = await fetch('/api/add-bao-cao-ngap-tu-dan', {
            method: 'POST',
            body: formData
        });

        // Kiểm tra response
        if (!response.ok) {
            throw new Error(`Lỗi HTTP: ${response.status}`);
        }

        const result = await response.json();

        // Xử lý kết quả
        if (result.success) {
            alert("Gửi báo cáo thành công!");
            console.log("✅ Gửi báo cáo thành công:", result);
        } else {
            throw new Error(result.error || "Lỗi không xác định");
        }

    } catch (error) {
        console.error('Lỗi khi gửi báo cáo:', error);
        alert("Lỗi khi gửi báo cáo: " + error.message);
    }
}