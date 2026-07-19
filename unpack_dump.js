const fs = require('fs');
const path = require('path');

// Usage: node unpack_dump.js <path-to-ECCS_Site_Dump.json> [output-dir]
const dumpFilePath = process.argv[2];
const outputDir = process.argv[3] || path.join(__dirname, 'unpacked_dump');

if (!dumpFilePath) {
    console.error("Usage: node unpack_dump.js <path-to-ECCS_Site_Dump.json> [output-dir]");
    process.exit(1);
}

try {
    const rawData = fs.readFileSync(dumpFilePath, 'utf8');
    const dump = JSON.parse(rawData);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`Unpacking ${Object.keys(dump.pages).length} pages into ${outputDir}...`);

    let indexHtml = `<!DOCTYPE html><html><head><title>ECCS Dump Index</title><style>
        body { font-family: sans-serif; margin: 20px; background: #0f172a; color: #f8fafc; }
        h1 { color: #3b82f6; }
        ul { list-style: none; padding: 0; }
        li { margin: 8px 0; background: #1e293b; padding: 10px; border-radius: 6px; }
        a { color: #38bdf8; text-decoration: none; font-weight: bold; }
        a:hover { text-decoration: underline; }
        .meta { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    </style></head><body>
        <h1>ECCS Dump Index</h1>
        <p>Dump Date: ${dump.timestamp}</p>
        <ul>`;

    let pageIdx = 1;
    for (const [url, pageData] of Object.entries(dump.pages)) {
        const urlObj = new URL(url);
        let safeName = path.basename(urlObj.pathname).replace(/[^a-zA-Z0-9_\-]/g, '_');
        if (!safeName || safeName === '_') safeName = `page_${pageIdx}`;
        const fileName = `${safeName}_${pageIdx}.html`;
        const filePath = path.join(outputDir, fileName);

        fs.writeFileSync(filePath, pageData.html || '', 'utf8');
        console.log(`Saved: ${fileName}`);

        indexHtml += `<li>
            <a href="${fileName}" target="_blank">${pageData.title || fileName}</a>
            <div class="meta">Original URL: ${url} | Forms: ${pageData.forms ? pageData.forms.length : 0} | Buttons: ${pageData.buttons ? pageData.buttons.length : 0}</div>
        </li>`;

        pageIdx++;
    }

    indexHtml += `</ul></body></html>`;
    fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml, 'utf8');

    // Save summary meta JSON
    fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify({
        timestamp: dump.timestamp,
        menuTree: dump.menuTree,
        actions: dump.actions
    }, null, 2), 'utf8');

    console.log(`\nUnpack complete! Open ${path.join(outputDir, 'index.html')} to browse captured pages.`);

} catch (err) {
    console.error("Failed to unpack dump file:", err);
}
