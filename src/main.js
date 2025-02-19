import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Inisialisasi utama
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Bayangan lebih halus
document.body.appendChild(renderer.domElement);

// Kontrol kamera
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Pencahayaan
const ambientLight = new THREE.AmbientLight(0xF4E99B, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xDF9755, 5);
directionalLight.position.set(25, 10, 20);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(2560, 2560);
directionalLight.shadow.bias = -0.001; // Mengurangi shadow acne

scene.add(directionalLight);

const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x080820, 5);
scene.add(hemisphereLight);

// Posisi kamera
camera.position.set(35, 10, 17);
camera.lookAt(0, 0, 0);

const loadingScreen = document.getElementById('loading-screen');

const manager = new THREE.LoadingManager();
manager.onStart = function (url, itemsLoaded, itemsTotal) {
    console.log(`Started loading file: ${url} (${itemsLoaded}/${itemsTotal})`);
};

manager.onLoad = function () {
    console.log('Loading complete!');
    loadingScreen.style.display = 'none'; // Sembunyikan loading screen
};

manager.onProgress = function (url, itemsLoaded, itemsTotal) {
    console.log(`Loading file: ${url} (${itemsLoaded}/${itemsTotal})`);
};

manager.onError = function (url) {
    console.log(`Error loading ${url}`);
};

// Gunakan `manager` saat memuat model
const gltfloader = new GLTFLoader(manager);
gltfloader.load('../scene.gltf', (gltf) => {
    gltf.scene.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.shadowSide = THREE.FrontSide);
                } else {
                    child.material.shadowSide = THREE.FrontSide;
                }
            }
        }
    });

    const box = new THREE.Box3().setFromObject(gltf.scene);
    gltf.scene.position.y = -box.min.y; // Posisi model di atas ground

    scene.add(gltf.scene);
}, undefined, (error) => {
    console.error('Error loading model:', error);
});


// // Membuat geometri bidang untuk latar belakang
const planeGeometry = new THREE.PlaneGeometry(2, 2);
// Shader material untuk gradasi dinamis
const planeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    color1: { value: new THREE.Color(0xfdfbfb) },
    color2: { value: new THREE.Color(0xebedee) },
    ratio: { value: window.innerWidth / window.innerHeight }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
     varying vec2 vUv;
  uniform vec3 color1;
  uniform vec3 color2;
  uniform float ratio;
  void main() {
    vec2 uv = (vUv - 0.5) * vec2(ratio, 1.0);
    float dist = length(uv);
    float blur = smoothstep(-0.5, 1.0, dist);
    vec3 color = mix(color1, color2, blur);
    gl_FragColor = vec4(color, 1.0);
}
  `,
  depthWrite: false
});

// Membuat background scene terpisah
const backgroundScene = new THREE.Scene();
const backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const backgroundMesh = new THREE.Mesh(planeGeometry, planeMaterial);
backgroundScene.add(backgroundMesh);

// Memuat model 3D
const loader = new GLTFLoader();
loader.load('../scene.gltf', (gltf) => {
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      
      // Pastikan material model mendukung bayangan
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            mat.shadowSide = THREE.FrontSide;
          });
        } else {
          child.material.shadowSide = THREE.FrontSide;
        }
      }
    }
  });
  
  // Atur posisi model agar berada tepat di atas ground plane
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const modelHeight = box.max.y - box.min.y;
  gltf.scene.position.y = Math.abs(box.min.y);
  
  scene.add(gltf.scene);
}, undefined, (error) => {
  console.error('Error loading model:', error);
});

// Menangani perubahan ukuran jendela
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  planeMaterial.uniforms.ratio.value = window.innerWidth / window.innerHeight;
});

// Fungsi animasi dengan rendering dua scene
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  
  // Render background terlebih dahulu
  renderer.autoClear = false;
  renderer.clear();
  renderer.render(backgroundScene, backgroundCamera);
  
  // Kemudian render scene utama (dengan model dan bayangan)
  renderer.render(scene, camera);
}
animate();