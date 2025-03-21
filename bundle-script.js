// Script to run the bundler
const { exec } = require('child_process');
const path = require('path');

// Set the path to the directory containing the bundler.js file
const dirPath = __dirname;
const bundlerPath = path.join(dirPath, 'bundler.js');

// Execute the bundler.js file
exec(`node "${bundlerPath}"`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing bundler: ${error.message}`);
    console.error(`stderr: ${stderr}`);
    process.exit(1);
  }
  
  console.log(`Bundler output: ${stdout}`);
  console.log('Bundling completed successfully!');
});
