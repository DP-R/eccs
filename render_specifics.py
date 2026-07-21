import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

def main():
    html_path = "/home/dpr/Downloads/eccs/examuination_cbe_specifics.html"
    js_path = "/home/dpr/Downloads/eccs/extension/beautifyDetails.js"
    output_screenshot_path = "/home/dpr/.gemini/antigravity-cli/brain/50112b58-c76f-43b5-a51c-8d52531b88d7/actual_beautified_specifics.png"

    # Setup headless Chrome options
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1200,1000")

    driver = webdriver.Chrome(options=options)
    
    try:
        # Load local HTML file
        print(f"Loading local HTML: {html_path}")
        driver.get(f"file://{html_path}")
        
        # Read the beautification script content
        with open(js_path, "r", encoding="utf-8") as f:
            js_code = f.read()
        
        # Inject the script into the page context
        print("Injecting beautifyDetails.js...")
        driver.execute_script(js_code)
        
        # Wait a brief moment for dynamic modifications to complete
        import time
        time.sleep(1)
        
        # Capture screenshot
        print(f"Saving screenshot to: {output_screenshot_path}")
        driver.save_screenshot(output_screenshot_path)
        print("Rendering complete!")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
