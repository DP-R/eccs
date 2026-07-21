// ======================
// Auto-Click & Auto-Submit X-Ray Clearance
// ======================

let done = 0;

// Initialize toggle state (default to true if not set)
if (localStorage.autoXrayEnabled === undefined) {
    localStorage.autoXrayEnabled = "true";
}

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
    // Stop immediately if the toggle is disabled
    if (localStorage.autoXrayEnabled === "false") {
        return;
    }

    if (done) return;

    // --- PAGE 2: Auto-click "X-Ray Clear" button ---
    const clearButton = document.querySelector('input[value="X-Ray Clear"]');
    if (clearButton) {
        done = 1;
        
        const scannedHawb = getScannedHawb();
        const numPackages = getNoOfPackages();
        
        // Determine if this is a subsequent package of a multi-package HAWB
        let isSubsequent = false;
        if (scannedHawb && sessionStorage.currentHawb === scannedHawb) {
            const progress = parseInt(sessionStorage.currentProgress, 10) || 0;
            if (progress >= 1) {
                isSubsequent = true;
            }
        }
        
        // Track that we are about to clear the package
        if (scannedHawb) {
            sessionStorage.currentHawb = scannedHawb;
            const currentProg = parseInt(sessionStorage.currentProgress, 10) || 0;
            sessionStorage.currentProgress = currentProg + 1;
        }
        
        if (numPackages > 1 && isSubsequent) {
            console.log(`ECCS Automation: HAWB ${scannedHawb} (${numPackages} packages). Clicking clear instantaneously...`);
            if (clearButton && typeof clearButton.click === 'function') {
                clearButton.click();
            }
        } else {
            console.log(`ECCS Automation: HAWB ${scannedHawb} (${numPackages} packages). Clicking clear in 7000ms...`);
            setTimeout(() => {
                // Re-check state right before execution in case the user toggled it off during the 7s delay
                if (localStorage.autoXrayEnabled === "false") {
                    done = 0;
                    return;
                }
                if (clearButton && typeof clearButton.click === 'function') {
                    clearButton.click();
                }
            }, 7000);
        }
        return;
    }

    // --- PAGE 1: Auto-submit next packages ---
    const redFont = document.querySelector('font[color="red"]');
    if (redFont) {
        // Strip extra spaces and linebreaks
        const text = redFont.textContent.replace(/\s+/g, ' ').trim();
        // Match: "The HAWB No. <hawbNo> <current> out of <total>"
        const match = text.match(/The HAWB No\.\s*(\d+)\s*(\d+)\s*out\s*of\s*(\d+)/i);
        
        if (match) {
            const hawbNo = match[1].trim();
            const current = parseInt(match[2], 10);
            const total = parseInt(match[3], 10);

            if (current < total) {
                const input = document.querySelector('input[name="hawbNo"]');
                if (input && !input.dataset.automated) {
                    input.dataset.automated = 'true';
                    done = 1;
                    
                    // Sync sessionStorage state with Page 1 progress
                    sessionStorage.currentHawb = hawbNo;
                    sessionStorage.currentProgress = current;
                    
                    // Paste the HAWB number
                    input.value = hawbNo;
                    
                    // 1. Trigger change event to fire inline onchange handler
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // 2. Trigger Enter keypress to submit the form
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

// Listen for Ctrl + Shift + D shortcut to toggle auto-clearance
document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        
        const isEnabled = localStorage.autoXrayEnabled === "true";
        localStorage.autoXrayEnabled = isEnabled ? "false" : "true";
        
        showToast(`Auto X-Ray: ${isEnabled ? 'DISABLED' : 'ENABLED'}`);
        
        // If re-enabled, immediately trigger verification
        if (!isEnabled) {
            automateXray();
        }
    }
});

// Run on window load
window.addEventListener("load", automateXray);

// Check periodically to catch elements loaded after initial render
setInterval(automateXray, 1000);

// Observe DOM updates for dynamic contents
new MutationObserver(automateXray).observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
});
