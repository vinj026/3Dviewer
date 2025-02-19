import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Fungsi bantu untuk mendeteksi perangkat mobile
function isMobile() {
  return /Mobi|Android/i.test(navigator.userAgent);
}

// Inisialisasi utama
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  35,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// Nonaktifkan antialiasing jika mobile untuk menghemat performa
const renderer = new THREE.WebGLRenderer({ antialias: !isMobile() });
renderer.setSize(window.innerWidth, window.innerHeight);
// Batasi device pixel ratio (maksimal 2) agar tidak terlalu berat di mobile
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
// Jika perangkat mobile, gunakan resolusi shadow map yang lebih kecil
const shadowMapSize = isMobile() ? 1024 : 2560;
directionalLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
directionalLight.shadow.bias = -0.001;
scene.add(directionalLight);

const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x080820, 5);
scene.add(hemisphereLight);

// Posisi kamera
camera.position.set(35, 10, 17);
camera.lookAt(0, 0, 0);

// Loading manager untuk model
const loadingScreen = document.getElementById('loading-screen');
const manager = new THREE.LoadingManager();

manager.onStart = function (url, itemsLoaded, itemsTotal) {
  console.log(`Started loading file: ${url} (${itemsLoaded}/${itemsTotal})`);
};

manager.onLoad = function () {
  console.log('Loading complete!');
  if (loadingScreen) {
    loadingScreen.style.display = 'none'; // Sembunyikan loading screen
  }
};

manager.onProgress = function (url, itemsLoaded, itemsTotal) {
  console.log(`Loading file: ${url} (${itemsLoaded}/${itemsTotal})`);
};

manager.onError = function (url) {
  console.log(`Error loading ${url}`);
};

// Memuat model 3D (hanya sekali)
const gltfLoader = new GLTFLoader(manager);
gltfLoader.load(
  '../scene.gltf',
  (gltf) => {
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => (mat.shadowSide = THREE.FrontSide));
          } else {
            child.material.shadowSide = THREE.FrontSide;
          }
        }
      }
    });

    // Atur posisi model di atas ground
    const box = new THREE.Box3().setFromObject(gltf.scene);
    gltf.scene.position.y = -box.min.y;

    scene.add(gltf.scene);
  },
  undefined,
  (error) => {
    console.error('Error loading model:', error);
  }
);

// Membuat geometri bidang untuk latar belakang (background)
const planeGeometry = new THREE.PlaneGeometry(2, 2);
const planeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    color1: { value: new THREE.Color(0xfdfbfb) },
    color2: { value: new THREE.Color(0xebedee) },
    ratio: { value: window.innerWidth / window.innerHeight },
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
  depthWrite: false,
});

// Membuat scene latar belakang terpisah
const backgroundScene = new THREE.Scene();
const backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const backgroundMesh = new THREE.Mesh(planeGeometry, planeMaterial);
backgroundScene.add(backgroundMesh);

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

  // Render scene utama (dengan model dan bayangan)
  renderer.render(scene, camera);
}
animate();
