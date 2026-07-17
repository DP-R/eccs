// ======================
// Browser Lock
// ======================

let lock;

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

    pin.onkeydown = e => {
        if (e.key == "Enter" && pin.value == "5664") {
            lock.remove();
            lock = null;
            localStorage.lock = 0;
        }
    };
}

if (localStorage.lock == "1")
    showLock();

document.addEventListener("keydown", e => {

    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() == "l") {
        e.preventDefault();
        localStorage.lock = 1;
        showLock();
    }

});
