// ==========================================
// Auto-Click & Auto-Submit X-Ray Clearance
// ==========================================

(function() {
    // Initialize toggle state for auto-clearance in localStorage (defaults to true)
    if (localStorage.autoXrayEnabled === undefined) {
        localStorage.autoXrayEnabled = "true";
    }

    // Toggle shortcut: Ctrl + Shift + Space toggles auto-clearance specifically
    document.addEventListener("keydown", e => {
        if (e.ctrlKey && e.shiftKey && e.code === "Space") {
            e.preventDefault();
            
            const isEnabled = localStorage.autoXrayEnabled === "true";
            localStorage.autoXrayEnabled = isEnabled ? "false" : "true";
            
            showToast(isEnabled ? 'OFF' : 'ON');
            
            // If re-enabled, immediately run clearance check
            if (!isEnabled) {
                automateXray();
            }
        }
    });

    let done = 0;

    function showToast(message) {
        let toast = document.getElementById('eccs-toast-alert');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'eccs-toast-alert';
            document.documentElement.appendChild(toast);
        }
        
        const isActionOn = message === 'ON';
        const textColor = isActionOn ? '#16a34a' : '#dc2626'; // Green vs Red
        
        toast.style = `position:fixed;bottom:15px;right:15px;background:#ffffff;` +
                      `color:${textColor};padding:5px 10px;border-radius:4px;z-index:2147483647;` +
                      `font-family:system-ui,sans-serif;font-size:12px;font-weight:800;` +
                      `letter-spacing:0.04em;box-shadow:0 2px 5px rgba(0,0,0,0.1);` +
                      `transition:opacity 0.3s;border:1.5px solid ${textColor};`;
                      
        toast.textContent = "ECCS";
        toast.style.opacity = '1';
        
        if (window.toastTimeout) clearTimeout(window.toastTimeout);
        window.toastTimeout = setTimeout(() => {
            toast.style.opacity = '0';
        }, 2000);
    }
    window.showToast = showToast;

    function getScannedHawb() {
        const tds = Array.from(document.querySelectorAll('td'));
        const targetTd = tds.find(td => td.textContent.includes('Scanned HAWB :'));
        if (targetTd && targetTd.nextElementSibling) {
            return targetTd.nextElementSibling.textContent.replace(/\s+/g, '').trim();
        }
        return null;
    }

    function getNoOfPackages() {
        const tds = Array.from(document.querySelectorAll('td'));
        const targetTd = tds.find(td => td.textContent.includes('No of packages :'));
        if (targetTd && targetTd.nextElementSibling) {
            const parsed = parseInt(targetTd.nextElementSibling.textContent.trim(), 10);
            return isNaN(parsed) ? 1 : parsed;
        }
        return 1;
    }



    // Extractor for multi-package data directly from the table
    function getPackageLinks() {
        const links = [];
        const anchors = document.querySelectorAll('a[href^="getHAWBStatus.do?hId="]');
        anchors.forEach(a => {
            const href = a.getAttribute('href');
            const hIdMatch = href.match(/hId=(\d+)/);
            const hNoMatch = href.match(/hNo=(\d+)/);
            
            if (hIdMatch && hNoMatch) {
                links.push({ hId: hIdMatch[1], hNo: hNoMatch[1] });
            }
        });
        return links;
    }

    // Direct API call to clear package instantly instead of clicking
    async function clearPackageBackground(hId, hNo) {
        const tokenInput = document.querySelector('input[name="org.apache.struts.taglib.html.TOKEN"]');
        const token = tokenInput ? tokenInput.value : '';
        
        const cIdMatch = document.cookie.match(/cId=([^;]+)/); // Just in case cId is needed, though usually standard
        const cId = cIdMatch ? cIdMatch[1] : '300719'; // Fallback to a common one if needed, though mostly hId and hNo drive it

        const params = new URLSearchParams();
        params.set('org.apache.struts.taglib.html.TOKEN', token);
        params.set('hawbNoToSubmit', '');
        params.set('selecteduploadedDocID', '');
        params.set('hawbNo', '');
        
        try {
            await fetch(`/eccs/jsp/common/updateHAWBStatus.do?hId=${hId}&hNo=${hNo}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });
        } catch (e) {
            console.error('[ECCS X-Ray] Background fetch failed for', hId, e);
        }
    }

    function playAttentionSound() {
        // 1. Try Speech Synthesis
        try {
            const utterance = new SpeechSynthesisUtterance("Attention! Multiple entries found.");
            utterance.rate = 1.2;
            utterance.pitch = 1.2;
            utterance.volume = 1.0;
            window.speechSynthesis.speak(utterance);
        } catch(e) {}

        // 2. Try Web Audio API Beeps
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            
            const playTone = (freq, startTime, duration) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = 'square';
                osc.frequency.value = freq;
                
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
                gain.gain.setValueAtTime(0.3, startTime + duration - 0.05);
                gain.gain.linearRampToValueAtTime(0, startTime + duration);
                
                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            const now = ctx.currentTime;
            playTone(880, now, 0.15);
            playTone(880, now + 0.3, 0.15);
            playTone(1200, now + 0.6, 0.4);
        } catch(e) {
            console.error("[ECCS X-Ray] Beep failed", e);
        }
    }

    async function automateXray() {
        if (localStorage.autoXrayEnabled === "false") {
            return;
        }
        if (done) return;

        // --- PAGE 2: Auto-clear via background POSTs ---
        const clearButton = document.querySelector('input[value="X-Ray Clear"]');
        if (clearButton) {
            done = 1;
            
            const packages = getPackageLinks();
            if (packages.length > 0) {
                console.log(`[ECCS X-Ray] Executing direct API clear for ${packages.length} packages...`);
                if (window.eccsLog) window.eccsLog.info(`Executing direct API clear for ${packages.length} packages...`);

                clearButton.value = "Clearing...";
                clearButton.disabled = true;

                // Fire all POST requests in parallel for maximum speed
                await Promise.all(packages.map(pkg => clearPackageBackground(pkg.hId, pkg.hNo)));

                console.log(`[ECCS X-Ray] Background clearance complete. Reloading page to sync state.`);
                // Submit the form normally to sync the server state and return to the entry page
                clearButton.disabled = false;
                clearButton.click();
            } else {
                // Fallback for single packages if link isn't found
                clearButton.click();
            }
            
            return;
        }
        
        // --- PAGE 3: Multiple HAWB Entries Found (Manual intervention needed) ---
        const packages = getPackageLinks();
        const suspiciousLink = document.querySelector('a[href*="stat=suspicious"]');
        if (packages.length >= 1 && suspiciousLink && !clearButton) {
            if (!sessionStorage.multiHawbBeepPlayed) {
                console.log("[ECCS X-Ray] Multiple entries conflict. Playing alert sound.");
                playAttentionSound();
                sessionStorage.multiHawbBeepPlayed = "true";
            }
            return;
        } else {
            sessionStorage.removeItem("multiHawbBeepPlayed");
        }

        // --- PAGE 1: Auto-submit next packages ---
        const redFont = document.querySelector('font[color="red"]');
        if (redFont) {
            const text = redFont.textContent.replace(/\s+/g, ' ').trim();
            const match = text.match(/The HAWB No\.\s*([A-Za-z0-9]+)\s*(\d+)\s*out\s*of\s*(\d+)/i);
            
            if (match) {
                const hawbNo = match[1].trim();
                const current = parseInt(match[2], 10);
                const total = parseInt(match[3], 10);

                if (current < total) {
                    const input = document.querySelector('input[name="hawbNo"]');
                    if (input && !input.dataset.automated) {
                        input.dataset.automated = 'true';
                        done = 1;
                        
                        const remainingCount = total - current;
                        sessionStorage.currentHawb = hawbNo;
                        sessionStorage.isSubsequent = "true";
                        sessionStorage.remainingCount = String(remainingCount);

                        console.log(`[ECCS X-Ray] Page 1: Package ${current} of ${total} recorded. Remaining: ${remainingCount}`);
                        if (window.eccsLog) window.eccsLog.info(`Page 1: Package ${current} of ${total}. Remaining: ${remainingCount}`);
                        
                        input.value = hawbNo;
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        setTimeout(() => {
                            ['keydown', 'keypress', 'keyup'].forEach(type => {
                                input.dispatchEvent(new KeyboardEvent(type, {
                                    key: 'Enter',
                                    code: 'Enter',
                                    keyCode: 13,
                                    which: 13,
                                    bubbles: true
                                }));
                            });
                        }, 200);
                    }
                }
            }
        }
    }

    // Run immediately when script executes
    automateXray();

    // Check periodically to catch elements loaded after initial render
    setInterval(automateXray, 1000);

    // Removed MutationObserver to prevent UI lag. setInterval is sufficient.
})();
