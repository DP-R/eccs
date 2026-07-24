import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

def main():
    html_path = "/home/dpr/Downloads/eccs/csb4_preview.html"
    js_path = "/home/dpr/Downloads/eccs/extension/filterCsb.js"
    xray_js_path = "/home/dpr/Downloads/eccs/extension/xray.js"
    output_screenshot_path = "/home/dpr/.gemini/antigravity-cli/brain/50112b58-c76f-43b5-a51c-8d52531b88d7/toast_preview.png"

    # Setup headless Chrome options for standard desktop viewport
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1280,800") # Normal desktop size

    driver = webdriver.Chrome(options=options)
    
    try:
        print(f"Loading HTML: {html_path}")
        driver.get(f"file://{html_path}")
        
        # Inject mocks
        mock_js = """
        sessionStorage.eccsExtensionActive = "true";
        window.viewCSBDetails = function(actionUrl, csbNo, index) {
            const div = document.getElementById('mydiv' + index);
            if (!div) return;
            div.innerHTML = `<table><tr><td>Description:</td><td>SAMPLE PU SYNTHETIC SAMPLES</td></tr></table>`;
        };
        """
        driver.execute_script(mock_js)
        
        # Inject filterCsb.js
        with open(js_path, "r", encoding="utf-8") as f:
            driver.execute_script(f.read())
            
        # Inject xray.js
        with open(xray_js_path, "r", encoding="utf-8") as f:
            driver.execute_script(f.read())
            
        # Trigger the toast alert
        print("Triggering toast alert...")
        driver.execute_script("window.showToast('Auto X-Ray: ENABLED');")
        
        # Wait a moment for transition
        time.sleep(1.0)
        
        # Capture standard viewport screenshot
        print(f"Saving viewport screenshot to: {output_screenshot_path}")
        driver.save_screenshot(output_screenshot_path)
        print("Rendering complete!")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
