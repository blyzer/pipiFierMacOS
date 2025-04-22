// --- Constants & Utilities ---

const ICON_WHITE = browser.runtime.getURL('PiP_Toolbar_Icon_white_new.svg');
let previousResult = null;
let videoFound = false;
let iframeSearchDepth = 0;

// Logging toggle
const DEBUG = false;
const log = (...args) => { if (DEBUG) console.log('[PiPifier]', ...args); };

// --- Iframe Video Search ---

const checkIframeAccess = (iframe) => {
    try {
        const testKey = `__pip_test_${Math.random()}`;
        iframe.contentWindow[testKey] = true;
        return iframe.contentWindow[testKey] === true;
    } catch {
        return false;
    }
};

const findVideoInIframes = (iframes, depth = 0, maxDepth = 3) => {
    for (const iframe of iframes) {
        if (!checkIframeAccess(iframe)) continue;

        const iframeDoc = iframe.contentDocument;
        const video = iframeDoc?.querySelector('video');
        if (video) return video;

        if (depth < maxDepth) {
            const nested = iframeDoc?.querySelectorAll('iframe');
            const found = findVideoInIframes(nested, depth + 1, maxDepth);
            if (found) return found;
        }
    }
    return null;
};

// --- Video Logic ---

const getVideoElement = () => {
    if (location.hostname.includes("hulu.com")) {
        return document.getElementById('content-video-player');
    }

    const inlineVideo = document.querySelector('video');
    if (inlineVideo) return inlineVideo;

    const iframes = document.querySelectorAll('iframe');
    return findVideoInIframes(iframes);
};

const togglePictureInPicture = async () => {
    try {
        const video = getVideoElement();
        if (!video) return;

        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else {
            await video.requestPictureInPicture();
        }
    } catch (error) {
        console.error('PiP toggle error:', error);
    }
};

// --- Messaging ---

browser.runtime.onMessage.addListener((msg) => {
    if (msg.action === "togglePiP") {
        togglePictureInPicture();
    } else if (msg.action === "addCustomPiPButtonToPlayer" && typeof window[msg.callback] === "function") {
        window[msg.callback]();
    }
});

// --- DOM Monitoring ---

const onFocus = () => {
    previousResult = null;
    checkForVideo();
};

const checkForVideo = () => {
    const video = getVideoElement();
    const found = !!video;

    if (found) {
        injectAllCustomButtons();
    }

    if (previousResult !== found) {
        browser.runtime.sendMessage({ action: "videoCheck", found });
        previousResult = found;
    }
};

window.addEventListener('focus', onFocus);
new MutationObserver(checkForVideo).observe(document, { subtree: true, childList: true });

// --- UI Injection System ---

const players = [
    {
        name: "YouTube",
        match: () => location.hostname.includes("youtube.com"),
        buttonSelector: ".ytp-right-controls",
        shouldInject: () => !document.querySelector('.PiPifierButton') && document.querySelector('.ytp-right-controls'),
        inject: () => injectPiPButton(".ytp-right-controls", "ytp-button", 22, 36),
    },
    {
        name: "VideoJS",
        match: () => !!document.querySelector(".vjs-control-bar"),
        buttonSelector: ".vjs-fullscreen-control",
        shouldInject: () => !document.querySelector('.PiPifierButton') && document.querySelector(".vjs-fullscreen-control"),
        inject: () => injectPiPButtonBefore(".vjs-fullscreen-control", "vjs-control vjs-button", 16, 30),
    },
    {
        name: "Wistia",
        match: () => !!document.querySelector(".wistia_playbar"),
        buttonSelector: ".w-control-bar__region--airplay",
        shouldInject: () => !document.querySelector('.PiPifierButton'),
        inject: () => injectPiPButton(".w-control-bar__region--airplay", "w-control w-control--fullscreen w-is-visible", 28, 18),
    },
    {
        name: "Netflix",
        match: () => location.hostname.includes("netflix.com"),
        buttonSelector: ".player-status",
        shouldInject: () => !document.querySelector('.PiPifierButton'),
        inject: () => {
            const container = document.querySelector(".player-status");
            if (!container) return;
            injectPiPButton(".player-status", "PiPifierButton", 28, 28, { marginRight: "2px", width: "70px" });
        },
    },
    {
        name: "Twitch",
        match: () => location.hostname.includes("twitch.tv"),
        buttonSelector: ".player-buttons-right",
        shouldInject: () => !document.querySelector('.PiPifierButton'),
        inject: () => injectPiPButton(".player-buttons-right", "player-button", 18, 14),
    },
    {
        name: "Disney+",
        match: () => location.hostname.includes("disneyplus.com"),
        buttonSelector: ".controls__right",
        shouldInject: () => !document.querySelector('.PiPifierButton') && document.querySelector(".controls__right"),
        inject: () => {
            const wrapper = document.querySelector(".controls__right");
            const video = document.querySelector("video");
            if (!wrapper || !video) return;

            video.removeAttribute("disablepictureinpicture");
            injectPiPButton(".controls__right", "control-icon-btn", 24, 24, {}, "pip-toggle");
        },
    }
];

const injectAllCustomButtons = () => {
    players.forEach(player => {
        if (player.match() && player.shouldInject()) {
            log(`Injecting PiP button for ${player.name}`);
            player.inject();
        }
    });
};

const injectPiPButton = (selector, className, width, height, styles = {}, id = null) => {
    const container = document.querySelector(selector);
    if (!container) return;

    const button = document.createElement("button");
    button.className = `PiPifierButton ${className}`;
    if (id) button.id = id;
    button.title = "PiP (by PiPifier)";
    button.onclick = togglePictureInPicture;

    Object.assign(button.style, {
        backgroundColor: "transparent",
        border: "none",
        maxHeight: "inherit",
        ...styles
    });

    const img = document.createElement("img");
    img.src = ICON_WHITE;
    img.width = width;
    img.height = height;
    img.style.verticalAlign = "middle";

    button.appendChild(img);
    container.appendChild(button);
};

const injectPiPButtonBefore = (selector, className, width, height) => {
    const ref = document.querySelector(selector);
    if (!ref || !ref.parentNode) return;

    const button = document.createElement("button");
    button.className = `PiPifierButton ${className}`;
    button.title = "PiP (by PiPifier)";
    button.onclick = togglePictureInPicture;

    const img = document.createElement("img");
    img.src = ICON_WHITE;
    img.width = width;
    img.height = height;
    button.appendChild(img);

    ref.parentNode.insertBefore(button, ref);
};
