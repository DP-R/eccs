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

    function clickClearButton(button, count) {
        if (!button) return;
        
        let clicks = 0;
        const interval = setInterval(() => {
            if (clicks < count && document.body.contains(button)) {
                button.click();
                clicks++;
            } else {
                clearInterval(interval);
            }
        }, 300); // Small 300ms time gap between clicks
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
            
            const isSubsequent = (sessionStorage.currentHawb === hawbNo && sessionStorage.isSubsequent === "true");

            if (!isSubsequent) {
                // FIRST ONE: Wait 5 seconds (5000ms) before clicking
                sessionStorage.currentHawb = hawbNo || '';
                sessionStorage.isSubsequent = "true";

                setTimeout(() => {
                    clickClearButton(clearButton, totalPackages);
                }, 5000);
            } else {
                // SUBSEQUENT ONES: Click with a very small time gap (300ms)
                setTimeout(() => {
                    clickClearButton(clearButton, totalPackages);
                }, 300);
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
                        
                        sessionStorage.currentHawb = hawbNo;
                        sessionStorage.isSubsequent = "true";
                        
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
