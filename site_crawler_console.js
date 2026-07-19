/**
 * ====================================================================
 * ECCS Safe Automated Site Crawling Console Script
 * ====================================================================
 * Copy and paste this script directly into your browser's DevTools console 
 * while logged into the ECCS portal.
 * 
 * Safety & Form Inspection Features:
 * 1. Strictly READ-ONLY (uses GET fetch only, NEVER calls form.submit() or click()).
 * 2. Blacklists any mutating endpoints (e.g. submit, update, delete, save, clear).
 * 3. Form Validation Analyzer: Statically analyzes form fields and identifies
 *    compulsory/required fields without submitting any form.
 * 4. Exports a single JSON package with all captured pages, forms, and validation specs.
 */

(async () => {
    console.log("%c[ECCS Safe Crawler] Starting Read-Only Site Exploration...", "color: #3b82f6; font-size: 16px; font-weight: bold;");

    const CONFIG = {
        delayMs: 1200,              // Delay between GET requests (ms) to avoid server rate-limiting
        maxDepth: 3,                // Crawl depth limit
        baseUrl: location.origin    // Target origin
    };

    // Explicit Blacklist for any state-modifying or session-ending URLs
    const MUTATION_BLACKLIST = [
        'submit', 'update', 'delete', 'remove', 'save', 'insert',
        'create', 'clear', 'logout', 'logOut', 'cancel', 'process', 'modify'
    ];

    const siteData = {
        timestamp: new Date().toISOString(),
        startUrl: location.href,
        pages: {},       // url -> { html, title, forms, buttons }
        actions: [],     // discovered JS / button actions
        menuTree: []     // menu hierarchy
    };

    const visited = new Set();
    const queue = [];

    // --- Helper: Create Floating Progress HUD ---
    const hud = document.createElement('div');
    hud.id = 'eccs-crawler-hud';
    hud.style = `
        position: fixed; top: 15px; right: 15px; z-index: 2147483647;
        background: #0f172a; color: #f8fafc; border: 2px solid #3b82f6;
        padding: 14px; border-radius: 8px; font-family: monospace; font-size: 13px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5); min-width: 290px; max-width: 400px;
    `;
    hud.innerHTML = `
        <div style="font-weight:bold; color:#60a5fa; margin-bottom:6px; font-size:14px;">ECCS Safe Crawler (Read-Only)</div>
        <div>Status: <span id="eccs-hud-status" style="color:#facc15;">Initializing...</span></div>
        <div>Captured Pages: <span id="eccs-hud-count" style="color:#4ade80;">0</span></div>
        <div>Queue Remaining: <span id="eccs-hud-queue">0</span></div>
        <div id="eccs-hud-current" style="color:#94a3b8; font-size:11px; margin-top:6px; word-break:break-all;">-</div>
    `;
    document.body.appendChild(hud);

    function updateHUD(status, currentUrl = '') {
        const statusEl = document.getElementById('eccs-hud-status');
        const countEl = document.getElementById('eccs-hud-count');
        const queueEl = document.getElementById('eccs-hud-queue');
        const currentEl = document.getElementById('eccs-hud-current');

        if (statusEl) statusEl.textContent = status;
        if (countEl) countEl.textContent = Object.keys(siteData.pages).length;
        if (queueEl) queueEl.textContent = queue.length;
        if (currentEl) currentEl.textContent = currentUrl ? currentUrl.replace(CONFIG.baseUrl, '') : '-';
    }

    // --- Check if URL is Safe for GET Fetching ---
    function isSafeUrl(urlStr) {
        const lower = urlStr.toLowerCase();
        return !MUTATION_BLACKLIST.some(keyword => lower.includes(keyword.toLowerCase()));
    }

    // --- Normalize & Add URL to Queue ---
    function enqueue(url, depth = 1) {
        if (!url) return;

        // Clean javascript: pseudo-links
        if (url.startsWith('javascript:')) {
            parseJavaScriptAction(url);
            return;
        }

        // Convert relative paths to absolute
        let absoluteUrl;
        try {
            absoluteUrl = new URL(url, location.href).href;
        } catch (e) {
            return;
        }

        // Only stay within the /eccs/ domain/application path
        if (!absoluteUrl.startsWith(CONFIG.baseUrl) || !absoluteUrl.includes('/eccs/')) {
            return;
        }

        // Ensure URL is non-mutating / read-only
        if (!isSafeUrl(absoluteUrl)) {
            siteData.actions.push({
                type: 'Blacklisted_Mutation_Endpoint',
                url: absoluteUrl,
                contextUrl: location.href
            });
            return;
        }

        if (!visited.has(absoluteUrl)) {
            visited.add(absoluteUrl);
            queue.push({ url: absoluteUrl, depth });
            updateHUD('Queued');
        }
    }

    // --- Extract JS Actions (e.g., CreateExamReport, submitCheckBoxForm) ---
    function parseJavaScriptAction(jsString) {
        const actionMatch = jsString.match(/([a-zA-Z0-9_]+)\((.*?)\)/);
        if (actionMatch) {
            const funcName = actionMatch[1];
            const rawArgs = actionMatch[2];
            
            // Extract URL strings inside function calls (e.g. 'createExamReportCSB4.do?ini=Y')
            const urlMatches = rawArgs.match(/['"]([^'"]+\.do[^'"]*)['"]/g);
            if (urlMatches) {
                urlMatches.forEach(quotedUrl => {
                    const cleanUrl = quotedUrl.replace(/['"]/g, '');
                    enqueue(cleanUrl);
                });
            }

            siteData.actions.push({
                function: funcName,
                rawCall: jsString,
                contextUrl: location.href
            });
        }
    }

    // --- Static Form Field Validation Analysis ---
    function isFieldCompulsory(inputEl, formEl) {
        // 1. Native HTML required attribute
        if (inputEl.required || inputEl.getAttribute('required') !== null) {
            return true;
        }

        // 2. Check label in parent or preceding TD for mandatory indicators (* or red color)
        const parentTd = inputEl.closest('td');
        if (parentTd) {
            const prevTd = parentTd.previousElementSibling;
            const targetTds = [parentTd, prevTd].filter(Boolean);

            for (const td of targetTds) {
                if (td.querySelector('font[color="red"], span.captionInRed, .mandatory') || td.textContent.includes('*')) {
                    return true;
                }
            }
        }

        return false;
    }

    // --- Parse Page DOM for Metadata, Forms, and Safe Links ---
    function extractPageInfo(htmlText, pageUrl) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        const title = doc.title ? doc.title.trim() : '';
        
        // 1. Extract Forms & Input Validation Specs
        const forms = Array.from(doc.querySelectorAll('form')).map(f => {
            const inputs = Array.from(f.querySelectorAll('input, select, textarea')).map(i => ({
                name: i.name || i.id || '',
                type: i.type || i.tagName.toLowerCase(),
                value: i.value || '',
                isCompulsory: isFieldCompulsory(i, f),
                options: i.tagName.toLowerCase() === 'select' ? Array.from(i.options).map(o => ({
                    text: o.text.trim(),
                    value: o.value
                })) : undefined
            }));

            return {
                name: f.name || '',
                action: f.getAttribute('action') || '',
                method: (f.getAttribute('method') || 'GET').toUpperCase(),
                isMutationForm: !isSafeUrl(f.getAttribute('action') || ''),
                inputs
            };
        });

        // 2. Extract Buttons
        const buttons = Array.from(doc.querySelectorAll('input[type="submit"], input[type="button"], button, a.hyperLink, a.dropdown-item')).map(b => ({
            text: (b.innerText || b.value || '').trim(),
            tag: b.tagName.toLowerCase(),
            type: b.type || '',
            href: b.getAttribute('href') || '',
            onclick: b.getAttribute('onclick') || ''
        }));

        // 3. Discover Links on Page
        doc.querySelectorAll('a[href]').forEach(a => {
            enqueue(a.getAttribute('href'));
        });

        // 4. Discover Onclick Handlers
        doc.querySelectorAll('[onclick]').forEach(el => {
            const onclick = el.getAttribute('onclick');
            if (onclick) parseJavaScriptAction(onclick);
        });

        return {
            title,
            forms,
            buttons,
            html: htmlText
        };
    }

    // --- Step 1: Scan Navbar & Current Page ---
    updateHUD('Scanning Navbar');
    document.querySelectorAll('.navbar-nav a[href], .dropdown-menu a[href]').forEach(a => {
        const text = a.innerText.trim();
        const href = a.getAttribute('href');
        siteData.menuTree.push({ text, href });
        enqueue(href, 1);
    });

    siteData.pages[location.href] = extractPageInfo(document.documentElement.outerHTML, location.href);

    // --- Step 2: Crawl Safe Queue ---
    while (queue.length > 0) {
        const item = queue.shift();
        updateHUD('Fetching Page...', item.url);

        try {
            // Safe GET request only
            const res = await fetch(item.url, { method: 'GET', credentials: 'same-origin' });
            if (res.ok) {
                const text = await res.text();
                siteData.pages[item.url] = extractPageInfo(text, item.url);
                console.log(`%c[Captured View] (${Object.keys(siteData.pages).length}) ${item.url}`, "color: #10b981;");
            } else {
                console.warn(`[HTTP ${res.status}] ${item.url}`);
            }
        } catch (err) {
            console.error(`[Error] Safe GET failed for ${item.url}:`, err);
        }

        // Rate-limiting delay
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayMs));
    }

    updateHUD('Completed!');

    // --- Step 3: Trigger Download of JSON Package ---
    const dataStr = JSON.stringify(siteData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = `ECCS_Site_Dump_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(blobUrl);

    console.log("%c[ECCS Safe Crawler] Read-only Crawl Complete! Exported JSON package.", "color: #3b82f6; font-size: 16px; font-weight: bold;");
    alert(`ECCS Safe Crawl Completed!\n\nCaptured Pages: ${Object.keys(siteData.pages).length}\nParsed Actions/Endpoints: ${siteData.actions.length}\n\nDownloaded file: ECCS_Site_Dump_${new Date().toISOString().slice(0,10)}.json`);
})();
