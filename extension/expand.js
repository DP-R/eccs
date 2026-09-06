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
        pwd: "Codelink@51",
        ooc: `Opened and examined the package as per examination instructions\nContents: verified as declared under import documents.\n`,
        lv: `Opened and examined the package as per examination instructions\nContents: |\nAs per the import documents, declared value for the examined quantity seems low, may be forwarded for assessment.\n`,
        hq: `Opened and examined the package as per examination instructions\nContents: |\nAs per the import documents, examined quantity seems higher than what has been declared.\n`,
        ncf: `No concealment found.\n`,
        leo: `Opened and examined the package as per examination instructions\nContents: verified as declared under export documents.\nGoods may be considered for export.\n`,
        nkyc: `KYC documents may kindly be reuploaded.\n`
    };

    // 1. Expansion Logic
    document.addEventListener("input", e => {
        let t = e.target;

        if (t.tagName !== "INPUT" && t.tagName !== "TEXTAREA") {
            return;
        }

        let val = t.value;
        let cursorStart = t.selectionStart;
        if (cursorStart === undefined || cursorStart === null) return;
        
        let textUpToCursor = val.substring(0, cursorStart);
        
        // strictly require a space or newline AFTER the word to trigger it.
        // This prevents "lv" from triggering when you are typing "solve".
        let match = textUpToCursor.match(/(^|\s+)([a-zA-Z0-9]+)(\s+)$/);
        
        let prefix = "";
        let word = "";
        let replaceStart = 0;
        
        if (match) {
            prefix = match[1];
            word = match[2];
            replaceStart = match.index;
        } 
        
        if (word) {
            let lowerWord = word.toLowerCase();
            
            if (ex[lowerWord] !== undefined || lowerWord === "zd") {
                let expansion = "";
                
                if (lowerWord === "zd") {
                    expansion = `CBEXI_MAA_2026-2027_${getTodayDDMM()}_|_01`;
                } else {
                    expansion = ex[lowerWord];
                }
                
                let before = val.substring(0, replaceStart) + prefix;
                let after = val.substring(cursorStart); 
                
                let newText = before + expansion + after;
                
                let cursorOffset = newText.indexOf('|');
                if (cursorOffset !== -1) {
                    t.value = newText.substring(0, cursorOffset) + newText.substring(cursorOffset + 1);
                    t.setSelectionRange(cursorOffset, cursorOffset);
                } else {
                    t.value = newText;
                    let newCursorPos = before.length + expansion.length;
                    t.setSelectionRange(newCursorPos, newCursorPos);
                }
                
                t.dispatchEvent(new Event("input", { bubbles: true }));
                t.focus();
            }
        }
    });

    // 2. Tab Navigation Logic for '|' Snippet Placeholders
    document.addEventListener("keydown", e => {
        if (e.key === "Tab") {
            let t = e.target;
            if (t.tagName !== "INPUT" && t.tagName !== "TEXTAREA") return;
            
            let val = t.value;
            let nextPipe = val.indexOf('|');
            
            if (nextPipe !== -1) {
                e.preventDefault(); 
                let newText = val.substring(0, nextPipe) + val.substring(nextPipe + 1);
                t.value = newText;
                t.setSelectionRange(nextPipe, nextPipe);
                t.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }
    });

    // 3. Auto-trigger 'zd' expansion on listCBEXIDetailsInsp.do
    if (window.location.pathname.toLowerCase().includes('listcbexidetailsinsp')) {
        setTimeout(() => {
            const inputs = document.querySelectorAll('input[type="text"]');
            const targetInput = Array.from(inputs).find(inp => !inp.classList.contains('eccs-filter-input') && !inp.readOnly && !inp.disabled && inp.style.display !== 'none');
            
            if (targetInput) {
                const val = targetInput.value.trim();
                if (!val || val === "CBEXI_MAA_2026-2027_0" || val.endsWith("_0")) {
                    targetInput.value = "zd "; // Added trailing space to cleanly trigger the strictly-space regex
                    targetInput.selectionStart = 3; 
                    targetInput.dispatchEvent(new Event("input", { bubbles: true }));
                }
            }
        }, 100);
    }
})();
