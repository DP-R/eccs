import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

def main():
    html_path = "/home/dpr/Downloads/eccs/csb4_preview.html"
    js_path = "/home/dpr/Downloads/eccs/extension/filterCsb.js"
    output_screenshot_path = "/home/dpr/.gemini/antigravity-cli/brain/50112b58-c76f-43b5-a51c-8d52531b88d7/csb_preview.png"

    # Setup headless Chrome options
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=options)
    
    try:
        # Load local HTML file
        print(f"Loading local HTML: {html_path}")
        driver.get(f"file://{html_path}")
        
        # Inject realistic ECCS data instead of generic mocks
        mock_js = """
        sessionStorage.eccsExtensionActive = "true";
        window.viewCSBDetails = function(actionUrl, csbNo, index) {
            const div = document.getElementById('mydiv' + index);
            if (!div) return;
            
            // Generate realistic values based on index
            let desc = "SAMPLE PU SYNTHETIC SAMPLES";
            let airlines = "CATHAY PACIFIC AIRWAYS";
            let dest = "HKG";
            let weight = "0.7";
            
            if (index == "1") {
                desc = "POLYESTER FABRIC SAMPLES";
                airlines = "EMIRATES AIRLINES";
                dest = "DXB";
                weight = "1.2";
            } else if (index == "2") {
                desc = "SILK SCARVES";
                airlines = "SINGAPORE AIRLINES";
                dest = "SIN";
                weight = "0.5";
            } else if (index == "3") {
                desc = "LEATHER WALLETS";
                airlines = "LUFTHANSA";
                dest = "FRA";
                weight = "2.1";
            } else if (index == "4") {
                desc = "COTTON T-SHIRTS SAMPLES";
                airlines = "BRITISH AIRWAYS";
                dest = "LHR";
                weight = "1.8";
            }
            
            div.innerHTML = `
                <table>
                    <tr>
                        <td>Description of Goods:</td>
                        <td>` + desc + `</td>
                    </tr>
                    <tr>
                        <td>International Airlines:</td>
                        <td>` + airlines + `</td>
                    </tr>
                    <tr>
                        <td>Airport of Destination:</td>
                        <td>` + dest + `</td>
                    </tr>
                    <tr>
                        <td>Weight (in Kg.):</td>
                        <td>` + weight + `</td>
                    </tr>
                </table>
            `;
        };
        """
        driver.execute_script(mock_js)
        
        # Read the filter script content
        with open(js_path, "r", encoding="utf-8") as f:
            js_code = f.read()
        
        # Inject the script into the page context
        print("Injecting filterCsb.js...")
        driver.execute_script(js_code)
        
        # Wait a brief moment for parallel dynamic loads to complete
        import time
        time.sleep(2)
        
        # Resize window to capture the entire scrolled webpage
        width = driver.execute_script("return Math.max(document.body.scrollWidth, document.documentElement.scrollWidth, document.body.offsetWidth, document.documentElement.offsetWidth, document.body.clientWidth, document.documentElement.clientWidth);")
        height = driver.execute_script("return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight, document.body.clientHeight, document.documentElement.clientHeight);")
        print(f"Resizing window to: width={width}, height={height}")
        driver.set_window_size(width, height)
        time.sleep(0.5)

        # Capture screenshot
        print(f"Saving full-page screenshot to: {output_screenshot_path}")
        driver.save_screenshot(output_screenshot_path)
        print("Rendering complete!")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
