(function() {
    let done = 0;

    // --- Core Stealth Protocol: Erase any legacy tracks left on the host machine ---
    try {
        localStorage.removeItem('autoXrayEnabled');
        sessionStorage.removeItem('multiHawbBeepPlayed');
        sessionStorage.removeItem('currentHawb');
        sessionStorage.removeItem('isSubsequent');
        sessionStorage.removeItem('remainingCount');
    } catch(e) {}

    // Toggle shortcut: Ctrl + Shift + Space toggles auto-clearance specifically
    document.addEventListener("keydown", async (e) => {
        if (e.ctrlKey && e.shiftKey && e.code === "Space") {
            e.preventDefault();
            
            const items = await new Promise(resolve => {
                if (chrome && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.get({ autoXrayEnabled: true }, resolve);
                } else {
                    resolve({ autoXrayEnabled: true });
                }
            });
            
            const newState = !items.autoXrayEnabled;
            
            if (chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ autoXrayEnabled: newState });
            }
            
            showToast(newState ? 'ON' : 'OFF');
            
            // If re-enabled, immediately run clearance check
            if (newState) {
                automateXray();
            }
        }
    });

    // Custom Toast Notification System
    function showToast(message) {
        const existingToast = document.getElementById('eccs-xray-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.id = 'eccs-xray-toast';
        toast.textContent = `Auto X-Ray: ${message}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            background-color: ${message === 'ON' ? '#10b981' : '#ef4444'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 16px;
            font-weight: 600;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            z-index: 999999;
            transition: opacity 0.3s ease-in-out;
            opacity: 1;
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    function getPackageLinks() {
        const links = [];
        const anchors = document.querySelectorAll('a[href*="updateHAWBStatus.do"]');
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
        
        const params = new URLSearchParams();
        params.set('org.apache.struts.taglib.html.TOKEN', token);
        params.set('hawbNoToSubmit', '');
        params.set('selecteduploadedDocID', '');
        params.set('hawbNo', '');
        
        try {
            await fetch(`/eccs/jsp/common/updateHAWBStatus.do?hId=${hId}&hNo=${hNo}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            });
        } catch (e) {
            console.error('[ECCS X-Ray] Background fetch failed for', hId, e);
        }
    }

    function playAttentionSound() {
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
        } catch(e) {}
    }

    async function automateXray() {
        // Read settings and state from stealth extension storage
        const state = await new Promise(resolve => {
            if (chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get({ 
                    autoXrayEnabled: true, 
                    xrayDelaySeconds: 1.0,
                    multiHawbBeepPlayed: false
                }, resolve);
            } else {
                resolve({ autoXrayEnabled: true, xrayDelaySeconds: 1.0, multiHawbBeepPlayed: false });
            }
        });

        if (!state.autoXrayEnabled) return;
        if (done) return;

        // --- PAGE 2: Auto-clear via background POSTs ---
        const clearButton = document.querySelector('input[value="X-Ray Clear"]');
        if (clearButton) {
            done = 1;
            
            const packages = getPackageLinks();
            if (packages.length > 0) {
                setTimeout(async () => {
                    clearButton.disabled = true;
                    await Promise.all(packages.map(pkg => clearPackageBackground(pkg.hId, pkg.hNo)));
                    clearButton.disabled = false;
                    clearButton.click();
                }, state.xrayDelaySeconds * 1000);
            } else {
                setTimeout(() => clearButton.click(), state.xrayDelaySeconds * 1000);
            }
            return;
        }
        
        // --- PAGE 3: Multiple HAWB Entries Found ---
        const packages = getPackageLinks();
        const suspiciousLink = document.querySelector('a[href*="stat=suspicious"]');
        if (packages.length >= 1 && suspiciousLink && !clearButton) {
            if (!state.multiHawbBeepPlayed) {
                playAttentionSound();
                if (chrome && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.set({ multiHawbBeepPlayed: true });
                }
            }
            return;
        } else {
            if (chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ multiHawbBeepPlayed: false });
            }
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
                        
                        input.value = hawbNo;
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        setTimeout(() => {
                            ['keydown', 'keypress', 'keyup'].forEach(type => {
                                input.dispatchEvent(new KeyboardEvent(type, {
                                    key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
                                }));
                            });
                        }, 200);
                    }
                }
            }
        }
    }

    automateXray();
    setInterval(automateXray, 1000);
})();
