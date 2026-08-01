// ==========================================
// ECCS Auto Login & Captcha Solver (Ctrl + Shift + U)
// ==========================================

(function() {
    function autoLogin() {
        const usernameInput = document.getElementById("username");
        const passwordInput = document.getElementById("password");
        const captchaInput = document.getElementById("txtInput");
        const captchaDiv = document.getElementById("mainCaptcha") || document.querySelector(".log-captcha + *");

        // Fill username if empty
        if (usernameInput && !usernameInput.value.trim()) {
            usernameInput.value = "14937314";
            usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
            usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Fill password if empty
        if (passwordInput && !passwordInput.value.trim()) {
            passwordInput.value = "Codelink@5";
            passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
            passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Copy captcha text, strip all whitespaces, and paste into txtInput
        if (captchaDiv && captchaInput) {
            const rawCaptcha = captchaDiv.textContent || captchaDiv.innerText || "";
            const cleanCaptcha = rawCaptcha.replace(/\s+/g, "").trim();
            
            captchaInput.value = cleanCaptcha;
            captchaInput.dispatchEvent(new Event('input', { bubbles: true }));
            captchaInput.dispatchEvent(new Event('change', { bubbles: true }));

            console.log("[ECCS Extension] Auto-filled Captcha:", cleanCaptcha);
        }

        // Click Login Button
        const loginBtn = document.querySelector('.btn-login') || document.querySelector('input[type="submit"][value="Login"]');
        if (loginBtn) {
            loginBtn.click();
        } else if (typeof window.submitRequest === 'function') {
            window.submitRequest();
        } else if (document.forms[0]) {
            document.forms[0].submit();
        }
    }

    // Key binding: Ctrl + Shift + U triggers auto login
    document.addEventListener("keydown", e => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "u") {
            e.preventDefault();
            autoLogin();
        }
    });
})();
