// ==========================================
// ECCS Extension: Force Popups into New Tabs
// ==========================================

(function() {
    const originalOpen = window.open;
    window.open = function(url, name, specs) {
        console.log("[ECCS Extension] Intercepted window.open - forcing new tab:", url);
        return originalOpen(url, name || '_blank');
    };
})();
