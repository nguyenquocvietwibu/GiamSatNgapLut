function dispatchEditFloodEvent(editedId) {
  window.dispatchEvent(new CustomEvent('edit_flood', {
    detail: {
      editedId: editedId,
    }
  }));
}

function dispatchEditedFloodInfoToForm(floodInfo) {
  window.dispatchEvent(new CustomEvent('edited_flood_info_to_form', {
    detail: {
      floodInfo: floodInfo,
    }
  }));
  console.log("flood info:", floodInfo);
}

function dispatchViewFloodEvent(viewedId) {
  window.dispatchEvent(new CustomEvent('viewed_flood', {
    detail: {
      viewedId: viewedId,
    }
  }));
}




function dispatchDrawedGeometryEvent(drawedGeometry) {

  window.dispatchEvent(new CustomEvent('drawed_geometry', {
    detail: {
      drawedGeometry: drawedGeometry,
    }
  }));
  console.log("dispatch: ", drawedGeometry);
}

function dispatchClearEditGeoFeatureEvent() {
  window.dispatchEvent(new CustomEvent('clear_edit_geometry'));
}


function dispatchPreviewUserReportFloodGemetry(feature) {
  window.dispatchEvent(new CustomEvent('preview_user_report_flood_geometry', {
    detail: {
      feature: feature
    }
  }));
  console.log("feature được xem trước: ", feature);
}

function dispatchUpdateUserReportFloodEvent() {
  window.dispatchEvent(new CustomEvent('update_user_report_flood_event'));
}
