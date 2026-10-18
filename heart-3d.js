import * as THREE from "three";

const heartElement = document.getElementById("photoHeart");
const webglCanvas = document.getElementById("heartWebGLCanvas");
const fallbackCanvas = document.getElementById("heartFallbackCanvas");
const DEFAULT_PARTICLE_COUNT = 6500;

let renderer = null;
let resizeObserver = null;
let animationStarted = false;
let webglFailed = false;
let lastFrameTime = 0;
let resizeHandler = null;
let heartGroup = null;
let activeScene = null;
let activeCamera = null;
let rotationSeconds = 18;
let imageOrbit = null;
const fallbackStart = window.startParticleHeart;
const fallbackStop = window.stopParticleHeart;

function heartFunction(x, y) {
    const x2 = x * x;
    const y2 = y * y;
    return Math.pow(x2 + y2 - 1, 3) - x2 * y * y2;
}

function randomHeartPoint() {
    for (let attempt = 0; attempt < 10000; attempt++) {
        const x = Math.random() * 2.55 - 1.275;
        const y = Math.random() * 2.35 - 1.15;
        if (heartFunction(x, y) <= 0) return { x, y };
    }

    return { x: 0, y: -0.5 };
}

function buildHeartSurface(THREE, group, particleCount) {
    const geometry = new THREE.SphereGeometry(1, 9, 7);
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.22,
        emissive: 0x680012,
        emissiveIntensity: 0.32
    });
    const beads = new THREE.InstancedMesh(geometry, material, particleCount);
    const transform = new THREE.Object3D();
    const palette = [
        0x9f0019,
        0xc90025,
        0xe20b32,
        0xf51f43,
        0x790013,
        0xff4056
    ];
    const beadColor = new THREE.Color();
    const volumePoints = Array.from({ length: particleCount }, randomHeartPoint);

    for (let index = 0; index < particleCount; index++) {
        const point = volumePoints[index];
        const normalizedRadius = Math.min(
            1,
            (point.x / 1.3) ** 2 + ((point.y + 0.02) / 1.2) ** 2
        );
        const halfDepth = 0.15 + 0.62 * Math.sqrt(1 - normalizedRadius);
        const z = (Math.random() * 2 - 1) * halfDepth;
        const radius = 0.024 + Math.random() * 0.009;

        transform.position.set(point.x * 1.48, point.y * 1.5, z);
        transform.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        transform.scale.setScalar(radius);
        transform.updateMatrix();
        beads.setMatrixAt(index, transform.matrix);

        beadColor.setHex(palette[Math.floor(Math.random() * palette.length)]);
        beadColor.multiplyScalar(0.82 + Math.random() * 0.38);
        beads.setColorAt(index, beadColor);
    }

    beads.instanceMatrix.needsUpdate = true;
    if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
    group.add(beads);
}

function buildPhotoOrbit(THREE, scene, camera) {
    imageOrbit = new THREE.Group();
    scene.add(imageOrbit);

    const textureLoader = new THREE.TextureLoader();
    const frameGeometry = new THREE.PlaneGeometry(1.419, 1.665);
    const photoGeometry = new THREE.PlaneGeometry(1.395, 1.641);
    const frameMaterial = new THREE.MeshBasicMaterial({
        color: 0x8d1029,
        side: THREE.DoubleSide,
        toneMapped: false
    });
    const halfViewHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const halfViewWidth = halfViewHeight * camera.aspect;
    const sideLanes = [-0.88, -0.68, -0.48, 0.48, 0.68, 0.88];

    for (let index = 0; index < 18; index++) {
        const sideIndex = index % 2;
        const sideSequence = Math.floor(index / 2);
        const lane = Math.floor(sideSequence / 3);
        const verticalSlot = sideSequence % 3;
        const card = new THREE.Group();
        const baseXNorm = sideLanes[lane + sideIndex * 3];
        const baseX = baseXNorm * halfViewWidth;
        card.userData.baseXNorm = baseXNorm;
        card.userData.baseX = baseX;
        card.userData.baseZ = ((index % 3) - 1) * 0.72;
        card.userData.floatPhase = index * 0.83;
        card.userData.riseOffset = verticalSlot / 3;
        card.userData.riseCycle = 10;
        card.position.set(
            baseX,
            -halfViewHeight - 1,
            card.userData.baseZ
        );
        card.rotation.z = ((index % 3) - 1) * 0.035;
        card.scale.setScalar(0.55);

        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.z = -0.012;
        card.add(frame);

        const texture = textureLoader.load(
            new URL(`images/hinh${index + 1}.jpg`, import.meta.url).href,
            loadedTexture => {
                loadedTexture.colorSpace = THREE.SRGBColorSpace;
                loadedTexture.anisotropy = Math.min(
                    renderer?.capabilities.getMaxAnisotropy() || 1,
                    4
                );
                const imageRatio = loadedTexture.image.width / loadedTexture.image.height;
                const frameRatio = 1.395 / 1.641;
                if (imageRatio > frameRatio) {
                    const visibleWidth = frameRatio / imageRatio;
                    loadedTexture.repeat.set(visibleWidth, 1);
                    loadedTexture.offset.set((1 - visibleWidth) / 2, 0);
                } else {
                    const visibleHeight = imageRatio / frameRatio;
                    loadedTexture.repeat.set(1, visibleHeight);
                    loadedTexture.offset.set(0, (1 - visibleHeight) / 2);
                }
                loadedTexture.needsUpdate = true;
            },
            undefined,
            error => console.warn(`Không tải được ảnh hinh${index + 1}.jpg`, error)
        );
        const photoMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            toneMapped: false
        });
        const photo = new THREE.Mesh(photoGeometry, photoMaterial);
        photo.position.z = 0.006;
        card.add(photo);
        imageOrbit.add(card);
    }
}

function addAmbientSparkles(THREE, scene) {
    const positions = new Float32Array(170 * 3);
    for (let index = 0; index < 170; index++) {
        positions[index * 3] = (Math.random() - 0.5) * 8.5;
        positions[index * 3 + 1] = (Math.random() - 0.5) * 5.4;
        positions[index * 3 + 2] = (Math.random() - 0.5) * 3.5 - 0.8;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: 0xff536b,
        size: 0.018,
        transparent: true,
        opacity: 0.5,
        sizeAttenuation: true,
        depthWrite: false
    });
    scene.add(new THREE.Points(geometry, material));
}

function resizeScene(camera, width, height) {
    if (!renderer || !width || !height) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = width / height < 0.9 ? 7.6 : 6.9;
    camera.updateProjectionMatrix();
}

function startAnimation(scene, camera) {
    if (animationStarted || !renderer) return;
    animationStarted = true;

    renderer.setAnimationLoop(time => {
        const delta = lastFrameTime
            ? Math.min((time - lastFrameTime) / 1000, 0.05)
            : 0;
        lastFrameTime = time;

        if (heartGroup) {
            heartGroup.rotation.y += delta * (Math.PI * 2 / rotationSeconds);
            heartGroup.rotation.x = -0.035;
            const beatPhase = (time % 1120) / 1120;
            const firstBeat = Math.exp(-Math.pow((beatPhase - 0.1) / 0.045, 2));
            const secondBeat = Math.exp(-Math.pow((beatPhase - 0.27) / 0.065, 2));
            const previewScale = document.body.classList.contains("heart-preview-mode")
                ? 0.78
                : 0.90;
            const pulse = previewScale * (1 + firstBeat * 0.045 + secondBeat * 0.026);
            heartGroup.scale.setScalar(pulse);
        }
        if (imageOrbit) {
            const halfViewHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
            const halfViewWidth = halfViewHeight * camera.aspect;
            imageOrbit.children.forEach(card => {
                const floatPhase = time * 0.0008 + card.userData.floatPhase;
                const risePhase = ((time / 1000) / card.userData.riseCycle + card.userData.riseOffset) % 1;
                const riseDistance = halfViewHeight * 2 + 1.8;
                card.userData.baseX = card.userData.baseXNorm * halfViewWidth;
                card.position.x = card.userData.baseX + Math.sin(floatPhase) * 0.08;
                card.position.y = -halfViewHeight - 0.9 + risePhase * riseDistance
                    + Math.cos(floatPhase * 0.8) * 0.07;
                card.position.z = card.userData.baseZ + Math.sin(floatPhase * 0.65) * 0.08;
                card.rotation.z = Math.sin(floatPhase * 0.7) * 0.035;
                card.rotation.y = Math.sin(floatPhase * 0.5) * 0.06;
                card.scale.setScalar(0.55);
            });
        }

        renderer.render(scene, camera);
    });
}

function initializeParticleHeart() {
    if (!heartElement || !webglCanvas || renderer) return;
    if (webglFailed) {
        fallbackStart?.();
        return;
    }

    try {
        const width = heartElement.clientWidth;
        const height = heartElement.clientHeight;
        if (!width || !height) {
            requestAnimationFrame(initializeParticleHeart);
            return;
        }

        const scene = new THREE.Scene();
        rotationSeconds = Math.max(
            6,
            Number(heartElement.dataset.rotationSeconds) || 18
        );
        const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 60);
        activeScene = scene;
        activeCamera = camera;
        camera.position.set(
            0,
            0.04,
            width / height < 1 ? 8.4 : width / height < 1.2 ? 7.5 : 6.9
        );

        renderer = new THREE.WebGLRenderer({
            canvas: webglCanvas,
            alpha: true,
            antialias: true,
            powerPreference: "low-power"
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setSize(width, height, false);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.setClearColor(0x000000, 0);

        scene.add(new THREE.HemisphereLight(0xffd4dc, 0x160006, 1.4));

        const keyLight = new THREE.DirectionalLight(0xffd0d5, 3.2);
        keyLight.position.set(-3.5, 4.5, 6);
        scene.add(keyLight);

        const rubyLight = new THREE.PointLight(0xff102e, 30, 9, 1.8);
        rubyLight.position.set(3.2, 1.2, 3.8);
        scene.add(rubyLight);

        const rimLight = new THREE.PointLight(0x9e001d, 24, 8, 1.8);
        rimLight.position.set(-3, -2.5, -3.5);
        scene.add(rimLight);

        heartGroup = new THREE.Group();
        heartGroup.position.y = document.body.classList.contains("heart-preview-mode")
            ? -0.65
            : -0.02;
        scene.add(heartGroup);

        const particleCount = Math.max(
            500,
            Math.min(
                Number(heartElement.dataset.particleCount) || DEFAULT_PARTICLE_COUNT,
                window.matchMedia("(max-width: 540px)").matches ? 3000 : 7000
            )
        );
        buildHeartSurface(THREE, heartGroup, particleCount);
        buildPhotoOrbit(THREE, scene, camera);
        addAmbientSparkles(THREE, scene);

        resizeHandler = () => {
            resizeScene(camera, heartElement.clientWidth, heartElement.clientHeight);
        };
        window.addEventListener("resize", resizeHandler, { passive: true });
        if ("ResizeObserver" in window) {
            resizeObserver = new ResizeObserver(entries => {
                const rect = entries[0]?.contentRect;
                if (rect) resizeScene(camera, rect.width, rect.height);
            });
            resizeObserver.observe(heartElement);
        }

        if (fallbackCanvas) fallbackCanvas.hidden = true;
        webglCanvas.hidden = false;
        startAnimation(scene, camera);
    } catch (error) {
        console.error("Không thể khởi tạo trái tim WebGL:", error);
        webglFailed = true;
        resizeObserver?.disconnect();
        resizeObserver = null;
        if (resizeHandler) {
            window.removeEventListener("resize", resizeHandler);
            resizeHandler = null;
        }
        if (renderer) {
            renderer.dispose();
            renderer = null;
        }
        animationStarted = false;
        if (webglCanvas) webglCanvas.hidden = true;
        fallbackStart?.();
    }
}

function stopParticleHeart() {
    if (renderer) renderer.setAnimationLoop(null);
    animationStarted = false;
    lastFrameTime = 0;
}

window.initParticleHeart = initializeParticleHeart;
window.startParticleHeart = () => {
    if (webglFailed) {
        fallbackStart?.();
    } else if (!renderer) {
        initializeParticleHeart();
    } else {
        startAnimation(activeScene, activeCamera);
    }
};
window.stopParticleHeart = () => {
    stopParticleHeart();
    fallbackStop?.();
};
