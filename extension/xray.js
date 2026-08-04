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



    // Asynchronous Multi-Click Exploit
    // By adding a small delay (e.g., 100ms), we force the browser to register each click in a separate event loop tick.
    // This perfectly mimics human rapid-clicking and exploits the server's race condition before the page unloads.
    async function exploitMultiClick(button, count) {
        if (!button || count <= 0) return;
        
        console.log(`[ECCS X-Ray] Exploiting double-submit glitch: Firing ${count} clicks rapidly...`);
        if (window.eccsLog) window.eccsLog.info(`Exploiting glitch: Firing ${count} rapid clicks`);

        for (let i = 0; i < count; i++) {
            try {
                button.disabled = false; 
                button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                button.click();
            } catch (err) {}
            // Wait 100ms between clicks to bypass browser form coalescing
            await new Promise(r => setTimeout(r, 100));
        }
    }

    function automateXray() {
        if (localStorage.autoXrayEnabled === "false") {
            return;
        }
        if (done) return;

        // --- PAGE 2: Auto-click "X-Ray Clear" button ---
        const clearButton = document.querySelector('input[value="X-Ray Clear"]');
        if (clearButton) {
            done = 1;
            
            const hawbNo = getScannedHawb();
            const totalPackages = getNoOfPackages();
            
            const isSubsequent = sessionStorage.isSubsequent === "true" || (sessionStorage.remainingCount && parseInt(sessionStorage.remainingCount, 10) > 0);

            if (!isSubsequent) {
                // PACKAGE 1: Wait 5 seconds, then exploit multi-click if there are multiple packages
                sessionStorage.currentHawb = hawbNo || '';
                console.log("[ECCS X-Ray] Package 1: Waiting 5s safety delay before clearing...");
                if (window.eccsLog) window.eccsLog.info("Package 1: Waiting 5s safety delay");

                setTimeout(() => {
                    if (document.body.contains(clearButton)) {
                        exploitMultiClick(clearButton, totalPackages);
                    }
                }, 5000);
            } else {
                // SUBSEQUENT PACKAGES (Just in case the exploit didn't clear all of them on the first try)
                const remaining = parseInt(sessionStorage.remainingCount || String(totalPackages - 1), 10);
                const clickCount = remaining > 0 ? remaining : (totalPackages > 1 ? totalPackages - 1 : 1);

                console.log(`[ECCS X-Ray] Subsequent Package: Skipping 5s wait, firing ${clickCount} rapid clicks...`);
                if (window.eccsLog) window.eccsLog.info(`Subsequent Package: Firing ${clickCount} rapid clicks`);

                // Clear subsequent flags
                sessionStorage.removeItem("isSubsequent");
                sessionStorage.removeItem("remainingCount");

                // Execute asynchronous multi-click exploit
                exploitMultiClick(clearButton, clickCount);
            }
            return;
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
