//////////////////////////////////////////////////////////////////////////////////
//		QR SCANNER
//////////////////////////////////////////////////////////////////////////////////

// Start QR Scanner
function beginQRScanner(sucessCallback) {
    const html5QrCode = new Html5Qrcode("reader");
    const config = {};

    // start scanner with priority for rear camera feed
    html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback);
}

// Download QR Code 
function downloadQRCode(text) {
    const qrCode = new QRCodeStyling({
        width: 300,
        height: 300,
        type: "jpg",
        data: text,
        image: "../assets/pattern-marker.png",
    });
    
    qrCode.download({ name: `qr-code-${text}`, extension: "jpg" });
}

//////////////////////////////////////////////////////////////////////////////////
//		3D Scene
//////////////////////////////////////////////////////////////////////////////////

function getCenterPoint(mesh) {
    var middle = new THREE.Vector3();
    var geometry = mesh.geometry;

    geometry.computeBoundingBox();

    middle.x = (geometry.boundingBox.max.x + geometry.boundingBox.min.x) / 2;
    middle.y = (geometry.boundingBox.max.y + geometry.boundingBox.min.y) / 2;
    middle.z = (geometry.boundingBox.max.z + geometry.boundingBox.min.z) / 2;

    mesh.localToWorld( middle );
    return middle;
}

//////////////////////////////////////////////////////////////////////////////////
//		Aux Functions
//////////////////////////////////////////////////////////////////////////////////

function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}