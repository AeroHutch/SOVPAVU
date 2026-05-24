document.addEventListener("DOMContentLoaded", () => {
    // --- 1. CORE VARIABLES & URL DETECTION ---
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('id');

    const languageSelector = document.getElementById('language-selector');
    const videoFrame = document.getElementById('video-frame');

    // UI elements for the uploading interface
    const uploadBtn = document.getElementById('upload-btn');
    const uploadModal = document.getElementById('upload-modal');
    const closeModal = document.getElementById('close-modal');
    const uploadForm = document.getElementById('upload-form');
    const addTranslationBtn = document.getElementById('add-translation-btn');
    const translationsContainer = document.getElementById('translations-container');
    const statusDiv = document.getElementById('status');
    const submitBtn = document.getElementById('submit-btn');

    // Determine the visitor's local system language context
    const userLang = navigator.language.split('-')[0] || 'en'; 

    // Setup browser localization engines
    const langNamesTranslator = new Intl.DisplayNames([userLang], { type: 'language' });
    const regionNamesTranslator = new Intl.DisplayNames([userLang], { type: 'region' });

    // --- 2. AUTOMATED VIDEO PLAYER ENGINE ---
    if (videoId) {
        const titleJsonPath = `./videos/${videoId}/translations/title.json`;
        const videoJsonPath = `./videos/${videoId}/translations/video.json`;

        let titlesData = {};
        let videosData = {};

        // Fetch translations concurrently
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

            // METHOD 2 AUTOMATIC DETECTION:
            // Find the language key whose filename DOES NOT contain its own language code extension.
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

                    // SPLIT STRATEGY: Manually process string components to preserve custom configurations (e.g. en-NL)
                    if (lang.includes('-')) {
                        const parts = lang.split('-');
                        langCode = parts[0].toLowerCase();
                        regionCode = parts[1].toUpperCase();
                    } else {
                        // Maximize 2-letter codes automatically to find implicit country associations
                        const maximizedLocale = new Intl.Locale(lang).maximize();
                        if (maximizedLocale.region) {
                            regionCode = maximizedLocale.region.toUpperCase();
                        }
                    }

                    // Translate codes independently
                    const baseLanguage = langNamesTranslator.of(langCode);
                    const countryName = regionCode ? regionNamesTranslator.of(regionCode) : '';
                    
                    formattedDropdownText = countryName ? `${baseLanguage} (${countryName})` : baseLanguage;
                } catch (e) {
                    formattedDropdownText = lang.toUpperCase();
                }

                // Append original tag
                if (lang === originalLangCode) {
                    formattedDropdownText += ' (Original)';
                }

                option.textContent = formattedDropdownText;
                languageSelector.appendChild(option);
            });

            // Handle baseline default selection
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
        languageSelector.innerHTML = '<option>No active video ID parameters located.</option>';
    }

    // --- 3. DIRECT GITHUB API COMMITS ENGINE ---
    uploadBtn.addEventListener('click', () => uploadModal.style.display = 'block');
    closeModal.addEventListener('click', () => uploadModal.style.display = 'none');

    // Add translation track elements dynamically
    addTranslationBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'translation-row';
        row.innerHTML = `
            <input type="text" placeholder="Tag (e.g. de)" class="trans-lang" style="width:25%;" required>
            <input type="text" placeholder="Translated Title" class="trans-title" style="width:45%;" required>
            <input type="text" placeholder="Filename (e.g. bowalkingde.mp4)" class="trans-file" style="width:30%;" required>
        `;
        translationsContainer.appendChild(row);
    });

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Deduce user repository tracking parameters from browser runtime path names
        const hostnameParts = window.location.hostname.split('.');
        const owner = hostnameParts[0]; 
        const pathParts = window.location.pathname.split('/');
        const repo = pathParts[1] || '';

        const token = document.getElementById('github-token').value.trim();
        const primaryFile = document.getElementById('primary-video-file').files[0];
        const primaryLang = document.getElementById('primary-lang-tag').value.trim();
        const primaryTitle = document.getElementById('primary-video-title').value.trim();

        if (!owner || !repo || repo === 'index.html') {
            showStatus("Error: Unable to map repository tracking configurations dynamically from URL parameters.", "red");
            return;
        }

        submitBtn.disabled = true;
        showStatus("Processing structural array payloads...", "orange");

        // Compute Base64 custom encoded identifier key matching random 8-character long string criteria
        let randomNumericString = '';
        for (let i = 0; i < 8; i++) {
            randomNumericString += Math.floor(Math.random() * 10).toString();
        }
        const customBase64Id = btoa(randomNumericString);

        let videoJson = {};
        let titleJson = {};

        videoJson[primaryLang] = primaryFile.name;
        titleJson[primaryLang] = primaryTitle;

        const dynamicRows = document.querySelectorAll('.translation-row');
        dynamicRows.forEach(row => {
            const extraLang = row.querySelector('.trans-lang').value.trim();
            const extraTitle = row.querySelector('.trans-title').value.trim();
            const extraFile = row.querySelector('.trans-file').value.trim();
            if (extraLang) {
                videoJson[extraLang] = extraFile;
                titleJson[extraLang] = extraTitle;
            }
        });

        // Communication channel helper pushing payloads directly to GitHub REST API content branches
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
                    message: `Auto-commit structures configuration for video sequence entry id: ${customBase64Id}`,
                    content: base64Payload
                })
            });
            return response;
        }

        try {
            showStatus("Pushing configuration tracking updates to active repository paths...", "orange");

            // Deploy concurrent asynchronous API write commits to your code repository tree branches
            const [res1, res2] = await Promise.all([
                commitToGitHub(`videos/${customBase64Id}/translations/video.json`, videoJson),
                commitToGitHub(`videos/${customBase64Id}/translations/title.json`, titleJson)
            ]);

            if (res1.ok && res2.ok) {
                const finalShareUrl = `${window.location.origin}/${repo}/index.html?id=${customBase64Id}`;
                showStatus(`SUCCESS! Structural components successfully created.<br><br><strong>Your Target Shareable Link:</strong><br><a href="${finalShareUrl}" target="_blank">${finalShareUrl}</a><br><br><em>Note: Ensure you drop the actual mp4 video tracks manually inside your repository structure under the path: videos/${customBase64Id}/</em>`, "green");
                uploadForm.reset();
                translationsContainer.innerHTML = '';
            } else {
                const errData = await res1.json().catch(() => ({}));
                showStatus(`GitHub API rejected tracking push updates: ${errData.message || 'Verify token credentials and scope adjustments.'}`, "red");
                submitBtn.disabled = false;
            }
        } catch (err) {
            showStatus(`Network connectivity execution errors: ${err.message}`, "red");
            submitBtn.disabled = false;
        }
    });

    function showStatus(msg, color) {
        statusDiv.style.display = "block";
        statusDiv.innerHTML = msg;
        if (color === "green") { statusDiv.style.background = "#d4edda"; statusDiv.style.color = "#155724"; }
        if (color === "orange") { statusDiv.style.background = "#fff3cd"; statusDiv.style.color = "#856404"; }
        if (color === "red") { statusDiv.style.background = "#f8d7da"; statusDiv.style.color = "#721c24"; }
    }
});
