// ======================
// Textarea Auto-resizing
// ======================

(function() {
    if (sessionStorage.eccsExtensionActive !== "true") {
        return;
    }

    function resizeTA() {
        let t = document.querySelector('textarea[name="InspRemarks"]');
        if (!t) return;

        t.rows = 8;
        t.cols = 100;

        t.style.width = "900px";
        t.style.height = "480px";
    }

    window.addEventListener("load", resizeTA);

    new MutationObserver(resizeTA).observe(document.documentElement, {
        childList: true,
        subtree: true
    });
})();
