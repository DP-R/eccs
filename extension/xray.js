// ======================
// Auto-Click X-Ray Clear
// ======================

let done = 0;

function xr() {
    if (done) return;

    let b = document.querySelector('input[value="X-Ray Clear"]');
    if (!b) return;

    done = 1;
    setTimeout(() => {
        if (b && typeof b.click === 'function') {
            b.click();
        }
    }, 700);
}

window.addEventListener("load", xr);
setInterval(xr, 1000);

new MutationObserver(xr).observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
});
