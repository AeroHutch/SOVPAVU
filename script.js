document.addEventListener("DOMContentLoaded", () => {
    // 1. Grab Video ID from URL parameter (?id=...)
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('id');

    const languageSelector = document.getElementById('language-selector');
    const videoFrame = document.getElementById('video-frame');

    if (!videoId) {
        languageSelector.innerHTML = '<option>Error: No ?id= specified in URL</option>';
        document.title = "Error - No Video ID";
        return;
    }

    // Determine user's local browser language context
    const userLang = navigator.language.split('-')[0] || 'en'; 

    // Built-in browser tool to change 'de' -> 'Deutsch' or 'German' automatically based on userLang
    const langNamesTranslator = new Intl.DisplayNames([userLang], { type: 'language' });

    // Paths inside your hosted GitHub repository tree
    const titleJsonPath = `./videos/${videoId}/translations/title.json`;
    const videoJsonPath = `./videos/${videoId}/translations/video.json`;

    let titlesData = {};
    let videosData = {};

    // 2. Fetch the JSON translation configurations over HTTP/HTTPS safely
    Promise.all([
        fetch(titleJsonPath).then(res => res.json()).catch(() => ({})),
        fetch(videoJsonPath).then(res => res.json()).catch(() => ({}))
    ]).then(([titles, videos]) => {
        titlesData = titles;
        videosData = videos;

        const availableLangs = Object.keys({ ...titlesData, ...videosData });

        if (availableLangs.length === 0) {
            languageSelector.innerHTML = '<option>No translations found</option>';
            document.title = `Video: ${videoId}`;
            return;
        }

        // 3. Construct dropdown with full names
        languageSelector.innerHTML = '';
        availableLangs.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang;

            try {
                option.textContent = langNamesTranslator.of(lang);
            } catch (e) {
                option.textContent = lang.toUpperCase(); // Fallback if conversion hits an edge case
            }

            languageSelector.appendChild(option);
        });

        // Default to user's browser language if it matches an option, else default to the first array index
        if (availableLangs.includes(userLang)) {
            languageSelector.value = userLang;
        } else {
            languageSelector.value = availableLangs[0];
        }

        updatePlayer(languageSelector.value);
    });

    // 4. Listen for user language alterations
    languageSelector.addEventListener('change', (e) => {
        updatePlayer(e.target.value);
    });

    // 5. Build dynamic player and inject into iframe srcdoc
    function updatePlayer(lang) {
        const currentTitle = titlesData[lang] || `Video: ${videoId}`;
        const currentVideoFile = videosData[lang] || 'default.mp4';
        const fullVideoPath = `./videos/${videoId}/${currentVideoFile}`;

        // Sync main window browser tab string
        document.title = currentTitle;

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

        videoFrame.srcdoc = iframeHTML;
    }
});
