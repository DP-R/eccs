// ==========================================
// ECCS Extension: Dynamic CSB View Filters & Silent Background Hover Details
// ==========================================

(function() {
    function initFilters() {
        const path = window.location.pathname.toLowerCase();
        
        // Exact pages where the 4 Hover Detail Columns (Description, Airlines, Dest, Weight) should be appended
        const exportDetailPages = [
            'listexamcsb5.do',
            'listexamcsb4.do',
            'listcsb4.do',
            'listcsb3.do',
            'listcsb5.do',
            'listsez.do'
        ];
        const isExportDetailList = exportDetailPages.some(page => path.includes(page));

        // Iterate through all tables to find the actual table containing data rows
        let targetTable = null;
        let headerRow = null;
        let dataRows = [];

        const candidateTables = Array.from(document.querySelectorAll('table'));

        for (const table of candidateTables) {
            if (table.querySelector('.eccs-filter-row')) continue;

            const normText = table.textContent.replace(/\s+/g, ' ');
            const hasCsbOrCbe = /CSB|CBE|Shipping\s*Bill|Bill\s*of\s*Entry|HAWB/i.test(normText);
            const hasCourierOrHawb = /Courier|HAWB|Status/i.test(normText);

            if (!hasCsbOrCbe || !hasCourierOrHawb) continue;

            const rows = Array.from(table.querySelectorAll('tr'));
            const foundHeader = rows.find(row => {
                const text = row.textContent.replace(/\s+/g, ' ');
                return /CSB|CBE|Shipping\s*Bill|Bill\s*of\s*Entry|HAWB/i.test(text) && (/Courier|HAWB|Status|Number/i.test(text));
            });

            if (!foundHeader) continue;

            const foundDataRows = rows.filter(row => {
                if (row === foundHeader || row.classList.contains('eccs-filter-row')) return false;
                const hasInput = row.querySelector('input[type="checkbox"], input[type="radio"], input[name="selectedIndex"], input[name="indexes"], input[name="csbNum"]');
                const hasDetailLink = row.querySelector('a[onmouseover*="view"], a[href*="view"], a[href*="CSB"], a[href*="csb"], a[href*="ExamReport"]');
                const cellCount = row.querySelectorAll('td').length;
                return (hasInput || hasDetailLink || cellCount >= 4) && cellCount >= 3;
            });

            if (foundDataRows.length > 0) {
                targetTable = table;
                headerRow = foundHeader;
                dataRows = foundDataRows;
                break; // Found the actual shipment list table!
            }
        }

        if (!targetTable || !headerRow || dataRows.length === 0) return;
        if (targetTable.querySelector('.eccs-filter-row')) return;

        console.log("[ECCS Extension] Initializing filters on target list view...");
        if (window.eccsLog) window.eccsLog.info("Filters initializing on list view", { rowsCount: dataRows.length, isExportDetailList });

        // Dynamically detect column indices from header row
        const headerTextArr = Array.from(headerRow.querySelectorAll('td, th')).map(c => (c.textContent || '').replace(/\s+/g, ' ').trim());
        let csbColIdx = headerTextArr.findIndex(t => /CSB|CBE|Shipping\s*Bill|Bill\s*of\s*Entry/i.test(t));
        let hawbColIdx = headerTextArr.findIndex(t => /HAWB/i.test(t));
        let courierColIdx = headerTextArr.findIndex(t => /Courier/i.test(t));
        let statusColIdx = headerTextArr.findIndex(t => /Status/i.test(t));

        if (csbColIdx === -1) csbColIdx = 1;
        if (hawbColIdx === -1) hawbColIdx = 2;
        if (courierColIdx === -1) courierColIdx = 3;
        if (statusColIdx === -1) statusColIdx = 4;

        // Inject Stylesheet only once
        if (!document.getElementById('eccs-filter-style')) {
            const style = document.createElement('style');
            style.id = 'eccs-filter-style';
            style.textContent = `
                .eccs-filter-input {
                    background: #ffffff !important;
                    color: #0f172a !important;
                    border: 1px solid #cbd5e1 !important;
                    border-radius: 4px !important;
                    padding: 4px 6px !important;
                    font-size: 11px !important;
                    width: 95% !important;
                    outline: none !important;
                    box-sizing: border-box !important;
                    font-family: sans-serif !important;
                }
                .eccs-filter-input:focus {
                    border-color: #2563eb !important;
                    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2) !important;
                }
                .eccs-filter-counter {
                    font-size: 11px !important;
                    font-weight: 700 !important;
                    color: #2563eb !important;
                    white-space: nowrap !important;
                    font-family: sans-serif !important;
                }
                .eccs-filter-row td {
                    background-color: #f8fafc !important;
                    padding: 6px 4px !important;
                    border: 1px solid #cbd5e1 !important;
                }
                .eccs-desc-cell {
                    font-family: sans-serif !important;
                    font-size: 11px !important;
                    color: #0f172a !important;
                    font-weight: 600 !important;
                    padding: 4px 6px !important;
                    border: 1px solid #cbd5e1 !important;
                    background-color: #ffffff !important;
                    max-width: 160px !important;
                    word-wrap: break-word !important;
                    white-space: normal !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Force container and table responsiveness so newly appended columns are fully visible
        targetTable.style.width = "100%";
        targetTable.style.maxWidth = "none";
        if (targetTable.parentElement) {
            targetTable.parentElement.style.overflowX = "auto";
        }

        // Determine indices for appended columns
        let descColIdx = -1, airColIdx = -1, destColIdx = -1, weightColIdx = -1;

        // --- EXPORT CLEARANCE & EXAMINATION LISTS ALONE: Append 4 Hover Columns at far right ---
        if (isExportDetailList) {
            const baseColCount = headerRow.querySelectorAll('td, th').length;
            descColIdx = baseColCount;
            airColIdx = baseColCount + 1;
            destColIdx = baseColCount + 2;
            weightColIdx = baseColCount + 3;

            // Increment Colspan of Header/Footer rows to fit 4 new columns
            Array.from(targetTable.querySelectorAll('td[colspan]')).forEach(td => {
                const currentCols = parseInt(td.getAttribute('colspan'), 10);
                if (currentCols >= 5) {
                    td.setAttribute('colspan', currentCols + 4);
                }
            });

            // Append 4 new header cells at the far right
            const headers = [
                "Description of Goods",
                "Airlines",
                "Airport of Destination",
                "Manifest Weight"
            ];
            headers.forEach(title => {
                const th = document.createElement('td');
                th.width = "130";
                th.height = "25";
                th.align = "center";
                th.style = "font-weight: bold; background-color: #e2e8f0; color: #0f172a; border: 1px solid #cbd5e1; padding: 4px;";
                th.textContent = title;
                headerRow.appendChild(th);
            });
        }

        // --- Override Select All / Clear All globally in page context ---
        window.selectAll = function() {
            dataRows.forEach(row => {
                if (row.style.display !== 'none') {
                    const checkbox = row.querySelector('input[type="checkbox"]');
                    if (checkbox) checkbox.checked = true;
                }
            });
        };

        window.clearAll = function() {
            dataRows.forEach(row => {
                const checkbox = row.querySelector('input[type="checkbox"]');
                if (checkbox) checkbox.checked = false;
            });
        };

        // --- Create Filter Row aligned with column structure ---
        const filterRow = document.createElement('tr');
        filterRow.className = 'eccs-filter-row';

        // Column 0: Clear button
        const td0 = document.createElement('td');
        td0.align = 'center';
        const resetBtn = document.createElement('a');
        resetBtn.href = '#';
        resetBtn.textContent = 'Clear';
        resetBtn.style = 'font-size: 11px; font-weight: bold; color: #ef4444; text-decoration: none;';
        resetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            csbInput.value = '';
            hawbInput.value = '';
            courierInput.value = '';
            statusInput.value = '';
            if (descInput) descInput.value = '';
            if (airlinesInput) airlinesInput.value = '';
            if (destInput) destInput.value = '';
            if (weightInput) weightInput.value = '';
            applyFilters();
        });
        td0.appendChild(resetBtn);
        filterRow.appendChild(td0);

        // Column 1: CSB / CBE Filter
        const td1 = document.createElement('td');
        td1.align = 'center';
        const csbInput = document.createElement('input');
        csbInput.type = 'text';
        csbInput.placeholder = isExportDetailList ? 'Filter CSB...' : 'Filter CBE/CSB...';
        csbInput.className = 'eccs-filter-input';
        td1.appendChild(csbInput);
        filterRow.appendChild(td1);

        // Column 2: HAWB Filter
        const td2 = document.createElement('td');
        td2.align = 'center';
        const hawbInput = document.createElement('input');
        hawbInput.type = 'text';
        hawbInput.placeholder = 'Filter HAWB...';
        hawbInput.className = 'eccs-filter-input';
        td2.appendChild(hawbInput);
        filterRow.appendChild(td2);

        // Column 3: Courier Filter
        const td4 = document.createElement('td');
        td4.align = 'center';
        const courierInput = document.createElement('input');
        courierInput.type = 'text';
        courierInput.placeholder = 'Filter Courier...';
        courierInput.className = 'eccs-filter-input';
        td4.appendChild(courierInput);
        filterRow.appendChild(td4);

        // Column 4: Status Filter
        const td5 = document.createElement('td');
        td5.align = 'center';
        const statusInput = document.createElement('input');
        statusInput.type = 'text';
        statusInput.placeholder = 'Filter Status...';
        statusInput.className = 'eccs-filter-input';
        td5.appendChild(statusInput);
        filterRow.appendChild(td5);

        // Column 5: Unique HAWB Counter
        const td6 = document.createElement('td');
        td6.align = 'center';
        const counterSpan = document.createElement('span');
        counterSpan.className = 'eccs-filter-counter';
        counterSpan.style = 'font-size: 11px; font-weight: bold; color: #2563eb;';
        td6.appendChild(counterSpan);
        filterRow.appendChild(td6);

        let descInput, airlinesInput, destInput, weightInput;

        if (isExportDetailList) {
            // Column 6: Description of Goods Filter
            const tdDesc = document.createElement('td');
            tdDesc.align = 'center';
            descInput = document.createElement('input');
            descInput.type = 'text';
            descInput.placeholder = 'Filter Goods...';
            descInput.className = 'eccs-filter-input';
            tdDesc.appendChild(descInput);
            filterRow.appendChild(tdDesc);

            // Column 7: Airlines Filter
            const tdAirlines = document.createElement('td');
            tdAirlines.align = 'center';
            airlinesInput = document.createElement('input');
            airlinesInput.type = 'text';
            airlinesInput.placeholder = 'Filter Airlines...';
            airlinesInput.className = 'eccs-filter-input';
            tdAirlines.appendChild(airlinesInput);
            filterRow.appendChild(tdAirlines);

            // Column 8: Airport of Destination Filter
            const tdDest = document.createElement('td');
            tdDest.align = 'center';
            destInput = document.createElement('input');
            destInput.type = 'text';
            destInput.placeholder = 'Filter Dest...';
            destInput.className = 'eccs-filter-input';
            tdDest.appendChild(destInput);
            filterRow.appendChild(tdDest);

            // Column 9: Manifest Weight Filter
            const tdWeight = document.createElement('td');
            tdWeight.align = 'center';
            weightInput = document.createElement('input');
            weightInput.type = 'text';
            weightInput.placeholder = 'Filter Weight...';
            weightInput.className = 'eccs-filter-input';
            tdWeight.appendChild(weightInput);
            filterRow.appendChild(tdWeight);
        }

        // Inject Filter Row right after Header Row
        headerRow.parentNode.insertBefore(filterRow, headerRow.nextSibling);

        // --- Extract Unique HAWBs Count ---
        function getUniqueHawbCount() {
            const uniqueHawbs = new Set();
            dataRows.forEach(row => {
                if (row.style.display !== 'none') {
                    const cells = Array.from(row.querySelectorAll('td'));
                    if (cells[hawbColIdx]) {
                        const hawbText = (cells[hawbColIdx].textContent || '').replace(/\s+/g, '').trim();
                        if (hawbText) uniqueHawbs.add(hawbText);
                    }
                }
            });
            return uniqueHawbs.size;
        }

        // Apply filtering logic with whitespace normalization
        function applyFilters() {
            const csbQuery = csbInput.value.toLowerCase().replace(/\s+/g, '');
            const hawbQuery = hawbInput.value.toLowerCase().replace(/\s+/g, '');
            const courierQuery = courierInput.value.toLowerCase().trim();
            const statusQuery = statusInput.value.toLowerCase().trim();
            
            const descQuery = descInput ? descInput.value.toLowerCase().trim() : '';
            const airlinesQuery = airlinesInput ? airlinesInput.value.toLowerCase().trim() : '';
            const destQuery = destInput ? destInput.value.toLowerCase().trim() : '';
            const weightQuery = weightInput ? weightInput.value.toLowerCase().trim() : '';

            dataRows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length < 3) return;

                const csbText = cells[csbColIdx] ? (cells[csbColIdx].textContent || '').toLowerCase().replace(/\s+/g, '') : '';
                const hawbText = cells[hawbColIdx] ? (cells[hawbColIdx].textContent || '').toLowerCase().replace(/\s+/g, '') : '';
                const courierText = cells[courierColIdx] ? (cells[courierColIdx].textContent || '').toLowerCase().replace(/\s+/g, ' ') : '';
                const statusText = cells[statusColIdx] ? (cells[statusColIdx].textContent || '').toLowerCase().replace(/\s+/g, ' ') : '';
                
                const descText = (descColIdx !== -1 && cells[descColIdx]) ? (cells[descColIdx].textContent || '').toLowerCase() : '';
                const airlinesText = (airColIdx !== -1 && cells[airColIdx]) ? (cells[airColIdx].textContent || '').toLowerCase() : '';
                const destText = (destColIdx !== -1 && cells[destColIdx]) ? (cells[destColIdx].textContent || '').toLowerCase() : '';
                const weightText = (weightColIdx !== -1 && cells[weightColIdx]) ? (cells[weightColIdx].textContent || '').toLowerCase() : '';

                const matchesCsb = !csbQuery || csbText.includes(csbQuery);
                const matchesHawb = !hawbQuery || hawbText.includes(hawbQuery);
                const matchesCourier = !courierQuery || courierText.includes(courierQuery);
                const matchesStatus = !statusQuery || statusText.includes(statusQuery);
                
                const matchesDesc = !descQuery || descText.includes(descQuery);
                const matchesAirlines = !airlinesQuery || airlinesText.includes(airlinesQuery);
                const matchesDest = !destQuery || destText.includes(destQuery);
                const matchesWeight = !weightQuery || weightText.includes(weightQuery);

                const matchesAll = matchesCsb && matchesHawb && matchesCourier && matchesStatus && matchesDesc && matchesAirlines && matchesDest && matchesWeight;

                if (matchesAll) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });

            // Update unique HAWB counter label
            const totalUnique = new Set(dataRows.map(r => {
                const cells = Array.from(r.querySelectorAll('td'));
                return cells[hawbColIdx] ? (cells[hawbColIdx].textContent || '').replace(/\s+/g, '').trim() : '';
            }).filter(Boolean)).size;

            counterSpan.textContent = `[${getUniqueHawbCount()}/${totalUnique} HAWBs]`;
        }

        // Debounce applyFilters
        let filterTimeout;
        function debouncedApplyFilters() {
            clearTimeout(filterTimeout);
            filterTimeout = setTimeout(applyFilters, 20);
        }

        // Attach listeners
        const inputs = [csbInput, hawbInput, courierInput, statusInput];
        if (isExportDetailList) {
            inputs.push(descInput, airlinesInput, destInput, weightInput);
        }
        inputs.forEach(input => {
            if (input) input.addEventListener('input', applyFilters);
        });

        // Set initial counter
        applyFilters();

        // --- Comprehensive Label & Structure Extraction for CSB-III, CSB-IV, CSB-V & SEZ ---
        function extractFieldFromDOM(container, labelNames) {
            if (!container) return "";

            const tables = Array.from(container.querySelectorAll('table'));
            for (const table of tables) {
                const trs = Array.from(table.querySelectorAll('tr'));
                // Format B: Multi-column header row + data row
                if (trs.length >= 2) {
                    const headerCells = Array.from(trs[0].querySelectorAll('td, th'));
                    for (let colIdx = 0; colIdx < headerCells.length; colIdx++) {
                        const headerText = (headerCells[colIdx]?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                        if (labelNames.some(name => headerText.includes(name.toLowerCase()))) {
                            const dataRow = trs[1];
                            if (dataRow) {
                                const dataCells = Array.from(dataRow.querySelectorAll('td, th'));
                                if (dataCells[colIdx]) {
                                    const val = (dataCells[colIdx]?.textContent || '').replace(/\s+/g, ' ').replace(/&nbsp;/gi, '').trim();
                                    if (val) return val;
                                }
                            }
                        }
                    }
                }

                // Format A: Key-Value pair matching
                const tds = Array.from(table.querySelectorAll('td'));
                for (let i = 0; i < tds.length; i++) {
                    const txt = (tds[i]?.textContent || '').replace(/\s+/g, ' ').trim().replace(/:$/, '').trim().toLowerCase();
                    if (labelNames.some(name => txt.includes(name.toLowerCase()))) {
                        const nextTd = tds[i].nextElementSibling;
                        if (nextTd && nextTd.tagName && nextTd.tagName.toLowerCase() === 'td') {
                            const val = (nextTd.textContent || '').replace(/\s+/g, ' ').replace(/&nbsp;/gi, '').trim();
                            if (val) return val;
                        }
                        if (tds[i+1]) {
                            const val = (tds[i+1]?.textContent || '').replace(/\s+/g, ' ').replace(/&nbsp;/gi, '').trim();
                            if (val) return val;
                        }
                    }
                }
            }

            // Text fallback parsing using comprehensive label regex
            const rawText = (container.textContent || '').replace(/\s+/g, ' ').trim();
            for (const name of labelNames) {
                const escapedLabel = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp(escapedLabel + '\\s*[:\\-]?\\s*([\\s\\S]*?)(?=\\s*(?:[A-Z][a-zA-Z0-9\\s()\\.\\/]+:|$))', 'i');
                const match = rawText.match(regex);
                if (match && match[1] && match[1].trim()) {
                    return match[1].replace(/&nbsp;/gi, '').trim();
                }
            }
            return "";
        }

        function extractDescription(container) {
            return extractFieldFromDOM(container, [
                'Description of Goods (Item wise)',
                'Description of Goods',
                'Goods Description',
                'Item Description',
                'Description',
                'Items',
                'Goods'
            ]);
        }

        function extractAirlines(container) {
            return extractFieldFromDOM(container, [
                'International Airlines',
                'Airlines',
                'Airline Name',
                'Flight Name',
                'Flight No.',
                'Flight No',
                'Flight',
                'Carrier'
            ]);
        }

        function extractDest(container) {
            return extractFieldFromDOM(container, [
                'Airport of Destination',
                'Port of Destination',
                'Destination Airport',
                'Destination Port',
                'Destination',
                'Port of Discharge'
            ]);
        }

        function extractWeight(container) {
            return extractFieldFromDOM(container, [
                'Manifest Weight',
                'Weight (in Kg.)',
                'Weight (in Kgs.)',
                'Weight(in Kg.)',
                'Gross Weight',
                'Declared Weight',
                'Total Weight',
                'Weight'
            ]);
        }

        // Silent Native Handler Trigger (Styles target mydiv offscreen without setting display:none so native ECCS JS proceeds)
        function triggerNativeHover(task) {
            if (!task.link) return;

            const myDiv = document.getElementById('mydiv' + task.index);
            if (myDiv) {
                myDiv.innerHTML = ''; // CRITICAL: Erase stale innerHTML from previous page renders to prevent data leakage!
                myDiv.style.position = 'absolute';
                myDiv.style.left = '-9999px';
                myDiv.style.top = '-9999px';
                myDiv.style.visibility = 'hidden';
                myDiv.style.height = '0px';
                myDiv.style.width = '0px';
                myDiv.style.overflow = 'hidden';
                myDiv.style.display = 'block';

                if (myDiv.parentElement) {
                    myDiv.parentElement.style.position = 'absolute';
                    myDiv.parentElement.style.left = '-9999px';
                    myDiv.parentElement.style.height = '0px';
                    myDiv.parentElement.style.overflow = 'hidden';
                    myDiv.parentElement.style.display = 'block';
                }
            }

            const targetAttr = task.link.getAttribute('onmouseover') || task.link.getAttribute('onclick') || '';
            const jsCode = targetAttr.replace(/^javascript:/i, '').trim();
            if (jsCode) {
                if (window.eccsLog) window.eccsLog.info("Executing native hover for row", { index: task.index, csbNo: task.csbNo, jsCode });
                try {
                    const fn = new Function(jsCode);
                    fn();
                } catch (e) {
                    if (window.eccsLog) window.eccsLog.error("Native hover execution error", { index: task.index, error: e.message });
                }
            }
        }

        // Silent Background Fetching (Fallback)
        async function fetchBackgroundDetails(actionUrl, idOrCsbNo, index) {
            if (!actionUrl || !idOrCsbNo) return { desc: "", airlines: "", dest: "", weight: "" };

            const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
            const targetUrl = actionUrl.startsWith('http') || actionUrl.startsWith('/') ? actionUrl : baseUrl + actionUrl;
            
            const params = new URLSearchParams();
            params.set('csbNo', idOrCsbNo);
            params.set('csbNumber', idOrCsbNo);
            params.set('csbID', idOrCsbNo);
            params.set('hawbId', idOrCsbNo);
            params.set('hawbID', idOrCsbNo);
            params.set('hawbNo', idOrCsbNo);
            params.set('hawbNumber', idOrCsbNo);
            params.set('id', idOrCsbNo);
            params.set('index', String(index || '0'));
            params.set('selectedIndex', idOrCsbNo);

            const bodyStr = params.toString();
            const urlWithParams = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}${bodyStr}`;

            try {
                let response = await fetch(targetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: bodyStr,
                    credentials: 'same-origin'
                });

                if (!response.ok) {
                    response = await fetch(urlWithParams, { credentials: 'same-origin' });
                }

                if (!response.ok) return { desc: "", airlines: "", dest: "", weight: "" };

                const htmlText = await response.text();
                const doc = new DOMParser().parseFromString(htmlText, 'text/html');

                const desc = extractDescription(doc);
                const airlines = extractAirlines(doc);
                const dest = extractDest(doc);
                const weight = extractWeight(doc);

                return { desc, airlines, dest, weight };
            } catch (e) {
                return { desc: "", airlines: "", dest: "", weight: "" };
            }
        }

        // --- Load details for Export Clearance Lists in background sequentially ---
        async function loadAllDetails() {
            if (!isExportDetailList) return;

            // Step A: Append new columns to the far right of all rows immediately
            const rowTasks = dataRows.map((row, rowIndex) => {
                const link = Array.from(row.querySelectorAll('a')).find(a => {
                    const html = a.outerHTML || '';
                    return html.includes('view') || html.includes('CSB') || html.includes('csb') || html.includes('CreateExamReport') || html.includes('ExamReport');
                });
                
                const targetAttr = link ? (link.getAttribute('onmouseover') || link.getAttribute('onclick') || link.getAttribute('href') || '') : '';
                const matches = targetAttr.match(/'([^']+)'/g);
                const csbNo = (matches && matches[1]) ? matches[1].replace(/'/g, '') : '';
                const actionUrl = (matches && matches[0]) ? matches[0].replace(/'/g, '') : '';
                const index = (matches && matches[2]) ? matches[2].replace(/'/g, '') : String(rowIndex);

                // Append 4 new columns at the far right of the row
                const descTd = document.createElement('td');
                descTd.height = "25"; descTd.width = "130"; descTd.align = "center"; descTd.className = "eccs-desc-cell"; descTd.textContent = "-";
                row.appendChild(descTd);

                const airTd = document.createElement('td');
                airTd.height = "25"; airTd.width = "130"; airTd.align = "center"; airTd.className = "eccs-desc-cell"; airTd.textContent = "-";
                row.appendChild(airTd);

                const destTd = document.createElement('td');
                destTd.height = "25"; destTd.width = "130"; destTd.align = "center"; destTd.className = "eccs-desc-cell"; destTd.textContent = "-";
                row.appendChild(destTd);

                const weightTd = document.createElement('td');
                weightTd.height = "25"; weightTd.width = "130"; weightTd.align = "center"; weightTd.className = "eccs-desc-cell"; weightTd.textContent = "-";
                row.appendChild(weightTd);

                return { row, rowIndex, index, link, csbNo, actionUrl, descTd, airTd, destTd, weightTd };
            });

            applyFilters();

            // Step B: Process rows SEQUENTIALLY with DOM clearing and polling for fresh AJAX data
            for (const task of rowTasks) {
                if (window.eccsLog) window.eccsLog.info(`Processing row ${task.rowIndex}`, { index: task.index, csbNo: task.csbNo });

                const myDiv = document.getElementById('mydiv' + task.index);
                if (myDiv) myDiv.innerHTML = ''; // CLEAR STALE HTML BEFORE TRIGGERING HOVER!

                // 1. Trigger native hover for THIS specific row
                triggerNativeHover(task);

                // 2. Poll for up to 600ms for ECCS native AJAX response to populate mydiv
                let details = null;
                let elapsed = 0;
                while (elapsed < 600) {
                    await new Promise(r => setTimeout(r, 50));
                    elapsed += 50;

                    if (myDiv && myDiv.textContent && myDiv.textContent.trim().length > 10) {
                        const desc = extractDescription(myDiv);
                        const airlines = extractAirlines(myDiv);
                        const dest = extractDest(myDiv);
                        const weight = extractWeight(myDiv);
                        if (desc || airlines || dest || weight) {
                            details = { desc, airlines, dest, weight };
                            break;
                        }
                    }
                }

                // 3. Fallback if polling produced no fields
                if (!details || (!details.desc && !details.airlines && !details.dest && !details.weight)) {
                    if (task.actionUrl && task.csbNo) {
                        details = await fetchBackgroundDetails(task.actionUrl, task.csbNo, task.index);
                    }
                }

                // 4. Populate cells for THIS row
                task.descTd.textContent = (details && details.desc) ? details.desc : "N/A";
                task.airTd.textContent = (details && details.airlines) ? details.airlines : "N/A";
                task.destTd.textContent = (details && details.dest) ? details.dest : "N/A";
                task.weightTd.textContent = (details && details.weight) ? details.weight : "N/A";

                if (window.eccsLog) window.eccsLog.info(`Row ${task.rowIndex} completed`, details);
            }
            
            debouncedApplyFilters();
        }

        // Load hover details for export lists silently in background
        loadAllDetails();
    }

    // Trigger initialization
    initFilters();
    new MutationObserver(initFilters).observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });
})();
