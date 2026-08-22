document.addEventListener('DOMContentLoaded', () => {
    const toggleXray = document.getElementById('toggleXray');
    const xrayDelay = document.getElementById('xrayDelay');
    const saveBtn = document.getElementById('saveBtn');
    const statusMsg = document.getElementById('statusMsg');

    // Load saved settings
    chrome.storage.local.get({
        autoXrayEnabled: true,
        xrayDelaySeconds: 1.0
    }, (items) => {
        toggleXray.checked = items.autoXrayEnabled;
        xrayDelay.value = items.xrayDelaySeconds;
    });

    // Save settings
    saveBtn.addEventListener('click', () => {
        let delay = parseFloat(xrayDelay.value);
        if (isNaN(delay) || delay < 0) delay = 0;
        
        chrome.storage.local.set({
            autoXrayEnabled: toggleXray.checked,
            xrayDelaySeconds: delay
        }, () => {
            statusMsg.textContent = "Settings saved successfully!";
            setTimeout(() => {
                statusMsg.textContent = "";
            }, 2000);
        });
    });
});
