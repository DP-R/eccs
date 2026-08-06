// ==========================================
// ECCS Extension: Dynamic CSB View Filters & Silent Background Hover Details
// ==========================================

(function() {
    let activeLoadId = 0;

    function initFilters() {
        const path = window.location.pathname.toLowerCase();
        const actionName = path.substring(path.lastIndexOf('/') + 1);
        
        // Strictly whitelist ONLY the 6 exact Export List action endpoints
        const exactExportPages = [
            'listexamcsb5.do',
            'listexamcsb4.do',
            'listcsb4.do',
            'listcsb3.do',
            'listcsb5.do',
            'listsez.do'
        ];
        const isExportDetailList = exactExportPages.includes(actionName);

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

            // ONLY target tables containing 2 or more data rows (multi-HAWB list views). Single-HAWB views are skipped.
            if (foundDataRows.length >= 2) {
                targetTable = table;
                headerRow = foundHeader;
                dataRows = foundDataRows;
                break; // Found the actual multi-shipment list table!
            }
        }

        // Do NOT inject filter rows or extra columns on single-HAWB tables or empty lists
        if (!targetTable || !headerRow || dataRows.length < 2) return;
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

        // --- EXPORT LIST PAGES ALONE: Append 4 Hover Columns at far right ---
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

        const filterInputs = []; // Array of inputs aligned with columns

        const filterRow = document.createElement('tr');
        filterRow.className = 'eccs-filter-row';

        Array.from(headerRow.querySelectorAll('td, th')).forEach((th, idx) => {
            const td = document.createElement('td');
            td.align = 'center';
            
            if (idx === 0) {
                const resetBtn = document.createElement('a');
                resetBtn.href = '#';
                resetBtn.textContent = 'Clear';
                resetBtn.style = 'font-size: 11px; font-weight: bold; color: #ef4444; text-decoration: none;';
                resetBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    filterInputs.forEach(input => { if (input) input.value = ''; });
                    applyFilters();
                });
                td.appendChild(resetBtn);
                filterInputs.push(null);
            } else {
                const title = (th.textContent || '').replace(/\s+/g, ' ').trim();
                if (title && !title.toLowerCase().includes('remarks') && !title.toLowerCase().includes('select') && !title.toLowerCase().includes('arrival date')) {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.placeholder = 'Filter...';
                    input.className = 'eccs-filter-input';
                    input.addEventListener('input', applyFilters);
                    td.appendChild(input);
                    filterInputs.push(input);
                } else {
                    if (title.toLowerCase().includes('remarks') || title.toLowerCase().includes('arrival date')) {
                        const counterSpan = document.createElement('span');
                        counterSpan.className = 'eccs-filter-counter';
                        counterSpan.style = 'font-size: 11px; font-weight: bold; color: #2563eb;';
                        if (!document.getElementById('eccs-hawb-counter')) {
                            counterSpan.id = 'eccs-hawb-counter';
                        }
                        td.appendChild(counterSpan);
                    }
                    filterInputs.push(null);
                }
            }
            filterRow.appendChild(td);
        });

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
            let visibleHawbs = new Set();
            
            dataRows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                let isMatch = true;

                for (let i = 0; i < filterInputs.length; i++) {
                    const input = filterInputs[i];
                    if (input && input.value.trim()) {
                        const query = input.value.toLowerCase().trim();
                        const cellText = (cells[i] ? cells[i].textContent : '').toLowerCase().replace(/\s+/g, ' ');
                        if (!cellText.includes(query)) {
                            isMatch = false;
                            break;
                        }
                    }
                }

                if (isMatch) {
                    row.style.display = '';
                    if (cells[hawbColIdx]) {
                        const hawbText = (cells[hawbColIdx].textContent || '').replace(/\s+/g, '').trim();
                        if (hawbText) visibleHawbs.add(hawbText);
                    }
                } else {
                    row.style.display = 'none';
                }
            });

            const counterSpan = document.getElementById('eccs-hawb-counter');
            if (counterSpan) {
                const totalUnique = new Set(dataRows.map(r => {
                    const cells = Array.from(r.querySelectorAll('td'));
                    return cells[hawbColIdx] ? (cells[hawbColIdx].textContent || '').replace(/\s+/g, '').trim() : '';
                }).filter(Boolean)).size;
                counterSpan.textContent = `[${visibleHawbs.size}/${totalUnique} HAWBs]`;
            }
        }

        // Debounce applyFilters
        let filterTimeout;
        function debouncedApplyFilters() {
            clearTimeout(filterTimeout);
            filterTimeout = setTimeout(applyFilters, 250);
        }

        // Attach listeners (handled during row creation)

        // Set initial counter
        applyFilters();

        // --- Comprehensive Label & Structure Extraction for CSB-III, CSB-IV, CSB-V & SEZ ---
        function extractFieldFromDOM(container, labelNames) {
            if (!container) return "";

            const tables = Array.from(container.querySelectorAll('table'));
            for (const table of tables) {
                const trs = Array.from(table.querySelectorAll('tr'));
                
                // 1. Check for Key-Value pairs in the same row
                for (const tr of trs) {
                    const cells = Array.from(tr.querySelectorAll('td, th'));
                    for (let i = 0; i < cells.length - 1; i++) {
                        const cellText = (cells[i].textContent || '').replace(/\s+/g, ' ').replace(/:$/, '').trim().toLowerCase();
                        
                        // Strict match or strict prefix match
                        const isMatch = labelNames.some(name => {
                            const lowerName = name.toLowerCase();
                            return cellText === lowerName || cellText.startsWith(lowerName + ' ') || cellText.startsWith(lowerName + ':');
                        });

                        if (isMatch) {
                            const nextCell = cells[i + 1];
                            // Ensure the next cell isn't a header or another label
                            if (nextCell && nextCell.tagName.toLowerCase() !== 'th') {
                                const val = (nextCell.textContent || '').replace(/\s+/g, ' ').replace(/&nbsp;/gi, '').trim();
                                if (val && val !== ':') return val;
                            }
                        }
                    }
                }
                
                // 2. Check for Table Headers (Vertical format)
                if (trs.length >= 2) {
                    for (let r = 0; r < trs.length - 1; r++) {
                        const headerCells = Array.from(trs[r].querySelectorAll('td, th'));
                        for (let colIdx = 0; colIdx < headerCells.length; colIdx++) {
                            const headerText = (headerCells[colIdx]?.textContent || '').replace(/\s+/g, ' ').replace(/:$/, '').trim().toLowerCase();
                            
                            const isMatch = labelNames.some(name => {
                                const lowerName = name.toLowerCase();
                                return headerText === lowerName || headerText.startsWith(lowerName + ' ');
                            });

                            if (isMatch) {
                                // Look at the same column index in the next row
                                const dataRow = trs[r + 1];
                                if (dataRow) {
                                    const dataCells = Array.from(dataRow.querySelectorAll('td, th'));
                                    if (dataCells[colIdx] && dataCells[colIdx].tagName.toLowerCase() !== 'th') {
                                        const val = (dataCells[colIdx].textContent || '').replace(/\s+/g, ' ').replace(/&nbsp;/gi, '').trim();
                                        if (val && val !== ':') return val;
                                    }
                                }
                            }
                        }
                    }
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

        // Removed triggerNativeHover entirely to prevent DOM races

        // Silent Background Fetching (Fallback for ALL rows when hover is rate-limited or fails)
        async function fetchBackgroundDetails(actionUrl, idOrCsbNo, index) {
            if (!actionUrl || !idOrCsbNo) return { desc: "", airlines: "", dest: "", weight: "" };

            const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
            const targetUrl = actionUrl.startsWith('http') || actionUrl.startsWith('/') ? actionUrl : baseUrl + actionUrl;
            
            let formData;
            if (document.forms.length > 0) {
                formData = new FormData(document.forms[0]);
            } else {
                formData = new FormData();
            }
            
            formData.set('csbNo', idOrCsbNo);
            formData.set('csbNumber', idOrCsbNo);
            formData.set('selectedIndex', String(index || '0'));
            
            const bodyStr = new URLSearchParams(formData).toString();
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

        // High-Speed Row Processing Unit
        async function processRowFast(task, thisLoadId) {
            if (activeLoadId !== thisLoadId) return;

            // Fetch details directly without native hover to prevent race condition over global form
            let details = null;
            if (task.actionUrl && task.csbNo) {
                details = await fetchBackgroundDetails(task.actionUrl, task.csbNo, task.index);
            }

            if (activeLoadId !== thisLoadId) return;

            // Update row UI instantly
            task.descTd.textContent = (details && details.desc) ? details.desc : "N/A";
            task.airTd.textContent = (details && details.airlines) ? details.airlines : "N/A";
            task.destTd.textContent = (details && details.dest) ? details.dest : "N/A";
            task.weightTd.textContent = (details && details.weight) ? details.weight : "N/A";
        }

        // --- Load details for Export Clearance Lists in ULTRA FAST parallel batches ---
        async function loadAllDetails() {
            if (!isExportDetailList) return;

            const thisLoadId = ++activeLoadId;

            // Wipe ALL existing mydiv containers in DOM globally before starting to eliminate stale data leakage
            document.querySelectorAll('[id^="mydiv"], [id^="eccs-temp-mydiv"]').forEach(div => {
                div.remove();
            });

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
                descTd.height = "25"; descTd.width = "130"; descTd.align = "center"; descTd.className = "eccs-desc-cell"; descTd.textContent = "...";
                row.appendChild(descTd);

                const airTd = document.createElement('td');
                airTd.height = "25"; airTd.width = "130"; airTd.align = "center"; airTd.className = "eccs-desc-cell"; airTd.textContent = "...";
                row.appendChild(airTd);

                const destTd = document.createElement('td');
                destTd.height = "25"; destTd.width = "130"; destTd.align = "center"; destTd.className = "eccs-desc-cell"; destTd.textContent = "...";
                row.appendChild(destTd);

                const weightTd = document.createElement('td');
                weightTd.height = "25"; weightTd.width = "130"; weightTd.align = "center"; weightTd.className = "eccs-desc-cell"; weightTd.textContent = "...";
                row.appendChild(weightTd);

                return { row, rowIndex, index, link, csbNo, actionUrl, descTd, airTd, destTd, weightTd };
            });

            applyFilters();

            // Step B: Process ALL rows in ULTRA-FAST parallel batches of 5
            const BATCH_SIZE = 5;
            for (let i = 0; i < rowTasks.length; i += BATCH_SIZE) {
                if (activeLoadId !== thisLoadId) return;
                const batch = rowTasks.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(task => processRowFast(task, thisLoadId)));
            }
            
            debouncedApplyFilters();
        }

        // Load hover details for export lists silently in background
        loadAllDetails();
    }

    // Trigger initialization
    initFilters();
    let mutationTimeout;
    new MutationObserver(() => {
        clearTimeout(mutationTimeout);
        mutationTimeout = setTimeout(initFilters, 500);
    }).observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });
})();
