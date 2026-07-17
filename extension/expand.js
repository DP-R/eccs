// ======================
// Text Autocomplete / Expansion
// ======================

const ex = {
    uname: "14937314",
    pwd: "Code1ink@5",
    ooc: `Opened and examined the pkg. As per examination order / instructions
Contents: as per invoice
Verified description, marks, number and quantity as per import documents`,
    lv: `Opened and examined the pkg. As per examination order / instructions
Contents: |
Declared value for the given quantity seems low, may be forwarded for assessment
Verified description, marks, number and quantity as per import documents`,
    hq: `Opened and examined the pkg. As per examination order / instructions
Contents: |
Declared quantity seems higher than what has been declared.
Verified description, marks, number and quantity as per import documents`
};

document.addEventListener("input", e => {
    let t = e.target;

    if (t.tagName != "INPUT" && t.tagName != "TEXTAREA") {
        return;
    }

    let s = ex[t.value.trim()];
    if (!s) {
        return;
    }

    e.preventDefault();

    let p = s.indexOf("|");
    t.value = s.replace("|", "");
    t.focus();

    if (p != -1) {
        t.setSelectionRange(p, p);
    }
});
