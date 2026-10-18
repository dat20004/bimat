
"use strict";

const GRID_SIZE = 4;
const TOTAL_PIECES = GRID_SIZE * GRID_SIZE;
const TOTAL_LEVELS = 5;
const PUZZLE_IMAGE_POOL_SIZE = 18;
const MUSIC_VOLUME = 0.7;

const PUZZLE_IMAGES = Array.from(
    { length: PUZZLE_IMAGE_POOL_SIZE },
    (_, index) => `images/hinh${index + 1}.jpg`
);

const HEART_PARTICLE_COUNT = 6500;
const HEART_ROTATION_DURATION = 18;

const BASE_SCRAMBLE_MOVES = 24;
const SCRAMBLE_MOVES_PER_LEVEL = 12;

const SVG_NS = "http://www.w3.org/2000/svg";


// Màn hình chào
const welcomeScreen =
    document.getElementById("welcomeScreen");

const startExperienceButton =
    document.getElementById("startExperience");

// Khu vực trò chơi
const puzzleSection =
    document.getElementById("puzzleSection");

const sectionHeading =
    puzzleSection?.querySelector(".section-heading");

const puzzleLayout =
    document.getElementById("puzzleLayout");

const puzzleBoard =
    document.getElementById("puzzleBoard");

// Thông tin cấp độ
const levelText =
    document.getElementById("levelText");

const levelCounter =
    document.getElementById("levelCounter");

const levelDescription =
    document.getElementById("levelDescription");

const puzzleStatus =
    document.getElementById("puzzleStatus");

// Nút trò chơi
const shuffleButton =
    document.getElementById("shufflePuzzle");

const playAgainButton =
    document.getElementById("playAgain");

// Màn hoàn thành ảnh
const successMessage =
    document.getElementById("successMessage");

const successTitle =
    document.getElementById("successTitle");

const successText =
    document.getElementById("successText");

const finalPhoto =
    document.getElementById("finalPhoto");

// Màn chúc mừng 20/10
const octoberCelebration =
    document.getElementById("octoberCelebration");

const octoberTitle =
    document.getElementById("octoberTitle");

const restartCelebrationButton =
    document.getElementById("restartCelebration");

// Trái tim
const photoHeart =
    document.getElementById("photoHeart");

// Nhạc
const backgroundMusic =
    document.getElementById("backgroundMusic");

const toggleMusic =
    document.getElementById("toggleMusic");

const musicIcon =
    document.getElementById("musicIcon");

const musicStatus =
    document.getElementById("musicStatus");

/* =========================================================
   3. TRẠNG THÁI
========================================================= */

let randomizedImages = [];
let currentImageIndex = 0;

let puzzlePieces = [];
let selectedPosition = null;
let draggedPosition = null;

let gameCompleted = false;
let experienceStarted = false;
let celebrationShown = false;
let isTransitioning = false;

let imageLoadToken = 0;
let musicError = false;
let heartAnimationReady = false;

/* =========================================================
   4. TIỆN ÍCH
========================================================= */

function shuffleArray(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [result[i], result[j]] = [
            result[j],
            result[i]
        ];
    }

    return result;
}

function createNewImageOrder(previousOrder = []) {
    let result = shuffleArray(PUZZLE_IMAGES).slice(0, TOTAL_LEVELS);

    const sameOrder =
        result.length === previousOrder.length &&
        result.every(
            (image, index) => image === previousOrder[index]
        );

    if (sameOrder && result.length > 1) {
        result = [
            ...result.slice(1),
            result[0]
        ];
    }

    return result;
}

function getCurrentImage() {
    return randomizedImages[currentImageIndex] || "";
}

function getTotalImages() {
    return randomizedImages.length;
}

function formatNumber(number) {
    return String(number).padStart(2, "0");
}

function setHidden(element, hidden) {
    if (element) {
        element.hidden = hidden;
    }
}

function scrollToElement(element) {
    if (!element) return;

    element.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function setPuzzleStatus(message, type = "") {
    if (!puzzleStatus) return;

    puzzleStatus.textContent = message;

    puzzleStatus.classList.remove(
        "success",
        "error"
    );

    if (type) {
        puzzleStatus.classList.add(type);
    }
}

function getScrambleMoves() {
    return (
        BASE_SCRAMBLE_MOVES +
        currentImageIndex * SCRAMBLE_MOVES_PER_LEVEL
    );
}

/* =========================================================
   5. KIỂM TRA HTML
========================================================= */

function hasRequiredElements() {
    const requiredElements = [
        puzzleSection,
        puzzleLayout,
        puzzleBoard,
        successMessage,
        shuffleButton,
        playAgainButton
    ];

    const missing = requiredElements.filter(
        element => !element
    );

    if (missing.length > 0) {
        console.error(
            "Thiếu phần tử HTML cần thiết. Kiểm tra các ID:",
            missing
        );

        return false;
    }

    if (PUZZLE_IMAGES.length < TOTAL_LEVELS) {
        console.error(
            "Không đủ ảnh trong thư viện để tạo các lượt chơi."
        );

        return false;
    }

    return true;
}

/* =========================================================
   6. CẬP NHẬT CẤP ĐỘ
========================================================= */

function updateLevelUI() {
    const level = currentImageIndex + 1;
    const total = getTotalImages();

    if (levelText) {
        levelText.textContent =
            `${formatNumber(level)} / OUR MEMORY`;
    }

    if (levelCounter) {
        levelCounter.textContent =
            `${formatNumber(level)} / ${formatNumber(total)}`;
    }

    if (levelDescription) {
        levelDescription.textContent =
            `Kỷ niệm ${level}/${total} · ${TOTAL_PIECES} mảnh ghép. ` +
            "Hãy ghép lại bức ảnh để khám phá kỷ niệm tiếp theo nhé!";
    }

    puzzleBoard.style.setProperty(
        "--grid-size",
        String(GRID_SIZE)
    );

    puzzleBoard.dataset.level = String(level);
    puzzleBoard.dataset.scrambleMoves =
        String(getScrambleMoves());
}

/* =========================================================
   7. TẢI ẢNH VÀ GIỮ TỶ LỆ GỐC
========================================================= */

function loadCurrentImage() {
    const imagePath = getCurrentImage();

    if (!imagePath || !puzzleBoard) return;

    const token = ++imageLoadToken;
    const image = new Image();

    setPuzzleStatus("Đang tải ảnh kỷ niệm...");

    image.onload = function () {
        if (token !== imageLoadToken) return;

        if (!image.naturalWidth || !image.naturalHeight) {
            handleImageLoadError(imagePath, token);
            return;
        }

        puzzleBoard.style.setProperty(
            "--puzzle-ratio",
            `${image.naturalWidth} / ${image.naturalHeight}`
        );

        setPuzzleStatus(
            "Mỗi mảnh ghép là một phần kỷ niệm. ♡"
        );
    };

    image.onerror = function () {
        handleImageLoadError(imagePath, token);
    };

    image.src = imagePath;
}

function handleImageLoadError(imagePath, token) {
    if (token !== imageLoadToken) return;

    console.error("Không thể tải ảnh:", imagePath);

    setPuzzleStatus(
        `Không tải được ảnh "${imagePath}". ` +
        "Hãy kiểm tra tên file và thư mục images.",
        "error"
    );
}

/* =========================================================
   8. TẠO VÀ XÁO TRỘN MẢNH GHÉP
========================================================= */

function createPieces() {
    puzzlePieces = Array.from(
        { length: TOTAL_PIECES },
        (_, index) => index
    );
}

function isPuzzleSolved() {
    return puzzlePieces.every(
        (piece, position) => piece === position
    );
}

function countCorrectPieces() {
    return puzzlePieces.reduce(
        (count, piece, position) =>
            count + (piece === position ? 1 : 0),
        0
    );
}

function shufflePieces() {
    if (puzzlePieces.length !== TOTAL_PIECES) return;

    const moves = getScrambleMoves();

    for (let i = 0; i < moves; i++) {
        const first = Math.floor(
            Math.random() * TOTAL_PIECES
        );

        let second = Math.floor(
            Math.random() * TOTAL_PIECES
        );

        while (second === first) {
            second = Math.floor(
                Math.random() * TOTAL_PIECES
            );
        }

        [
            puzzlePieces[first],
            puzzlePieces[second]
        ] = [
            puzzlePieces[second],
            puzzlePieces[first]
        ];
    }

    // Đảm bảo trò chơi không bắt đầu với ảnh hoàn chỉnh.
    if (isPuzzleSolved()) {
        [
            puzzlePieces[0],
            puzzlePieces[1]
        ] = [
            puzzlePieces[1],
            puzzlePieces[0]
        ];
    }

    // Bắt đầu mỗi lượt với 0 mảnh đúng vị trí để thanh tiến độ là 0.
    const correctPositions = [];
    for (let position = 0; position < TOTAL_PIECES; position++) {
        if (puzzlePieces[position] === position) {
            correctPositions.push(position);
        }
    }

    // Đổi chỗ các mảnh đang đúng theo cặp để không tạo vị trí đúng mới.
    for (let i = 0; i + 1 < correctPositions.length; i += 2) {
        const first = correctPositions[i];
        const second = correctPositions[i + 1];
        [puzzlePieces[first], puzzlePieces[second]] =
            [puzzlePieces[second], puzzlePieces[first]];
    }

    // Nếu còn một vị trí đúng lẻ, đổi với một mảnh đang sai vị trí.
    if (correctPositions.length % 2 === 1) {
        const lastCorrect = correctPositions[correctPositions.length - 1];
        const otherPosition = puzzlePieces.findIndex(
            (piece, position) => position !== lastCorrect && piece !== position
        );
        [puzzlePieces[lastCorrect], puzzlePieces[otherPosition]] =
            [puzzlePieces[otherPosition], puzzlePieces[lastCorrect]];
    }
}

/* =========================================================
   9. VỊ TRÍ ẢNH TRÊN BÀN GHÉP
========================================================= */

function getBackgroundPosition(piece) {
    const row = Math.floor(piece / GRID_SIZE);
    const col = piece % GRID_SIZE;

    const x = (col / (GRID_SIZE - 1)) * 100;
    const y = (row / (GRID_SIZE - 1)) * 100;

    return `${x}% ${y}%`;
}

/* =========================================================
   10. TẠO MỘT MẢNH GHÉP
========================================================= */

function createTile(piece, position) {
    const tile = document.createElement("button");

    tile.type = "button";
    tile.className = "puzzle-tile";
    tile.draggable = !gameCompleted;

    tile.dataset.position = String(position);
    tile.dataset.piece = String(piece);

    tile.style.backgroundImage =
        `url("${getCurrentImage()}")`;

    tile.style.backgroundRepeat = "no-repeat";
    tile.style.backgroundSize =
        `${GRID_SIZE * 100}% ${GRID_SIZE * 100}%`;

    tile.style.backgroundPosition =
        getBackgroundPosition(piece);

    Object.assign(tile.style, {
        margin: "0",
        padding: "0",
        border: "0",
        borderRadius: "0",
        minWidth: "0",
        minHeight: "0",
        width: "100%",
        height: "100%"
    });

    tile.setAttribute(
        "aria-label",
        `Mảnh ${piece + 1}, vị trí ${position + 1}`
    );

    tile.setAttribute(
        "aria-pressed",
        String(selectedPosition === position)
    );

    if (piece === position) {
        tile.classList.add("correct");
    }

    if (selectedPosition === position) {
        tile.classList.add("selected");
    }

    tile.addEventListener("click", function () {
        handleTileClick(position);
    });

    // Kéo mảnh ghép
    tile.addEventListener("dragstart", function (event) {
        if (gameCompleted || isTransitioning) {
            event.preventDefault();
            return;
        }

        draggedPosition = position;
        tile.classList.add("dragging");

        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData(
                "text/plain",
                String(position)
            );
        }
    });

    tile.addEventListener("dragover", function (event) {
        if (gameCompleted || isTransitioning) return;

        event.preventDefault();

        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }

        tile.classList.add("drag-over");
    });

    tile.addEventListener("dragleave", function () {
        tile.classList.remove("drag-over");
    });

    tile.addEventListener("drop", function (event) {
        event.preventDefault();
        tile.classList.remove("drag-over");

        if (gameCompleted || isTransitioning) return;

        let fromPosition = draggedPosition;

        if (event.dataTransfer) {
            const data =
                event.dataTransfer.getData("text/plain");

            if (data !== "") {
                const parsedPosition = Number(data);

                if (Number.isInteger(parsedPosition)) {
                    fromPosition = parsedPosition;
                }
            }
        }

        if (
            Number.isInteger(fromPosition) &&
            fromPosition >= 0 &&
            fromPosition < TOTAL_PIECES &&
            fromPosition !== position
        ) {
            swapPieces(fromPosition, position);
        }

        draggedPosition = null;
    });

    tile.addEventListener("dragend", function () {
        draggedPosition = null;

        puzzleBoard
            .querySelectorAll(".puzzle-tile")
            .forEach(function (item) {
                item.classList.remove(
                    "dragging",
                    "drag-over"
                );
            });
    });

    return tile;
}

/* =========================================================
   11. HIỂN THỊ BÀN GHÉP
========================================================= */

function renderPuzzle() {
    if (!puzzleBoard) return;

    puzzleBoard.style.setProperty(
        "--grid-size",
        String(GRID_SIZE)
    );

    puzzleBoard.style.gridTemplateColumns =
        `repeat(${GRID_SIZE}, minmax(0, 1fr))`;

    puzzleBoard.style.gridTemplateRows =
        `repeat(${GRID_SIZE}, minmax(0, 1fr))`;

    puzzleBoard.style.gap = "0";

    const fragment = document.createDocumentFragment();

    puzzlePieces.forEach(function (piece, position) {
        fragment.appendChild(
            createTile(piece, position)
        );
    });

    puzzleBoard.replaceChildren(fragment);

    puzzleBoard.classList.toggle(
        "complete",
        gameCompleted
    );
}

/* =========================================================
   12. CHỌN MẢNH BẰNG CHUỘT
========================================================= */

function handleTileClick(position) {
    if (gameCompleted || isTransitioning) return;

    if (selectedPosition === position) {
        selectedPosition = null;

        renderPuzzle();
        setPuzzleStatus("Đã bỏ chọn mảnh ghép.");

        return;
    }

    if (selectedPosition === null) {
        selectedPosition = position;

        renderPuzzle();

        setPuzzleStatus(
            "Đã chọn một mảnh. Hãy chọn mảnh thứ hai để đổi chỗ nhé!"
        );

        return;
    }

    const firstPosition = selectedPosition;
    selectedPosition = null;

    swapPieces(firstPosition, position);
}

/* =========================================================
   13. ĐỔI CHỖ HAI MẢNH
========================================================= */

function swapPieces(firstPosition, secondPosition) {
    if (gameCompleted || isTransitioning) return;

    const invalidPosition =
        !Number.isInteger(firstPosition) ||
        !Number.isInteger(secondPosition) ||
        firstPosition < 0 ||
        secondPosition < 0 ||
        firstPosition >= TOTAL_PIECES ||
        secondPosition >= TOTAL_PIECES;

    if (invalidPosition || firstPosition === secondPosition) {
        return;
    }

    [
        puzzlePieces[firstPosition],
        puzzlePieces[secondPosition]
    ] = [
        puzzlePieces[secondPosition],
        puzzlePieces[firstPosition]
    ];

    selectedPosition = null;
    draggedPosition = null;

    renderPuzzle();
    checkPuzzle();
}

/* =========================================================
   15. HOÀN THÀNH MỘT ẢNH
========================================================= */

function showThankYouScreen() {
    if (gameCompleted) return;

    gameCompleted = true;
    selectedPosition = null;
    draggedPosition = null;

    const imagePath = getCurrentImage();

    const isFinalLevel =
        currentImageIndex === getTotalImages() - 1;

    if (finalPhoto && imagePath) {
        finalPhoto.src = imagePath;
        finalPhoto.alt =
            `Bức ảnh kỷ niệm ${currentImageIndex + 1}`;
    }

    if (successMessage) {
        successMessage.hidden = false;

        successMessage.classList.toggle(
            "is-final-level",
            isFinalLevel
        );

        successMessage.dataset.final =
            String(isFinalLevel);
    }

    if (successTitle) {
        successTitle.textContent = isFinalLevel
            ? "Bạn đã hoàn thành tất cả kỷ niệm! ❤️"
            : "Bạn đã ghép xong một kỷ niệm! ❤️";
    }

    if (successText) {
        successText.textContent = isFinalLevel
            ? "Cảm ơn bạn đã cùng ghép lại những kỷ niệm đáng yêu. " +
              "Món quà 20/10 đang chờ bạn phía trước! ♡"
            : "Một bức ảnh, một kỷ niệm và một niềm vui nho nhỏ. " +
              "Cùng khám phá bức ảnh tiếp theo nhé! ♡";
    }

    if (playAgainButton) {
        playAgainButton.textContent = isFinalLevel
            ? "Đã hoàn thành ❤️"
            : "Ghép ảnh tiếp theo →";

        playAgainButton.disabled = isFinalLevel;
    }

    setHidden(puzzleLayout, true);
    setHidden(sectionHeading, true);

    if (shuffleButton) {
        shuffleButton.disabled = true;
    }

    renderPuzzle();
    setPuzzleStatus(
        "Tuyệt vời! Bạn đã hoàn thành bức ảnh này. ♡",
        "success"
    );

    if (isFinalLevel) {
        showFinalCelebration();
        return;
    }

    scrollToElement(successMessage);
}

/* =========================================================
   16. KIỂM TRA BÀN GHÉP
========================================================= */

function checkPuzzle() {
    if (gameCompleted) return;

    if (!isPuzzleSolved()) {
        const correct = countCorrectPieces();

        setPuzzleStatus(
            `Bạn đã ghép đúng ${correct}/${TOTAL_PIECES} mảnh. ` +
            "Tiếp tục cố gắng nhé! ♡"
        );

        return;
    }

    showThankYouScreen();
}

/* =========================================================
   17. BẮT ĐẦU MÀN CHƠI
========================================================= */

function startNewGame() {
    if (!getCurrentImage()) {
        setPuzzleStatus(
            "Không tìm thấy ảnh để bắt đầu trò chơi.",
            "error"
        );

        return;
    }

    imageLoadToken++;

    gameCompleted = false;
    selectedPosition = null;
    draggedPosition = null;
    isTransitioning = false;

    setHidden(successMessage, true);
    setHidden(puzzleLayout, false);
    setHidden(sectionHeading, false);
    setHidden(octoberCelebration, true);

    if (shuffleButton) {
        shuffleButton.disabled = false;
    }

    if (playAgainButton) {
        playAgainButton.disabled = false;
    }

    if (puzzleSection) {
        puzzleSection.hidden = false;
    }

    if (successMessage) {
        successMessage.classList.remove("is-final-level");
        successMessage.dataset.final = "false";
    }

    createPieces();
    shufflePieces();

    updateLevelUI();
    renderPuzzle();
    loadCurrentImage();

    setPuzzleStatus(
        "Mỗi mảnh ghép là một phần kỷ niệm. ♡"
    );
}

/* =========================================================
   18. NÚT XÁO TRỘN
========================================================= */

if (shuffleButton) {
    shuffleButton.addEventListener("click", function () {
        if (gameCompleted || isTransitioning) return;

        startNewGame();
    });
}

/* =========================================================
   19. NÚT ẢNH TIẾP THEO
========================================================= */

if (playAgainButton) {
    playAgainButton.addEventListener("click", function () {
        if (!gameCompleted || isTransitioning) return;

        if (currentImageIndex >= getTotalImages() - 1) {
            return;
        }

        currentImageIndex++;

        startNewGame();
        scrollToElement(puzzleSection);
    });
}

function createHeartImageGrid() {
    if (!photoHeart) return;
    photoHeart.dataset.particleCount = String(HEART_PARTICLE_COUNT);
    photoHeart.dataset.rotationSeconds = String(HEART_ROTATION_DURATION);
    heartAnimationReady = true;
    window.initParticleHeart?.();
}

/* =========================================================
   20.1. BẬT / TẮT CHUYỂN ĐỘNG TRÁI TIM
========================================================= */

function startHeartAnimation() {
    if (!heartAnimationReady) {
        createHeartImageGrid();
    }
    window.startParticleHeart?.();
}

function stopHeartAnimation() {
    window.stopParticleHeart?.();
}

/* =========================================================
   21. MÀN CHÚC MỪNG 20/10
========================================================= */

function showFinalCelebration() {
    if (celebrationShown) return;

    celebrationShown = true;
    gameCompleted = true;

    setHidden(successMessage, true);
    setHidden(puzzleSection, true);

    if (octoberCelebration) {
        octoberCelebration.hidden = false;
    }

    if (octoberTitle) {
        octoberTitle.textContent =
            "Chúc mừng ngày Phụ nữ Việt Nam 20/10! ❤️";
    }

    createHeartImageGrid();
    startHeartAnimation();

    setPuzzleStatus(
        "Bạn đã hoàn thành cả 5 bức ảnh. " +
        "Chúc bạn một ngày 20/10 thật hạnh phúc! ❤️",
        "success"
    );

    scrollToElement(octoberCelebration);

    if (octoberCelebration) {
        octoberCelebration.setAttribute("tabindex", "-1");
    }
}

/* =========================================================
   22. CHƠI LẠI TỪ ĐẦU
========================================================= */

function restartExperience() {
    stopHeartAnimation();

    celebrationShown = false;
    gameCompleted = false;
    isTransitioning = false;

    randomizedImages = createNewImageOrder(randomizedImages);
    currentImageIndex = 0;

    setHidden(octoberCelebration, true);
    setHidden(puzzleSection, false);
    setHidden(successMessage, true);

    startNewGame();

    scrollToElement(puzzleSection);
}

if (restartCelebrationButton) {
    restartCelebrationButton.addEventListener(
        "click",
        restartExperience
    );
}

/* =========================================================
   23. NHẠC MP3
========================================================= */

function updateMusicUI(isPlaying) {
    if (toggleMusic) {
        toggleMusic.classList.toggle(
            "is-playing",
            isPlaying
        );

        toggleMusic.setAttribute(
            "aria-pressed",
            String(isPlaying)
        );

        toggleMusic.setAttribute(
            "aria-label",
            isPlaying ? "Tắt nhạc" : "Bật nhạc"
        );

        toggleMusic.title =
            isPlaying ? "Tắt nhạc" : "Bật nhạc";
    }

    if (musicIcon) {
        musicIcon.textContent = isPlaying ? "♫" : "♪";
    }

    if (musicStatus) {
        if (musicError) {
            musicStatus.textContent =
                "Không tìm thấy file nhạc MP3.";
        } else {
            musicStatus.textContent = isPlaying
                ? "Đang phát nhạc ♡"
                : "Nhấn để phát nhạc ♡";
        }
    }
}

async function startBackgroundMusic() {
    if (!backgroundMusic) {
        return false;
    }

    try {
        backgroundMusic.volume = MUSIC_VOLUME;

        await backgroundMusic.play();

        musicError = false;
        updateMusicUI(true);

        return true;
    } catch (error) {
        console.warn(
            "Không thể phát nhạc nền:",
            error
        );

        updateMusicUI(false);

        return false;
    }
}

function pauseBackgroundMusic() {
    if (!backgroundMusic) return;

    backgroundMusic.pause();
    updateMusicUI(false);
}

if (toggleMusic && backgroundMusic) {
    toggleMusic.addEventListener(
        "click",
        async function () {
            if (backgroundMusic.paused) {
                await startBackgroundMusic();
            } else {
                pauseBackgroundMusic();
            }
        }
    );

    backgroundMusic.addEventListener("play", function () {
        musicError = false;
        updateMusicUI(true);
    });

    backgroundMusic.addEventListener("pause", function () {
        updateMusicUI(false);
    });

    backgroundMusic.addEventListener("error", function () {
        musicError = true;
        updateMusicUI(false);
    });

    updateMusicUI(!backgroundMusic.paused);
}

/* =========================================================
   24. BẮT ĐẦU TRẢI NGHIỆM
========================================================= */

async function handleStartExperience() {
    if (experienceStarted) return;

    experienceStarted = true;

    if (welcomeScreen) {
        welcomeScreen.classList.add("is-hidden");

        welcomeScreen.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    await startBackgroundMusic();

    scrollToElement(puzzleSection);
}

if (startExperienceButton) {
    startExperienceButton.addEventListener(
        "click",
        handleStartExperience
    );
}

/* =========================================================
   25. KHỞI TẠO
========================================================= */

function initializeGame() {
    if (!hasRequiredElements()) return;

    randomizedImages = createNewImageOrder();
    currentImageIndex = 0;

    setHidden(octoberCelebration, true);
    setHidden(successMessage, true);

    // Không tạo trái tim sớm để tránh tải ảnh khi chưa cần.
    heartAnimationReady = false;

    if (!welcomeScreen) {
        experienceStarted = true;
    }

    startNewGame();

    updateMusicUI(
        Boolean(backgroundMusic && !backgroundMusic.paused)
    );

    console.info("Love Letter đã khởi tạo.", {
        totalLevels: getTotalImages(),
        piecesPerLevel: TOTAL_PIECES,
        heartParticles: HEART_PARTICLE_COUNT,
        heartRotationSeconds: HEART_ROTATION_DURATION
    });
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeGame,
        { once: true }
    );
} else {
    initializeGame();
}
