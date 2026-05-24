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

    // --- 4. GITHUB REPOSITORY PULL REQUEST GENERATOR ---
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const hostnameParts = window.location.hostname.split('.');
        const owner = hostnameParts[0]; 
        const pathParts = window.location.pathname.split('/');
        const repo = pathParts[1] || '';

        const token = document.getElementById('github-token').value.trim();
        const primaryFile = document.getElementById('primary-video-file').files[0];
        const primaryLang = document.getElementById('primary-lang-tag').value.trim();
        const primaryTitle = document.getElementById('primary-video-title').value.trim();

        if (!owner || !repo || repo === 'index.html') {
            showStatus("Error: Unable to verify repository coordinates from context URL.", "red");
            return;
        }

        submitBtn.disabled = true;
        showStatus("Initializing request streams...", "orange");

        // Algorithm: Random 8-character long numeric string encoded into Base64
        let randomNumericString = '';
        for (let i = 0; i < 8; i++) {
            randomNumericString += Math.floor(Math.random() * 10).toString();
        }
        
        // Encodes string and strips out any equal sign symbols (=) to maintain look consistency
        const customBase64Id = btoa(randomNumericString).replace(/=/g, '');
        const cleanBranchName = `video-id-${customBase64Id}`;

        let videoJson = {};
        let titleJson = {};
        videoJson[primaryLang] = primaryFile.name;
        titleJson[primaryLang] = primaryTitle;

        const githubHeaders = {
            "Authorization": `token ${token}`,
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json"
        };

        try {
            showStatus("Fetching baseline branch information...", "orange");
            const repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: githubHeaders });
            if (!repoInfoRes.ok) throw new Error("Could not fetch repository defaults.");
            const repoData = await repoInfoRes.json();
            const defaultBranch = repoData.default_branch;

            const branchRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`, { headers: githubHeaders });
            if (!branchRefRes.ok) throw new Error(`Could not find latest commit on branch ${defaultBranch}`);
            const branchRefData = await branchRefRes.json();
            const latestCommitSha = branchRefData.object.sha;

            showStatus(`Creating isolated submission branch: ${cleanBranchName}...`, "orange");
            const createBranchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
                method: "POST",
                headers: githubHeaders,
                body: JSON.stringify({
                    ref: `refs/heads/${cleanBranchName}`,
                    sha: latestCommitSha
                })
            });
            if (!createBranchRes.ok) throw new Error("Branch creation rejected by GitHub API.");

            async function commitToBranch(path, jsonContent) {
                const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
                const base64Payload = btoa(unescape(encodeURIComponent(JSON.stringify(jsonContent, null, 2))));
                return fetch(url, {
                    method: "PUT",
                    headers: githubHeaders,
                    body: JSON.stringify({
                        message: `Add metadata configuration arrays for entry id: ${customBase64Id}`,
                        content: base64Payload,
                        branch: cleanBranchName
                    })
                });
            }

            showStatus("Uploading configuration arrays to staging branch...", "orange");
            const [res1, res2] = await Promise.all([
                commitToBranch(`videos/${customBase64Id}/translations/video.json`, videoJson),
                commitToBranch(`videos/${customBase64Id}/translations/title.json`, titleJson)
            ]);
            if (!res1.ok || !res2.ok) throw new Error("Failed to write translation JSON payloads to staging branch.");

            showStatus("Opening Pull Request sequence...", "orange");
            const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
                method: "POST",
                headers: githubHeaders,
                body: JSON.stringify({
                    title: `New Video Metadata Entry [ID: ${customBase64Id}]`,
                    head: cleanBranchName,
                    base: defaultBranch,
                    body: `Automated upload setup initialized for entry ID \`${customBase64Id}\`.\n\n**Next Steps:** Drop your video file \`${primaryFile.name}\` into the \`videos/${customBase64Id}/\` directory inside the files tab before merging this Pull Request.`
                })
            });

            if (prRes.ok) {
                const prData = await prRes.json();
                showStatus(`SUCCESS! Pull Request opened.<br><br><strong>Pull Request Link:</strong><br><a href="${prData.html_url}" target="_blank">${prData.html_url}</a><br><br><em>Action Needed: Open your PR, navigate to the Files tab, drop your video files under the folder \`videos/${customBase64Id}/\`, and merge!</em>`, "green");
                uploadForm.reset();
            } else {
                const errData = await prRes.json().catch(() => ({}));
                throw new Error(errData.message || "Pull Request generation rejected.");
            }

        } catch (err) {
            showStatus(`Execution Error: ${err.message}`, "red");
            submitBtn.disabled = false;
        }
    });

    function showStatus(msg, color) {
        statusDiv.style.display = "block";
        statusDiv.innerHTML = msg;
    }
});
