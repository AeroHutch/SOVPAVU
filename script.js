document.addEventListener("DOMContentLoaded", () => {
    // 1. Get the Video ID from the top URL parameter (e.g., index.html?id=myVideo123)
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('id');

    const languageSelector = document.getElementById('language-selector');
    const videoFrame = document.getElementById('video-frame');

    if (!videoId) {
        languageSelector.innerHTML = '<option>Error: No ?id= specified in URL</option>';
        document.title = "Error - No Video ID";
        return;
    }

    // Paths to your JSON translation files inside the /videos folder
    const titleJsonPath = `./videos/${videoId}/translations/title.json`;
    const videoJsonPath = `./videos/${videoId}/translations/video.json`;

    let titlesData = {};
    let videosData = {};

    // 2. Fetch the JSON data to know which languages are available
    Promise.all([
        fetch(titleJsonPath).then(res => res.json()).catch(() => ({})),
        fetch(videoJsonPath).then(res => res.json()).catch(() => ({}))
    ]).then(([titles, videos]) => {
        titlesData = titles;
        videosData = videos;

        // Find all unique language keys available (e.g., "en", "es", "fr")
        const availableLangs = Object.keys({ ...titlesData, ...videosData });

        if (availableLangs.length === 0) {
            languageSelector.innerHTML = '<option>No translations found</option>';
            document.title = `Video: ${videoId}`;
            return;
        }

        // Populate your HTML language dropdown menu
        languageSelector.innerHTML = '';
        availableLangs.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = lang.toUpperCase();
            languageSelector.appendChild(option);
        });

        // Detect user's default browser language, fallback to the first available if not found
        const defaultLang = navigator.language.split('-')[0];
        if (availableLangs.includes(defaultLang)) {
            languageSelector.value = defaultLang;
        } else {
            languageSelector.value = availableLangs[0];
        }

        // Load the initial video and title
        updatePlayer(languageSelector.value);
    });

    // 3. Listen for dropdown changes to swap the video, inner title, and top bar title
    languageSelector.addEventListener('change', (e) => {
        updatePlayer(e.target.value);
    });

    // 4. Function that updates everything based on the selected language
    function updatePlayer(lang) {
        const currentTitle = titlesData[lang] || `Video: ${videoId}`;
        const currentVideoFile = videosData[lang] || 'default.mp4';
        
        // This is the absolute path to the video file from the project root
        const fullVideoPath = `./videos/${videoId}/${currentVideoFile}`;

        // UPDATE TOP BAR: Changes the actual browser tab title
        document.title = currentTitle;

        // Generate the player HTML document to feed into the iframe srcdoc
        const iframeHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { margin: 0; background: #000; color: #fff; font-family: sans-serif; overflow: hidden; height: 100vh; position: relative; }
                    video { width: 100%; height: 100%; object-fit: contain; }
                    .video-title { position: absolute; top: 12px; left: 12px; pointer-events: none; background: rgba(0,0,0,0.7); padding: 6px 12px; border-radius: 4px; font-size: 14px; z-index: 10; }
                </style>
            </head>
            <body>
                <div class="video-title">${currentTitle}</div>
                <video id="player" controls autoplay>
                    <source src="${fullVideoPath}" type="video/mp4">
                </video>
            </body>
            </html>
        `;

        // Inject the player document into your iframe
        videoFrame.srcdoc = iframeHTML;
    }
});