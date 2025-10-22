window.addEventListener('drawed_geometry', function (e) {
    const geometry = e.detail.drawedGeometry;
    const geometryJSON = JSON.stringify(geometry);

    console.log('📥 Nhận được geometry:', geometry);

    document.getElementById('send-flood-geometry').value = geometryJSON;
});

document.getElementById('confirm-send-flood-button').addEventListener('click', async function () {
    const sentFloodInfo = {
        senderName: document.getElementById('sender-name').value,
        senderPhoneNumber: document.getElementById('sender-phone-number').value,
        floodName: document.getElementById('flood-name').value,
        floodDepth: document.getElementById('flood-depth').value,
        floodType: document.getElementById('send-flood-type-selecter').value,
        floodGeometry: document.getElementById('send-flood-geometry').value,
        floodImages: document.getElementById('flood-images').files
    };

    await sendFlood(sentFloodInfo);
});