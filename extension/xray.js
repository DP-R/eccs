// ==========================================
// Auto-Click & Auto-Submit X-Ray Clearance
// ==========================================

(function() {
    // Initialize Master Toggle state in sessionStorage (defaults to "false" on fresh launch)
    if (sessionStorage.eccsExtensionActive === undefined) {
        sessionStorage.eccsExtensionActive = "false";
    }

    // Toggle shortcut: Ctrl + Shift + Space toggles the entire ECCS Utility Pack
    document.addEventListener("keydown", e => {
        if (e.ctrlKey && e.shiftKey && e.code === "Space") {
            e.preventDefault();
            
            const wasActive = sessionStorage.eccsExtensionActive === "true";
            sessionStorage.eccsExtensionActive = wasActive ? "false" : "true";
            
            showToast(`ECCS Utility Pack: ${wasActive ? 'DISABLED' : 'ENABLED'}`);
            
            // Reload page so modifications take effect or disappear completely
            setTimeout(() => {
                window.location.reload();
            }, 1200);
        }
    });

    if (sessionStorage.eccsExtensionActive !== "true") {
        return;
    }

    let done = 0;

    function showToast(message) {
        let toast = document.getElementById('eccs-toast-alert');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'eccs-toast-alert';
            toast.style = "position:fixed;top:20px;right:20px;background:#1e293b;color:#f8fafc;padding:10px 20px;border-radius:6px;z-index:2147483647;font-family:sans-serif;font-size:14px;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.25);transition:opacity 0.3s;border:1px solid #475569;";
            document.documentElement.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.opacity = '1';
        
        if (window.toastTimeout) clearTimeout(window.toastTimeout);
        window.toastTimeout = setTimeout(() => {
            toast.style.opacity = '0';
        }, 2000);
    }

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

    function automateXray() {
        if (done) return;

        // --- PAGE 2: Auto-click "X-Ray Clear" button ---
        const clearButton = document.querySelector('input[value="X-Ray Clear"]');
        if (clearButton) {
            done = 1;
            
            // Check if HAWB is single or multi package
            const hawbNo = getScannedHawb();
            const totalPackages = getNoOfPackages();
            
            if (hawbNo && totalPackages > 1) {
                // Multi-package: initialize sequence progress track
                sessionStorage.currentHawb = hawbNo;
                sessionStorage.currentProgress = 1; // First scan package submitted
            }
            
            // Add a 7s delay to allow inspector to uncheck/override scan
            setTimeout(() => {
                clearButton.click();
            }, 7000);
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
                        
                        sessionStorage.currentHawb = hawbNo;
                        sessionStorage.currentProgress = current;
                        
                        input.value = hawbNo;
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        ['keydown', 'keypress', 'keyup'].forEach(type => {
                            input.dispatchEvent(new KeyboardEvent(type, {
                                key: 'Enter',
                                code: 'Enter',
                                keyCode: 13,
                                which: 13,
                                bubbles: true
                            }));
                        });
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
