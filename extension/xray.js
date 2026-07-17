// ======================
// Auto-Click & Auto-Submit X-Ray Clearance
// ======================

let done = 0;

function automateXray() {
    if (done) return;

    // --- PAGE 2: Auto-click "X-Ray Clear" button ---
    const clearButton = document.querySelector('input[value="X-Ray Clear"]');
    if (clearButton) {
        done = 1;
        setTimeout(() => {
            if (clearButton && typeof clearButton.click === 'function') {
                clearButton.click();
            }
        }, 100); // Click instantaneously (100ms)
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
                    
                    // Paste the stripped barcode/hawb number
                    input.value = hawbNo;
                    
                    setTimeout(() => {
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
                    }, 100);
                }
            }
        }
    }
}

// Run on window load
window.addEventListener("load", automateXray);

// Check periodically to catch elements loaded after initial render
setInterval(automateXray, 1000);

// Observe DOM updates for dynamic contents
new MutationObserver(automateXray).observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
});
