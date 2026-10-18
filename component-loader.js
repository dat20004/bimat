"use strict";

const loaderUrl = document.currentScript.src;
const heartMount = document.getElementById("photoHeartMount");

function loadClassicScript(fileName) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = new URL(fileName, loaderUrl).href;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Không tải được ${fileName}.`));
        document.body.appendChild(script);
    });
}

function loadMainScript() {
    loadClassicScript("script.js").catch(error => {
        console.error("Không thể nạp ứng dụng Love Letter:", error);
    });
}

async function loadHeartComponent() {
    if (!heartMount) {
        console.error("Không tìm thấy #photoHeartMount trong index.html.");
        loadMainScript();
        return;
    }

    try {
        const response = await fetch(new URL("heart.html", loaderUrl));
        if (!response.ok) {
            throw new Error(`Không tải được heart.html (${response.status}).`);
        }

        heartMount.innerHTML = await response.text();
    } catch (error) {
        console.error("Không thể nạp giao diện trái tim:", error);
    }

    try {
        await loadClassicScript("heart-fallback.js");
    } catch (error) {
        console.error("Không thể nạp hiệu ứng dự phòng:", error);
    }

    const heartRendererReady = import(new URL("heart-3d.js", loaderUrl).href).catch(error => {
        console.warn("Three.js không khả dụng; dùng trái tim dự phòng 2D.", error);
    });

    loadMainScript();

    if (document.body.classList.contains("heart-preview-mode")) {
        heartRendererReady.finally(() => {
            const heart = document.getElementById("photoHeart");
            if (!heart) return;

        heart.dataset.particleCount = "6500";
            heart.dataset.rotationSeconds = "18";
            window.initParticleHeart?.();
        });
    }
}

loadHeartComponent();
