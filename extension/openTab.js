// ==========================================
// ECCS Extension: Force Popups into New Tabs
// ==========================================

(function() {
    // Inject code into the main page execution context to intercept window.open
    const script = document.createElement('script');
    script.textContent = `
        (function() {
            const originalOpen = window.open;
            window.open = function(url, name, specs) {
                // If specs defines a popup window (usually contains width or height),
                // strip the specs argument so the browser opens it in a new tab instead of a popup.
                if (specs && (typeof specs === 'string') && (specs.includes('width') || specs.includes('height'))) {
                    console.log("[ECCS Extension] Intercepted popup window.open - opening in a new tab:", url);
                    return originalOpen(url, name);
                }
                return originalOpen(url, name, specs);
            };
        })();
    `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
})();
