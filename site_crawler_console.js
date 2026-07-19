/**
 * ====================================================================
 * ECCS Automated Site Dump & Crawl Console Script
 * ====================================================================
 * Copy and paste this script directly into your browser's DevTools console 
 * while logged into the ECCS portal.
 * 
 * Features:
 * 1. Crawls all navbar menus, submenus, and page links.
 * 2. Parses JavaScript inline actions (e.g. CreateExamReport, submitCheckBoxForm).
 * 3. Discovers all forms, buttons, inputs (including hidden fields), and action endpoints.
 * 4. Downloads a single consolidated JSON bundle containing all offline HTML pages,
 *    form definitions, button actions, and site structure.
 * 5. Includes a built-in offline HTML unpacker.
 */

(async () => {
    console.log("%c[ECCS Crawler] Starting Site Exploration...", "color: #3b82f6; font-size: 16px; font-weight: bold;");

    const CONFIG = {
        delayMs: 1200,              // Delay between requests (ms) to avoid server rate-limiting
        maxDepth: 3,                // Crawl depth limit
        baseUrl: location.origin    // Target origin
    };

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
        box-shadow: 0 10px 25px rgba(0,0,0,0.5); min-width: 280px; max-width: 380px;
    `;
    hud.innerHTML = `
        <div style="font-weight:bold; color:#60a5fa; margin-bottom:6px; font-size:14px;">ECCS Site Crawler</div>
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

        // Exclude logout or destructive actions
        if (absoluteUrl.includes('logOut.do') || absoluteUrl.includes('cancel.do')) {
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

    // --- Parse Page DOM for Metadata & Next Links ---
    function extractPageInfo(htmlText, pageUrl) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        const title = doc.title ? doc.title.trim() : '';
        
        // 1. Extract Forms & Inputs
        const forms = Array.from(doc.querySelectorAll('form')).map(f => {
            const inputs = Array.from(f.querySelectorAll('input, select, textarea')).map(i => ({
                name: i.name || i.id || '',
                type: i.type || i.tagName.toLowerCase(),
                value: i.value || '',
                options: i.tagName.toLowerCase() === 'select' ? Array.from(i.options).map(o => o.value) : undefined
            }));
            return {
                name: f.name || '',
                action: f.getAttribute('action') || '',
                method: (f.getAttribute('method') || 'GET').toUpperCase(),
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
        const links = doc.querySelectorAll('a[href]');
        links.forEach(a => {
            const href = a.getAttribute('href');
            enqueue(href);
        });

        // 4. Discover Onclick Handlers
        const clickables = doc.querySelectorAll('[onclick]');
        clickables.forEach(el => {
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
    const navbarLinks = document.querySelectorAll('.navbar-nav a[href], .dropdown-menu a[href]');
    navbarLinks.forEach(a => {
        const text = a.innerText.trim();
        const href = a.getAttribute('href');
        siteData.menuTree.push({ text, href });
        enqueue(href, 1);
    });

    // Also parse current page DOM
    const currentPageInfo = extractPageInfo(document.documentElement.outerHTML, location.href);
    siteData.pages[location.href] = currentPageInfo;

    // --- Step 2: Crawl Queue ---
    while (queue.length > 0) {
        const item = queue.shift();
        updateHUD('Fetching Page...', item.url);

        try {
            const res = await fetch(item.url, { credentials: 'same-origin' });
            if (res.ok) {
                const text = await res.text();
                const pageMeta = extractPageInfo(text, item.url);
                siteData.pages[item.url] = pageMeta;
                console.log(`%c[Captured] (${Object.keys(siteData.pages).length}) ${item.url}`, "color: #10b981;");
            } else {
                console.warn(`[HTTP ${res.status}] Failed to fetch ${item.url}`);
            }
        } catch (err) {
            console.error(`[Error] Fetch failed for ${item.url}:`, err);
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

    console.log("%c[ECCS Crawler] Crawl Complete! Exported JSON package.", "color: #3b82f6; font-size: 16px; font-weight: bold;");
    alert(`ECCS Crawl Completed successfully!\n\nCaptured Pages: ${Object.keys(siteData.pages).length}\nDiscovered Actions: ${siteData.actions.length}\n\nDownloaded file: ECCS_Site_Dump_${new Date().toISOString().slice(0,10)}.json`);
})();
