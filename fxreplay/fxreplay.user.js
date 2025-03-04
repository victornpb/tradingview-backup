// ==UserScript==
// @name         FXReplay Templates & Theme Restore Manager
// @namespace    https://github.com/victornpb/
// @version      1.4
// @description  Transfer drawing templates and theme from Tradingview to FXReplay
// @author       Victor
// @match        https://app.fxreplay.com/*/auth/chart/*
// ==/UserScript==

(function () {
    'use strict';

    // --- Append Style Element ---
    const style = document.createElement('style');
    style.innerHTML = `
        #restoreManagerUI {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #1e222d;
            padding: 10px;
            border: 1px solid #363a45;
            border-radius: 3px;
            box-shadow: 0 2px 20px rgba(0, 0, 0, 1);
            z-index: 10000;
            color: #ffffff;
            width: 300px;
        }
        #restoreManagerUI h3 {
            margin: 0 0 10px 0;
        }
        #restoreManagerUI button {
            display: block;
            width: 100%;
            margin-bottom: 10px;
            border: 1px solid grey;
        }
        #restoreManagerUI input[type="file"] {
            display: none;
        }
        #restoreManagerUI #statusMessage {
            margin-top: 10px;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);

    // --- Create UI from a temporary container ---
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = `
        <div id="restoreManagerUI">
            <h3>Restore Templates & Theme</h3>
            <button id="importFile" title="Import Backup File">Import Backup File</button>
            <button id="restoreTemplates" title="Restore Templates">Apply</button>
            <input type="file" id="importFileInput" accept="application/json,.json" />
            <div id="statusMessage"></div>
        </div>
    `;
    const ui = tempDiv.firstElementChild;
    document.body.appendChild(ui);

    // --- Token search functions ---
    function searchObject(obj, path, visited, startTime, timeoutMs) {
        if (Date.now() - startTime > timeoutMs) return null;
        if (!obj || typeof obj !== "object" || visited.has(obj)) return null;
        visited.add(obj);
        for (let key in obj) {
            try {
                const newPath = path + "." + key;
                const value = obj[key];
                if (typeof value === "string" && key === "accessToken") {
                    return value;
                } else if (value && typeof value === "object") {
                    const token = searchObject(value, newPath, visited, startTime, timeoutMs);
                    if (token) return token;
                }
            } catch (e) {
                // Ignore inaccessible properties.
            }
        }
        return null;
    }

    async function findToken(timeoutMs = 5000) {
        const startTime = Date.now();
        const visited = new Set();
        const tradingviewKeys = [];
        for (let key in window) {
            if (key.startsWith("tradingview_")) {
                tradingviewKeys.push({ key: key, obj: window[key] });
            }
        }
        for (const entry of tradingviewKeys) {
            const token = searchObject(entry.obj, "window." + entry.key, visited, startTime, timeoutMs);
            if (token) return token;
            // Yield to prevent blocking.
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        return null;
    }

    // --- Variables & Status Update ---
    const statusMessage = document.getElementById('statusMessage');
    let backupData = null;

    function updateStatus(message) {
        statusMessage.textContent = message;
    }

    // --- Import Backup File ---
    document.getElementById('importFile').addEventListener('click', () => {
        document.getElementById('importFileInput').click();
    });

    document.getElementById('importFileInput').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                backupData = JSON.parse(e.target.result);
                updateStatus('Backup file imported successfully.');
            } catch (err) {
                console.error('Error parsing backup file:', err);
                updateStatus('Error parsing backup file.');
            }
        };
        reader.readAsText(file);
    });

    // --- Restore Templates & Theme ---
    document.getElementById('restoreTemplates').addEventListener('click', async () => {
        if (!backupData) {
            alert('Please import a backup file.');
            return;
        }
        // Restore templates (TOOLS)
        if (!backupData.TOOLS) {
            alert('No templates found in backup.');
            return;
        }

        const userId = localStorage.getItem('apc_user_id');
        if (!userId) {
            updateStatus('User ID not found in localStorage.');
            return;
        }

        updateStatus('Searching for access token...');
        const token = await findToken();
        if (!token) {
            updateStatus('Access token not found.');
            return;
        }
        const authHeader = "Bearer " + token;
        updateStatus('Access token found. Restoring templates...');

        // Iterate over each tool type in the backup file
        for (const tool in backupData.TOOLS) {
            const templates = backupData.TOOLS[tool];
            for (const templateName in templates) {
                const content = templates[templateName];
                updateStatus(`Restoring ${tool} template "${templateName}"...`);
                const formData = new FormData();
                formData.append('content', JSON.stringify(content));
                // Build the endpoint URL with query parameters
                const endpoint = `https://awf.fxreplay.com/chart-storage/2/drawing_templates?client=fxreplay.com&user=${encodeURIComponent(userId)}&tool=${encodeURIComponent(tool)}&name=${encodeURIComponent(templateName)}`;
                try {
                    await fetch(endpoint, {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Authorization': authHeader,
                            'accept': 'application/json'
                        },
                        body: formData
                    });
                } catch (err) {
                    console.error(`Error restoring ${tool} template "${templateName}":`, err);
                    updateStatus(`Error restoring ${tool} template "${templateName}". See console.`);
                }
                // Optional delay between requests
                await new Promise(r => setTimeout(r, 100));
            }
        }

        // --- Restore Theme ---
        if (backupData.THEMES && Object.keys(backupData.THEMES).length > 0) {
            const themeName = Object.keys(backupData.THEMES)[0];
            const theme = backupData.THEMES[themeName];
            updateStatus(`Restoring theme "${themeName}"...`);
            // If theme.chartProperties exists, restore it to "tradingview.chartproperties"
            if (theme.chartProperties) {
                localStorage.setItem("tradingview.chartproperties", JSON.stringify(theme.chartProperties));
            }
            // If theme.mainSourceProperties exists, restore it to "tradingview.chartproperties.mainSeriesProperties"
            if (theme.mainSourceProperties) {
                localStorage.setItem("tradingview.chartproperties.mainSeriesProperties", JSON.stringify(theme.mainSourceProperties));
            }
            // Store the theme name
           // localStorage.setItem("tradingview.current_theme.name", themeName);
        }

        updateStatus('Templates and theme restored successfully.');
    });
})();
