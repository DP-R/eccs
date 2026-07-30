// ======================
// Browser Lock & Session Keep-Alive
// ======================

(function() {
    let lock;
    let keepAliveInterval;

    function startKeepAlive() {
        keepAliveInterval = setInterval(() => {
            console.log("[ECCS Keep-Alive] Refreshing session to prevent timeout...");
            fetch("/eccs/jsp/acl/cancel.do")
                .catch(err => console.warn("[ECCS Keep-Alive] Refresh failed:", err));
        }, 240000);
    }

    function stopKeepAlive() {
        clearInterval(keepAliveInterval);
    }

    function showLock() {
        if (lock) return;

        lock = document.createElement("div");

        lock.style =
            "position:fixed;inset:0;background:#111;color:#fff;" +
            "z-index:2147483647;display:grid;place-items:center;" +
            "font:30px sans-serif;";

        lock.innerHTML =
            "<div>Browser Locked<br><br>" +
            "<input id='pin' type='password' autofocus></div>";

        document.documentElement.append(lock);
        startKeepAlive();

        const pinInput = document.getElementById('pin');
        if (pinInput) {
            pinInput.onkeydown = e => {
                if (e.key == "Enter" && pinInput.value == "5664") {
                    lock.remove();
                    lock = null;
                    localStorage.lock = 0;
                    stopKeepAlive();
                }
            };
        }
    }

    if (localStorage.lock == "1")
        showLock();

    // Lock Browser shortcut: Ctrl + Shift + K (Leaves Ctrl + Shift + L for log export)
    document.addEventListener("keydown", e => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() == "k") {
            e.preventDefault();
            localStorage.lock = 1;
            showLock();
        }
    });
})();
