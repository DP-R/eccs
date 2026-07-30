// ==========================================
// ECCS Extension: Beautify CBE & CSB Single-Page Details View
// ==========================================

(function() {
    // Only run on CBE & CSB View/Details pages
    const path = window.location.pathname.toLowerCase();
    const isCbeView = path.includes('/imp/') && (path.includes('view') || path.includes('details') || path.includes('cbexi'));
    const isCsbView = path.includes('/export/') && (path.includes('view') || path.includes('details') || path.includes('csb'));

    if (!isCbeView && !isCsbView) return;
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
                        const valText = (valTd.textContent || '').replace(/\s+/g, ' ').trim();
                        // Store normalized key
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

    // --- 2. Extract Key Fields ---
    const documentNo = getValue(["cbe-xi number", "cbe-xii number", "cbe-xiii number", "cbe-xiv number", "csb number", "csb-iv number", "csb-v number", "csb-iii number", "csb reference number", "hawb number"], "N/A");
    const courierName = getValue(["authorized courier name", "courier name", "name of authorized courier", "name of the authorized courier"], "N/A");
    const hawbNo = getValue(["hawb number", "hawb no.", "hawb no"], "N/A");
    const consName = getValue(["consignee name", "name of consignee", "name of the consignee", "consignor name", "name of consignor", "name of the consignor"], "N/A");
    const portDest = getValue(["airport of destination", "port of destination", "destination airport", "destination port"], "N/A");
    const weight = getValue(["manifest weight", "weight (in kg.)", "gross weight", "weight"], "N/A");
    const totalVal = getValue(["invoice value", "total value", "fob value", "assessable value"], "N/A");
    const currency = getValue(["invoice currency", "currency"], "");
    const status = getValue(["status", "current status"], "N/A");
    const flightNo = getValue(["international flight number", "flight number", "flight no.", "flight name"], "N/A");

    // Look for any general supporting documents HTML
    let supportingDocsHtml = "N/A";
    for (const key in labelMap) {
        if (key.includes("supporting") || key.includes("document") || key.includes("upload")) {
            supportingDocsHtml = labelMap[key].innerHTML;
            break;
        }
    }

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

    // --- 3. Construct Modern Consolidated Dashboard ---
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
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                text-decoration: none;
                margin: 2px 4px 2px 0;
            }
            .doc-badge:hover {
                background: #dbeafe;
            }
        </style>

        <div class="section-title">
            <span>ECCS Consolidated Details: ${documentNo}</span>
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
    if (originalMain) {
        originalMain.style.display = '';
    }
    const originalFooter = document.querySelector('footer');
    if (originalFooter) {
        originalFooter.style.display = '';
    }

    // Prepend the summary table at the very top of the page body
    document.body.insertBefore(summaryContainer, document.body.firstChild);

    // --- 4. Clean and Extract Instruction Tables Without IFrames or Headers ---
    function cleanInstructionHTML(html, targetKeyword) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Remove page headers, navigation bars, footers, scripts, styles, and nested iframes from fetched doc
        doc.querySelectorAll('header, footer, nav, script, iframe, style, .main-header, .navbar, .header-bottom, img[src*="logo"]').forEach(el => el.remove());

        const candidateTables = Array.from(doc.querySelectorAll('table'));
        
        let targetTable = candidateTables.find(table => {
            const txt = table.textContent.toLowerCase();
            return (txt.includes(targetKeyword) || txt.includes("instruction") || txt.includes("compliance") || txt.includes("remarks") || txt.includes("details")) &&
                   !table.querySelector('header, nav, .navbar');
        });

        // Fallback: pick table with data rows
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

            // Convert raw Javascript popup links into clean new-tab links
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

    // --- 5. Fetch and Display CCR Details in the Background ---
    const ccrLink = document.querySelector('a[href*="viewCCRIntructions"]');
    if (ccrLink) {
        let url = ccrLink.getAttribute('href');
        if (url.startsWith("javascript:")) {
            const matches = url.match(/'([^']+)'/g);
            if (matches && matches.length >= 3) {
                const action = matches[0].replace(/'/g, '');
                const refNo = matches[1].replace(/'/g, '');
                const hawbId = matches[2].replace(/'/g, '');
                url = `${action}?refNo=${refNo}&hawbId=${hawbId}`;
            }
        }
        
        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error("Status " + res.status);
                return res.text();
            })
            .then(html => {
                const content = cleanInstructionHTML(html, 'ccr');
                const container = document.getElementById('ccr-details-content');
                if (container) container.innerHTML = content;
            })
            .catch(err => {
                const container = document.getElementById('ccr-details-content');
                if (container) container.innerHTML = `<div style="color: #ef4444; font-weight: bold;">Failed to load CCR details: ${err.message}</div>`;
            });
    } else {
        const container = document.getElementById('ccr-details-content');
        if (container) {
            container.innerHTML = `<div style="color: #64748b;">No CCR instructions required for this HAWB.</div>`;
        }
    }

    // --- 6. Fetch and Display RMS Instructions in the Background ---
    const rmsLink = document.querySelector('a[href*="viewRMSIntructions"]') || document.querySelector('a[href*="viewRMS"]');
    if (rmsLink) {
        let url = rmsLink.getAttribute('href');
        if (url.startsWith("javascript:")) {
            const matches = url.match(/'([^']+)'/g);
            if (matches && matches.length >= 3) {
                const action = matches[0].replace(/'/g, '');
                const refNo = matches[1].replace(/'/g, '');
                const hawbId = matches[2].replace(/'/g, '');
                url = `${action}?refNo=${refNo}&hawbId=${hawbId}`;
            }
        }
        
        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error("Status " + res.status);
                return res.text();
            })
            .then(html => {
                const content = cleanInstructionHTML(html, 'rms');
                const container = document.getElementById('rms-details-content');
                if (container) container.innerHTML = content;
            })
            .catch(err => {
                const container = document.getElementById('rms-details-content');
                if (container) container.innerHTML = `<div style="color: #ef4444; font-weight: bold;">Failed to load RMS details: ${err.message}</div>`;
            });
    } else {
        const container = document.getElementById('rms-details-content');
        if (container) {
            const rawRms = getValueHtml(["rms instruction", "rms instructions"]) || "N/A";
            container.innerHTML = `<div style="font-size: 11px; color: #334155;">${rawRms}</div>`;
        }
    }

    // --- 7. Fetch and Render Supporting Documents Inline ---
    const docContainer = document.getElementById('supporting-docs-content');
    const docLink = document.querySelector('a[href*="listExpDocumentsAttached"]') || document.querySelector('a[href*="ViewUploadedFile"]');

    if (docLink && docContainer) {
        let url = docLink.getAttribute('href');
        if (url.startsWith("javascript:")) {
            const matches = url.match(/'([^']+)'/g);
            if (matches && matches.length >= 3) {
                const action = matches[0].replace(/'/g, '');
                const hawbId = matches[1].replace(/'/g, '');
                const csbNo = matches[2].replace(/'/g, '');
                url = `${action}?hawbID=${hawbId}&csbNumber=${csbNo}`;
            }
        }

        fetch(url)
            .then(res => res.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // Extract document links
                const docLinks = Array.from(doc.querySelectorAll('a')).filter(a => {
                    const txt = a.textContent.toLowerCase();
                    const href = (a.getAttribute('href') || '').toLowerCase();
                    return txt.includes('.pdf') || txt.includes('.tif') || txt.includes('.jpg') || txt.includes('.png') || href.includes('uploadedfile') || href.includes('document');
                });

                if (docLinks.length > 0) {
                    let badgesHtml = '';
                    docLinks.forEach(a => {
                        const fileName = a.textContent.trim();
                        const href = a.getAttribute('href');
                        badgesHtml += `<a class="doc-badge" href="${href}" target="_blank">📄 ${fileName}</a>`;
                    });
                    docContainer.innerHTML = badgesHtml;
                } else {
                    const cleanText = cleanInstructionHTML(html, 'document');
                    docContainer.innerHTML = cleanText;
                }
            })
            .catch(() => {
                docContainer.innerHTML = supportingDocsHtml !== "N/A" ? `<div style="font-size:11px;">${supportingDocsHtml}</div>` : `<div style="color: #64748b;">No attached supporting documents.</div>`;
            });
    } else if (docContainer) {
        docContainer.innerHTML = supportingDocsHtml !== "N/A" ? `<div style="font-size:11px;">${supportingDocsHtml}</div>` : `<div style="color: #64748b;">No attached supporting documents.</div>`;
    }
})();
