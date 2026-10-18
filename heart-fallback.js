"use strict";

(function () {
    const heart = document.getElementById("photoHeart");
    const canvas = document.getElementById("heartFallbackCanvas");
    const webglCanvas = document.getElementById("heartWebGLCanvas");

    let context = null;
    let animationFrame = 0;
    let lastTime = 0;
    let angle = 0;
    let points = [];
    const photos = Array.from({ length: 18 }, (_, index) => {
        const image = new Image();
        image.src = `images/hinh${index + 1}.jpg`;
        return image;
    });
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let rotationSeconds = 18;

    function insideHeart(x, y) {
        const x2 = x * x;
        const y2 = y * y;
        return Math.pow(x2 + y2 - 1, 3) - x2 * y * y2 <= 0;
    }

    function createPoints() {
        points = [];
        while (points.length < 950) {
            const x = Math.random() * 2.5 - 1.25;
            const y = Math.random() * 2.35 - 1.15;
            if (!insideHeart(x, y)) continue;

            points.push({
                x,
                y,
                z: (Math.random() * 2 - 1) * 0.62,
            size: 1.55 + Math.random() * 1.8,
                shade: Math.random()
            });
        }
    }

    function resize() {
        if (!heart || !canvas) return;
        const rect = heart.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        width = rect.width;
        height = rect.height;
        pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context = canvas.getContext("2d", { alpha: true });
        if (!context) return;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    function render(time) {
        if (!context) return;
        const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
        lastTime = time;
        angle += delta * (Math.PI * 2 / rotationSeconds);

        context.clearRect(0, 0, width, height);
        const pulsePhase = (time % 1120) / 1120;
        const pulse = 1
            + Math.exp(-Math.pow((pulsePhase - 0.1) / 0.045, 2)) * 0.045
            + Math.exp(-Math.pow((pulsePhase - 0.27) / 0.065, 2)) * 0.026;
        const orbitScale = Math.min(width / 6.4, height / 4.5, 78);
        const heartScale = orbitScale * pulse * 0.82;
        const centerX = width / 2;
        const centerY = document.body.classList.contains("heart-preview-mode")
            ? height * 0.64
            : height / 2;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);

        const orbitPhotos = photos.map((image, index) => {
            const sideIndex = index % 2;
            const sideSequence = Math.floor(index / 2);
            const lane = Math.floor(sideSequence / 3);
            const verticalSlot = sideSequence % 3;
            const sideLanes = [-0.88, -0.68, -0.48, 0.48, 0.68, 0.88];
            const floatPhase = time * 0.0008 + index * 0.83;
            const riseCycle = 10;
            const risePhase = ((time / 1000) / riseCycle + verticalSlot / 3) % 1;
            const depth = (index % 3) - 1;
            const photoWidth = orbitScale * 1.395 * 0.55;
            const photoHeight = orbitScale * 1.641 * 0.55;
            const riseDistance = height + photoHeight + 16;

            return {
                image,
                depth,
                x: width * (0.5 + sideLanes[lane + sideIndex * 3] * 0.5)
                    + Math.sin(floatPhase) * width * 0.008,
                y: height + photoHeight / 2 - risePhase * riseDistance
                    + Math.cos(floatPhase * 0.8) * height * 0.012,
                width: photoWidth,
                height: photoHeight
            };
        }).sort((first, second) => first.depth - second.depth);

        function drawPhoto(photo) {
            const { image, x, y, width: photoWidth, height: photoHeight } = photo;
            context.save();
            context.shadowColor = "rgba(255, 20, 55, 0.65)";
            context.shadowBlur = 11;
            context.fillStyle = "#8d1029";
            context.fillRect(x - photoWidth / 2 - 1, y - photoHeight / 2 - 1, photoWidth + 2, photoHeight + 2);
            context.shadowBlur = 0;
            if (image.complete && image.naturalWidth) {
                const targetRatio = photoWidth / photoHeight;
                const imageRatio = image.naturalWidth / image.naturalHeight;
                let sourceX = 0;
                let sourceY = 0;
                let sourceWidth = image.naturalWidth;
                let sourceHeight = image.naturalHeight;
                if (imageRatio > targetRatio) {
                    sourceWidth = image.naturalHeight * targetRatio;
                    sourceX = (image.naturalWidth - sourceWidth) / 2;
                } else {
                    sourceHeight = image.naturalWidth / targetRatio;
                    sourceY = (image.naturalHeight - sourceHeight) / 2;
                }
                context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight,
                    x - photoWidth / 2, y - photoHeight / 2, photoWidth, photoHeight);
            } else {
                context.fillStyle = "#42000d";
                context.fillRect(x - photoWidth / 2, y - photoHeight / 2, photoWidth, photoHeight);
            }
            context.restore();
        }

        orbitPhotos.filter(photo => photo.depth < 0).forEach(drawPhoto);

        points.forEach(point => {
            const rotatedX = point.x * cosine + point.z * sine;
            const rotatedZ = point.z * cosine - point.x * sine;
            const perspective = 1 / (1 + rotatedZ * 0.18);
            const x = centerX + rotatedX * heartScale * perspective;
            const y = centerY - point.y * heartScale * perspective;
            const radius = point.size * perspective;
            const light = 0.45 + Math.max(0, rotatedZ) * 0.45 + point.shade * 0.18;
            const gradient = context.createRadialGradient(
                x - radius * 0.35,
                y - radius * 0.4,
                radius * 0.08,
                x,
                y,
                radius
            );
            gradient.addColorStop(0, `rgba(255, ${Math.round(175 * light)}, ${Math.round(185 * light)}, 1)`);
            gradient.addColorStop(0.35, `rgba(255, ${Math.round(35 * light)}, ${Math.round(55 * light)}, 0.98)`);
            gradient.addColorStop(1, "rgba(75, 0, 10, 0.9)");
            context.fillStyle = gradient;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        });

        orbitPhotos.filter(photo => photo.depth >= 0).forEach(drawPhoto);

        animationFrame = window.requestAnimationFrame(render);
    }

    function startFallback() {
        if (!heart || !canvas || animationFrame) return;
        rotationSeconds = Math.max(
            6,
            Number(heart.dataset.rotationSeconds) || 18
        );
        if (webglCanvas) webglCanvas.hidden = true;
        canvas.hidden = false;
        createPoints();
        resize();

        if ("ResizeObserver" in window) {
            new ResizeObserver(resize).observe(heart);
        } else {
            window.addEventListener("resize", resize);
        }

        animationFrame = window.requestAnimationFrame(render);
    }

    function stopFallback() {
        if (!animationFrame) return;
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        lastTime = 0;
    }

    window.startParticleHeart = startFallback;
    window.stopParticleHeart = stopFallback;
    window.initParticleHeart = startFallback;
})();
