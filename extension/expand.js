// ======================
// Text Autocomplete / Expansion
// ======================

(function() {
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

        let s = ex[t.value.trim()];
        if (s) {
            let start = t.selectionStart;
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
