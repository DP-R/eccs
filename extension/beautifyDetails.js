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

    // --- 2. Build & Prepend Pattern-Detection Table at the top of the body ---
    const summaryContainer = document.createElement('div');
    summaryContainer.id = 'eccs-summary-root';
    summaryContainer.style = "margin: 15px auto; width: 95%; max-width: 1200px; box-sizing: border-box;";

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
        .cbe-pattern-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 20px !important;
            font-family: system-ui, -apple-system, sans-serif !important;
            font-size: 12px !important;
            background-color: #f8fafc !important;
            border: 2px solid #2563eb !important;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06) !important;
        }
        .cbe-pattern-table td {
            border: 1px solid #cbd5e1 !important;
            padding: 8px 10px !important;
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
            width: 15% !important;
            text-align: right !important;
        }
        .pattern-value {
            width: 35% !important;
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
    `;
    document.head.appendChild(style);

    // Extract values
    const airlines = getValueText("Airlines Name");
    const flight = getValueText("Flight Number");
    const portShipment = getValueText("Port of Shipment");
    const portArrival = getValueText("Port of Arrival") || getValueText("First Port of Arrival");
    const grossWt = getValueText("Gross Weight (KGs)");
    const netWt = getValueText("Net Weight (KGs)");
    const pkgs = getValueText("No. of Packages") || getValueText("No. of Packages :");
    const assessableVal = getValueText("Assessable Value(Rs.)") || getValueText("Assessable Value (Rs.)");
    const duty = getValueText("Duty (Rs.)");
    const challanNo = getValueText("TR-6 Challan Number");
    const challanDate = getValueText("TR-6 Challan Date");
    const fine = getValueText("Fine (Rs.)");
    const penalty = getValueText("Penalty (Rs.)");
    const interest = getValueText("Interest Amount (Rs.)");
    const consignorName = getValueText("Name Of Consignor");
    const consignorAddr = getValueText("Address Of Consignor");
    const consigneeName = getValueText("Name Of Consignee");
    const consigneeAddr = getValueText("Address Of Consignee");

    // Build Table Layout
    summaryContainer.innerHTML = `
        <table class="cbe-pattern-table">
            <thead>
                <tr>
                    <td class="pattern-header" colspan="4">CBE STATUS SUMMARY (Combined Fields for Quick Review)</td>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="pattern-label">Shipment & Route:</td>
                    <td class="pattern-value">
                        <strong>HAWB:</strong> ${hawbNo} | 
                        <strong>CBE:</strong> ${cbeNo} (${cbeType})<br>
                        <strong>Airlines:</strong> ${airlines} (${flight}) | 
                        <strong>Route:</strong> ${portShipment} ➔ ${portArrival}
                    </td>
                    <td class="pattern-label">Weight & Pkgs:</td>
                    <td class="pattern-value">
                        <strong>Gross Weight:</strong> ${grossWt} KGs<br>
                        <strong>Net Weight:</strong> ${netWt} KGs | 
                        <strong>Packages:</strong> ${pkgs}
                    </td>
                </tr>
                <tr>
                    <td class="pattern-label">Finance & Duty:</td>
                    <td class="pattern-value">
                        <strong>Assessable Value:</strong> <span class="pattern-highlight">₹ ${assessableVal}</span><br>
                        <strong>Duty:</strong> ₹ ${duty} | 
                        <strong>Challan:</strong> ${challanNo} (${challanDate})
                    </td>
                    <td class="pattern-label">Fines & Interest:</td>
                    <td class="pattern-value">
                        <strong>Fine:</strong> ₹ ${fine} | 
                        <strong>Penalty:</strong> ₹ ${penalty}<br>
                        <strong>Interest:</strong> ₹ ${interest}
                    </td>
                </tr>
                <tr>
                    <td class="pattern-label">Consignor (Sender):</td>
                    <td class="pattern-value">
                        <strong>${consignorName}</strong><br>
                        <span style="font-size: 11px; color: #475569;">${consignorAddr}</span>
                    </td>
                    <td class="pattern-label">Consignee (Receiver):</td>
                    <td class="pattern-value">
                        <strong>${consigneeName}</strong><br>
                        <span style="font-size: 11px; color: #475569;">${consigneeAddr}</span>
                    </td>
                </tr>
            </tbody>
        </table>
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
})();
