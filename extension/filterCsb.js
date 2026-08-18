// ==========================================
// ECCS Extension: Dynamic CSB View Filters & Silent Background Hover Details
// ==========================================

(function() {
    let activeLoadId = 0;

    function initFilters() {
        const path = window.location.pathname.toLowerCase();
        const actionName = path.substring(path.lastIndexOf('/') + 1);
        
        // Exclude all non-list/non-search/non-submit pages from filter injection
        if (!actionName.includes('list') && !actionName.includes('search') && !actionName.includes('submit')) return;
        
        // Strictly whitelist ONLY the exact Export List action endpoints
        const exactExportPages = [
            'listexamcsb5.do',
            'listexamcsb4.do',
            'listcsb4.do',
            'listcsb3.do',
            'listcsb5.do',
            'listsez.do',
            'submitxrayremarks.do'
        ];
        // Whitelist Import List action endpoints
        const exactImportPages = [
            'listsuspicioushawbetails.do',
            'listcbexidetailsinsp.do',
            'listinspexamcbexidetails.do',
            'listhawbdetailsinspnondocs.do',
            'listcbexi.do',
            'listcbexii.do',
            'listcbexiii.do',
            'searchrboe.do'
        ];
        const isExportDetailList = exactExportPages.includes(actionName);
        const isImportDetailList = exactImportPages.includes(actionName);
        const isActiveDetailList = isExportDetailList || isImportDetailList;

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
                
                // Exclude footer/pagination rows which typically use colspan
                if (row.querySelector('td[colspan], th[colspan]')) return false;
                
                const hasInput = row.querySelector('input[type="checkbox"], input[type="radio"], input[name="selectedIndex"], input[name="indexes"], input[name="csbNum"]');
                const hasDetailLink = row.querySelector('a[onmouseover*="view"], a[href*="view"], a[href*="CSB"], a[href*="csb"], a[href*="ExamReport"], a[href*="getHawbDetails"], a[href*="CBE"], a[href*="cbe"]');
                const cellCount = row.querySelectorAll('td').length;
                return (hasInput || hasDetailLink) && cellCount >= 3;
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

        // --- EXPORT & IMPORT LIST PAGES ALONE: Append 4 Hover Columns at far right ---
        if (isActiveDetailList) {
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
            const headers = isExportDetailList ? [
                "Description of Goods", "Airlines", "Airport of Destination", "Manifest Weight"
            ] : [
                "Item Description", "Qty", "Value (Rs.)", "Consignee"
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
                td.innerHTML = `<a href="#" style="font-size: 11px; font-weight: bold; color: #ef4444; text-decoration: none;" class="eccs-clear-filters">Clear</a><br><span class="eccs-filter-counter" id="eccs-hawb-counter" style="font-size: 10px; font-weight: bold; color: #2563eb; display: block; margin-top: 4px;"></span>`;
                td.querySelector('.eccs-clear-filters').addEventListener('click', (e) => {
                    e.preventDefault();
                    filterInputs.forEach(input => { if (input) input.value = ''; });
                    applyFilters();
                });
                filterInputs.push(null);
            } else {
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = 'Filter...';
                input.className = 'eccs-filter-input';
                input.addEventListener('input', applyFilters);
                td.appendChild(input);
                filterInputs.push(input);
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
                const primaryIdx = (headerTextArr.findIndex(t => /HAWB/i.test(t)) !== -1) 
                                    ? headerTextArr.findIndex(t => /HAWB/i.test(t)) 
                                    : (csbColIdx !== -1 ? csbColIdx : 1);
                                    
                const totalUnique = new Set(dataRows.map(r => {
                    const cells = Array.from(r.querySelectorAll('td'));
                    return cells[primaryIdx] ? (cells[primaryIdx].textContent || '').replace(/\s+/g, '').trim() : '';
                }).filter(Boolean)).size;
                
                // visibleHawbs counts how many unique primary items are visible
                const visibleUnique = new Set(dataRows.filter(r => r.style.display !== 'none').map(r => {
                    const cells = Array.from(r.querySelectorAll('td'));
                    return cells[primaryIdx] ? (cells[primaryIdx].textContent || '').replace(/\s+/g, '').trim() : '';
                }).filter(Boolean)).size;
                
                counterSpan.textContent = `[${visibleUnique}/${totalUnique} Items]`;
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
                
                // Common keywords that appear in headers to prevent extracting another header as a value
                const headerKeywords = ['consignor', 'consignee', 'airport', 'airlines', 'weight', 'value', 'status', 'hawb', 'date', 'description', 'flight', 'courier', 'csb', 'cbe', 'item', 'quantity', 'uqc', 'ctsh'];

                // 1. Check for Key-Value pairs in the same row
                for (const tr of trs) {
                    const cells = Array.from(tr.querySelectorAll('td, th'));
                    for (let i = 0; i < cells.length - 1; i++) {
                        const cellText = (cells[i].textContent || '').replace(/\s+/g, ' ').replace(/:$/, '').trim().toLowerCase();
                        
                        const isMatch = labelNames.some(name => cellText.includes(name.toLowerCase()));

                        if (isMatch) {
                            const nextCell = cells[i + 1];
                            if (nextCell && nextCell.tagName.toLowerCase() !== 'th') {
                                const val = (nextCell.textContent || '').replace(/\s+/g, ' ').replace(/&nbsp;/gi, '').trim();
                                
                                // Check if the extracted value is actually just another header!
                                const valLower = val.toLowerCase();
                                const isAnotherHeader = val.length < 50 && headerKeywords.some(kw => valLower.includes(kw));

                                if (val && val !== ':' && !isAnotherHeader) {
                                    return val;
                                }
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
                            
                            const isMatch = labelNames.some(name => headerText.includes(name.toLowerCase()));

                            if (isMatch) {
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
        async function fetchBackgroundDetails(actionUrl, idOrCsbNo, index, argMatches) {
            if (!actionUrl || !idOrCsbNo) return { desc: "", airlines: "", dest: "", weight: "" };

            // CACHING LAYER: Check if we already fetched these details in this session
            const cacheKey = 'eccs_cache_' + idOrCsbNo;
            try {
                const cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                    return JSON.parse(cached);
                }
            } catch (e) {
                console.warn("[ECCS] Cache read error", e);
            }

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
            formData.set('csbNum', idOrCsbNo);
            formData.set('hiddenCSBVRefId', idOrCsbNo);
            formData.set('selectedIndex', String(index || '0'));
            
            // Populate extra arguments for CreateExamReport or others if they exist
            if (argMatches && argMatches.length >= 5) {
                formData.set('csbID', argMatches[2] || '');
                formData.set('grpCatID', argMatches[3] || '');
                formData.set('userID', argMatches[4] || '');
            }
            // Populate arguments for Import getHawbDetails
            if (argMatches && argMatches.length >= 4) {
                formData.set('hawbRefNumber', argMatches[1] || '');
                formData.set('hawbNumber', argMatches[1] || '');
                formData.set('selectedHawb', argMatches[1] || '');
                formData.set('cbeXIRefNumber', argMatches[2] || '');
                formData.set('cbeRefNumber', argMatches[2] || '');
                formData.set('cbeXIINumber', argMatches[2] || '');
                formData.set('selectedCbe', argMatches[2] || '');
                formData.set('selectedCbe3No', argMatches[2] || '');
                formData.set('hawbId', argMatches[3] || '');
                formData.set('selectedHawbID', argMatches[3] || '');
            }
            
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

                let desc, airlines, dest, weight;
                if (isImportDetailList) {
                    let descArray = [];
                    let qtyArray = [];
                    let valArray = [];
                    let consignee = "N/A";
                    
                    // 1. Find the Consignee using native DOM
                    const allCells = Array.from(doc.querySelectorAll('td, th'));
                    for (let i = 0; i < allCells.length - 1; i++) {
                        const text = (allCells[i].textContent || '').trim().toLowerCase();
                        if (text === 'name of consignee:' || text === 'name of consignee :') {
                            const nextCell = allCells[i+1];
                            if (nextCell) {
                                consignee = (nextCell.textContent || '').replace(/&nbsp;/gi, '').trim();
                                break;
                            }
                        }
                    }

                    // 2. Find the DETAILS OF ITEMS table and aggregate ALL items
                    const tables = Array.from(doc.querySelectorAll('table'));
                    let itemsTable = null;
                    let headerRow = null;
                    
                    for (const table of tables) {
                        const trs = Array.from(table.querySelectorAll('tr'));
                        for (const tr of trs) {
                            const trText = (tr.textContent || '').toLowerCase();
                            if (trText.includes('ctsh') && trText.includes('description') && trText.includes('qty')) {
                                itemsTable = table;
                                headerRow = tr;
                                break;
                            }
                        }
                        if (itemsTable) break;
                    }

                    if (itemsTable && headerRow) {
                        let descIdx = -1, qtyIdx = -1, valIdx = -1;
                        const hCells = Array.from(headerRow.querySelectorAll('td, th'));
                        
                        hCells.forEach((cell, idx) => {
                            const text = (cell.textContent || '').trim().toLowerCase();
                            if (text.includes('description')) descIdx = idx;
                            else if (text.includes('qty') || text.includes('quantity')) qtyIdx = idx;
                            else if (text.includes('assessable value') || text.includes('value (rs')) valIdx = idx;
                        });

                        const allTrs = Array.from(itemsTable.querySelectorAll('tr'));
                        const headerIndex = allTrs.indexOf(headerRow);
                        
                        for (let r = headerIndex + 1; r < allTrs.length; r++) {
                            const tr = allTrs[r];
                            const cells = Array.from(tr.querySelectorAll('td, th'));
                            
                            if (cells.length > Math.max(descIdx, qtyIdx, valIdx) && descIdx !== -1) {
                                // Skip footer rows with colspans
                                if (cells[0].getAttribute('colspan')) continue;
                                
                                const dText = (cells[descIdx].textContent || '').replace(/&nbsp;/gi, '').trim();
                                const qText = qtyIdx !== -1 ? (cells[qtyIdx].textContent || '').replace(/&nbsp;/gi, '').trim() : "N/A";
                                const vText = valIdx !== -1 ? (cells[valIdx].textContent || '').replace(/&nbsp;/gi, '').trim() : "N/A";
                                
                                // Only add if it looks like a valid item (not empty, not just a random label)
                                if (dText && dText !== 'N/A' && dText.length > 1 && !dText.toLowerCase().includes('dutiable goods')) {
                                    descArray.push(dText);
                                    qtyArray.push(qText);
                                    valArray.push(vText);
                                } else if (dText.toLowerCase().includes('dutiable goods') && cells.length > descIdx + 1) {
                                    // Sometimes shifted due to CTSH?
                                    const shiftedDText = (cells[descIdx + 1].textContent || '').replace(/&nbsp;/gi, '').trim();
                                    if (shiftedDText.length > 1) {
                                        descArray.push(shiftedDText);
                                        qtyArray.push(qtyIdx !== -1 ? (cells[qtyIdx + 1]?.textContent || '').replace(/&nbsp;/gi, '').trim() : "N/A");
                                        valArray.push(valIdx !== -1 ? (cells[valIdx + 1]?.textContent || '').replace(/&nbsp;/gi, '').trim() : "N/A");
                                    }
                                }
                            }
                        }
                    }

                    desc = descArray.length > 0 ? descArray.join('<hr style="margin:4px 0;border-color:#cbd5e1;">') : "N/A";
                    airlines = qtyArray.length > 0 ? qtyArray.join('<hr style="margin:4px 0;border-color:#cbd5e1;">') : "N/A";
                    dest = valArray.length > 0 ? valArray.join('<hr style="margin:4px 0;border-color:#cbd5e1;">') : "N/A";
                    weight = consignee;
                } else {
                    desc = extractFieldFromDOM(doc, ['ITEM Description', 'Item Description', 'Description']);
                    airlines = extractFieldFromDOM(doc, ['Airlines', 'Flight', 'Carrier']);
                    dest = extractFieldFromDOM(doc, ['Destination', 'Port of Arrival', 'Port', 'Country']);
                    weight = extractFieldFromDOM(doc, ['Gross Weight', 'Weight']);
                }

                const result = { desc, airlines, dest, weight };
                try {
                    sessionStorage.setItem(cacheKey, JSON.stringify(result));
                } catch(e) {}
                
                return result;
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
                details = await fetchBackgroundDetails(task.actionUrl, task.csbNo, task.index, task.argMatches);
            }

            if (activeLoadId !== thisLoadId) return;

            // Update row UI instantly
            task.descTd.innerHTML = (details && details.desc) ? details.desc : "N/A";
            task.airTd.innerHTML = (details && details.airlines) ? details.airlines : "N/A";
            task.destTd.innerHTML = (details && details.dest) ? details.dest : "N/A";
            task.weightTd.innerHTML = (details && details.weight) ? details.weight : "N/A";
        }

        // --- Load details for Export & Import Clearance Lists in ULTRA FAST parallel batches ---
        async function loadAllDetails() {
            if (!isActiveDetailList) return;

            const thisLoadId = ++activeLoadId;

            // Wipe ALL existing mydiv containers in DOM globally before starting to eliminate stale data leakage
            document.querySelectorAll('[id^="mydiv"], [id^="eccs-temp-mydiv"]').forEach(div => {
                div.remove();
            });

            // Step A: Append new columns to the far right of all rows immediately
            const rowTasks = dataRows.map((row, rowIndex) => {
                const link = Array.from(row.querySelectorAll('a')).find(a => {
                    const attr = a.getAttribute('onmouseover') || a.getAttribute('onclick') || a.getAttribute('href') || '';
                    return attr.includes('view') || attr.includes('CSB') || attr.includes('csb') || attr.includes('ExamReport') || attr.includes('getHawbDetails') || attr.includes('CBE') || attr.includes('cbe');
                });
                
                const targetAttr = link ? (link.getAttribute('onmouseover') || link.getAttribute('onclick') || link.getAttribute('href') || '') : '';
                const matches = targetAttr.match(/'([^']+)'/g);
                const cleanMatches = matches ? matches.map(m => m.replace(/'/g, '')) : [];
                const csbNo = cleanMatches[1] || '';
                const actionUrl = cleanMatches[0] || '';
                const index = cleanMatches[2] || String(rowIndex);

                // Strip native hover to definitively block Struts race conditions when user scrubs mouse
                if (link && link.hasAttribute('onmouseover')) {
                    link.removeAttribute('onmouseover');
                }

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

                return { row, rowIndex, index, link, csbNo, actionUrl, argMatches: cleanMatches, descTd, airTd, destTd, weightTd };
            });

            // We MUST process sequentially due to Apache Struts 1.x session race conditions!
            // To speed up perceived performance, we use an IntersectionObserver to only load
            // details for rows that are currently visible on the screen.
            const fetchQueue = [];
            let isProcessingQueue = false;

            async function processFetchQueue() {
                if (isProcessingQueue) return;
                isProcessingQueue = true;
                while (fetchQueue.length > 0) {
                    if (activeLoadId !== thisLoadId) break;
                    const task = fetchQueue.shift();
                    await processRowFast(task, thisLoadId);
                    await new Promise(r => setTimeout(r, 20)); // yield
                }
                isProcessingQueue = false;
                debouncedApplyFilters();
            }

            const observer = new IntersectionObserver((entries) => {
                let addedToQueue = false;
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const taskIdx = entry.target.getAttribute('data-task-idx');
                        const task = rowTasks[taskIdx];
                        if (task && !task.queued) {
                            task.queued = true;
                            fetchQueue.push(task);
                            addedToQueue = true;
                            // Stop observing once queued
                            observer.unobserve(entry.target);
                        }
                    }
                });
                if (addedToQueue) {
                    processFetchQueue();
                }
            }, { rootMargin: "300px" }); // Start loading slightly before it scrolls into view

            rowTasks.forEach((task, i) => {
                task.row.setAttribute('data-task-idx', i);
                observer.observe(task.row);
            });
            
            // Apply initial filters immediately
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
