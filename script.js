document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('id');

    const languageSelector = document.getElementById('language-selector');
    const videoFrame = document.getElementById('video-frame');

    if (!videoId) {
        languageSelector.innerHTML = '<option>Error: No ?id= specified in URL</option>';
        document.title = "Error - No Video ID";
        return;
    }

    // Determine user's local browser language context (e.g., 'en', 'de', 'nl')
    const userLang = navigator.language.split('-')[0] || 'en'; 

    // Setup browser built-in localization engines based on the visitor's language
    const langNamesTranslator = new Intl.DisplayNames([userLang], { type: 'language' });
    const regionNamesTranslator = new Intl.DisplayNames([userLang], { type: 'region' });

    const titleJsonPath = `./videos/${videoId}/translations/title.json`;
    const videoJsonPath = `./videos/${videoId}/translations/video.json`;

    let titlesData = {};
    let videosData = {};

    // Fetch the 2 required configuration files
    Promise.all([
        fetch(titleJsonPath).then(res => res.json()).catch(() => ({})),
        fetch(videoJsonPath).then(res => res.json()).catch(() => ({}))
    ]).then(([titles, videos]) => {
        titlesData = titles;
        videosData = videos;

        const availableLangs = Object.keys(videosData);

        if (availableLangs.length === 0) {
            languageSelector.innerHTML = '<option>No translations found</option>';
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

                // 1. Check if a region is explicitly provided (e.g., 'pt-PT', 'nl-NL', 'nl-nl')
                if (lang.includes('-')) {
                    const parts = lang.split('-');
                    langCode = parts[0].toLowerCase();
                    regionCode = parts[1].toUpperCase(); // Ensures 'nl' or 'NL' safely formats to uppercase
                } else {
                    // 2. FULLY AUTOMATED DETECTOR:
                    // If no country is specified (e.g., 'nl', 'de'), ask the browser 
                    // to find the standard default region associated with that language code.
                    const maximizedLocale = new Intl.Locale(lang).maximize();
                    if (maximizedLocale.region) {
                        regionCode = maximizedLocale.region.toUpperCase();
                    }
                }

                // 3. Translate codes into full names using visitor's local language context
                const baseLanguage = langNamesTranslator.of(langCode);
                const countryName = regionCode ? regionNamesTranslator.of(regionCode) : '';
                
                formattedDropdownText = countryName ? `${baseLanguage} (${countryName})` : baseLanguage;

            } catch (e) {
                // Hard fallback to capitalized code if lookups fail
                formattedDropdownText = lang.toUpperCase();
            }

            // Append (Original) dynamically next to the auto-detected source track
            if (lang === originalLangCode) {
                formattedDropdownText += ' (Original)';
            }

            option.textContent = formattedDropdownText;
            languageSelector.appendChild(option);
        });

        // Set starting selector values based on visitor's browser or original language track
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
});
