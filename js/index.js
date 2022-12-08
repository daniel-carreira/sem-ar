//////////////////////////////////////////////////////////////////////////////////
//		CONFIGURATION
//////////////////////////////////////////////////////////////////////////////////

// init scene
const scene = new THREE.Scene();

// init camera
const camera = new THREE.Camera();
scene.add(camera)

// init font loader
const fontLoader = new THREE.FontLoader();

// init renderer
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
});
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );


//////////////////////////////////////////////////////
//          ARToolkitSource
//////////////////////////////////////////////////////

// handle ARToolkitSource
var ArToolkitSource = new THREEx.ArToolkitSource({
    sourceType: "webcam",
});

// perform resize
const onResize = () => {
  ArToolkitSource.onResizeElement();
  ArToolkitSource.copyElementSizeTo(renderer.domElement);
};

// init ARToolkitSource
ArToolkitSource.init(function onReady() {
  onResize()
  setTimeout(() => {
    onResize()
    setLoadingCardText("Look Around")
  }, 100)
});

// handle resize
window.addEventListener("resize", () => {
  onResize();
});


//////////////////////////////////////////////////////
//          Initialize ARToolkitContext
//////////////////////////////////////////////////////

// create ARToolkitContext
ArToolkitContext = new THREEx.ArToolkitContext({
    cameraParametersUrl: '/assets/camera_para.dat',
    detectionMode: 'color_and_matrix',
    patternRatio: 0.5
});

// init ARToolkitContext
ArToolkitContext.init(function() {
    camera.projectionMatrix.copy(ArToolkitContext.getProjectionMatrix());
});


//////////////////////////////////////////////////////
//          Create ARMarkerControls
//////////////////////////////////////////////////////

// init controls for camera
ArMarkerControls = new THREEx.ArMarkerControls(ArToolkitContext, camera, {
    type: 'pattern',
    patternUrl: '/assets/pattern-marker.patt',
    changeMatrixMode: 'cameraTransformMatrix',
});

scene.visible = false;


//////////////////////////////////////////////////////////////////////////////////
//          BUSINESS LOGIC
//////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////
//          Auth
//////////////////////////////////////////////////////
var AUTH_TOKEN = ''
const urlParams = new URLSearchParams(location.search);

for (const [key, value] of urlParams) {
    if (key == 'token') {
        AUTH_TOKEN = value
    }
}

//////////////////////////////////////////////////////
//          Status Card
//////////////////////////////////////////////////////
var loadlingCard = document.getElementById("loading");
var powerCard = document.getElementById("text");
var loadlingCardText = document.querySelector("#loading .info-card-text");
var powerCardText = document.querySelector("#text .info-card-text-power");

function activatePowerCard() {
    loadlingCard.style.display = "none"
    powerCard.style.display = "inline"
}
function activateLoadlingCard() {
    powerCard.style.display = "none"
    loadlingCard.style.display = "flex"
}

function setLoadingCardText(message) {
    loadlingCardText.textContent = message;
}
function setPowerCardText(message) {
    powerCardText.textContent = message;
}

//////////////////////////////////////////////////////
//          Store
//////////////////////////////////////////////////////
var store = {
    user: null,
    equipments: [],
    power: null,
    exhibitID: null,
    exhibit: {}
}

function getAuthUser() {
    return axios.get("http://smartenergymonitoring.dei.estg.ipleiria.pt/api/user", {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}`,
        }
    }).then(function (response) {
        store.user = response.data
    })
}

function getLastObservation() {
    return axios.get("http://smartenergymonitoring.dei.estg.ipleiria.pt/api/users/1/observations/last", {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}`,
        }
    }).then(function (response) {
        store.equipments = response.data.observation.equipments
    })
}
//getLastObservation()

//////////////////////////////////////////////////////
//          MQTT
//////////////////////////////////////////////////////
const url = 'wss://broker.emqx.io:8084/mqtt'

const options = {
    clean: true,
    connectTimeout: 4000,
    clientId: uuidv4(),
    username: '',
    password: '',
}

const client = mqtt.connect(url, options)
client.on('connect', async function() {
    //await getAuthUser()
    client.subscribe(`${store.user.id}/disaggregation`, function (err) {
        if (!err) {
            console.log(`MQTT Client subscribed to "${`${store.user.id}/disaggregation`}"`)
        }
    })
    client.subscribe(`${store.user.id}/power`, function (err) {
        if (!err) {
            console.log(`MQTT Client subscribed to "${`${store.user.id}/power`}"`)
        }
    })
})
  
// Receive messages
client.on('message', function (topic, message) {
    if (topic == `${store.user.id}/disaggregation`) {
        store.equipments = JSON.parse(message.toString())
        const data = getEquipmentData(store.equipments, store.exhibitID)
        if (data == null) {
            activateLoadlingCard()
            // Invalid QR CODE
            return
        }
        store.exhibit = getEquipmentData(store.equipments, store.exhibitID)
        refreshText()
    }
    else if (topic == `${store.user.id}/power`) {
        store.power = message.toString()
        refreshText()
    }
})

function getEquipmentData(equip_list, equip_id) {
    for (const equip of equip_list) {
        if (equip_id == equip.id) {
            return equip
        }
    }
    return null
}


//////////////////////////////////////////////////////
//          QR Scanner
//////////////////////////////////////////////////////

const qrCodeSuccessCallback = async (decodedText, decodedResult) => {
    if (store.exhibitID == decodedText) return
    store.exhibitID = decodedText
    
    const data = getEquipmentData(store.equipments, store.exhibitID)
    if (data != null) {
        store.exhibit = data
    }
    else if (store.exhibitID != 0) {
        return
    }
    
    const message = store.exhibitID == 0 ? `Home [ ${store.power} W ]` : `${store.exhibit.name} [ ${store.exhibit.consumption} W ]`
    setPowerCardText(message)
    activatePowerCard()
};
beginQRScanner(qrCodeSuccessCallback)


//////////////////////////////////////////////////////
//          AR Scene
//////////////////////////////////////////////////////

// Add Text
let textMesh
let group = new THREE.Group();
scene.add(group);

function createText() {
    fontLoader.load('/css/fonts/Roboto Black_Regular.json', (my_font) => {
        const geometry = new THREE.TextGeometry(`${store.power} W`, {
            font: my_font,
            size: 0.4,
            height: 0.01
        });

        textMesh = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial({ color: new THREE.Color( 0x000000 ) }));

        let middle_point = getCenterPoint(textMesh)

        textMesh.position.x = -middle_point.x
        textMesh.position.y = -middle_point.y
        textMesh.position.z = 0.1

        textMesh.rotation.x = -Math.PI / 2
    
        group.add(textMesh)
    });
}

createText()

/*
fontLoader.load('../css/fonts/Roboto_Bold.json', (my_font) => {
    const geometry = new THREE.TextGeometry('Television', {
        font: my_font,
        size: 0.1,
        height: 0.01
    });

    textMesh = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial({ color: new THREE.Color( 0x000000 ) }));

    textMesh.position.x = textMesh.position.x
    textMesh.position.y = textMesh.position.y
    textMesh.position.z = -0.2

    textMesh.rotation.x = -Math.PI / 2

    group.add(textMesh)
});
*/

const geometry = new THREE.PlaneGeometry( 6, 6 );
const material = new THREE.MeshBasicMaterial( {color: 0xFF8A00, side: THREE.DoubleSide} );
const plane = new THREE.Mesh( geometry, material );
plane.position.y = -0.1
plane.rotation.x = -Math.PI / 2
scene.add( plane );

function refreshText() {

    switch (store.exhibitID) {
        case '0':
            // General Home Power
            setPowerCardText(`Home [ ${store.power} W ]`)
            break

        default:
            // Equipment Power
            setPowerCardText(`${store.exhibit.name} [ ${store.exhibit.consumption} W ]`)

            group.remove(textMesh)
            createText()
    }

}

function animate() {
    requestAnimationFrame( animate );
    ArToolkitContext.update(ArToolkitSource.domElement);
    if (camera.visible) {
        //activatePowerCard()
    }
    else {
        //activateLoadlingCard()
    }
    scene.visible = camera.visible;
    renderer.render( scene, camera );
};

animate();

