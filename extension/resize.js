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

        if (window.location.pathname.toLowerCase().includes('listcbexidetailsinsp')) {
            document.querySelectorAll('input[type="text"]').forEach(input => {
                if (!input.classList.contains('eccs-filter-input')) {
                    input.style.width = "400px";
                }
            });
            document.querySelectorAll('textarea').forEach(t => {
                t.style.width = "400px";
                t.style.height = "100px";
            });
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
