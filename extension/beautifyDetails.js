// =========================================================
// ECCS Extension: CBE Status Summary (Combined Fields)
// =========================================================

(function() {
    // Only target CBE specifics and details pages
    const isDetailsPage = document.body && (
        document.body.textContent.includes("Courier Bill of Entry") || 
        document.body.textContent.includes("CBE-XIII") ||
        document.body.textContent.includes("HAWB Details") ||
        document.querySelector('input[name="cbeXIINumber"]') ||
        window.location.pathname.includes("getCBEXIIList") ||
        window.location.pathname.includes("cbe_specifics") ||
        window.location.pathname.includes("examuination_cbe_specifics")
    );

    // Do NOT run on X-Ray clearance/barcode scanning pages
    if (document.querySelector('form[name="searchHAWBStatusForm"]')) {
        return;
    }

    if (!isDetailsPage) return;

    // --- 1. Map all labels and values programmatically ---
    const tds = Array.from(document.querySelectorAll('td'));
    const labelMap = {};

    function cleanText(txt) {
        if (!txt) return "";
        return txt.replace(/\s+/g, " ").replace(/&nbsp;/gi, "").replace(/:$/, "").trim();
    }

    function normalizeLabel(label) {
        return label.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    tds.forEach(td => {
        if (td.getAttribute('align') === 'right') {
            const normKey = normalizeLabel(td.textContent);
            if (normKey && td.nextElementSibling) {
                if (!labelMap[normKey] || cleanText(td.nextElementSibling.textContent) !== "") {
                    labelMap[normKey] = td.nextElementSibling;
                }
            }
        }
    });

    function getElementByLabel(label) {
        return labelMap[normalizeLabel(label)] || null;
    }

    function getValueText(label) {
        const el = getElementByLabel(label);
        return el ? cleanText(el.textContent) : "N/A";
    }

    function getValueHtml(label) {
        const el = getElementByLabel(label);
        return el ? el.innerHTML : "N/A";
    }

    // Try finding any CBE identifier
    let cbeNo = "N/A";
    let cbeType = "CBE Details";
    for (const key of Object.keys(labelMap)) {
        if (key.startsWith('cbex') && key.endsWith('no')) {
            cbeNo = cleanText(labelMap[key].textContent);
            cbeType = key.replace('no', '').toUpperCase();
            break;
        }
    }
    if (cbeNo === "N/A") {
        cbeNo = getValueText("CBE-XIII No.") || getValueText("CBE-XIV No.") || getValueText("CBE-XII No.") || getValueText("CBE-XI No.");
    }

    const hawbNo = getValueText("HAWB Number");

    // Safety check: if we cannot identify basic parameters, abort
    if (cbeNo === "N/A" && hawbNo === "N/A") {
        return;
    }

    // --- 2. Extract Declared Items Table ---
    const itemsTable = Array.from(document.querySelectorAll('table')).find(table => {
        return table.textContent.includes('CTSH') && table.textContent.includes('ITEM Description');
    });

    const items = [];
    if (itemsTable) {
        const rows = Array.from(itemsTable.querySelectorAll('tr'));
        const headerIndex = rows.findIndex(row => row.textContent.includes('CTSH'));
        if (headerIndex !== -1) {
            for (let i = headerIndex + 1; i < rows.length; i++) {
                const cells = Array.from(rows[i].querySelectorAll('td'));
                if (cells.length >= 8) {
                    items.push({
                        sNo: cleanText(cells[0].textContent),
                        ctsh: cleanText(cells[1].textContent),
                        nature: cleanText(cells[2].textContent),
                        description: cleanText(cells[3].textContent),
                        origin: cleanText(cells[4].textContent),
                        qty: cleanText(cells[5].textContent),
                        uqc: cleanText(cells[6].textContent),
                        assessableVal: cleanText(cells[7].textContent),
                        detailsHtml: cells[8] ? cells[8].innerHTML : ""
                    });
                }
            }
        }
    }

    // Build Item details table rows (unmodified raw data)
    let itemsRowsHtml = "";
    if (items.length > 0) {
        items.forEach(item => {
            itemsRowsHtml += `
                <tr>
                    <td align="center">${item.sNo}</td>
                    <td align="center"><strong>${item.ctsh}</strong></td>
                    <td align="center">${item.nature}</td>
                    <td>${item.description}</td>
                    <td align="center">${item.origin}</td>
                    <td align="center">${item.qty} ${item.uqc}</td>
                    <td align="right" style="font-weight: bold; color: #854d0e; background-color: #fef08a;">₹ ${item.assessableVal}</td>
                    <td align="center">${item.detailsHtml}</td>
                </tr>
            `;
        });
    } else {
        itemsRowsHtml = `<tr><td colspan="8" style="text-align: center;">No declared items found.</td></tr>`;
    }

    // Look for any other general supporting documents
    let supportingDocsHtml = "N/A";
    for (const key of Object.keys(labelMap)) {
        if (key.includes("supporting") || key.includes("document") || key.includes("upload")) {
            supportingDocsHtml = labelMap[key].innerHTML;
            break;
        }
    }

    // --- 3. Build & Prepend Summary Dashboard at the top of the body ---
    const summaryContainer = document.createElement('div');
    summaryContainer.id = 'eccs-summary-root';
    summaryContainer.style = "margin: 15px auto; width: 95%; max-width: 1200px; box-sizing: border-box;";

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
        .cbe-pattern-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 15px !important;
            font-family: system-ui, -apple-system, sans-serif !important;
            font-size: 11px !important;
            background-color: #f8fafc !important;
            border: 2px solid #2563eb !important;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06) !important;
        }
        .cbe-pattern-table td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 8px !important;
            color: #0f172a !important;
            vertical-align: middle !important;
        }
        .pattern-header {
            background-color: #2563eb !important;
            color: #ffffff !important;
            font-weight: bold !important;
            text-align: center !important;
            font-size: 13px !important;
            padding: 8px !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
        }
        .pattern-label {
            background-color: #f1f5f9 !important;
            font-weight: 700 !important;
            color: #475569 !important;
            width: 14% !important;
            text-align: right !important;
        }
        .pattern-value {
            width: 36% !important;
            text-align: left !important;
        }
        .pattern-highlight {
            background-color: #fef08a !important;
            color: #854d0e !important;
            font-weight: 800 !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            border: 1px solid #fde047 !important;
            display: inline-block !important;
        }
        .summary-details-section {
            display: flex !important;
            gap: 15px !important;
            margin-top: 15px !important;
            width: 100% !important;
            box-sizing: border-box !important;
        }
        @media (max-width: 768px) {
            .summary-details-section {
                flex-direction: column !important;
            }
        }
        .details-box {
            flex: 1 !important;
            background-color: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 6px !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05) !important;
            overflow: hidden !important;
        }
        .details-title {
            background-color: #f1f5f9 !important;
            border-bottom: 1px solid #cbd5e1 !important;
            margin: 0 !important;
            padding: 8px 12px !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            color: #1e293b !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
        }
        .details-content {
            padding: 10px !important;
            font-size: 11px !important;
            overflow-x: auto !important;
            max-height: 250px !important;
            overflow-y: auto !important;
        }
        .item-summary-table, .ccr-detail-table, .rms-detail-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 11px !important;
        }
        .item-summary-table th, .ccr-detail-table th, .rms-detail-table th {
            background-color: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            padding: 6px 8px !important;
            font-weight: bold !important;
            color: #475569 !important;
            text-align: center !important;
        }
        .item-summary-table td, .ccr-detail-table td, .rms-detail-table td {
            border: 1px solid #e2e8f0 !important;
            padding: 6px 8px !important;
            color: #334155 !important;
        }
        #eccs-summary-root a {
            color: #2563eb !important;
            text-decoration: underline !important;
            font-weight: 700 !important;
        }
        #eccs-summary-root a:hover {
            color: #1d4ed8 !important;
        }
    `;
    document.head.appendChild(style);

    // Extract all values
    const airlines = getValueText("Airlines Name");
    const flight = getValueText("Flight Number");
    const portShipment = getValueText("Port of Shipment");
    const portArrival = getValueText("Port of Arrival");
    const firstPort = getValueText("First Port of Arrival");
    const dateArrival = getValueText("Date of Arrival");
    const timeArrival = getValueText("Time of Arrival");
    const countryExport = getValueText("Country of Exportation");
    
    const grossWt = getValueText("Gross Weight (KGs)");
    const netWt = getValueText("Net Weight (KGs)");
    const pkgs = getValueText("No. of Packages") || getValueText("No. of Packages :");
    const ucn = getValueText("Unique Consignment No.");
    const iecCode = getValueText("IEC Code");
    const iecBranch = getValueText("IEC Branch Code");

    const courierReg = getValueText("Courier Registration Number");
    const courierName = getValueText("Courier Name");
    const courierAddr = getValueText("Address of Courier");
    const caseOfCrn = getValueText("Case of CRN");

    const consignorName = getValueText("Name Of Consignor");
    const consignorAddr = getValueText("Address Of Consignor");
    const consigneeName = getValueText("Name Of Consignee");
    const consigneeAddr = getValueText("Address Of Consignee");

    const invoiceVal = getValueText("Invoice Value (Rs.)") || getValueText("Invoice Value");
    const assessableVal = getValueText("Assessable Value(Rs.)") || getValueText("Assessable Value (Rs.)");
    const duty = getValueText("Duty (Rs.)");
    const interest = getValueText("Interest Amount (Rs.)");
    const fine = getValueText("Fine (Rs.)");
    const penalty = getValueText("Penalty (Rs.)");
    const challanNo = getValueText("TR-6 Challan Number");
    const challanDate = getValueText("TR-6 Challan Date");

    // Extract raw HTML elements/links
    const invoiceHtml = getValueHtml("Invoice Image");
    const rmsHtml = getValueHtml("RMS Instruction");
    const ccrHtml = getValueHtml("CCR Instruction");

    // Build Layout
    summaryContainer.innerHTML = `
        <table class="cbe-pattern-table">
            <thead>
                <tr>
                    <td class="pattern-header" colspan="4">CBE STATUS SUMMARY (All Fields Grouped for Pattern Review)</td>
                </tr>
            </thead>
            <tbody>
                <!-- 1. Identification & Identifiers -->
                <tr>
                    <td class="pattern-label">Identifiers & IEC:</td>
                    <td class="pattern-value">
                        <strong>HAWB:</strong> ${hawbNo} | 
                        <strong>CBE:</strong> ${cbeNo} (${cbeType})<br>
                        <strong>UCN:</strong> ${ucn} | 
                        <strong>IEC:</strong> ${iecCode} (Branch: ${iecBranch})
                    </td>
                    <td class="pattern-label">Weight & Pkgs:</td>
                    <td class="pattern-value">
                        <strong>Gross:</strong> ${grossWt} KGs | 
                        <strong>Net:</strong> ${netWt} KGs<br>
                        <strong>Packages:</strong> ${pkgs}
                    </td>
                </tr>

                <!-- 2. Logistics & Flight Routing -->
                <tr>
                    <td class="pattern-label">Flight & Routing:</td>
                    <td class="pattern-value">
                        <strong>Airlines:</strong> ${airlines} (${flight}) | 
                        <strong>Export:</strong> ${countryExport}<br>
                        <strong>Ports:</strong> ${portShipment} ➔ ${portArrival} (First Port: ${firstPort})
                    </td>
                    <td class="pattern-label">Arrival Timestamp:</td>
                    <td class="pattern-value">
                        <strong>Date:</strong> ${dateArrival} | 
                        <strong>Time:</strong> ${timeArrival}
                    </td>
                </tr>

                <!-- 3. Courier Credentials -->
                <tr>
                    <td class="pattern-label">Courier Info:</td>
                    <td class="pattern-value">
                        <strong>Name:</strong> ${courierName} (Reg: ${courierReg})<br>
                        <strong>CRN Case:</strong> ${caseOfCrn}
                    </td>
                    <td class="pattern-label">Courier Address:</td>
                    <td class="pattern-value">
                        <span style="font-size: 10px; color: #475569;">${courierAddr}</span>
                    </td>
                </tr>

                <!-- 4. Financials & Customs Clearance -->
                <tr>
                    <td class="pattern-label">Financials & Duty:</td>
                    <td class="pattern-value">
                        <strong>Invoice Value:</strong> ₹ ${invoiceVal} | 
                        <strong>Duty:</strong> ₹ ${duty}<br>
                        <strong>Assessable Value:</strong> <span class="pattern-highlight">₹ ${assessableVal}</span>
                    </td>
                    <td class="pattern-label">Fines & Challan:</td>
                    <td class="pattern-value">
                        <strong>Fine:</strong> ₹ ${fine} | 
                        <strong>Penalty:</strong> ₹ ${penalty} | 
                        <strong>Interest:</strong> ₹ ${interest}<br>
                        <strong>Challan:</strong> ${challanNo} (${challanDate})
                    </td>
                </tr>

                <!-- 5. Consignor & Consignee -->
                <tr>
                    <td class="pattern-label">Consignor (Sender):</td>
                    <td class="pattern-value">
                        <strong>${consignorName}</strong><br>
                        <span style="font-size: 10px; color: #475569;">${consignorAddr}</span>
                    </td>
                    <td class="pattern-label">Consignee (Receiver):</td>
                    <td class="pattern-value">
                        <strong>${consigneeName}</strong><br>
                        <span style="font-size: 10px; color: #475569;">${consigneeAddr}</span>
                    </td>
                </tr>

                <!-- 6. Interactive Documents & Actions -->
                <tr>
                    <td class="pattern-label">Docs & Actions:</td>
                    <td class="pattern-value" colspan="3">
                        <strong>Invoice Link:</strong> ${invoiceHtml} &nbsp;&nbsp;|&nbsp;&nbsp;
                        <strong>Supporting Docs:</strong> ${supportingDocsHtml}
                    </td>
                </tr>
            </tbody>
        </table>

        <!-- Item Details and Instructions side-by-side section -->
        <div class="summary-details-section">
            <!-- Left: Item Details -->
            <div class="details-box">
                <h3 class="details-title">Declared Item Details (CTSH Table)</h3>
                <div class="details-content">
                    <table class="item-summary-table">
                        <thead>
                            <tr>
                                <th>SNo</th>
                                <th>CTSH</th>
                                <th>Nature</th>
                                <th>Item Description</th>
                                <th>Origin</th>
                                <th>Qty (UQC)</th>
                                <th>Assessable Value</th>
                                <th>Details Link</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Right: Instructions Box (CCR & RMS) -->
            <div class="details-box">
                <h3 class="details-title">Customs Instructions (CCR & RMS)</h3>
                <div class="details-content" style="display: flex; flex-direction: column; gap: 12px;">
                    <div>
                        <strong style="color: #475569; font-size: 10px; text-transform: uppercase; display: block; margin-bottom: 4px;">CCR Instructions (Compulsory Compliance):</strong>
                        <div id="ccr-details-content">
                            <div style="color: #64748b;">Loading CCR details...</div>
                        </div>
                    </div>
                    <hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 4px 0;">
                    <div>
                        <strong style="color: #475569; font-size: 10px; text-transform: uppercase; display: block; margin-bottom: 4px;">RMS Instructions (Risk Management System):</strong>
                        <div id="rms-details-content">
                            <div style="color: #64748b;">Loading RMS details...</div>
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

    // --- 4. Helper to Clean and Extract Instruction Tables ---
    function cleanInstructionHTML(html, targetKeyword) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const targetTable = Array.from(doc.querySelectorAll('table')).find(table => {
            const txt = table.textContent.toLowerCase();
            return txt.includes(targetKeyword) || txt.includes("instruction") || txt.includes("details");
        });

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
            
            return targetTable.outerHTML;
        }

        return doc.body ? doc.body.innerHTML : `No ${targetKeyword.toUpperCase()} details found.`;
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
            // Get raw text from the ECCS page
            const rawRms = getValueHtml("RMS Instruction") || getValueHtml("RMS Instructions") || "N/A";
            container.innerHTML = rawRms;
        }
    }
})();
