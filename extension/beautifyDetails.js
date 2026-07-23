// ==========================================
// ECCS Extension: Beautify Details & Highlight Assessable Value
// ==========================================

(function() {
    // Only target CBE specifics and details pages (containing Courier Bill of Entry details)
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
        return txt.replace(/\s+/g, " ").replace(/&nbsp;/g, "").replace(/:$/, "").trim();
    }

    function normalizeLabel(label) {
        return label.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    tds.forEach(td => {
        if (td.getAttribute('align') === 'right') {
            const normKey = normalizeLabel(td.textContent);
            if (normKey && td.nextElementSibling) {
                // If it is already mapped, prioritize mapping if it contains actual content
                if (!labelMap[normKey] || cleanText(td.nextElementSibling.textContent) !== "") {
                    labelMap[normKey] = td.nextElementSibling;
                }
            }
        }
    });

    function getElementByLabel(label) {
        return labelMap[normalizeLabel(label)] || null;
    }

    function getValueHtml(label) {
        const el = getElementByLabel(label);
        return el ? el.innerHTML : "N/A";
    }

    function getValueText(label) {
        const el = getElementByLabel(label);
        return el ? cleanText(el.textContent) : "N/A";
    }

    // Try finding any CBE identifier (CBE-XI, CBE-XII, CBE-XIII, CBE-XIV)
    let cbeNo = "N/A";
    let cbeType = "CBE Details";
    for (const key of Object.keys(labelMap)) {
        if (key.startsWith('cbex') && key.endsWith('no')) {
            cbeNo = cleanText(labelMap[key].textContent);
            cbeType = key.replace('no', '').toUpperCase();
            break;
        }
    }
    // Fallback if not found with key starts with cbex
    if (cbeNo === "N/A") {
        cbeNo = getValueText("CBE-XIII No.") || getValueText("CBE-XIV No.") || getValueText("CBE-XII No.") || getValueText("CBE-XI No.");
    }

    const hawbNo = getValueText("HAWB Number");

    // Safety check: if we cannot identify basic parameters, fall back to safe styling only
    if (cbeNo === "N/A" && hawbNo === "N/A") {
        console.log("[ECCS Beautifier] Fallback: Basic style override only.");
        injectBasicStyles();
        return;
    }

    // --- 2. Extract declared items ---
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

    // --- 3. Build & Inject Premium Modern Dashboard ---
    const dashboardContainer = document.createElement('div');
    dashboardContainer.id = 'eccs-dashboard-root';

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
        #eccs-dashboard-root {
            background-color: #0f172a !important;
            color: #f8fafc !important;
            font-family: system-ui, -apple-system, sans-serif !important;
            padding: 24px !important;
            min-height: 100vh !important;
            box-sizing: border-box !important;
        }

        #eccs-dashboard-root * {
            box-sizing: border-box !important;
        }

        .db-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-bottom: 1px solid #334155 !important;
            padding-bottom: 20px !important;
            margin-bottom: 24px !important;
            flex-wrap: wrap !important;
            gap: 16px !important;
        }

        .db-title-area {
            flex: 1 !important;
            min-width: 300px !important;
        }

        .db-badge {
            background: #2563eb !important;
            color: #ffffff !important;
            padding: 4px 8px !important;
            border-radius: 4px !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            display: inline-block !important;
            margin-bottom: 6px !important;
        }

        .db-title-area h1 {
            margin: 0 !important;
            font-size: 26px !important;
            font-weight: 800 !important;
            color: #ffffff !important;
            letter-spacing: -0.025em !important;
        }

        .db-title-area p {
            margin: 4px 0 0 0 !important;
            color: #94a3b8 !important;
            font-size: 14px !important;
        }

        .db-stats {
            display: grid !important;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) !important;
            gap: 12px !important;
            width: 100% !important;
            max-width: 800px !important;
        }

        .stat-card {
            background: #1e293b !important;
            border: 1px solid #334155 !important;
            border-radius: 8px !important;
            padding: 12px 16px !important;
            display: flex !important;
            flex-direction: column !important;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1) !important;
        }

        .stat-card.gold {
            border-color: #eab308 !important;
            background: rgba(234, 179, 8, 0.05) !important;
        }

        .stat-card.gold .stat-value {
            color: #facc15 !important;
        }

        .stat-card.red {
            border-color: #ef4444 !important;
            background: rgba(239, 68, 68, 0.05) !important;
        }

        .stat-card.red .stat-value {
            color: #f87171 !important;
        }

        .stat-label {
            font-size: 11px !important;
            font-weight: 600 !important;
            color: #94a3b8 !important;
            text-transform: uppercase !important;
            margin-bottom: 4px !important;
        }

        .stat-value {
            font-size: 20px !important;
            font-weight: 800 !important;
            color: #f1f5f9 !important;
        }

        .db-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 20px !important;
        }

        @media (max-width: 768px) {
            .db-grid {
                grid-template-columns: 1fr !important;
            }
            .col-span-2 {
                grid-column: span 1 !important;
            }
        }

        .col-span-2 {
            grid-column: span 2 !important;
        }

        .db-card {
            background: #1e293b !important;
            border: 1px solid #334155 !important;
            border-radius: 10px !important;
            overflow: hidden !important;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3) !important;
        }

        .card-header {
            background: #111827 !important;
            padding: 12px 18px !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            color: #38bdf8 !important;
            text-transform: uppercase !important;
            border-bottom: 1px solid #334155 !important;
            letter-spacing: 0.05em !important;
        }

        .card-body {
            padding: 18px !important;
        }

        /* Parties style */
        .party-split {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 16px !important;
        }

        @media (max-width: 600px) {
            .party-split {
                grid-template-columns: 1fr !important;
            }
        }

        .party-col {
            border-right: 1px solid #334155 !important;
            padding-right: 16px !important;
        }

        .party-col:last-child {
            border-right: none !important;
            padding-right: 0 !important;
        }

        .party-label {
            font-size: 10px !important;
            font-weight: 700 !important;
            color: #64748b !important;
            text-transform: uppercase !important;
            display: block !important;
            margin-bottom: 4px !important;
        }

        .party-name {
            font-size: 14px !important;
            font-weight: 700 !important;
            color: #f8fafc !important;
            display: block !important;
            margin-bottom: 6px !important;
        }

        .party-address {
            font-size: 12px !important;
            color: #94a3b8 !important;
            line-height: 1.5 !important;
            margin: 0 !important;
        }

        /* Grid Fields style */
        .grid-fields {
            display: grid !important;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
            gap: 14px !important;
        }

        .field-item {
            display: flex !important;
            flex-direction: column !important;
        }

        .field-label {
            font-size: 10px !important;
            font-weight: 600 !important;
            color: #64748b !important;
            text-transform: uppercase !important;
            margin-bottom: 2px !important;
        }

        .field-value {
            font-size: 13px !important;
            color: #cbd5e1 !important;
            font-weight: 500 !important;
        }

        /* Modern Table style */
        .modern-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 0 !important;
            border: none !important;
        }

        .modern-table th {
            background: #111827 !important;
            color: #94a3b8 !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            padding: 10px 14px !important;
            text-align: left !important;
            border: 1px solid #334155 !important;
        }

        .modern-table td {
            padding: 10px 14px !important;
            font-size: 12px !important;
            color: #e2e8f0 !important;
            border: 1px solid #334155 !important;
            background: #1e293b !important;
        }

        .modern-table tr:hover td {
            background: #1e293b !important;
        }

        .modern-table td.highlight {
            background: rgba(234, 179, 8, 0.1) !important;
            color: #facc15 !important;
            font-weight: bold !important;
            border-color: #eab308 !important;
        }

        /* Two columns body */
        .grid-two-cols {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 20px !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
        }

        @media (max-width: 768px) {
            .grid-two-cols {
                grid-template-columns: 1fr !important;
            }
        }

        /* Styling links inside document values */
        .field-value a, .modern-table td a {
            color: #38bdf8 !important;
            text-decoration: none !important;
            font-weight: bold !important;
            border-bottom: 1px dashed #38bdf8 !important;
        }

        .field-value a:hover, .modern-table td a:hover {
            color: #60a5fa !important;
            border-bottom-style: solid !important;
        }

        /* Footer & Buttons */
        .db-footer {
            margin-top: 30px !important;
            display: flex !important;
            justify-content: center !important;
        }

        .btn-close {
            background: #e2e8f0 !important;
            color: #0f172a !important;
            border: none !important;
            padding: 10px 24px !important;
            font-size: 14px !important;
            font-weight: bold !important;
            border-radius: 6px !important;
            cursor: pointer !important;
            transition: background 0.2s !important;
        }

        .btn-close:hover {
            background: #cbd5e1 !important;
        }
    `;
    document.head.appendChild(style);

    // Build the items body rows
    let itemsRowsHtml = "";
    if (items.length > 0) {
        items.forEach(item => {
            itemsRowsHtml += `
                <tr>
                    <td>${item.sNo}</td>
                    <td>${item.ctsh}</td>
                    <td>${item.nature}</td>
                    <td>${item.description}</td>
                    <td>${item.origin}</td>
                    <td>${item.qty} ${item.uqc}</td>
                    <td class="highlight">₹ ${item.assessableVal}</td>
                    <td>${item.detailsHtml}</td>
                </tr>
            `;
        });
    } else {
        itemsRowsHtml = `<tr><td colspan="8" style="text-align: center;">No items found.</td></tr>`;
    }

    // Build overall layout
    dashboardContainer.innerHTML = `
        <div class="db-header">
            <div class="db-title-area">
                <span class="db-badge">${cbeType}</span>
                <h1>HAWB: ${hawbNo}</h1>
                <p>CBE Identifier: ${cbeNo}</p>
            </div>
            <div class="db-stats">
                <div class="stat-card gold">
                    <span class="stat-label">Assessable Value</span>
                    <span class="stat-value">₹ ${getValueText("Assessable Value(Rs.)") || getValueText("Assessable Value (Rs.)")}</span>
                </div>
                <div class="stat-card red">
                    <span class="stat-label">Total Duty</span>
                    <span class="stat-value">₹ ${getValueText("Duty (Rs.)")}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Gross / Net Weight</span>
                    <span class="stat-value">${getValueText("Gross Weight (KGs)")} / ${getValueText("Net Weight (KGs)")} KGs</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">No. of Packages</span>
                    <span class="stat-value">${getValueText("No. of Packages") || getValueText("No. of Packages :")}</span>
                </div>
            </div>
        </div>

        <div class="db-grid">
            <!-- Trade Parties -->
            <div class="db-card col-span-2">
                <div class="card-header">Trade Parties</div>
                <div class="card-body party-split">
                    <div class="party-col">
                        <span class="party-label">Consignor</span>
                        <strong class="party-name">${getValueText("Name Of Consignor")}</strong>
                        <p class="party-address">${getValueHtml("Address Of Consignor")}</p>
                    </div>
                    <div class="party-col">
                        <span class="party-label">Consignee</span>
                        <strong class="party-name">${getValueText("Name Of Consignee")}</strong>
                        <p class="party-address">${getValueHtml("Address Of Consignee")}</p>
                    </div>
                </div>
            </div>

            <!-- Logistics & Shipment Details -->
            <div class="db-card col-span-2">
                <div class="card-header">Logistics & Customs Clearance details</div>
                <div class="card-body grid-fields">
                    <div class="field-item">
                        <span class="field-label">Airlines</span>
                        <span class="field-value">${getValueText("Airlines Name")}</span>
                    </div>
                    <div class="field-item">
                        <span class="field-label">Flight Number</span>
                        <span class="field-value">${getValueText("Flight Number")}</span>
                    </div>
                    <div class="field-item">
                        <span class="field-label">Port of Shipment</span>
                        <span class="field-value">${getValueText("Port of Shipment")}</span>
                    </div>
                    <div class="field-item">
                        <span class="field-label">Port of Arrival / First Port</span>
                        <span class="field-value">${getValueText("Port of Arrival")} / ${getValueText("First Port of Arrival")}</span>
                    </div>
                    <div class="field-item">
                        <span class="field-label">Arrival Date & Time</span>
                        <span class="field-value">${getValueText("Date of Arrival")} @ ${getValueText("Time of Arrival")}</span>
                    </div>
                    <div class="field-item">
                        <span class="field-label">Country of Export</span>
                        <span class="field-value">${getValueText("Country of Exportation")}</span>
                    </div>
                    <div class="field-item">
                        <span class="field-label">IEC Code / Branch</span>
                        <span class="field-value">${getValueText("IEC Code")} (Branch: ${getValueText("IEC Branch Code")})</span>
                    </div>
                    <div class="field-item">
                        <span class="field-label">Courier Reg. No.</span>
                        <span class="field-value">${getValueText("Courier Registration Number")}</span>
                    </div>
                    <div class="field-item">
                        <span class="field-label">Courier Name & Address</span>
                        <span class="field-value">${getValueText("Courier Name")} - ${getValueText("Address of Courier")}</span>
                    </div>
                    <div class="field-item">
                        <span class="field-label">Unique Consignment No. (UCN)</span>
                        <span class="field-value">${getValueText("Unique Consignment No.") || "N/A"}</span>
                    </div>
                </div>
            </div>

            <!-- Declared Items -->
            <div class="db-card col-span-2">
                <div class="card-header">Declared Items</div>
                <div class="card-body" style="padding: 0 !important; overflow-x: auto !important;">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>S. No</th>
                                <th>CTSH</th>
                                <th>Nature</th>
                                <th>Description</th>
                                <th>Origin</th>
                                <th>Qty (UQC)</th>
                                <th>Assessable Value (Rs.)</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Two Subcards: Payments & Documents -->
            <div class="grid-two-cols col-span-2">
                <div class="db-card">
                    <div class="card-header">Payment & Challan Details</div>
                    <div class="card-body grid-fields">
                        <div class="field-item">
                            <span class="field-label">TR-6 Challan No.</span>
                            <span class="field-value">${getValueText("TR-6 Challan Number")}</span>
                        </div>
                        <div class="field-item">
                            <span class="field-label">Challan Date</span>
                            <span class="field-value">${getValueText("TR-6 Challan Date")}</span>
                        </div>
                        <div class="field-item">
                            <span class="field-label">Interest Amount</span>
                            <span class="field-value">₹ ${getValueText("Interest Amount (Rs.)")}</span>
                        </div>
                        <div class="field-item">
                            <span class="field-label">Fine / Penalty</span>
                            <span class="field-value">₹ ${getValueText("Fine (Rs.)")} / ₹ ${getValueText("Penalty (Rs.)")}</span>
                        </div>
                    </div>
                </div>
                <div class="db-card">
                    <div class="card-header">Instructions & Documents</div>
                    <div class="card-body grid-fields">
                        <div class="field-item">
                            <span class="field-label">Invoice Attachment</span>
                            <span class="field-value">${getValueHtml("Invoice Image")}</span>
                        </div>
                        <div class="field-item">
                            <span class="field-label">CCR Instructions</span>
                            <span class="field-value">${getValueHtml("CCR Instruction")}</span>
                        </div>
                        <div class="field-item">
                            <span class="field-label">RMS Instructions</span>
                            <span class="field-value">${getValueHtml("RMS Instruction")}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="db-footer">
            <button id="eccs-db-close-btn" class="btn-close">Close Window</button>
        </div>
    `;

    // Hide original main container and footer
    const originalMain = document.querySelector('.main-container');
    const originalFooter = document.querySelector('footer');
    if (originalMain) originalMain.style.display = 'none';
    if (originalFooter) originalFooter.style.display = 'none';

    // Append our dashboard
    document.body.appendChild(dashboardContainer);

    // Setup action handler for the close button
    const closeBtn = document.getElementById('eccs-db-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            // Attempt to trigger the page's original close action (e.g. window.close() or clicking the close button link)
            window.close();
        });
    }

    function injectBasicStyles() {
        const style = document.createElement('style');
        style.textContent = `
            body {
                background-color: #f8fafc !important;
                font-family: system-ui, -apple-system, sans-serif !important;
                padding: 20px !important;
            }
            table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin-bottom: 16px !important;
            }
            td {
                padding: 10px !important;
                border: 1px solid #e2e8f0 !important;
            }
        `;
        document.head.appendChild(style);
    }
})();
