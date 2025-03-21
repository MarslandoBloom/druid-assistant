const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CONFIG = {
  // Main HTML file (relative to project directory)
  entryHtml: 'index.html',
  // Output file name
  outputFile: 'The Druid Assistant.html',
  // Relative path to beast data file (relative to bundler.js location)
  beastDataFilePath: './All beasts CR6 and below, druid seen, forest, grassland, hills.md',
  // Project base directory for resolving relative paths
  baseDir: './'
};

// Utility to read file content - updated to handle absolute paths
function readFile(filePath, isAbsolute = false) {
  try {
    const resolvedPath = isAbsolute ? filePath : path.resolve(CONFIG.baseDir, filePath);
    return fs.readFileSync(resolvedPath, 'utf8');
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${error.message}`);
    throw error;
  }
}

// Utility to check if a string is a URL
function isUrl(str) {
  return str.startsWith('http://') || str.startsWith('https://');
}

// Utility to fetch content from a URL
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Utility to convert image to data URI
function imageToDataURI(filePath) {
  try {
    const fullPath = path.resolve(CONFIG.baseDir, filePath);
    const extension = path.extname(filePath).substring(1);
    const mimeType = `image/${extension === 'svg' ? 'svg+xml' : extension}`;
    const buffer = fs.readFileSync(fullPath);
    const base64 = buffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.warn(`Warning: Could not convert image ${filePath} to data URI: ${error.message}`);
    return filePath; // Return original path as fallback
  }
}

// Parse beast data from Markdown
function parseBeastData(markdown) {
  console.log("Parsing beast data...");
  const beasts = [];
  let currentBeast = null;
  let currentSection = null;
  
  // Split the markdown into lines
  const lines = markdown.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Start of a new beast
    if (line.startsWith('>## ')) {
      // Save previous beast if exists
      if (currentBeast) {
        beasts.push(currentBeast);
      }
      
      // Start new beast
      currentBeast = {
        name: line.substring(4).trim(),
        statblock: [line],
        description: []
      };
      currentSection = 'statblock';
    } 
    // Non-statblock section (descriptive text)
    else if (line.startsWith('## ')) {
      currentSection = 'description';
      currentBeast.description.push(line);
    }
    // Continue current section
    else if (currentBeast) {
      if (currentSection === 'statblock') {
        currentBeast.statblock.push(line);
      } else if (currentSection === 'description') {
        currentBeast.description.push(line);
      }
    }
  }
  
  // Add the last beast
  if (currentBeast) {
    beasts.push(currentBeast);
  }
  
  console.log(`Parsed ${beasts.length} beasts from markdown.`);
  return beasts;
}

// Process CSS file and convert any url() references to data URIs
function processCss(cssContent) {
  return cssContent.replace(/url\(['"]?([^'"()]+)['"]?\)/g, (match, url) => {
    if (url.startsWith('data:')) return match; // Skip data URIs
    return `url('${imageToDataURI(url)}')`;
  });
}

// Process HTML and inline all resources
async function processHtml(htmlContent) {
  console.log("Processing HTML...");
  
  // Replace CSS link tags with inline styles
  const cssLinkRegex = /<link\s+[^>]*href=["']([^"']+)["'][^>]*>/g;
  let match;
  let processedHtml = htmlContent;
  
  while ((match = cssLinkRegex.exec(htmlContent)) !== null) {
    const fullMatch = match[0];
    const cssUrl = match[1];
    
    // Only process CSS files
    if (!cssUrl.endsWith('.css') && !fullMatch.includes('stylesheet')) {
      continue;
    }
    
    try {
      let cssContent;
      
      if (isUrl(cssUrl)) {
        console.log(`Fetching external CSS: ${cssUrl}`);
        cssContent = await fetchUrl(cssUrl);
      } else {
        // Local file path - may need to remove .css extension if it's in the regex match
        const cssPath = cssUrl.endsWith('.css') ? cssUrl : `${cssUrl}.css`;
        cssContent = readFile(cssPath);
      }
      
      // Process the CSS content
      const processedCss = processCss(cssContent);
      
      // Replace the link tag with an inline style tag
      processedHtml = processedHtml.replace(
        fullMatch, 
        `<style>${processedCss}</style>`
      );
    } catch (error) {
      console.warn(`Warning: Could not inline CSS file ${cssUrl}: ${error.message}`);
      // Keep original link tag as fallback
    }
  }
  
  // Replace script tags with inline scripts
  const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/g;
  while ((match = scriptRegex.exec(htmlContent)) !== null) {
    const fullMatch = match[0];
    const scriptUrl = match[1];
    
    try {
      let jsContent;
      
      if (isUrl(scriptUrl)) {
        console.log(`Fetching external JavaScript: ${scriptUrl}`);
        jsContent = await fetchUrl(scriptUrl);
      } else {
        // Local file path - may need to remove .js extension if it's in the regex match
        const jsPath = scriptUrl.endsWith('.js') ? scriptUrl : `${scriptUrl}.js`;
        jsContent = readFile(jsPath);
      }
      
      // Replace the script tag with an inline script
      processedHtml = processedHtml.replace(
        fullMatch, 
        `<script>${jsContent}</script>`
      );
    } catch (error) {
      console.warn(`Warning: Could not inline JS file ${scriptUrl}: ${error.message}`);
      // Keep original script tag as fallback
    }
  }
  
  // Replace img src with data URIs
  processedHtml = processedHtml.replace(
    /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/g,
    (match, imgSrc) => {
      if (imgSrc.startsWith('data:')) return match; // Skip if already data URI
      try {
        const dataUri = imageToDataURI(imgSrc);
        return match.replace(imgSrc, dataUri);
      } catch (error) {
        console.warn(`Warning: Could not convert image ${imgSrc} to data URI: ${error.message}`);
        return match; // Keep original img tag as fallback
      }
    }
  );
  
  return processedHtml;
}

// Check if a file exists
function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch (err) {
    return false;
  }
}

// Main bundling function
async function bundleApp() {
  try {
    console.log("Starting bundling process...");
    
    // Verify beast data file exists before proceeding
    if (!fileExists(CONFIG.beastDataFilePath)) {
      console.error(`Beast data file not found at: ${CONFIG.beastDataFilePath}`);
      console.error("Please update the CONFIG.beastDataFilePath with the correct path.");
      process.exit(1);
    }
    
    console.log(`Reading beast data from: ${CONFIG.beastDataFilePath}`);
    
    // Read beast data and convert to JavaScript
    const beastMarkdown = readFile(CONFIG.beastDataFilePath); // Using relative path
    
    // Read and process main HTML
    let htmlContent = readFile(CONFIG.entryHtml);
    htmlContent = await processHtml(htmlContent);
    
    // Insert beast data before closing body tag
    const beastDataRawScript = '<script>\n' +
      '  // Beast data from markdown file - stored as raw markdown\n' +
      '  const BEAST_DATA_RAW = ' + JSON.stringify(beastMarkdown) + ';\n' +
      '  \n' +
      '  // Create debug console\n' +
      '  function createDebugConsole() {\n' +
      '    const debugConsole = document.createElement("div");\n' +
      '    debugConsole.id = "debug-console";\n' +
      '    debugConsole.style.position = "fixed";\n' +
      '    debugConsole.style.bottom = "0";\n' +
      '    debugConsole.style.left = "0";\n' +
      '    debugConsole.style.right = "0";\n' +
      '    debugConsole.style.maxHeight = "200px";\n' +
      '    debugConsole.style.overflowY = "auto";\n' +
      '    debugConsole.style.backgroundColor = "rgba(0,0,0,0.8)";\n' +
      '    debugConsole.style.color = "#fff";\n' +
      '    debugConsole.style.padding = "10px";\n' +
      '    debugConsole.style.fontFamily = "monospace";\n' +
      '    debugConsole.style.fontSize = "12px";\n' +
      '    debugConsole.style.zIndex = "9999";\n' +
      '    debugConsole.style.display = "none"; // Hide console by default\n' +
      '    debugConsole.innerHTML = "<div><strong>Debug Console</strong> <button id=\'hide-debug\' style=\'float:right\'>Hide</button><button id=\'clear-debug\' style=\'float:right; margin-right:10px\'>Clear</button></div><div id=\'debug-log\'></div>";\n' +
      '    document.body.appendChild(debugConsole);\n' +
      '    \n' +
      '    // Add the debug console button next to the Manage Data button in the footer\n' +
      '    setTimeout(() => {\n' +
      '      const footerButtonsContainer = document.querySelector("footer .col-md-6.text-md-end");\n' +
      '      if (footerButtonsContainer) {\n' +
      '        const toggleButton = document.createElement("button");\n' +
      '        toggleButton.id = "show-debug-console";\n' +
      '        toggleButton.textContent = "Debug Console";\n' +
      '        toggleButton.className = "btn btn-light btn-sm";\n' +
      '        toggleButton.style.marginRight = "10px";\n' +
      '        \n' +
      '        // Insert the button before the Manage Data button\n' +
      '        const manageDataButton = footerButtonsContainer.querySelector(".btn");\n' +
      '        if (manageDataButton) {\n' +
      '          footerButtonsContainer.insertBefore(toggleButton, manageDataButton);\n' +
      '        } else {\n' +
      '          footerButtonsContainer.appendChild(toggleButton);\n' +
      '        }\n' +
      '        \n' +
      '        // Add event listener\n' +
      '        toggleButton.addEventListener("click", function() {\n' +
      '          debugConsole.style.display = "block";\n' +
      '        });\n' +
      '      }\n' +
      '    }, 1000); // Wait for DOM to be fully loaded\n' +
      '    \n' +
      '    // Add event listener to hide button\n' +
      '    document.getElementById("hide-debug").addEventListener("click", function() {\n' +
      '      debugConsole.style.display = "none";\n' +
      '    });\n' +
      '    \n' +
      '    document.getElementById("clear-debug").addEventListener("click", function() {\n' +
      '      document.getElementById("debug-log").innerHTML = "";\n' +
      '    });\n' +
      '  }\n' +
      '  \n' +
      '  // Log function for debug console\n' +
      '  function debugLog(message, type = "info") {\n' +
      '    const log = document.getElementById("debug-log");\n' +
      '    if (!log) return;\n' +
      '    \n' +
      '    const entry = document.createElement("div");\n' +
      '    const timestamp = new Date().toLocaleTimeString();\n' +
      '    entry.innerHTML = `<span style="color:#aaa">[${timestamp}]</span> <span style="color:${type === "error" ? "red" : type === "warning" ? "orange" : "lightblue"}">\n[${type.toUpperCase()}]</span> ${message}`;\n' +
      '    log.appendChild(entry);\n' +
      '    log.scrollTop = log.scrollHeight;\n' +
      '    \n' +
      '    // Also log to browser console\n' +
      '    if (type === "error") {\n' +
      '      console.error(message);\n' +
      '    } else if (type === "warning") {\n' +
      '      console.warn(message);\n' +
      '    } else {\n' +
      '      console.log(message);\n' +
      '    }\n' +
      '  }\n' +
      '  \n' +
      '  // Import beast data function\n' +
      '  async function importBeastData() {\n' +
      '    debugLog("Manual import started...");\n' +
      '    \n' +
      '    // Show loading indicator\n' +
      '    const beastList = document.getElementById("beastList");\n' +
      '    if (beastList) {\n' +
      '      beastList.innerHTML = \'<div class="text-center p-4"><div class="spinner-border text-success" role="status"></div><p class="mt-2">Loading beast data...</p></div>\';\n' +
      '    }\n' +
      '    \n' +
      '    try {\n' +
      '      // Check if required functions exist\n' +
      '      if (typeof DataManager === "undefined") {\n' +
      '        throw new Error("DataManager is not defined");\n' +
      '      }\n' +
      '      \n' +
      '      if (typeof DataManager.loadBeastData !== "function") {\n' +
      '        throw new Error("DataManager.loadBeastData is not a function");\n' +
      '      }\n' +
      '      \n' +
      '      // Log raw data length\n' +
      '      debugLog(`Raw data length: ${BEAST_DATA_RAW.length} characters`);\n' +
      '      debugLog(`First 100 characters: ${BEAST_DATA_RAW.substring(0, 100)}...`);\n' +
      '      \n' +
      '      // Import the data\n' +
      '      const count = await DataManager.loadBeastData(BEAST_DATA_RAW);\n' +
      '      debugLog(`Successfully loaded ${count} beasts from bundled data`);\n' +
      '      \n' +
      '      // Refresh UI\n' +
      '      if (typeof UIManager !== "undefined" && typeof UIManager.renderBeastList === "function") {\n' +
      '        const beasts = await DataManager.getAllBeasts();\n' +
      '        debugLog(`Retrieved ${beasts.length} beasts from database`);\n' +
      '        UIManager.renderBeastList(beasts);\n' +
      '      } else {\n' +
      '        throw new Error("UIManager or renderBeastList is not available");\n' +
      '      }\n' +
      '    } catch (error) {\n' +
      '      debugLog(`Error loading beast data: ${error.message}`, "error");\n' +
      '      if (error.stack) {\n' +
      '        debugLog(`Stack trace: ${error.stack}`, "error");\n' +
      '      }\n' +
      '      \n' +
      '      if (beastList) {\n' +
      '        beastList.innerHTML = `<div class="text-center p-4 text-danger">\n' +
      '          <p>Error loading beast data: ${error.message}</p>\n' +
      '          <p>Check the debug console for details or try opening the Data Management modal.</p>\n' +
      '        </div>`;\n' +
      '      }\n' +
      '    }\n' +
      '  }\n' +
      '  \n' +
      '  // Initialize database with beast data\n' +
      '  document.addEventListener("DOMContentLoaded", async function() {\n' +
      '    // Create debug console\n' +
      '    createDebugConsole();\n' +
      '    \n' +
      '    debugLog("Bundle loaded - preparing to initialize data...");\n' +
      '    \n' +
      '    // Wait a moment to ensure all scripts are loaded\n' +
      '    setTimeout(async function() {\n' +
      '      debugLog("Starting automatic data import...");\n' +
      '      \n' +
      '      // Check if IndexedDB is available\n' +
      '      if (!window.indexedDB) {\n' +
      '        debugLog("IndexedDB is not supported in this browser", "error");\n' +
      '        return;\n' +
      '      }\n' +
      '      \n' +
      '      // Import the data\n' +
      '      await importBeastData();\n' +
      '    }, 2000); // Wait 2 seconds to ensure scripts are loaded\n' +
      '  });\n' +
      '</script>\n' +
      '</body>';
    
    htmlContent = htmlContent.replace('</body>', beastDataRawScript);
    
    // Write output file
    fs.writeFileSync(CONFIG.outputFile, htmlContent);
    console.log(`Bundle created successfully: ${CONFIG.outputFile}`);
    
  } catch (error) {
    console.error(`Error bundling application: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the bundler
bundleApp();