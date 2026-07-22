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
                console.log("[ECCS Extension] Intercepted window.open - forcing new tab:", url);
                return originalOpen(url, name || '_blank');
            };
        })();
    `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
})();
