// ==========================================
// ECCS Extension: Dynamic CSB View Filters
// ==========================================

(function() {
    function initFilters() {
        // Find table with CSB headers
        const targetTable = Array.from(document.querySelectorAll('table')).find(table => {
            const text = table.textContent;
            return text.includes('CSB Number') && text.includes('Courier Name');
        });

        if (!targetTable || targetTable.querySelector('.eccs-filter-row')) return;

        console.log("[ECCS Extension] Initializing advanced filters and multiple details columns on CSB view...");

        const rows = Array.from(targetTable.querySelectorAll('tr'));
        const headerRow = rows.find(row => row.textContent.includes('CSB Number') && row.textContent.includes('Courier Name'));
        if (!headerRow) return;

        // Gather data rows (rows that contain checkbox targets)
        const dataRows = rows.filter(row => {
            return row.querySelector('input[name="selectedIndex"]') || row.querySelector('input[name="indexes"]');
        });

        if (dataRows.length === 0) return;

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
                font-size: 12px !important;
                color: #475569 !important;
                font-weight: 500 !important;
            }
        `;
        document.head.appendChild(style);

        // --- 1. Increment Colspan of Header/Footer rows to fit 4 new columns ---
        Array.from(targetTable.querySelectorAll('td[colspan]')).forEach(td => {
            const currentCols = parseInt(td.getAttribute('colspan'), 10);
            if (currentCols >= 5) {
                td.setAttribute('colspan', currentCols + 4);
            }
        });

        // --- 2. Append new header cells at the end (to the right) ---
        const headers = [
            "Description of Goods",
            "Airlines",
            "Airport of Destination",
            "Weight (in Kg.)"
        ];
        headers.forEach(title => {
            const th = document.createElement('td');
            th.width = "120";
            th.height = "25";
            th.align = "center";
            th.style = "font-weight: bold;";
            th.textContent = title;
            headerRow.appendChild(th);
        });

        // --- 3. Override Select All / Clear All globally in page context ---
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

        // --- 4. Create Filter Row aligned with new appended column structure ---
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
            descInput.value = '';
            courierInput.value = '';
            statusInput.value = '';
            airlinesInput.value = '';
            destInput.value = '';
            weightInput.value = '';
            applyFilters();
        });
        td0.appendChild(resetBtn);
        filterRow.appendChild(td0);

        // Column 1: CSB Filter
        const td1 = document.createElement('td');
        td1.align = 'center';
        const csbInput = document.createElement('input');
        csbInput.type = 'text';
        csbInput.placeholder = 'Filter CSB...';
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
        td6.appendChild(counterSpan);
        filterRow.appendChild(td6);

        // Column 6: Description of Goods Filter
        const tdDesc = document.createElement('td');
        tdDesc.align = 'center';
        const descInput = document.createElement('input');
        descInput.type = 'text';
        descInput.placeholder = 'Filter Goods...';
        descInput.className = 'eccs-filter-input';
        tdDesc.appendChild(descInput);
        filterRow.appendChild(tdDesc);

        // Column 7: Airlines Filter
        const tdAirlines = document.createElement('td');
        tdAirlines.align = 'center';
        const airlinesInput = document.createElement('input');
        airlinesInput.type = 'text';
        airlinesInput.placeholder = 'Filter Airlines...';
        airlinesInput.className = 'eccs-filter-input';
        tdAirlines.appendChild(airlinesInput);
        filterRow.appendChild(tdAirlines);

        // Column 8: Airport of Destination Filter
        const tdDest = document.createElement('td');
        tdDest.align = 'center';
        const destInput = document.createElement('input');
        destInput.type = 'text';
        destInput.placeholder = 'Filter Dest...';
        destInput.className = 'eccs-filter-input';
        tdDest.appendChild(destInput);
        filterRow.appendChild(tdDest);

        // Column 9: Weight Filter
        const tdWeight = document.createElement('td');
        tdWeight.align = 'center';
        const weightInput = document.createElement('input');
        weightInput.type = 'text';
        weightInput.placeholder = 'Filter Weight...';
        weightInput.className = 'eccs-filter-input';
        tdWeight.appendChild(weightInput);
        filterRow.appendChild(tdWeight);

        // Inject Filter Row right after Header Row
        headerRow.parentNode.insertBefore(filterRow, headerRow.nextSibling);

        // --- 5. Extract Unique HAWBs Count ---
        function getUniqueHawbCount() {
            const uniqueHawbs = new Set();
            dataRows.forEach(row => {
                if (row.style.display !== 'none') {
                    const cells = Array.from(row.querySelectorAll('td'));
                    if (cells[2]) {
                        const hawbText = cells[2].textContent.replace(/\s+/g, '').trim();
                        if (hawbText) uniqueHawbs.add(hawbText);
                    }
                }
            });
            return uniqueHawbs.size;
        }

        // Apply filtering logic using direct index alignment
        function applyFilters() {
            const csbQuery = csbInput.value.toLowerCase().trim();
            const hawbQuery = hawbInput.value.toLowerCase().trim();
            const descQuery = descInput.value.toLowerCase().trim();
            const courierQuery = courierInput.value.toLowerCase().trim();
            const statusQuery = statusInput.value.toLowerCase().trim();
            const airlinesQuery = airlinesInput.value.toLowerCase().trim();
            const destQuery = destInput.value.toLowerCase().trim();
            const weightQuery = weightInput.value.toLowerCase().trim();

            dataRows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length < 6) return;

                const csbText = cells[1] ? cells[1].textContent.toLowerCase() : '';
                const hawbText = cells[2] ? cells[2].textContent.toLowerCase() : '';
                const courierText = cells[3] ? cells[3].textContent.toLowerCase() : '';
                const statusText = cells[4] ? cells[4].textContent.toLowerCase() : '';
                
                const descText = cells[6] ? cells[6].textContent.toLowerCase() : '';
                const airlinesText = cells[7] ? cells[7].textContent.toLowerCase() : '';
                const destText = cells[8] ? cells[8].textContent.toLowerCase() : '';
                const weightText = cells[9] ? cells[9].textContent.toLowerCase() : '';

                const matchesCsb = !csbQuery || csbText.includes(csbQuery);
                const matchesHawb = !hawbQuery || hawbText.includes(hawbQuery);
                const matchesDesc = !descQuery || descText.includes(descQuery);
                const matchesCourier = !courierQuery || courierText.includes(courierQuery);
                const matchesStatus = !statusQuery || statusText.includes(statusQuery);
                const matchesAirlines = !airlinesQuery || airlinesText.includes(airlinesQuery);
                const matchesDest = !destQuery || destText.includes(destQuery);
                const matchesWeight = !weightQuery || weightText.includes(weightQuery);

                if (matchesCsb && matchesHawb && matchesDesc && matchesCourier && matchesStatus && matchesAirlines && matchesDest && matchesWeight) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });

            // Update unique HAWB counter label
            const totalUnique = new Set(dataRows.map(r => {
                const cells = Array.from(r.querySelectorAll('td'));
                return cells[2] ? cells[2].textContent.replace(/\s+/g, '').trim() : '';
            }).filter(Boolean)).size;

            counterSpan.textContent = `[${getUniqueHawbCount()}/${totalUnique} HAWBs]`;
        }

        // Debounce applyFilters to reduce CPU usage and layout thrashing
        let filterTimeout;
        function debouncedApplyFilters() {
            clearTimeout(filterTimeout);
            filterTimeout = setTimeout(applyFilters, 20);
        }

        // Attach listeners
        [csbInput, hawbInput, descInput, courierInput, statusInput, airlinesInput, destInput, weightInput].forEach(input => {
            input.addEventListener('input', applyFilters);
        });

        // Set initial counter
        applyFilters();

        // --- 6. Helpers: Extract values from injected detail view HTML ---
        function extractFieldFromDOM(container, labelNames) {
            const tds = Array.from(container.querySelectorAll('td'));
            for (let i = 0; i < tds.length; i++) {
                const txt = tds[i].textContent.replace(/\s+/g, ' ').trim().replace(/:$/, '').trim().toLowerCase();
                if (labelNames.some(name => txt.includes(name.toLowerCase()))) {
                    const nextTd = tds[i].nextElementSibling;
                    if (nextTd && nextTd.tagName.toLowerCase() === 'td') {
                        return nextTd.textContent.replace(/\s+/g, ' ').replace(/&nbsp;/gi, '').trim();
                    }
                    if (tds[i+1]) {
                        return tds[i+1].textContent.replace(/\s+/g, ' ').replace(/&nbsp;/gi, '').trim();
                    }
                }
            }
            return "";
        }

        function getValueFromText(text, labelName) {
            const escapedLabel = labelName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(escapedLabel + '\\s*[:\\-]?\\s*([\\s\\S]*?)(?=\\s*(?:[A-Z][a-zA-Z0-9\\s()\\.\\/]+:|$))', 'i');
            const match = text.match(regex);
            if (match) {
                return match[1].replace(/&nbsp;/gi, '').trim();
            }
            return "";
        }

        function extractDescription(container) {
            let val = extractFieldFromDOM(container, ['Description of Goods', 'Goods Description']);
            if (val) return val;
            const rawText = container.textContent.replace(/\s+/g, ' ').trim();
            return getValueFromText(rawText, 'Description of Goods');
        }

        function extractAirlines(container) {
            let val = extractFieldFromDOM(container, ['International Airlines', 'Airlines']);
            if (val) return val;
            const rawText = container.textContent.replace(/\s+/g, ' ').trim();
            return getValueFromText(rawText, 'International Airlines');
        }

        // Helper to extract Airport of Destination
        function extractDest(container) {
            let val = extractFieldFromDOM(container, ['Airport of Destination', 'Destination']);
            if (val) return val;
            const rawText = container.textContent.replace(/\s+/g, ' ').trim();
            return getValueFromText(rawText, 'Airport of Destination');
        }

        // Helper to extract Weight (in Kg.)
        function extractWeight(container) {
            let val = extractFieldFromDOM(container, ['Weight (in Kg.)', 'Weight']);
            if (val) return val;
            const rawText = container.textContent.replace(/\s+/g, ' ').trim();
            return getValueFromText(rawText, 'Weight (in Kg.)');
        }

        // Helper: Trigger background AJAX details fetch
        function fetchDetails(index, csbNo, actionUrl) {
            return new Promise((resolve) => {
                const mydiv = document.getElementById('mydiv' + index);
                if (!mydiv) {
                    resolve({ desc: "", airlines: "", dest: "", weight: "" });
                    return;
                }

                const observer = new MutationObserver(() => {
                    const text = mydiv.textContent.trim();
                    if (text !== "") {
                        observer.disconnect();
                        const desc = extractDescription(mydiv);
                        const airlines = extractAirlines(mydiv);
                        const dest = extractDest(mydiv);
                        const weight = extractWeight(mydiv);
                        mydiv.innerHTML = ""; // Clean layout container
                        resolve({ desc, airlines, dest, weight });
                    }
                });

                observer.observe(mydiv, { childList: true, subtree: true });

                try {
                    window.viewCSBDetails(actionUrl, csbNo, index);
                } catch (e) {
                    observer.disconnect();
                    resolve({ desc: "", airlines: "", dest: "", weight: "" });
                }

                // Timeout safety guard
                setTimeout(() => {
                    observer.disconnect();
                    resolve({ desc: "", airlines: "", dest: "", weight: "" });
                }, 5000);
            });
        }

        // --- 7. Load details for all rows in parallel (efficient asynchronous fetching) ---
        function loadAllDetails() {
            dataRows.forEach(async (row) => {
                const link = row.querySelector('a[onmouseover]');
                
                // Append 4 new columns to the right of each row immediately (loading state)
                const descTd = document.createElement('td');
                descTd.height = "25"; descTd.width = "120"; descTd.align = "center"; descTd.className = "eccs-desc-cell"; descTd.textContent = "Loading...";
                row.appendChild(descTd);

                const airTd = document.createElement('td');
                airTd.height = "25"; airTd.width = "120"; airTd.align = "center"; airTd.className = "eccs-desc-cell"; airTd.textContent = "Loading...";
                row.appendChild(airTd);

                const destTd = document.createElement('td');
                destTd.height = "25"; destTd.width = "120"; destTd.align = "center"; destTd.className = "eccs-desc-cell"; destTd.textContent = "Loading...";
                row.appendChild(destTd);

                const weightTd = document.createElement('td');
                weightTd.height = "25"; weightTd.width = "120"; weightTd.align = "center"; weightTd.className = "eccs-desc-cell"; weightTd.textContent = "Loading...";
                row.appendChild(weightTd);

                if (link) {
                    const onmouseover = link.getAttribute('onmouseover');
                    const matches = onmouseover.match(/'([^']+)'/g);
                    if (matches && matches.length >= 3) {
                        const actionUrl = matches[0].replace(/'/g, '');
                        const csbNo = matches[1].replace(/'/g, '');
                        const index = matches[2].replace(/'/g, '');
                        
                        const details = await fetchDetails(index, csbNo, actionUrl);
                        descTd.textContent = details.desc || "N/A";
                        airTd.textContent = details.airlines || "N/A";
                        destTd.textContent = details.dest || "N/A";
                        weightTd.textContent = details.weight || "N/A";
                    } else {
                        descTd.textContent = "N/A";
                        airTd.textContent = "N/A";
                        destTd.textContent = "N/A";
                        weightTd.textContent = "N/A";
                    }
                } else {
                    descTd.textContent = "N/A";
                    airTd.textContent = "N/A";
                    destTd.textContent = "N/A";
                    weightTd.textContent = "N/A";
                }
                
                // Debounce layout updates to batch filter updates efficiently
                debouncedApplyFilters();
            });
        }

        // Load all details on start
        loadAllDetails();
    }

    // Trigger initialization
    initFilters();
    new MutationObserver(initFilters).observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });
})();
