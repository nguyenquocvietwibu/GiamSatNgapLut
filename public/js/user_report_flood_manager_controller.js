window.addEventListener('update_user_report_flood_event', async function () {
  loadUserReportFloodToTable(await getBaoCaoNgapTuDan());
})

loadUserReportFloodToTable(await cachedBaoCaoNgapTuDan);

console.log(await cachedBaoCaoNgapTuDan);


function previewUserReportFloodGemetry(userReportFloodId) {

}

function loadUserReportFloodToTable(reportFlood) {
  if (!reportFlood) return;
  const reportFloodTable = document.getElementById('user-report-flood-table');
  reportFloodTable.innerHTML = `
        <caption></caption>
        <thead>
        <tr>
            <th colspan="10">Danh sách không gian ngập</th>
        </tr>
        <tr>
        <th>Mã</th>
        <th>Tên nơi ngập</th>
        <th>Mực nước ngập</th>
        <th>Loại không gian</th>
        <th>Hình ảnh</th>
        <th>Tên người gửi</th>
        <th>Số điện thoại người gửi</th>
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
  let reportFloodTableHtmlTbody = document.querySelector('#user-report-flood-table tbody');

  reportFlood.forEach(async report => {
    let reportImageHTMLContent = '';
    // const reportFloodImage = await getAnhNgapTuDanBaoCao(report.ma);
    // reportFloodImage.forEach(image => {
    //   reportImageHTMLContent += `<img class="user-report-flood-img" src="img/${image.ten}" alt="" srcset="">\n`
    // })
    reportFloodTableHtmlTbody.innerHTML += `
      <tr>
        <td>${report.ma}</td>
        <td>${report.ten_noi_ngap}</td>
        <td>${report.muc_nuoc_ngap}</td>
        <td>${report.loai_khong_gian}</td>
        <td>
        <div class="user-report-flood-img-wrapper" id="user-report-flood-img-${report.ma}">
        </div>
        </td>
        <td>${report.ten_nguoi_gui}</td>
        <td>${report.so_dien_thoai_nguoi_gui}</td>
        <td>
          <button id="view-user-report-flood-button" class="dark-on-hover"onclick="dispatchPreviewUserReportFloodGemetry(${JSON.stringify(convertUserFloodReportToFeature(report)).replace(/"/g, '&quot;')})">Xem ở bản đồ</button>
          <button id="aprove-user-report-flood-button" class="dark-on-hover" onclick="aproveUserReportFlood(${JSON.stringify(convertUserFloodReportToFeature(report)).replace(/"/g, '&quot;')})">Duyệt</button>
          <button id="decline-user-report-flood-button" class="dark-on-hover" onclick="declineUserReportFlood(${report.ma})">Từ chối</button>
        </td>
      </tr>
  `;

    getAnhNgapTuDanBaoCao(report.ma).then(images => {
      let reportImageHTMLContent = '';
      images.forEach(image => {
        reportImageHTMLContent += `<img class="user-report-flood-img" src="img/${image.ten}" alt="">`;
      });

      document.getElementById(`user-report-flood-img-${report.ma}`).innerHTML = reportImageHTMLContent;
    });

  })
}

async function searchUserReportFloodInTable(keyWord) {
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

function convertUserFloodReportToFeature(report) {
  // Parse geometry string thành object
  const geometry = JSON.parse(report.geometry);

  // Tạo GeoJSON Feature
  const feature = {
    type: "Feature",
    geometry: geometry,
    properties: {
      ma: report.ma,
      ten_noi_ngap: report.ten_noi_ngap,
      muc_nuoc_ngap: report.muc_nuoc_ngap,
      loai_khong_gian: report.loai_khong_gian,
      ten_nguoi_gui: report.ten_nguoi_gui,
      so_dien_thoai_nguoi_gui: report.so_dien_thoai_nguoi_gui,
      ngay_tao: report.ngay_tao
    }
  };
  return feature;
}


