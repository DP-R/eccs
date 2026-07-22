/**
 * ====================================================================
 * ECCS Page Bundler: Save Self-Contained Webpage
 * ====================================================================
 * Copy and paste this script directly into your browser's DevTools console.
 * It will bundle the active page's DOM, inline all stylesheets, convert 
 * images to base64 data URIs, inline local scripts, and download the page 
 * as a single, completely self-contained HTML file.
 */

(async () => {
    console.log("%c[ECCS Bundler] Starting full-page capture and asset bundling...", "color: #3b82f6; font-size: 16px; font-weight: bold;");

    // 1. Helper to fetch resources and convert them to Base64
    async function toDataURL(url) {
        try {
            const res = await fetch(url, { credentials: 'same-origin' });
            if (!res.ok) return url;
            const blob = await res.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.warn(`[ECCS Bundler] Could not fetch asset for base64 inlining: ${url}`);
            return url;
        }
    }

    // 2. Bundle all stylesheets
    console.log("[ECCS Bundler] Bundling and inlining CSS stylesheets...");
    let bundledCss = "";
    const styleSheets = Array.from(document.styleSheets);

    for (const sheet of styleSheets) {
        try {
            const rules = Array.from(sheet.cssRules || sheet.rules);
            rules.forEach(rule => {
                bundledCss += rule.cssText + "\n";
            });
        } catch (e) {
            // CORS cross-origin fallback: fetch external sheets
            if (sheet.href) {
                try {
                    const res = await fetch(sheet.href, { credentials: 'same-origin' });
                    if (res.ok) {
                        bundledCss += await res.text() + "\n";
                    }
                } catch (err) {
                    console.warn(`[ECCS Bundler] Failed to capture cross-origin CSS: ${sheet.href}`);
                }
            }
        }
    }

    // Remove original stylesheet links to prevent duplication
    Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach(el => el.remove());

    // Inject all compiled CSS into a new style tag
    const styleTag = document.createElement('style');
    styleTag.textContent = bundledCss;
    document.head.appendChild(styleTag);

    // 3. Inline all images (convert to base64)
    console.log("[ECCS Bundler] Converting images to self-contained Base64 URIs...");
    const images = Array.from(document.querySelectorAll('img, input[type="image"]'));
    for (const img of images) {
        const srcAttr = img.tagName.toLowerCase() === 'img' ? 'src' : 'src';
        const url = img.getAttribute(srcAttr);
        if (url && !url.startsWith('data:') && !url.startsWith('javascript:')) {
            const absoluteUrl = new URL(url, location.href).href;
            const base64Url = await toDataURL(absoluteUrl);
            img.setAttribute(srcAttr, base64Url);
        }
    }

    // 4. Inline all local JavaScript scripts
    console.log("[ECCS Bundler] Inlining local javascript scripts...");
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    for (const script of scripts) {
        const src = script.getAttribute('src');
        if (src && !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('javascript:')) {
            try {
                const absoluteUrl = new URL(src, location.href).href;
                const res = await fetch(absoluteUrl, { credentials: 'same-origin' });
                if (res.ok) {
                    const jsContent = await res.text();
                    const inlinedScript = document.createElement('script');
                    inlinedScript.textContent = jsContent;
                    script.parentNode.replaceChild(inlinedScript, script);
                }
            } catch (err) {
                console.warn(`[ECCS Bundler] Failed to inline script: ${src}`);
            }
        }
    }

    // 5. Package and trigger file download
    const filename = (document.title || "captured_page").replace(/[^a-z0-9]/gi, '_').toLowerCase() + "_bundled.html";
    const documentHtml = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
    
    const blob = new Blob([documentHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);

    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = filename;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(blobUrl);

    console.log(`%c[ECCS Bundler] Success! Downloaded self-contained page: ${filename}`, "color: #10b981; font-weight: bold; font-size: 14px;");
})();
