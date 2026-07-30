// ==========================================
// ECCS Extension: Automated Continuous Session Logger
// Automatically records all user actions, navigation, clicks, inputs,
// network requests, and errors from start to end.
// Download log anytime with Ctrl + Shift + L or Ctrl + Shift + D
// ==========================================

(function() {
    const MAX_LOG_ENTRIES = 5000;

    // Load existing history from localStorage
    function getLogHistory() {
        try {
            return JSON.parse(localStorage.getItem('eccs_session_logs') || '[]');
        } catch (e) {
            return [];
        }
    }

    function saveLogHistory(logs) {
        try {
            if (logs.length > MAX_LOG_ENTRIES) {
                logs = logs.slice(logs.length - MAX_LOG_ENTRIES);
            }
            localStorage.setItem('eccs_session_logs', JSON.stringify(logs));
        } catch (e) {
            // Ignore quota exceeded
        }
    }

    function appendLog(level, category, message, data = null) {
        const time = new Date().toISOString();
        const page = window.location.pathname;
        const entry = { time, level, category, page, message, data };
        
        const logs = getLogHistory();
        logs.push(entry);
        saveLogHistory(logs);

        // Also output to console
        const prefix = `[ECCS Log ${time}] [${category}]`;
        if (level === 'ERROR') console.error(prefix, message, data || '');
        else if (level === 'WARN') console.warn(prefix, message, data || '');
        else console.log(prefix, message, data || '');
    }

    // Export global window logger API
    window.eccsLog = {
        info: (msg, data) => appendLog('INFO', 'EXTENSION', msg, data),
        warn: (msg, data) => appendLog('WARN', 'EXTENSION', msg, data),
        error: (msg, data) => appendLog('ERROR', 'EXTENSION', msg, data),
        getLogs: getLogHistory,
        clear: () => localStorage.removeItem('eccs_session_logs')
    };

    // Log Page Load Event immediately
    appendLog('INFO', 'NAVIGATION', `Page Loaded: ${window.location.href}`, {
        title: document.title,
        referrer: document.referrer,
        userAgent: navigator.userAgent
    });

    // --- 1. Intercept User Click Events ---
    document.addEventListener('click', e => {
        const target = e.target;
        if (!target) return;

        const tagName = target.tagName ? target.tagName.toUpperCase() : '';
        if (['A', 'BUTTON', 'INPUT'].includes(tagName) || target.closest('a, button')) {
            const text = (target.textContent || target.value || target.alt || '').replace(/\s+/g, ' ').trim();
            const href = target.getAttribute('href') || target.getAttribute('onclick') || target.getAttribute('onmouseover') || '';
            
            appendLog('INFO', 'USER_CLICK', `Clicked ${tagName} "${text.substring(0, 40)}"`, {
                id: target.id || '',
                className: target.className || '',
                href: href.substring(0, 100)
            });
        }
    }, true);

    // --- 2. Intercept Input & HAWB Submissions ---
    document.addEventListener('change', e => {
        const target = e.target;
        if (!target || !target.name) return;

        if (['hawbNo', 'csbNumber', 'csbNoInput', 'searchcbexi', 'selectedIndex'].includes(target.name) || target.id === 'csbNoInput') {
            appendLog('INFO', 'USER_INPUT', `Field Changed [${target.name || target.id}]: "${target.value}"`);
        }
    }, true);

    // --- 3. Intercept Network Fetch Requests ---
    const originalFetch = window.fetch;
    if (originalFetch) {
        window.fetch = async function(...args) {
            const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
            const method = (args[1] && args[1].method) ? args[1].method.toUpperCase() : 'GET';
            const startTime = Date.now();

            appendLog('INFO', 'NETWORK_REQ', `${method} ${url}`, { body: args[1] ? args[1].body : null });

            try {
                const response = await originalFetch.apply(this, args);
                const duration = Date.now() - startTime;
                appendLog('INFO', 'NETWORK_RES', `${method} ${url} [${response.status}] (${duration}ms)`);
                return response;
            } catch (err) {
                const duration = Date.now() - startTime;
                appendLog('ERROR', 'NETWORK_ERR', `${method} ${url} FAILED (${duration}ms): ${err.message}`);
                throw err;
            }
        };
    }

    // --- 4. Intercept Uncaught Errors & Rejections ---
    window.addEventListener('error', e => {
        appendLog('ERROR', 'UNCAUGHT_ERR', e.message, {
            filename: e.filename,
            lineno: e.lineno,
            colno: e.colno
        });
    });

    window.addEventListener('unhandledrejection', e => {
        appendLog('ERROR', 'UNHANDLED_REJECTION', e.reason ? String(e.reason) : 'Promise rejection');
    });

    // --- 5. Log Export Function (Ctrl + Shift + L or Ctrl + Shift + D) ---
    function exportLogsToFile() {
        const logs = getLogHistory();
        if (logs.length === 0) {
            alert("[ECCS Extension] Session log is currently empty.");
            return;
        }

        let fileContent = `==========================================\n` +
                          `ECCS EXTENSION CONTINUOUS SESSION LOG FILE\n` +
                          `Generated: ${new Date().toLocaleString()}\n` +
                          `Total Recorded Entries: ${logs.length}\n` +
                          `==========================================\n\n`;

        logs.forEach((entry, idx) => {
            fileContent += `[#${idx + 1}] [${entry.time}] [${entry.level}] [${entry.category}] Page: ${entry.page}\n`;
            fileContent += `Message: ${entry.message}\n`;
            if (entry.data) {
                fileContent += `Data: ${JSON.stringify(entry.data)}\n`;
            }
            fileContent += `------------------------------------------\n`;
        });

        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
        
        a.href = URL.createObjectURL(blob);
        a.download = `eccs_session_logs_${dateStr}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        if (window.showToast) window.showToast('LOG EXPORTED');
    }

    document.addEventListener('keydown', e => {
        // Ctrl + Shift + L  OR  Ctrl + Shift + D exports log file
        if (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === 'l' || e.key.toLowerCase() === 'd')) {
            e.preventDefault();
            exportLogsToFile();
        }
    });

    console.log("[ECCS Extension] Continuous session logger active. Logs recorded automatically.");
})();
