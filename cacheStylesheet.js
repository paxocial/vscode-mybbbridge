const axios = require('axios');
const path = require('path');

const filePath = process.argv[2];

function getStylesheetName(filePath) {
    const parts = filePath.split(path.sep);
    return parts[parts.length - 1]; // Correctly extract the stylesheet name (eg custom.css)
}

function getThemeName(filePath) {
    const parts = filePath.split(path.sep);
    return parts[parts.length - 2]; // Correctly extract the theme name (eg Hoshin Budo v2)
}

const stylesheetName = getStylesheetName(filePath);
const themeName = getThemeName(filePath);

console.log(`Run on Save: Starting cURL command...`);
console.log(`Run on Save: Stylesheet name is "${stylesheetName}"`);
console.log(`Run on Save: Theme name is "${themeName}"`);

async function clearCache() {
    try {
        const response = await axios.post('http://localhost/mybb/ryu/cacheform.php?action=csscacheclear', new URLSearchParams({
            theme_name: themeName,
            stylesheet: stylesheetName // Send as a plain string
        }));
        console.log(`Run on Save: cURL command completed.`);
        console.log(`Response from server: ${JSON.stringify(response.data)}`);
    } catch (error) {
        console.error(`Run on Save: cURL command failed.`);
        console.error(`Error: ${error.message}`);
    }
}

clearCache();