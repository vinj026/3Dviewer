import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Inisialisasi utama
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
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
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.bias = -0.001;
scene.add(directionalLight);

const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x080820, 5);
scene.add(hemisphereLight);

// Posisi kamera
camera.position.set(35, 10, 17);
camera.lookAt(0, 0, 0);

// Memuat model 3D
const loader = new GLTFLoader();
loader.load('../scene.gltf', (gltf) => {
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
    gltf.scene.position.y = -box.min.y;
    scene.add(gltf.scene);
}, undefined, (error) => {
    console.error('Error loading model:', error);
});

// Background gradasi
const planeGeometry = new THREE.PlaneGeometry(2, 2);
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

const backgroundScene = new THREE.Scene();
const backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const backgroundMesh = new THREE.Mesh(planeGeometry, planeMaterial);
backgroundScene.add(backgroundMesh);

// Responsif
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    planeMaterial.uniforms.ratio.value = window.innerWidth / window.innerHeight;
});

// Render loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(backgroundScene, backgroundCamera);
    renderer.render(scene, camera);
}
animate();