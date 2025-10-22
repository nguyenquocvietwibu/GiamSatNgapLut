


loadFloodDataToTable(await cachedNoiNgap);

let floodKeyWord = '';

const searchFloodInTableElement = document.getElementById('search-flood-in-table');



// Khi select thay đổi - PHÁT event
document.getElementById('add-flood-type-selecter').addEventListener('change', function (e) {
  const selectedType = e.target.value;
  dispatchClearEditGeoFeatureEvent()
  // Phát sự kiện custom
  window.dispatchEvent(new CustomEvent('form_selected_flood_type', {
    detail: {
      manageTask: 'add',
      selectedType: selectedType
    }
  }));
});

// Khi select thay đổi - PHÁT event
document.getElementById('edit-flood-type-selecter').addEventListener('change', function (e) {
  const selectedType = e.target.value;
  dispatchClearEditGeoFeatureEvent();
  // Phát sự kiện custom
  window.dispatchEvent(new CustomEvent('form_selected_flood_type', {
    detail: {
      manageTask: 'add',
      selectedType: selectedType
    }
  }));
});

document.getElementById('confirm-edit-flood-button').addEventListener('click', async function () {
  // LẤY GIÁ TRỊ TRỰC TIẾP TỪ INPUT, KHÔNG DÙNG FormData
  const editedFloodInfo = {
    floodId: document.getElementById('edit-flood-id').value,
    floodName: document.getElementById('edit-flood-name').value,
    floodDepth: document.getElementById('edit-flood-depth').value,
    floodType: document.getElementById('edit-flood-type-selecter').value,
    floodGeometry: document.getElementById('edit-flood-geometry').value
  };

  console.log("📝 Dữ liệu từ form:", editedFloodInfo); // KIỂM TRA XEM CÓ DỮ LIỆU KHÔNG

  try {
    // Gọi hàm từ api_caller
    await editNoiNgap(editedFloodInfo);
    // Đóng form sau khi thành công
    displayElement('edit-flood-form', 'none');
    displayElement('add-flood-button');
  } catch (error) {
    console.error(error);
  }
});

document.getElementById('confirm-add-flood-button').addEventListener('click', async function () {
  // LẤY GIÁ TRỊ TRỰC TIẾP TỪ INPUT, KHÔNG DÙNG FormData
  const addedFloodInfo = {
    floodName: document.getElementById('add-flood-name').value,
    floodDepth: document.getElementById('add-flood-depth').value,
    floodType: document.getElementById('add-flood-type-selecter').value,
    floodGeometry: document.getElementById('add-flood-geometry').value
  };

  console.log("📝 Dữ liệu từ form:", addedFloodInfo); // KIỂM TRA XEM CÓ DỮ LIỆU KHÔNG

  try {
    // Gọi hàm từ api_caller
    await addNoiNgap(addedFloodInfo);
    // Đóng form sau khi thành công
    displayElement('add-flood-form', 'none');
    displayElement('add-flood-button');
  } catch (error) {
    console.error(error);
  }
});


window.addEventListener('drawed_geometry', function (e) {
  const geometry = e.detail.drawedGeometry;
  const geometryJSON = JSON.stringify(geometry);

  console.log('📥 Nhận được geometry:', geometry);

  // Điền vào cả 2 input
  document.getElementById('add-flood-geometry').value = geometryJSON;
  document.getElementById('edit-flood-geometry').value = geometryJSON;
});

window.addEventListener('clear_edit_geometry', function () {
  document.getElementById('add-flood-geometry').value = "";
  document.getElementById('edit-flood-geometry').value = "";
});

// Thêm event listener để nhận floodInfo và cập nhật
window.addEventListener('edited_flood_info_to_form', function (event) {
  const floodInfo = event.detail.floodInfo;
  const floodTypeSelecter = document.getElementById('edit-flood-type-selecter');
  const floodDepth = document.getElementById('edit-flood-depth');
  const floodName = document.getElementById('edit-flood-name');
  const floodId = document.getElementById('edit-flood-id');
  floodDepth.value = floodInfo.floodDepth;
  floodName.value = floodInfo.floodName;
  floodId.value = floodInfo.floodId;
  const options = floodTypeSelecter.options;
  for (let i = 0; i < options.length; i++) {
    if (options[i].value === floodInfo.floodType) {
      floodTypeSelecter.selectedIndex = i;
      console.log("Đã cập nhật select thành:", floodInfo);
      break;
    }
  }
});





// Đăng ký event
window.addEventListener('update_noi_ngap', async (event) => {
  if (floodKeyWord) {
    loadFloodDataToTable(await searchFloodInTable(floodKeyWord))
  } else {
    loadFloodDataToTable(event.detail.updatedData);
  }
});

searchFloodInTableElement.addEventListener('input', async (event) => {
  floodKeyWord = event.target.value.trim().toLowerCase();
  loadFloodDataToTable(await searchFloodInTable(floodKeyWord));
})



async function searchFloodInTable(keyWord) {
  const floodData = await cachedNoiNgap;
  if (!keyWord) {
    loadFloodDataToTable(floodData)
  } else {
    const found_list = floodData.features.filter(feature =>
      feature.properties.ten.toLowerCase().includes(keyWord.toLowerCase())
    )

    /*
    const kết_quả_lọc = {
      ...floodData,
      features: danh_sách_lọc
    };
    */

    const result = structuredClone(floodData);
    result.features = found_list;
    return result;
  }
}



function loadFloodDataToTable(floodData) {
  if (!floodData || !floodData.features) return;
  const floodTable = document.getElementById('flood-table');
  floodTable.innerHTML = `
        <caption></caption>
        <thead>
        <tr>
            <th colspan="10">Danh sách nơi ngập</th>
        </tr>
        <tr>
        <th>Mã</th>
        <th>Tên</th>
        <th>Mực nước ngập (m)</th>
        <th>Loại không gian</th>
        <th>Hành động</th>
        </tr>
        </thead>

        <tbody>
        </tbody>

        <tfoot>
        <!-- <tr>
        </tr> -->
        </tfoot>
      `;
  let floodTableHtmlTbody = document.querySelector('#flood-table tbody');
  floodData.features.forEach(feature => {
    floodTableHtmlTbody.innerHTML += `
      <tr>
        <td>${feature.properties.ma}</td>
        <td>${feature.properties.ten}</td>
        <td>${feature.properties.muc_nuoc_ngap}</td>
        <td>${feature.properties.loai_khong_gian}</td>
        <td>
          <button id="view-flood-button" class="dark-on-hover"onclick="dispatchViewFloodEvent(${feature.properties.ma})">Xem ở bản đồ</button>
          <button id="edit-flood-button" class="dark-on-hover" onclick="displayElement('edit-flood-form', 'flex'), displayElement('add-flood-form', 'none'), displayElement('add-flood-button', 'none'), dispatchEditFloodEvent(${feature.properties.ma})">Sửa</button>
          <button id="delete-flood-button" class="dark-on-hover" onclick="deleteNoiNgap(${feature.properties.ma})">Xóa</button>
        </td>
      </tr>
      `;
  });
}


