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

    // Synchronous Multi-Click Function with Error Safety & Disabled-State Reset
    function clickClearButtonSynchronous(button, count) {
        if (!button || count <= 0) return;
        
        console.log(`[ECCS X-Ray] Synchronously firing ${count} clicks on X-Ray Clear button...`);
        if (window.eccsLog) window.eccsLog.info(`Synchronously firing ${count} clicks on X-Ray Clear`);

        for (let i = 0; i < count; i++) {
            try {
                button.disabled = false; // Re-enable if Struts/jQuery disabled the button on previous click
                button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                button.click();
            } catch (err) {
                console.warn(`[ECCS X-Ray] Click ${i + 1} handled safely:`, err);
            }
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
                // PACKAGE 1: Wait 5 seconds, then click ONCE to submit Package 1
                sessionStorage.currentHawb = hawbNo || '';
                console.log("[ECCS X-Ray] Package 1: Waiting 5s safety delay before single click...");
                if (window.eccsLog) window.eccsLog.info("Package 1: Waiting 5s safety delay");

                setTimeout(() => {
                    if (document.body.contains(clearButton)) {
                        clearButton.click();
                    }
                }, 5000);
            } else {
                // SUBSEQUENT PACKAGES (Package 2, 3... re-opened after re-inserting HAWB):
                // Skip 5s wait and click SYNCHRONOUSLY equal to remainingCount at once!
                const remaining = parseInt(sessionStorage.remainingCount || String(totalPackages - 1), 10);
                const clickCount = remaining > 0 ? remaining : (totalPackages > 1 ? totalPackages - 1 : 1);

                console.log(`[ECCS X-Ray] Subsequent Package: Firing ${clickCount} synchronous clicks at once...`);
                if (window.eccsLog) window.eccsLog.info(`Subsequent Package: Firing ${clickCount} synchronous clicks`);

                // Clear subsequent flags for next fresh HAWB
                sessionStorage.removeItem("isSubsequent");
                sessionStorage.removeItem("remainingCount");

                // Execute error-safe synchronous multi-clicking
                clickClearButtonSynchronous(clearButton, clickCount);
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

    // Observe DOM updates for dynamic contents
    new MutationObserver(automateXray).observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });
})();
