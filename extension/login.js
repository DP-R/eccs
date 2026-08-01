// ==========================================
// ECCS Auto Login & Captcha Solver (Ctrl + Shift + U)
// ==========================================

(function() {
    function setInputValue(input, val) {
        if (!input) return;
        input.value = ''; // Explicitly clear any existing or browser autofilled text
        input.value = val; // Direct replacement (overwrites completely, never appends)
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function autoLogin() {
        const usernameInput = document.getElementById("username");
        const passwordInput = document.getElementById("password");
        const captchaInput = document.getElementById("txtInput");
        const captchaDiv = document.getElementById("mainCaptcha") || document.querySelector(".log-captcha + *");

        // Always replace username and password with fresh credentials
        setInputValue(usernameInput, "14937314");
        setInputValue(passwordInput, "Codelink@5");

        // Copy captcha text, strip all whitespaces, and paste cleanly into txtInput
        if (captchaDiv && captchaInput) {
            const rawCaptcha = captchaDiv.textContent || captchaDiv.innerText || "";
            const cleanCaptcha = rawCaptcha.replace(/\s+/g, "").trim();
            
            setInputValue(captchaInput, cleanCaptcha);
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
