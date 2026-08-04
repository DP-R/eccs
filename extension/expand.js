// ======================
// Text Autocomplete / Expansion
// ======================

(function() {
    function getTodayDDMM() {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        return dd + mm;
    }

    const ex = {
        uname: "14937314",
        pwd: "Codelink@5",
        ooc: `Opened and examined the package. As per examination order / instructions
Contents: verified as declared under import documents
`,
        lv: `Opened and examined the package. As per examination order / instructions
Contents: |
As per the import documents, declared value for the examined quantity seems low, may be forwarded for assessment
`,
        hq: `Opened and examined the pkg. As per examination order / instructions
Contents: |
As per the import documents,examined quantity seems higher than what has been declared.`
    };

    document.addEventListener("input", e => {
        let t = e.target;

        if (t.tagName != "INPUT" && t.tagName != "TEXTAREA") {
            return;
        }

        const rawVal = t.value.trim();
        const lowerVal = rawVal.toLowerCase();
        let s = null;

        if (["cbexi", "cbe", "cbe1", "c1", "cbexi1", "zd"].includes(lowerVal)) {
            const ddmm = getTodayDDMM();
            s = `CBEXI_MAA_2026-2027_${ddmm}_|_01`;
        } else if (ex[rawVal]) {
            s = ex[rawVal];
        }

        if (s) {
            t.value = s;
            
            // If template has cursor target symbol |
            let cursorIndex = s.indexOf('|');
            if (cursorIndex !== -1) {
                t.value = s.replace('|', '');
                t.setSelectionRange(cursorIndex, cursorIndex);
                t.focus();
            }
        }
    });
})();
