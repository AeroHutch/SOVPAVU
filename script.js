document.addEventListener("DOMContentLoaded", () => {
    // --- 1. SETUP DOM TARGET INTERFACE LOCATORS ---
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('id');

    const languageSelector = document.getElementById('language-selector');
    const videoFrame = document.getElementById('video-frame');

    const uploadBtn = document.getElementById('upload-btn');
    const uploadModal = document.getElementById('upload-modal');
    const closeModal = document.getElementById('close-modal');
    const uploadForm = document.getElementById('upload-form');
    const statusDiv = document.getElementById('status');
    const submitBtn = document.getElementById('submit-btn');

    const userLang = navigator.language.split('-')[0] || 'en'; 

    const langNamesTranslator = new Intl.DisplayNames([userLang], { type: 'language' });
    const regionNamesTranslator = new Intl.DisplayNames([userLang], { type: 'region' });

    // --- 2. AUTOMATED VIDEO PLAYER RENDER ---
    if (videoId) {
        const titleJsonPath = `./videos/${videoId}/translations/title.json`;
        const videoJsonPath = `./videos/${videoId}/translations/video.json`;

        let titlesData = {};
        let videosData = {};

        Promise.all([
            fetch(titleJsonPath).then(res => res.json()).catch(() => ({})),
            fetch(videoJsonPath).then(res => res.json()).catch(() => ({}))
        ]).then(([titles, videos]) => {
            titlesData = titles;
            videosData = videos;

            const availableLangs = Object.keys(videosData);

            if (availableLangs.length === 0) {
                languageSelector.innerHTML = '<option>No configurations found</option>';
                document.title = `Video: ${videoId}`;
                return;
            }

            // Method 2 Auto Detection: Isolates original video by matching key-name differences
            const originalLangCode = availableLangs.find(lang => {
                const filename = videosData[lang].toLowerCase();
                const cleanLang = lang.toLowerCase().replace('-', '');
                return !filename.includes(cleanLang);
            }) || availableLangs[0];

            languageSelector.innerHTML = '';
            availableLangs.forEach(lang => {
                const option = document.createElement('option');
                option.value = lang;

                let formattedDropdownText = '';

                try {
                    let langCode = lang;
                    let regionCode = '';

                    // SPLIT STRATEGY: Manually splits components to bypass default browser overrides (e.g. en-NL)
                    if (lang.includes('-')) {
                        const parts = lang.split('-');
                        langCode = parts[0].toLowerCase();
                        regionCode = parts[1].toUpperCase();
                    } else {
                        const maximizedLocale = new Intl.Locale(lang).maximize();
                        if (maximizedLocale.region) {
                            regionCode = maximizedLocale.region.toUpperCase();
                        }
                    }

                    const baseLanguage = langNamesTranslator.of(langCode);
                    const countryName = regionCode ? regionNamesTranslator.of(regionCode) : '';
                    formattedDropdownText = countryName ? `${baseLanguage} (${countryName})` : baseLanguage;
                } catch (e) {
                    formattedDropdownText = lang.toUpperCase();
                }

                if (lang === originalLangCode) {
                    formattedDropdownText += ' (Original)';
                }

                option.textContent = formattedDropdownText;
                languageSelector.appendChild(option);
            });

            if (availableLangs.includes(userLang)) {
                languageSelector.value = userLang;
            } else if (availableLangs.includes(originalLangCode)) {
                languageSelector.value = originalLangCode;
            } else {
                languageSelector.value = availableLangs[0];
            }

            updatePlayer(languageSelector.value);
        });

        languageSelector.addEventListener('change', (e) => {
            updatePlayer(e.target.value);
        });

        function updatePlayer(lang) {
            const currentTitle = titlesData[lang] || `Video: ${videoId}`;
            const currentVideoFile = videosData[lang] || 'default.mp4';
            const fullVideoPath = `./videos/${videoId}/${currentVideoFile}`;

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
    } else {
        languageSelector.innerHTML = '<option>No active parameters located. Launch upload suite to test.</option>';
    }

    // --- 3. DYNAMIC INTERACTIVE MODAL COMPONENT ---
    uploadBtn.addEventListener('click', () => { statusDiv.style.display = "none"; uploadModal.style.display = 'block'; });
    closeModal.addEventListener('click', () => uploadModal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === uploadModal) uploadModal.style.display = 'none'; });

    // --- 4. GITHUB REPOSITORY DIRECT WRITER ---
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Automatically map paths straight out of your live domain structure 
        const hostnameParts = window.location.hostname.split('.');
        const owner = hostnameParts[0]; 
        const pathParts = window.location.pathname.split('/');
        const repo = pathParts[1] || '';

        const token = document.getElementById('github-token').value.trim();
        const primaryFile = document.getElementById('primary-video-file').files[0];
        const primaryLang = document.getElementById('primary-lang-tag').value.trim();
        const primaryTitle = document.getElementById('primary-video-title').value.trim();

        if (!owner || !repo || repo === 'index.html') {
            showStatus("Error: Unable to verify repository tracking coordinates from context URL parameters.", "red");
            return;
        }

        submitBtn.disabled = true;
        showStatus("Analyzing and structuring payload data streams...", "orange");

        // Algorithm Execution: Generates random 8-character long numeric array sequence encoded into Base64
        let randomNumericString = '';
        for (let i = 0; i < 8; i++) {
            randomNumericString += Math.floor(Math.random() * 10).toString();
        }
        const customBase64Id = btoa(randomNumericString);

        let videoJson = {};
        let titleJson = {};

        videoJson[primaryLang] = primaryFile.name;
        titleJson[primaryLang] = primaryTitle;

        // Communication channel helper transforming content and putting files directly onto GitHub branch trees
        async function commitToGitHub(path, jsonContent) {
            const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
            const base64Payload = btoa(unescape(encodeURIComponent(JSON.stringify(jsonContent, null, 2))));
            
            const response = await fetch(url, {
                method: "PUT",
                headers: {
                    "Authorization": `token ${token}`,
                    "Accept": "application/vnd.github.v3+json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: `Automated config arrays compilation for tracking entry sequence id: ${customBase64Id}`,
                    content: base64Payload
                })
            });
            return response;
        }

        try {
            showStatus("Pushing workspace changes directly into your public repository tree...", "orange");

            const [res1, res2] = await Promise.all([
                commitToGitHub(`videos/${customBase64Id}/translations/video.json`, videoJson),
                commitToGitHub(`videos/${customBase64Id}/translations/title.json`, titleJson)
            ]);

            if (res1.ok && res2.ok) {
                const finalShareUrl = `${window.location.origin}/${repo}/index.html?id=${customBase64Id}`;
                showStatus(`SUCCESS! Metadata committed to repository branch paths.<br><br><strong>Shareable URL Link:</strong><br><a href="${finalShareUrl}" target="_blank">${finalShareUrl}</a><br><br><em>Action Required: Open your repo and place the actual raw mp4 video files directly inside the new path: videos/${customBase64Id}/</em>`, "green");
                uploadForm.reset();
            } else {
                const errData = await res1.json().catch(() => ({}));
                showStatus(`GitHub API communication error: ${errData.message || 'Verify token configurations.'}`, "red");
                submitBtn.disabled = false;
            }
        } catch (err) {
            showStatus(`Network transmission failure: ${err.message}`, "red");
            submitBtn.disabled = false;
        }
    });

    function showStatus(msg, color) {
        statusDiv.style.display = "block";
        statusDiv.innerHTML = msg;
    }
});
