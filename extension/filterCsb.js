// ==========================================
// ECCS Extension: Dynamic CSB View Filters & Hover Details
// ==========================================

(function() {
    function initFilters() {
        const path = window.location.pathname.toLowerCase();
        const isExport = path.includes('/export/');
        const isImport = path.includes('/imp/');

        // Strictly run on Export Clearance Lists and Import Cargo List Views
        if (!isExport && !isImport) return;

        // Find table with CSB or CBE headers using normalized whitespace and flexible matching
        const targetTable = Array.from(document.querySelectorAll('table')).find(table => {
            const normText = table.textContent.replace(/\s+/g, ' ');
            const hasCsbOrCbe = /CSB|CBE|Shipping\s*Bill|Bill\s*of\s*Entry|HAWB/i.test(normText);
            const hasCourierOrHawb = /Courier|HAWB|Status/i.test(normText);
            return hasCsbOrCbe && hasCourierOrHawb;
        });

        if (!targetTable || targetTable.querySelector('.eccs-filter-row')) return;

        console.log("[ECCS Extension] Initializing filters on target list view...");

        const rows = Array.from(targetTable.querySelectorAll('tr'));
        const headerRow = rows.find(row => {
            const normText = row.textContent.replace(/\s+/g, ' ');
            return /CSB|CBE|Shipping\s*Bill|Bill\s*of\s*Entry|HAWB/i.test(normText) && (/Courier|HAWB|Status|Number/i.test(normText));
        });

        if (!headerRow) return;

        // Gather data rows (rows that contain checkboxes or detail links)
        const dataRows = rows.filter(row => {
            if (row === headerRow || row.classList.contains('eccs-filter-row')) return false;
            const hasInput = row.querySelector('input[type="checkbox"], input[name="selectedIndex"], input[name="indexes"], input[name="csbNum"]');
            const hasDetailLink = row.querySelector('a[onmouseover*="view"], a[href*="view"], a[href*="CSB"], a[href*="csb"]');
            const cellCount = row.querySelectorAll('td').length;
            return (hasInput || hasDetailLink) && cellCount >= 3;
        });

        if (dataRows.length === 0) return;

        // Dynamically detect column indices from header row
        const headerTextArr = Array.from(headerRow.querySelectorAll('td, th')).map(c => c.textContent.replace(/\s+/g, ' ').trim());
        let csbColIdx = headerTextArr.findIndex(t => /CSB|Shipping\s*Bill/i.test(t));
        let hawbColIdx = headerTextArr.findIndex(t => /HAWB/i.test(t));
        let courierColIdx = headerTextArr.findIndex(t => /Courier/i.test(t));
        let statusColIdx = headerTextArr.findIndex(t => /Status/i.test(t));

        if (csbColIdx === -1) csbColIdx = 1;
        if (hawbColIdx === -1) hawbColIdx = 2;
        if (courierColIdx === -1) courierColIdx = 3;
        if (statusColIdx === -1) statusColIdx = 4;

        // Inject Stylesheet
        const style = document.createElement('style');
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

        // Force container and table responsiveness so newly appended columns are fully visible
        targetTable.style.width = "100%";
        targetTable.style.maxWidth = "none";
        if (targetTable.parentElement) {
            targetTable.parentElement.style.overflowX = "auto";
        }

        // Determine indices for appended columns
        let descColIdx = -1, airColIdx = -1, destColIdx = -1, weightColIdx = -1;

        // --- EXPORT CLEARANCE LISTS ALONE: Append 4 Hover Columns at far right ---
        if (isExport) {
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
        csbInput.placeholder = isExport ? 'Filter CSB...' : 'Filter CBE...';
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

        if (isExport) {
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
                        const hawbText = cells[hawbColIdx].textContent.replace(/\s+/g, '').trim();
                        if (hawbText) uniqueHawbs.add(hawbText);
                    }
                }
            });
            return uniqueHawbs.size;
        }

        // Apply filtering logic using dynamic column alignment
        function applyFilters() {
            const csbQuery = csbInput.value.toLowerCase().trim();
            const hawbQuery = hawbInput.value.toLowerCase().trim();
            const courierQuery = courierInput.value.toLowerCase().trim();
            const statusQuery = statusInput.value.toLowerCase().trim();
            
            const descQuery = descInput ? descInput.value.toLowerCase().trim() : '';
            const airlinesQuery = airlinesInput ? airlinesInput.value.toLowerCase().trim() : '';
            const destQuery = destInput ? destInput.value.toLowerCase().trim() : '';
            const weightQuery = weightInput ? weightInput.value.toLowerCase().trim() : '';

            dataRows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length < 5) return;

                const csbText = cells[csbColIdx] ? cells[csbColIdx].textContent.toLowerCase() : '';
                const hawbText = cells[hawbColIdx] ? cells[hawbColIdx].textContent.toLowerCase() : '';
                const courierText = cells[courierColIdx] ? cells[courierColIdx].textContent.toLowerCase() : '';
                const statusText = cells[statusColIdx] ? cells[statusColIdx].textContent.toLowerCase() : '';
                
                const descText = (descColIdx !== -1 && cells[descColIdx]) ? cells[descColIdx].textContent.toLowerCase() : '';
                const airlinesText = (airColIdx !== -1 && cells[airColIdx]) ? cells[airColIdx].textContent.toLowerCase() : '';
                const destText = (destColIdx !== -1 && cells[destColIdx]) ? cells[destColIdx].textContent.toLowerCase() : '';
                const weightText = (weightColIdx !== -1 && cells[weightColIdx]) ? cells[weightColIdx].textContent.toLowerCase() : '';

                const matchesCsb = !csbQuery || csbText.includes(csbQuery);
                const matchesHawb = !hawbQuery || hawbText.includes(hawbQuery);
                const matchesCourier = !courierQuery || courierText.includes(courierQuery);
                const matchesStatus = !statusQuery || statusText.includes(statusQuery);
                
                const matchesDesc = !descQuery || descText.includes(descQuery);
                const matchesAirlines = !airlinesQuery || airlinesText.includes(airlinesQuery);
                const matchesDest = !destQuery || destText.includes(destQuery);
                const matchesWeight = !weightQuery || weightText.includes(weightQuery);

                if (matchesCsb && matchesHawb && matchesCourier && matchesStatus && matchesDesc && matchesAirlines && matchesDest && matchesWeight) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });

            // Update unique HAWB counter label
            const totalUnique = new Set(dataRows.map(r => {
                const cells = Array.from(r.querySelectorAll('td'));
                return cells[hawbColIdx] ? cells[hawbColIdx].textContent.replace(/\s+/g, '').trim() : '';
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
        if (isExport) {
            inputs.push(descInput, airlinesInput, destInput, weightInput);
        }
        inputs.forEach(input => {
            if (input) input.addEventListener('input', applyFilters);
        });

        // Set initial counter
        applyFilters();

        // --- Robust DOM Extraction for Both Key-Value and Header-Data Table Formats ---
        function extractFieldFromDOM(container, labelNames) {
            const tables = Array.from(container.querySelectorAll('table'));
            for (const table of tables) {
                const trs = Array.from(table.querySelectorAll('tr'));
                // Format B: Multi-column header row + data row
                if (trs.length >= 2) {
                    const headerCells = Array.from(trs[0].querySelectorAll('td, th'));
                    for (let colIdx = 0; colIdx < headerCells.length; colIdx++) {
                        const headerText = headerCells[colIdx].textContent.replace(/\s+/g, ' ').trim().toLowerCase();
                        if (labelNames.some(name => headerText.includes(name.toLowerCase()))) {
                            const dataRow = trs[1];
                            if (dataRow) {
                                const dataCells = Array.from(dataRow.querySelectorAll('td, th'));
                                if (dataCells[colIdx]) {
                                    const val = dataCells[colIdx].textContent.replace(/\s+/g, ' ').replace(/&nbsp;/gi, '').trim();
                                    if (val) return val;
                                }
                            }
                        }
                    }
                }

                // Format A: Key-Value pair matching
                const tds = Array.from(table.querySelectorAll('td'));
                for (let i = 0; i < tds.length; i++) {
                    const txt = tds[i].textContent.replace(/\s+/g, ' ').trim().replace(/:$/, '').trim().toLowerCase();
                    if (labelNames.some(name => txt.includes(name.toLowerCase()))) {
                        const nextTd = tds[i].nextElementSibling;
                        if (nextTd && nextTd.tagName.toLowerCase() === 'td') {
                            const val = nextTd.textContent.replace(/\s+/g, ' ').replace(/&nbsp;/gi, '').trim();
                            if (val) return val;
                        }
                        if (tds[i+1]) {
                            const val = tds[i+1].textContent.replace(/\s+/g, ' ').replace(/&nbsp;/gi, '').trim();
                            if (val) return val;
                        }
                    }
                }
            }

            // Text fallback parsing
            const rawText = container.textContent.replace(/\s+/g, ' ').trim();
            for (const name of labelNames) {
                const escapedLabel = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp(escapedLabel + '\\s*[:\\-]?\\s*([\\s\\S]*?)(?=\\s*(?:[A-Z][a-zA-Z0-9\\s()\\.\\/]+:|$))', 'i');
                const match = rawText.match(regex);
                if (match && match[1].trim()) {
                    return match[1].replace(/&nbsp;/gi, '').trim();
                }
            }
            return "";
        }

        function extractDescription(container) {
            return extractFieldFromDOM(container, ['Description of Goods (Item wise)', 'Description of Goods', 'Goods Description', 'Description', 'Item Description']);
        }

        function extractAirlines(container) {
            return extractFieldFromDOM(container, ['International Airlines', 'Airlines', 'Airline Name', 'Flight']);
        }

        function extractDest(container) {
            return extractFieldFromDOM(container, ['Airport of Destination', 'Destination', 'Port of Destination']);
        }

        function extractWeight(container) {
            return extractFieldFromDOM(container, ['Manifest Weight', 'Weight (in Kg.)', 'Gross Weight', 'Declared Weight', 'Weight']);
        }

        // Helper: Trigger native hover event dynamically
        function fetchDetails(index, csbNo, actionUrl, linkElement) {
            return new Promise((resolve) => {
                const mydiv = document.getElementById('mydiv' + index);
                if (!mydiv) {
                    resolve({ desc: "", airlines: "", dest: "", weight: "" });
                    return;
                }

                if (mydiv.textContent.trim() !== "") {
                    const desc = extractDescription(mydiv);
                    const airlines = extractAirlines(mydiv);
                    const dest = extractDest(mydiv);
                    const weight = extractWeight(mydiv);
                    if (desc || airlines || dest || weight) {
                        resolve({ desc, airlines, dest, weight });
                        return;
                    }
                }

                const observer = new MutationObserver(() => {
                    const text = mydiv.textContent.trim();
                    if (text !== "") {
                        const desc = extractDescription(mydiv);
                        const airlines = extractAirlines(mydiv);
                        const dest = extractDest(mydiv);
                        const weight = extractWeight(mydiv);
                        if (desc || airlines || dest || weight) {
                            observer.disconnect();
                            resolve({ desc, airlines, dest, weight });
                        }
                    }
                });

                observer.observe(mydiv, { childList: true, subtree: true });

                // Trigger hover natively on link element
                try {
                    if (linkElement) {
                        // Dispatch mouseover event to invoke ECCS listener
                        linkElement.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));

                        // Fallback: Execute onmouseover attribute script if present
                        const onmouseoverAttr = linkElement.getAttribute('onmouseover');
                        if (onmouseoverAttr) {
                            const cleanScript = onmouseoverAttr.replace(/^javascript:/i, '').trim();
                            if (cleanScript) {
                                try {
                                    new Function(cleanScript)();
                                } catch (e) {}
                            }
                        }
                    }
                } catch (e) {
                    console.error("[ECCS Extension] Error triggering mouseover:", e);
                }

                // Safety timeout guard (1500ms)
                setTimeout(() => {
                    observer.disconnect();
                    const desc = extractDescription(mydiv);
                    const airlines = extractAirlines(mydiv);
                    const dest = extractDest(mydiv);
                    const weight = extractWeight(mydiv);
                    resolve({ desc, airlines, dest, weight });
                }, 1500);
            });
        }

        // --- Load details for Export Clearance Lists alone ---
        async function loadAllDetails() {
            if (!isExport) return;

            // Step A: Append new columns to the far right of all rows immediately (0ms UI latency)
            const rowTasks = dataRows.map((row, rowIndex) => {
                const link = Array.from(row.querySelectorAll('a')).find(a => {
                    const html = a.outerHTML || '';
                    return html.includes('view') || html.includes('CSB') || html.includes('csb') || html.includes('CreateExamReport');
                });
                
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

                return { row, rowIndex, link, descTd, airTd, destTd, weightTd };
            });

            // Initial render complete immediately
            applyFilters();

            // Step B: Stagger background fetches in small non-blocking batches of 3
            const BATCH_SIZE = 3;
            for (let i = 0; i < rowTasks.length; i += BATCH_SIZE) {
                const batch = rowTasks.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(async (task) => {
                    if (task.link) {
                        const targetAttr = task.link.getAttribute('onmouseover') || task.link.getAttribute('onclick') || task.link.getAttribute('href') || '';
                        const matches = targetAttr.match(/'([^']+)'/g);
                        const csbNo = (matches && matches[1]) ? matches[1].replace(/'/g, '') : '';
                        const actionUrl = (matches && matches[0]) ? matches[0].replace(/'/g, '') : '';
                        const index = (matches && matches[2]) ? matches[2].replace(/'/g, '') : String(task.rowIndex);

                        const details = await fetchDetails(index, csbNo, actionUrl, task.link);
                        task.descTd.textContent = details.desc || "N/A";
                        task.airTd.textContent = details.airlines || "N/A";
                        task.destTd.textContent = details.dest || "N/A";
                        task.weightTd.textContent = details.weight || "N/A";
                    } else {
                        task.descTd.textContent = "N/A";
                        task.airTd.textContent = "N/A";
                        task.destTd.textContent = "N/A";
                        task.weightTd.textContent = "N/A";
                    }
                }));

                // Micro pause (30ms) between batches to maintain browser UI smoothness
                await new Promise(resolve => setTimeout(resolve, 30));
            }
            
            debouncedApplyFilters();
        }

        // Load hover details for export lists
        loadAllDetails();
    }

    // Trigger initialization
    initFilters();
    new MutationObserver(initFilters).observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });
})();
