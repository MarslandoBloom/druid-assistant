# Druid's Assistant Bundling Instructions

This document explains how to bundle the Druid's Assistant application into a single HTML file that can be used on any device.

## Prerequisites

1. **Node.js**: You must have Node.js installed on your computer.
   - Download from: https://nodejs.org/ (LTS version recommended)
   - Verify installation by opening a command prompt and typing: `node --version`

## Bundling Steps

1. **Prepare the beast data file**:
   - Make sure your beast data file is located at: `C:/Users/npara/Documents/GitHub/All beasts CR6 and below, druid seen, forest, grassland, hills.md`
   - If your beast data is in a different location, edit the `beastDataFilePath` in `bundler.js`

2. **Open a command prompt**:
   - Press `Win + R`, type `cmd`, and press Enter
   - Navigate to your project directory:
     ```
     cd C:\Users\npara\Documents\GitHub\druid-assistant
     ```

3. **Run the bundler script**:
   ```
   node bundler.js
   ```

4. **Check for success message**:
   - You should see: `Bundle created successfully: druid-assistant-bundle.html`
   - The bundled file will be created in your project directory

## Using the Bundled Application

### On Windows PC

1. **Direct Use**:
   - Simply double-click the `druid-assistant-bundle.html` file to open it in your default browser
   - Bookmark the file for easy access

2. **Create Shortcut** (optional):
   - Right-click the HTML file and select "Create shortcut"
   - Move the shortcut to your desktop or another convenient location

### On Android Devices

1. **Transfer the file**:
   - Connect your Android device to your PC via USB
   - Copy the `druid-assistant-bundle.html` file to your device's storage
   - Alternatively, email the file to yourself or use a cloud service (Google Drive, Dropbox, etc.)

2. **Open in browser**:
   - Use a file manager app to locate the HTML file
   - Tap the file to open it in your default browser
   - Chrome is recommended for best compatibility

3. **Add to Home Screen** (recommended):
   - While viewing the app in Chrome, tap the menu (three dots)
   - Select "Add to Home screen"
   - This creates an app-like shortcut on your home screen

## Troubleshooting

If you encounter any issues:

1. **Beast data not loading**:
   - Check if the beast data file path in `bundler.js` is correct
   - Ensure the file exists and contains valid markdown data

2. **Bundler errors**:
   - Verify Node.js is installed correctly
   - Check the terminal output for specific error messages

3. **Browser compatibility**:
   - The app works best with Chrome, Firefox, or Edge
   - Some features may not work in older browsers

4. **IndexedDB issues**:
   - If the beast list doesn't appear, try clearing your browser's data for the site
   - In Chrome, go to Settings → Privacy and Security → Clear browsing data

## Updating the Bundle

If you make changes to the application:

1. Run the bundler script again to create a new bundle
2. Replace the old HTML file on your devices with the new one

## Advanced: Customizing Icons

For a more polished experience:

1. Place icon images in the `images/` folder:
   - `icon-192.png` (192×192 pixels)
   - `icon-512.png` (512×512 pixels)

2. These will be used when installing the app as a PWA

---

For questions or issues, contact the developer or submit an issue on GitHub.