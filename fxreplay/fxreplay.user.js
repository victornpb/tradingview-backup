// ==UserScript==
// @name         FXReplay Templates & Theme Restore Manager
// @namespace    https://github.com/victornpb/
// @version      1.5
// @description  Transfer drawing templates and theme from TradingView backup to FXReplay with a modern UI
// @author       Victor
// @match        https://app.fxreplay.com/*/auth/chart/*
// ==/UserScript==

(function () {
    'use strict';

    // Append UI styles (mirroring TradingView Backup/Restore Manager)
    const style = document.createElement('style');
    style.innerHTML = `
        #restoreManagerUI {
            position: fixed;
            bottom: 62px;
            left: 64px;
            background: #1e222d;
            padding: 15px;
            border: 1px solid #363a45;
            border-radius: 3px;
            box-shadow: 0 2px 20px rgba(0, 0, 0, 1);
            z-index: 10000;
            width: 500px;
            color: #ffffff;
        }
        #restoreManagerUI h3 {
            color: #2962ff;
            margin: 0 0 10px 0;
            font-size: 16px;
        }
        #restoreManagerUI h2 {
            margin: 0 0 10px 0;
        }
        #restoreManagerUI button {
            display: block;
            width: 100%;
            margin-bottom: 10px;
            padding: 8px;
            font-size: 14px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            border: 1px solid grey;
        }
        #restoreManagerUI button:hover {
            background-color: #434651;
        }
        #itemsDiv label {
            display: block;
            font-weight: bold;
        }
        #itemsDiv {
            height: 405px;
            overflow-y: auto;
            margin-top: 10px;
            border-top: 1px solid #ccc;
            padding: 4px;
            border: 2px inset #b2b5be;
            resize: auto;
        }
         #itemsDiv li {
            margin-left: 32px;
         }   
        #progressBar {
            margin: 10px 0;
            height: 20px;
            width: 100%;
        }
        #statusMessage {
            text-align: center;
            margin-top: 5px;
        }
    `;
    document.head.appendChild(style);

    // Create UI
    const ui = document.createElement('div');
    ui.id = 'restoreManagerUI';
    ui.innerHTML = `
        <h3>TV 2 FXReplay Migration</h3>
        <div style="display: flex; justify-content: space-around;">
            <div>
                <h2>Import Backup</h2>
                <button id="importFile" title="Import Backup File">Import Backup File</button>
                <input type="file" id="importFileInput" accept="application/json,.json" style="display: none;" />
            </div>
            <div>
                <h2>Migrate Settings</h2>
                <button id="restoreTemplates" title="Restore Templates">Apply</button>
            </div>
        </div>
        <div id="statusMessage"><i>Click Import Backup File</i></div>
        <progress id="progressBar" value="0" min="0" max="100"></progress>
        <div>
            Select items to restore:
            <a id="selectAll" href="#">Select All</a> | <a id="unselectAll" href="#">Unselect All</a>
        </div>
        <div id="itemsDiv"></div>
    `;
    document.body.appendChild(ui);

    // Global backup data
    let backupData = null;

    // UI element references
    const statusMessage = document.getElementById('statusMessage');
    const progressBar = document.getElementById('progressBar');
    const itemsDiv = document.getElementById('itemsDiv');

    // Helper functions
    function updateProgressBar(percent) {
        if (percent >= 0) progressBar.value = percent;
        else progressBar.removeAttribute('value');
    }

    function updateStatus(message) {
        statusMessage.innerHTML = message;
    }

    function getCheckboxes() {
        return Object.fromEntries(Array.from(itemsDiv.querySelectorAll('input[type="checkbox"]')).map(c => [c.value, c.checked]));
    }

    // Populate itemsDiv with checkboxes based on imported backup data
    function populateItems() {
        itemsDiv.innerHTML = '';
        // THEMES
        if (backupData.THEMES && Object.keys(backupData.THEMES).length > 0) {
            const labelElm = document.createElement('label');
            labelElm.innerHTML = `<input type="checkbox" value="THEMES" checked /> THEMES`;
            itemsDiv.appendChild(labelElm);
            const ul = document.createElement('ul');
            ul.setAttribute('name', 'THEMES');
            for (const themeName in backupData.THEMES) {
                const li = document.createElement('li');
                li.textContent = themeName;
                ul.appendChild(li);
            }
            itemsDiv.appendChild(ul);
        }
        // TOOLS
        if (backupData.TOOLS && Object.keys(backupData.TOOLS).length > 0) {
            for (const tool in backupData.TOOLS) {
                const labelElm = document.createElement('label');
                labelElm.innerHTML = `<input type="checkbox" value="${tool}" checked /> ${tool}`;
                itemsDiv.appendChild(labelElm);
                const ul = document.createElement('ul');
                ul.setAttribute('name', tool);
                for (const templateName in backupData.TOOLS[tool]) {
                    const li = document.createElement('li');
                    li.textContent = templateName;
                    ul.appendChild(li);
                }
                itemsDiv.appendChild(ul);
            }
        }
    }

    // Select/Unselect all handlers
    document.getElementById('selectAll').addEventListener('click', (e) => {
        e.preventDefault();
        itemsDiv.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = true);
    });
    document.getElementById('unselectAll').addEventListener('click', (e) => {
        e.preventDefault();
        itemsDiv.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
    });

    // Import Backup File
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
                populateItems();
            } catch (err) {
                console.error('Error parsing backup file:', err);
                updateStatus('Error parsing backup file.');
            }
        };
        reader.readAsText(file);
    });

    // Token search functions
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
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        return null;
    }

    // Restore Settings
    document.getElementById('restoreTemplates').addEventListener('click', async () => {
        if (!backupData) {
            alert('Please import a backup file.');
            return;
        }
        const checkboxes = getCheckboxes();

        // Restore THEMES if selected
        if (checkboxes.THEMES && backupData.THEMES && Object.keys(backupData.THEMES).length > 0) {
            const themeName = Object.keys(backupData.THEMES)[0];
            const theme = backupData.THEMES[themeName];
            updateStatus(`Restoring theme "${themeName}"...`);
            if (theme.chartProperties) {
                localStorage.setItem("tradingview.chartproperties", JSON.stringify(theme.chartProperties));
            }
            if (theme.mainSourceProperties) {
                localStorage.setItem("tradingview.chartproperties.mainSeriesProperties", JSON.stringify(theme.mainSourceProperties));
            }
        }

        // Restore TOOLS templates if selected
        if (backupData.TOOLS && Object.keys(backupData.TOOLS).length > 0) {
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

            // Count total templates for progress
            let totalTemplates = 0;
            for (const tool in backupData.TOOLS) {
                if (checkboxes[tool]) {
                    totalTemplates += Object.keys(backupData.TOOLS[tool]).length;
                }
            }
            let restoredCount = 0;

            for (const tool in backupData.TOOLS) {
                if (checkboxes[tool]) {
                    const templates = backupData.TOOLS[tool];
                    for (const templateName in templates) {
                        const content = templates[templateName];
                        updateStatus(`Restoring ${tool} template "${templateName}"...`);
                        const formData = new FormData();
                        formData.append('content', JSON.stringify(content));
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
                        restoredCount++;
                        updateProgressBar((restoredCount / totalTemplates) * 100);
                        await new Promise(r => setTimeout(r, 100));
                    }
                }
            }
        }
        updateStatus('Templates and theme restored successfully.');
    });
})();
