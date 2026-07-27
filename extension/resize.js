// ======================
// Textarea Auto-resizing & Calendar CSS Fix
// ======================

(function() {
    function resizeTA() {
        let t = document.querySelector('textarea[name="InspRemarks"]');
        if (t) {
            t.rows = 8;
            t.cols = 100;
            t.style.width = "900px";
            t.style.height = "480px";
        }

        // Fix broken calendar_style.css relative links that return 404 HTML and trigger MIME type errors
        document.querySelectorAll('link[href*="calendar_style.css"]').forEach(link => {
            link.href = 'data:text/css,/* calendar style fallback */';
        });
    }

    resizeTA();
    window.addEventListener("load", resizeTA);

    new MutationObserver(resizeTA).observe(document.documentElement || document.body, {
        childList: true,
        subtree: true
    });
})();
