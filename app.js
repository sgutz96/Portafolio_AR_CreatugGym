import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* ---------- PRODUCTS ---------- */
const products = [
    {
        name: 'Bongo Drum',
        desc: 'Instrumento de percusión tradicional',
        model: 'models/gltf/Bongo/Bongo.gltf',
        scale: 0.01,
        textures: [
            { name: 'Original', color: null },
            { name: 'Rojo', color: 0xCC3333 }
        ]
    }
];

let camera, scene, renderer, reticle;
let hitTestSource = null;
let hitTestSourceRequested = false;
let gltfModels = [];
let currentProductIndex = 0;
let currentTextureIndex = 0;

const loader = new GLTFLoader();

/* ---------- UI ---------- */
function renderProductUI() {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';

    products.forEach((p, i) => {
        const card = document.createElement('div');
        card.className = `product-card ${i === currentProductIndex ? 'active' : ''}`;
        card.innerHTML = `<div class="product-name">${p.name}</div>
                          <div class="product-desc">${p.desc}</div>`;
        card.onclick = () => {
            currentProductIndex = i;
            renderProductUI();
            renderTextureUI();
        };
        grid.appendChild(card);
    });
}

function renderTextureUI() {
    const grid = document.getElementById('textureGrid');
    grid.innerHTML = '';

    products[currentProductIndex].textures.forEach((t, i) => {
        const el = document.createElement('div');
        el.className = `texture-option ${i === currentTextureIndex ? 'active' : ''}`;
        el.style.background = t.color ? `#${t.color.toString(16)}` : '#666';
        el.onclick = () => {
            currentTextureIndex = i;
            renderTextureUI();
        };
        grid.appendChild(el);
    });
}

/* ---------- THREE / AR ---------- */
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3));

    const arButton = ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] });
    arButton.id = 'ARButton';
    arButton.textContent = 'Iniciar AR';
    document.body.appendChild(arButton);

    reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xff6b35 })
    );
    reticle.visible = false;
    reticle.matrixAutoUpdate = false;
    scene.add(reticle);

    renderer.setAnimationLoop(render);
}

/* ---------- LOAD ---------- */
products.forEach((p, i) => {
    loader.load(p.model, gltf => gltfModels[i] = gltf.scene);
});

renderProductUI();
renderTextureUI();
init();

function render(_, frame) {
    if (frame && renderer.xr.isPresenting) {
        const session = renderer.xr.getSession();
        const refSpace = renderer.xr.getReferenceSpace();

        if (!hitTestSourceRequested) {
            session.requestReferenceSpace('viewer').then(space => {
                session.requestHitTestSource({ space }).then(src => hitTestSource = src);
            });
            hitTestSourceRequested = true;
        }

        if (hitTestSource) {
            const hits = frame.getHitTestResults(hitTestSource);
            if (hits.length) {
                reticle.visible = true;
                reticle.matrix.fromArray(hits[0].getPose(refSpace).transform.matrix);
            }
        }
    }

    renderer.render(scene, camera);
}
