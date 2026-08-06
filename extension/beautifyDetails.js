// ==========================================
// ECCS Extension: Beautify CBE & CSB Single-Page Details View
// ==========================================

(function() {
    // Strictly run ONLY on Single-Bill View Pages, NOT on Multi-CBE List Views
    const path = window.location.pathname.toLowerCase();

    // Explicitly exclude viewCBEXI.do as requested by user
    if (path.includes('viewcbexi')) return;

    // Check if the page is a multi-row selection list page (where all CBEs/CSBs are listed)
    const isMultiRowList = Array.from(document.querySelectorAll('table')).some(table => {
        const inputs = table.querySelectorAll('input[type="checkbox"][name="selectedIndex"], input[type="checkbox"][name="indexes"], input[type="radio"][name="selectedIndex"]');
        return inputs.length >= 2;
    });

    // DO NOT render beautified summary on Multi-CBE / Multi-CSB list pages!
    if (isMultiRowList) return;

    // Must be a Single-Bill View / Details endpoint or page containing single document details
    const isSingleView = path.includes('view') || path.includes('details') || path.includes('csb') || path.includes('cbe') || path.includes('rboe') || path.includes('examreport');
    if (!isSingleView) return;

    if (document.getElementById('eccs-beautified-summary')) return;

    // --- 1. Helper to extract key-value pairs from ECCS standard tables ---
    const labelMap = {};

    function parseTables() {
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            const trs = table.querySelectorAll('tr');
            trs.forEach(tr => {
                const tds = tr.querySelectorAll('td, th');
                for (let i = 0; i < tds.length; i++) {
                    const text = (tds[i].textContent || '').replace(/\s+/g, ' ').trim().replace(/:$/, '').trim();
                    if (text && (i + 1 < tds.length)) {
                        const valTd = tds[i + 1];
                        if (valTd.tagName.toLowerCase() === 'th') continue; // Skip if value is a table header
                        
                        const valText = (valTd.textContent || '').replace(/\s+/g, ' ').trim();
                        const key = text.toLowerCase();
                        if (valText && valText !== ":" && !labelMap[key]) {
                            labelMap[key] = {
                                label: text,
                                value: valText,
                                element: valTd
                            };
                        }
                    }
                }
            });
        });
    }

    parseTables();

    // Helper getter with fallback keys
    function getValue(keys, defaultVal = "N/A") {
        for (const k of keys) {
            const normKey = k.toLowerCase();
            if (labelMap[normKey] && labelMap[normKey].value) {
                return labelMap[normKey].value;
            }
        }
        return defaultVal;
    }

    function getValueHtml(keys, defaultVal = "N/A") {
        for (const k of keys) {
            const normKey = k.toLowerCase();
            if (labelMap[normKey] && labelMap[normKey].element) {
                return labelMap[normKey].element.innerHTML.trim();
            }
        }
        return defaultVal;
    }

    // Ensure we are viewing a single bill document
    const documentNo = getValue(["cbe-xi number", "cbe-xii number", "cbe-xiii number", "cbe-xiv number", "cbe-xi no.", "cbe-xii no.", "cbe-xiii no.", "cbe-xiv no.", "csb number", "csb-iv number", "csb-v number", "csb-iii number", "csb reference number", "hawb number"], "");
    if (!documentNo || documentNo === "N/A" || documentNo.length > 50) return; // Skip if no document number found

    const courierName = getValue(["authorized courier name", "courier name", "name of authorized courier", "name of the authorized courier"], "N/A");
    const hawbNo = getValue(["hawb number", "hawb no.", "hawb no"], "N/A");
    
    // STRICT CHECK: Ensure it's a real details page
    if (courierName === "N/A" || hawbNo === "N/A" || hawbNo === "Flight Number" || hawbNo.length > 30) return;
    const consName = getValue(["consignee name", "name of consignee", "name of the consignee", "consignor name", "name of consignor", "name of the consignor"], "N/A");
    const portDest = getValue(["airport of destination", "port of destination", "destination airport", "destination port", "port of arrival", "airport of arrival"], "N/A");
    const weight = getValue(["manifest weight", "weight (in kg.)", "gross weight", "weight", "gross weight (kgs)", "gross weight (kgs.)"], "N/A");
    const totalVal = getValue(["invoice value", "total value", "fob value", "assessable value", "invoice value (rs.)", "assessable value (rs.)", "assessable value(rs.)"], "N/A");
    const currency = getValue(["invoice currency", "currency"], "");
    const status = getValue(["status", "current status"], "N/A");
    const flightNo = getValue(["international flight number", "flight number", "flight no.", "flight name"], "N/A");

    // Parse Items Table if available
    let itemsRowsHtml = '';
    const itemTables = Array.from(document.querySelectorAll('table')).filter(t => {
        const text = t.textContent.toLowerCase();
        return text.includes('ctsh') || text.includes('item description') || text.includes('goods description');
    });

    if (itemTables.length > 0) {
        const itemTrs = Array.from(itemTables[itemTables.length - 1].querySelectorAll('tr')).slice(1);
        itemTrs.forEach(tr => {
            const tds = tr.querySelectorAll('td');
            if (tds.length >= 4) {
                itemsRowsHtml += `
                    <tr>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${tds[0]?.textContent.trim() || '-'}</td>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${tds[1]?.textContent.trim() || '-'}</td>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${tds[2]?.textContent.trim() || '-'}</td>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${tds[3]?.textContent.trim() || '-'}</td>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${tds[4]?.textContent.trim() || '-'}</td>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${tds[5]?.textContent.trim() || '-'}</td>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${tds[6]?.innerHTML.trim() || '-'}</td>
                    </tr>
                `;
            }
        });
    }

    if (!itemsRowsHtml) {
        itemsRowsHtml = `<tr><td colspan="7" style="padding: 8px; text-align: center; color: #64748b;">No item breakdown available.</td></tr>`;
    }

    // --- 2. Construct Modern Single-Bill Dashboard ---
    const summaryContainer = document.createElement('div');
    summaryContainer.id = 'eccs-beautified-summary';
    summaryContainer.style = `
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 16px;
        margin: 15px auto;
        max-width: 1200px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    `;

    summaryContainer.innerHTML = `
        <style>
            #eccs-beautified-summary .details-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 12px;
                margin-bottom: 16px;
            }
            #eccs-beautified-summary .details-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 12px;
            }
            #eccs-beautified-summary .card-label {
                font-size: 10px;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 4px;
            }
            #eccs-beautified-summary .card-value {
                font-size: 13px;
                font-weight: 600;
                color: #0f172a;
                word-break: break-word;
            }
            #eccs-beautified-summary .section-title {
                font-size: 14px;
                font-weight: 700;
                color: #1e293b;
                border-bottom: 2px solid #2563eb;
                padding-bottom: 4px;
                margin-bottom: 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            #eccs-beautified-summary .tables-layout {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 16px;
            }
            @media (max-width: 900px) {
                #eccs-beautified-summary .tables-layout {
                    grid-template-columns: 1fr;
                }
            }
            #eccs-beautified-summary .details-box {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 12px;
            }
            #eccs-beautified-summary .details-title {
                font-size: 12px;
                font-weight: 700;
                color: #334155;
                margin-top: 0;
                margin-bottom: 8px;
                padding-bottom: 4px;
                border-bottom: 1px solid #e2e8f0;
            }
            .item-summary-table, .ccr-detail-table, .rms-detail-table {
                width: 100% !important;
                border-collapse: collapse !important;
                font-size: 11px !important;
                margin: 0 !important;
            }
            .item-summary-table th, .ccr-detail-table th, .rms-detail-table th {
                background-color: #f1f5f9 !important;
                color: #334155 !important;
                font-weight: 700 !important;
                text-align: left !important;
                padding: 6px 8px !important;
                border: 1px solid #cbd5e1 !important;
            }
            .item-summary-table td, .ccr-detail-table td, .rms-detail-table td {
                padding: 6px 8px !important;
                border: 1px solid #e2e8f0 !important;
                color: #0f172a !important;
                font-size: 11px !important;
                background-color: #ffffff !important;
            }
            .doc-badge {
                display: inline-block;
                background: #eff6ff;
                color: #2563eb;
                border: 1px solid #bfdbfe;
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                text-decoration: none;
                margin: 3px 6px 3px 0;
            }
            .doc-badge:hover {
                background: #dbeafe;
            }
        </style>

        <div class="section-title">
            <span>ECCS Bill Summary: ${documentNo}</span>
            <span style="font-size: 11px; font-weight: 600; background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 4px;">Status: ${status}</span>
        </div>

        <div class="details-grid">
            <div class="details-card">
                <div class="card-label">Document / HAWB No.</div>
                <div class="card-value">${documentNo} / ${hawbNo}</div>
            </div>
            <div class="details-card">
                <div class="card-label">Authorized Courier</div>
                <div class="card-value">${courierName}</div>
            </div>
            <div class="details-card">
                <div class="card-label">Consignee / Consignor</div>
                <div class="card-value">${consName}</div>
            </div>
            <div class="details-card">
                <div class="card-label">Destination & Flight</div>
                <div class="card-value">${portDest} (${flightNo})</div>
            </div>
            <div class="details-card">
                <div class="card-label">Weight & Value</div>
                <div class="card-value">${weight} Kg | ${currency} ${totalVal}</div>
            </div>
        </div>

        <div class="tables-layout">
            <!-- Left: Item Breakdown -->
            <div class="details-box">
                <h3 class="details-title">Declared Items Breakdown</h3>
                <div style="overflow-x: auto;">
                    <table class="item-summary-table">
                        <thead>
                            <tr>
                                <th>Sl. No.</th>
                                <th>CTSH</th>
                                <th>Nature</th>
                                <th>Item Description</th>
                                <th>Origin</th>
                                <th>Qty (UQC)</th>
                                <th>Details Link</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Right: Instructions Box (CCR, RMS & Supporting Docs) -->
            <div class="details-box">
                <h3 class="details-title">Customs Compliance & Attachments</h3>
                <div class="details-content" style="display: flex; flex-direction: column; gap: 12px;">
                    <div>
                        <strong style="color: #475569; font-size: 10px; text-transform: uppercase; display: block; margin-bottom: 4px;">CCR Instructions (Compulsory Compliance):</strong>
                        <div id="ccr-details-content" style="max-height: 200px; overflow-y: auto;">
                            <div style="color: #64748b;">Loading CCR details...</div>
                        </div>
                    </div>
                    <hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 4px 0;">
                    <div>
                        <strong style="color: #475569; font-size: 10px; text-transform: uppercase; display: block; margin-bottom: 4px;">RMS Instructions (Risk Management System):</strong>
                        <div id="rms-details-content" style="max-height: 200px; overflow-y: auto;">
                            <div style="color: #64748b;">Loading RMS details...</div>
                        </div>
                    </div>
                    <hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 4px 0;">
                    <div>
                        <strong style="color: #475569; font-size: 10px; text-transform: uppercase; display: block; margin-bottom: 4px;">Attached Supporting Documents:</strong>
                        <div id="supporting-docs-content" style="max-height: 150px; overflow-y: auto;">
                            <div style="color: #64748b;">Loading supporting documents...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Ensure the original main layout is visible
    const originalMain = document.querySelector('.main-container');
    if (originalMain) originalMain.style.display = '';
    const originalFooter = document.querySelector('footer');
    if (originalFooter) originalFooter.style.display = '';

    // Prepend the summary table to a safer container if available, else body
    const mainContent = document.querySelector('.main-container') || document.querySelector('form') || document.body;
    mainContent.insertBefore(summaryContainer, mainContent.firstChild);

    // --- 3. Clean and Extract Instruction HTML Without IFrames or Headers ---
    function cleanInstructionHTML(html, targetKeyword) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        doc.querySelectorAll('header, footer, nav, script, iframe, style, .main-header, .navbar, .header-bottom, img[src*="logo"]').forEach(el => el.remove());

        const candidateTables = Array.from(doc.querySelectorAll('table'));
        let targetTable = candidateTables.find(table => {
            const txt = table.textContent.toLowerCase();
            return (txt.includes(targetKeyword) || txt.includes("instruction") || txt.includes("compliance") || txt.includes("remarks") || txt.includes("details")) &&
                   !table.querySelector('header, nav, .navbar');
        });

        if (!targetTable && candidateTables.length > 0) {
            targetTable = candidateTables.find(t => t.querySelectorAll('tr').length >= 1 && t.textContent.trim().length > 5);
        }

        if (targetTable) {
            targetTable.removeAttribute('style');
            targetTable.removeAttribute('width');
            targetTable.removeAttribute('border');
            targetTable.removeAttribute('cellspacing');
            targetTable.removeAttribute('cellpadding');
            targetTable.className = targetKeyword === 'ccr' ? 'ccr-detail-table' : 'rms-detail-table';
            
            targetTable.querySelectorAll('td, th').forEach(cell => {
                cell.removeAttribute('style');
                cell.removeAttribute('width');
                cell.removeAttribute('height');
                cell.removeAttribute('bgcolor');
            });

            targetTable.querySelectorAll('a').forEach(a => {
                const href = a.getAttribute('href') || '';
                if (href.startsWith('javascript:')) {
                    a.setAttribute('target', '_blank');
                    a.style.color = '#2563eb';
                    a.style.fontWeight = 'bold';
                }
            });

            return targetTable.outerHTML;
        }

        const cleanText = doc.body ? doc.body.textContent.replace(/\s+/g, ' ').trim() : "";
        return cleanText ? `<div style="padding: 4px; color: #334155; font-size: 11px;">${cleanText}</div>` : `<div style="color: #64748b;">No ${targetKeyword.toUpperCase()} details required.</div>`;
    }

    // --- 4. Populate CCR, RMS, and Supporting Documents (Both Page & Background) ---

    // A. CCR Instructions
    const ccrContainer = document.getElementById('ccr-details-content');
    const ccrLink = document.querySelector('a[href*="viewCCRIntructions"]');
    const pageCcrText = getValueHtml(["ccr instruction", "ccr instructions", "ccr remarks", "ccr details"]);

    if (ccrLink && ccrContainer) {
        let url = ccrLink.getAttribute('href');
        if (url.startsWith("javascript:")) {
            const matches = url.match(/'([^']+)'/g);
            if (matches && matches.length >= 2) {
                if (matches.length >= 3) {
                    url = `${matches[0].replace(/'/g, '')}?refNo=${matches[1].replace(/'/g, '')}&hawbId=${matches[2].replace(/'/g, '')}`;
                } else {
                    url = `${matches[0].replace(/'/g, '')}?refNo=${matches[1].replace(/'/g, '')}`;
                }
            }
        }
        url += (url.includes('?') ? '&' : '?') + '_ts=' + new Date().getTime(); // Cache buster
        fetch(url, { cache: "no-store" })
            .then(res => res.text())
            .then(html => { ccrContainer.innerHTML = cleanInstructionHTML(html, 'ccr'); })
            .catch(() => { ccrContainer.innerHTML = pageCcrText !== "N/A" ? `<div style="font-size: 11px;">${pageCcrText}</div>` : `<div style="color: #64748b;">No CCR instructions required.</div>`; });
    } else if (ccrContainer) {
        ccrContainer.innerHTML = (pageCcrText && pageCcrText !== "N/A") ? `<div style="font-size: 11px;">${pageCcrText}</div>` : `<div style="color: #64748b;">No CCR instructions required.</div>`;
    }

    // B. RMS Instructions
    const rmsContainer = document.getElementById('rms-details-content');
    const rmsLink = document.querySelector('a[href*="viewRMSIntructions"]') || document.querySelector('a[href*="viewRMS"]');
    const pageRmsText = getValueHtml(["rms instruction", "rms instructions", "rms remarks", "rms details", "rms action"]);

    if (rmsLink && rmsContainer) {
        let url = rmsLink.getAttribute('href');
        if (url.startsWith("javascript:")) {
            const matches = url.match(/'([^']+)'/g);
            if (matches && matches.length >= 2) {
                if (matches.length >= 3) {
                    url = `${matches[0].replace(/'/g, '')}?refNo=${matches[1].replace(/'/g, '')}&hawbId=${matches[2].replace(/'/g, '')}`;
                } else {
                    url = `${matches[0].replace(/'/g, '')}?refNo=${matches[1].replace(/'/g, '')}`;
                }
            }
        }
        url += (url.includes('?') ? '&' : '?') + '_ts=' + new Date().getTime(); // Cache buster
        fetch(url, { cache: "no-store" })
            .then(res => res.text())
            .then(html => { rmsContainer.innerHTML = cleanInstructionHTML(html, 'rms'); })
            .catch(() => { rmsContainer.innerHTML = pageRmsText !== "N/A" ? `<div style="font-size: 11px;">${pageRmsText}</div>` : `<div style="color: #64748b;">No RMS instructions.</div>`; });
    } else if (rmsContainer) {
        rmsContainer.innerHTML = (pageRmsText && pageRmsText !== "N/A") ? `<div style="font-size: 11px;">${pageRmsText}</div>` : `<div style="color: #64748b;">No RMS instructions.</div>`;
    }

    // C. Supporting Documents (Scans page links + background fetch)
    const docContainer = document.getElementById('supporting-docs-content');
    const docLinksOnPage = Array.from(document.querySelectorAll('a')).filter(a => {
        const txt = (a.textContent || '').toLowerCase();
        const href = (a.getAttribute('href') || '').toLowerCase();
        return href.includes('listexpdocuments') || href.includes('uploadedfile') || txt.includes('.pdf') || txt.includes('.tif') || txt.includes('.jpg') || txt.includes('.png') || txt.includes('view documents');
    });

    if (docContainer) {
        if (docLinksOnPage.length > 0) {
            let badgesHtml = '';
            docLinksOnPage.forEach(a => {
                const fileName = a.textContent.trim() || 'Attached Document';
                const href = a.getAttribute('href') || '#';
                badgesHtml += `<a class="doc-badge" href="${href}" target="_blank">📄 ${fileName}</a>`;
            });
            docContainer.innerHTML = badgesHtml;
        } else {
            docContainer.innerHTML = `<div style="color: #64748b;">No attached supporting documents.</div>`;
        }
    }
})();
