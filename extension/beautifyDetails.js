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
        window.location.pathname.includes("cbe_specifics")
    );

    if (!isDetailsPage) return;

    // --- 1. Inject Modern Stylesheet for Readability ---
    const style = document.createElement('style');
    style.textContent = `
        /* General Layout */
        body {
            background-color: #f8fafc !important;
            font-family: system-ui, -apple-system, sans-serif !important;
            margin: 0 !important;
            padding: 20px !important;
            color: #0f172a !important;
        }
        
        .main-container {
            max-width: 1000px !important;
            margin: 0 auto !important;
            background: #ffffff !important;
            border-radius: 12px !important;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05) !important;
            padding: 20px !important;
            border: 1px solid #e2e8f0 !important;
        }

        header, nav, footer {
            margin-bottom: 20px !important;
        }

        /* Redesign Tables */
        table {
            width: 100% !important;
            max-width: 1000px !important;
            margin: 16px auto !important;
            border-collapse: collapse !important;
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
            overflow: hidden !important;
        }

        /* Table cells standard alignment & padding */
        td {
            padding: 10px 14px !important;
            font-size: 13px !important;
            line-height: 1.5 !important;
            border: 1px solid #e2e8f0 !important;
            vertical-align: middle !important;
        }

        /* Section headers styling */
        .sectionHeader, .pageHeader, td[class*="Header"] {
            background: #1e293b !important;
            color: #ffffff !important;
            font-weight: bold !important;
            font-size: 14px !important;
            text-transform: uppercase !important;
            letter-spacing: 0.03em !important;
            padding: 12px !important;
            text-align: center !important;
        }

        /* Label cells (usually right-aligned) */
        td[align="right"] {
            background-color: #f8fafc !important;
            color: #475569 !important;
            font-weight: 600 !important;
            text-align: right !important;
        }

        /* Value cells (usually left-aligned) */
        td[align="left"] {
            background-color: #ffffff !important;
            color: #0f172a !important;
            text-align: left !important;
        }

        /* Links customization */
        a {
            color: #2563eb !important;
            text-decoration: none !important;
            font-weight: 500 !important;
        }

        a:hover {
            text-decoration: underline !important;
            color: #1d4ed8 !important;
        }
    `;
    (document.head || document.documentElement).appendChild(style);

    // --- 2. Highlight Assessable Value Fields ---
    function highlightAssessableValues() {
        const tds = Array.from(document.querySelectorAll('td'));

        // Highlighting in the key-value attributes grid
        tds.forEach(td => {
            if (td.textContent.includes('Assessable Value(Rs.):')) {
                // Highlight label td
                td.style.backgroundColor = '#fef08a'; // soft yellow
                td.style.color = '#854d0e'; // dark gold
                td.style.fontWeight = 'bold';
                td.style.fontSize = '14px';

                // Highlight corresponding value td (next element)
                const nextTd = td.nextElementSibling;
                if (nextTd) {
                    nextTd.style.backgroundColor = '#fef08a';
                    nextTd.style.color = '#854d0e';
                    nextTd.style.fontWeight = 'bold';
                    nextTd.style.fontSize = '16px';
                    nextTd.style.border = '2px solid #eab308';
                }
            }
        });

        // Highlighting in details/item tables
        document.querySelectorAll('table').forEach(table => {
            const rows = Array.from(table.querySelectorAll('tr'));
            if (rows.length === 0) return;

            // Search for header row containing the column name
            const headerRow = rows.find(row =>
                Array.from(row.querySelectorAll('td')).some(td => td.textContent.includes('Assessable Value'))
            );
            if (!headerRow) return;

            const headerCells = Array.from(headerRow.querySelectorAll('td'));
            const colIndex = headerCells.findIndex(td => td.textContent.includes('Assessable Value'));
            if (colIndex === -1) return;

            // Highlight header column
            headerCells[colIndex].style.backgroundColor = '#fef08a';
            headerCells[colIndex].style.color = '#854d0e';
            headerCells[colIndex].style.fontWeight = 'bold';

            // Highlight all matching cells in subsequent rows
            rows.forEach(row => {
                if (row === headerRow) return;
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells[colIndex]) {
                    cells[colIndex].style.backgroundColor = '#fef08a';
                    cells[colIndex].style.color = '#854d0e';
                    cells[colIndex].style.fontWeight = 'bold';
                    cells[colIndex].style.border = '1px solid #eab308';
                }
            });
        });
    }

    // Run on load and observe updates (for dynamic elements)
    highlightAssessableValues();
    new MutationObserver(highlightAssessableValues).observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });

})();
