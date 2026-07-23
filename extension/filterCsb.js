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

        console.log("[ECCS Extension] Initializing advanced filters and description column on CSB view...");

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

        // --- 1. Increment Colspan of Header/Footer rows to fit new column ---
        Array.from(targetTable.querySelectorAll('td[colspan]')).forEach(td => {
            const currentCols = parseInt(td.getAttribute('colspan'), 10);
            if (currentCols >= 5) {
                td.setAttribute('colspan', currentCols + 1);
            }
        });

        // --- 2. Insert new "Description of Goods" header cell ---
        const th = document.createElement('td');
        th.width = "150";
        th.height = "25";
        th.align = "center";
        th.style = "font-weight: bold;";
        th.textContent = "Description of Goods";
        headerRow.insertBefore(th, headerRow.cells[3]);

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

        // --- 4. Create Filter Row ---
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

        // Column 3: Description of Goods Filter
        const td3 = document.createElement('td');
        td3.align = 'center';
        const descInput = document.createElement('input');
        descInput.type = 'text';
        descInput.placeholder = 'Filter Goods...';
        descInput.className = 'eccs-filter-input';
        td3.appendChild(descInput);
        filterRow.appendChild(td3);

        // Column 4: Courier Filter
        const td4 = document.createElement('td');
        td4.align = 'center';
        const courierInput = document.createElement('input');
        courierInput.type = 'text';
        courierInput.placeholder = 'Filter Courier...';
        courierInput.className = 'eccs-filter-input';
        td4.appendChild(courierInput);
        filterRow.appendChild(td4);

        // Column 5: Status Filter
        const td5 = document.createElement('td');
        td5.align = 'center';
        const statusInput = document.createElement('input');
        statusInput.type = 'text';
        statusInput.placeholder = 'Filter Status...';
        statusInput.className = 'eccs-filter-input';
        td5.appendChild(statusInput);
        filterRow.appendChild(td5);

        // Column 6: Unique HAWB Counter
        const td6 = document.createElement('td');
        td6.align = 'center';
        const counterSpan = document.createElement('span');
        counterSpan.className = 'eccs-filter-counter';
        td6.appendChild(counterSpan);
        filterRow.appendChild(td6);

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

        // Apply filtering logic
        function applyFilters() {
            const csbQuery = csbInput.value.toLowerCase().trim();
            const hawbQuery = hawbInput.value.toLowerCase().trim();
            const descQuery = descInput.value.toLowerCase().trim();
            const courierQuery = courierInput.value.toLowerCase().trim();
            const statusQuery = statusInput.value.toLowerCase().trim();

            dataRows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length < 6) return;

                const csbText = cells[1].textContent.toLowerCase();
                const hawbText = cells[2].textContent.toLowerCase();
                const descText = cells[3].textContent.toLowerCase();
                const courierText = cells[4].textContent.toLowerCase();
                const statusText = cells[5].textContent.toLowerCase();

                const matchesCsb = !csbQuery || csbText.includes(csbQuery);
                const matchesHawb = !hawbQuery || hawbText.includes(hawbQuery);
                const matchesDesc = !descQuery || descText.includes(descQuery);
                const matchesCourier = !courierQuery || courierText.includes(courierQuery);
                const matchesStatus = !statusQuery || statusText.includes(statusQuery);

                if (matchesCsb && matchesHawb && matchesDesc && matchesCourier && matchesStatus) {
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

        // Attach listeners
        [csbInput, hawbInput, descInput, courierInput, statusInput].forEach(input => {
            input.addEventListener('input', applyFilters);
        });

        // Set initial counter
        applyFilters();

        // --- 6. Helper: Extract description from injected detail view HTML ---
        function extractDescription(container) {
            // Try regex matching on raw text first. This is extremely robust against mangled DOM/table parsing.
            const rawText = container.textContent.replace(/\s+/g, ' ').trim();
            const match = rawText.match(/(?:Description of Goods|Goods Description)\s*[:\-]?\s*([\s\S]*?)(?=\s*(?:Name of (?:the )?Consignor|Address of|Name of (?:the )?Consignee|GST Invoice|MHBS Number|MPS Details|Attached|$))/i);
            if (match && match[1].trim() !== "") {
                return match[1].replace(/&nbsp;/i, '').trim();
            }

            // Fallback to table cell iteration if regex yields nothing
            const tds = Array.from(container.querySelectorAll('td'));
            for (let i = 0; i < tds.length; i++) {
                const txt = tds[i].textContent.replace(/\s+/g, ' ').trim();
                const cleanTxt = txt.replace(/:$/, '').trim();
                if (cleanTxt === 'Description of Goods' || cleanTxt === 'Goods Description') {
                    const nextTd = tds[i].nextElementSibling;
                    if (nextTd) {
                        return nextTd.textContent.replace(/\s+/g, ' ').replace(/&nbsp;/i, '').trim();
                    }
                }
            }
            return "";
        }

        // Helper: Trigger background AJAX details fetch
        function fetchDescription(index, csbNo, actionUrl) {
            return new Promise((resolve) => {
                const mydiv = document.getElementById('mydiv' + index);
                if (!mydiv) {
                    resolve("");
                    return;
                }

                const observer = new MutationObserver(() => {
                    const text = mydiv.textContent.trim();
                    if (text !== "") {
                        observer.disconnect();
                        const desc = extractDescription(mydiv);
                        mydiv.innerHTML = ""; // Clean layout container
                        resolve(desc);
                    }
                });

                observer.observe(mydiv, { childList: true, subtree: true });

                try {
                    window.viewCSBDetails(actionUrl, csbNo, index);
                } catch (e) {
                    observer.disconnect();
                    resolve("");
                }

                // Timeout safety guard
                setTimeout(() => {
                    observer.disconnect();
                    resolve("");
                }, 5000);
            });
        }

        // --- 7. Sequentially load descriptions for all visible rows ---
        async function loadAllDescriptions() {
            for (let i = 0; i < dataRows.length; i++) {
                const row = dataRows[i];
                const link = row.querySelector('a[onmouseover]');
                if (link) {
                    const onmouseover = link.getAttribute('onmouseover');
                    const matches = onmouseover.match(/'([^']+)'/g);
                    if (matches && matches.length >= 3) {
                        const actionUrl = matches[0].replace(/'/g, '');
                        const csbNo = matches[1].replace(/'/g, '');
                        const index = matches[2].replace(/'/g, '');
                        
                        // Insert description cell
                        const td = document.createElement('td');
                        td.height = "25";
                        td.width = "150";
                        td.align = "center";
                        td.className = "eccs-desc-cell";
                        td.textContent = "Loading...";
                        row.insertBefore(td, row.cells[3]);

                        // Wait for description fetch
                        const desc = await fetchDescription(index, csbNo, actionUrl);
                        td.textContent = desc || "N/A";
                    }
                } else {
                    const td = document.createElement('td');
                    td.height = "25";
                    td.width = "150";
                    td.align = "center";
                    td.className = "eccs-desc-cell";
                    td.textContent = "N/A";
                    row.insertBefore(td, row.cells[3]);
                }
                
                // 50ms sequential spacing
                await new Promise(r => setTimeout(r, 50));
            }
            // Re-filter after descriptions are loaded
            applyFilters();
        }

        // Load all descriptions on start
        loadAllDescriptions();
    }

    // Trigger initialization
    initFilters();
    new MutationObserver(initFilters).observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });
})();
