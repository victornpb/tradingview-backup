// ==UserScript==
// @name         TV2FXReplay
// @description  Transfer drawing templates and theme from TradingView backup to FXReplay
// @author       Victor
// @namespace    https://github.com/victornpb/
// @version      1.2
// @match        https://app.fxreplay.com/*/auth/chart/*
// ==/UserScript==

(function () {
    'use strict';

    // Append UI styles (mirroring TradingView Backup/Restore Manager)
    const style = document.createElement('style');
    style.innerHTML = `
        #tvfxrMigrationToolFab { position: fixed; bottom: 110px; left: 9px; width: 34px; height: 34px; background: #1e222d; border: 1px solid #363a45; border-radius: 6px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5); color: #fff; font-size: 24px; line-height: 34px; text-align: center; cursor: pointer; z-index: 10001; }
        #tvfxrMigrationToolFab.active { border-color: #2962ff; }
        #tvfxrMigrationToolUI { position: fixed; bottom: 62px; left: 64px; width: 500px; padding: 15px; background: #1e222d; color: #ffffff; border: 1px solid #363a45; font-family: -apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif; border-radius: 3px; box-shadow: 0 2px 20px rgba(0, 0, 0, 1); z-index: 10000; }
        #tvfxrMigrationToolUI.hidden { display: none; }
        #tvfxrMigrationToolUI #closeUI { position: absolute; right: 10px; top: 10px; height: 24px; width: 24px; line-height: 24px; font-size: 24px; background: transparent; border: transparent; color: white; padding: 0; }
        #tvfxrMigrationToolUI h3 { color: #2962ff; margin: 0 0 10px 0; font-size: 16px; }
        #tvfxrMigrationToolUI h2 { font-size: 1.3em; margin: 0 0 10px 0; }
        #tvfxrMigrationToolUI a { cursor: pointer; color: #2962ff; }
        #tvfxrMigrationToolUI button { display: block; width: 100%; margin-bottom: 10px; padding: 8px; font-size: 16px; color: #000; background: #fff; border: 1px solid #fff; border-radius: 5px; cursor: pointer; }
        #tvfxrMigrationToolUI button:hover { background-color: #ddd; }
        #tvfxrMigrationToolUI button:active { background-color: #888; }
        #tvfxrMigrationToolUI #panel label { display: block; font-weight: normal; font-size: 10pt; }
        #tvfxrMigrationToolUI #panel label:hover { background: rgba(255, 255, 255, 0.05); }
        #tvfxrMigrationToolUI #panel { height: 405px; overflow-y: auto; margin-top: 10px; border-top: 1px solid #ccc; padding: 4px 16px; border: 2px inset #b2b5be; resize: auto; }
        #tvfxrMigrationToolUI #panel .sectionTitle { font-size: medium; font-weight: bold; color: silver; }
        #tvfxrMigrationToolUI section { padding: 8px; }
        #tvfxrMigrationToolUI section:empty:after { content: 'Empty'; opacity: 0.25; display: block; font-style: italic; font-size: 8pt; }
        #tvfxrMigrationToolUI #progressBar { margin: 10px 0; height: 20px; width: 100%; }
        #tvfxrMigrationToolUI #statusMessage { text-align: center; margin-top: 5px; }
    `;
    document.head.appendChild(style);

    // Create UI
    const ui = document.createElement('div');
    ui.id = 'tvfxrMigrationToolUI';
    ui.innerHTML = `
        <h3>TV 2 FXReplay Migration Tool - <small><a href="https://github.com/victornpb">victor</a></small></h3>
        <button id="closeUI" class="closeBtn" title="Close">×</button>
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
            Select items to migrate:
            <a id="selectAll" href="#">Select All</a> | <a id="unselectAll" href="#">Unselect All</a>
        </div>
        <div id="panel"></div>
    `;
    document.body.appendChild(ui);

    const STORAGE_KEY = 'tvfxrMigrationTool';
    const prefs = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? { lastVisibility: true};

    // Floating Action Button
    const fab = document.createElement('div');
    fab.id = 'tvfxrMigrationToolFab';
    fab.title = 'TradingView Backup Tool (Show/Hide)';
    fab.textContent = '🗄️';
    document.body.appendChild(fab);
    fab.classList.toggle('active', prefs.lastVisibility);
    ui.classList.toggle('hidden', !prefs.lastVisibility);
    
    function toggleUI() {
        const show = ui.classList.contains('hidden');
        ui.classList.toggle('hidden', !show);
        fab.classList.toggle('active', show);
        prefs.lastVisibility = show;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    }
    
    fab.addEventListener('click', toggleUI);
    ui.querySelector('#closeUI').addEventListener('click', toggleUI);

    // Global backup data
    let backupData = null;

    // UI element references
    const statusMessage = document.getElementById('statusMessage');
    const progressBar = document.getElementById('progressBar');
    const panel = document.getElementById('panel');

    // Helper functions
    function updateProgressBar(percent) {
        if (percent >= 0) progressBar.value = percent;
        else progressBar.removeAttribute('value');
    }

    function updateStatus(message) {
        statusMessage.innerHTML = message;
    }

    // Get all checked templates as an array of objects with tool and template names
    function getCheckedTemplates() {
        const checkboxes = Array.from(panel.querySelectorAll('input[type="checkbox"]:checked'));
        return checkboxes.map(c => ({ tool: c.dataset.tool, template: c.value }));
    }

    // Populate panel with individual checkboxes for each backup item
    function populateItems() {
        panel.innerHTML = '';
        
        // THEMES section
        if (backupData.THEMES && Object.keys(backupData.THEMES).length > 0) {
            const titleElm = document.createElement('div');
            titleElm.className = 'sectionTitle';
            titleElm.textContent = 'THEMES';
            panel.appendChild(titleElm);
            
            const section = document.createElement('section');
            section.setAttribute('data-tool', 'THEMES');
            for (const themeName in backupData.THEMES) {
                const labelElm = document.createElement('label');
                labelElm.innerHTML = `<input type="checkbox" data-tool="THEMES" value="${themeName}" checked /> ${themeName}`;
                section.appendChild(labelElm);
            }
            panel.appendChild(section);
        }

        // TOOLS section
        if (backupData.TOOLS && Object.keys(backupData.TOOLS).length > 0) {
            for (const tool in backupData.TOOLS) {
                const titleElm = document.createElement('div');
                titleElm.className = 'sectionTitle';
                titleElm.textContent = tool;
                panel.appendChild(titleElm);
                
                const section = document.createElement('section');
                section.setAttribute('data-tool', tool);
                for (const templateName in backupData.TOOLS[tool]) {
                    const labelElm = document.createElement('label');
                    labelElm.innerHTML = `<input type="checkbox" data-tool="${tool}" value="${templateName}" checked /> ${templateName}`;
                    section.appendChild(labelElm);
                }
                panel.appendChild(section);
            }
        }
    }

    // Select/Unselect all handlers
    document.getElementById('selectAll').addEventListener('click', (e) => {
        e.preventDefault();
        panel.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = true);
    });
    document.getElementById('unselectAll').addEventListener('click', (e) => {
        e.preventDefault();
        panel.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
    });

    // Import Backup File
    document.getElementById('importFile').addEventListener('click', () => {
        document.getElementById('importFileInput').click();
    });

    document.getElementById('importFileInput').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return updateStatus('No files selected');;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                backupData = JSON.parse(e.target.result);
                populateItems();
                updateStatus('Backup file has been loaded.<br>Select items you want to restora and click "Apply"');
            } catch (err) {
                console.error('Error parsing backup file:', err);
                updateStatus('Error parsing backup file.');
            }
        };
        reader.readAsText(file);
        updateStatus('Loading file...');
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
        
        const checkedTemplates = getCheckedTemplates();

        // Restore THEMES if selected
        const selectedThemes = checkedTemplates.filter(item => item.tool === "THEMES");
        if (selectedThemes.length > 0 && backupData.THEMES) {
            for (const { template: themeName } of selectedThemes) {
                const theme = backupData.THEMES[themeName];
                updateStatus(`Restoring theme "${themeName}"...`);
                if (theme.chartProperties) {
                    localStorage.setItem("tradingview.chartproperties", JSON.stringify(theme.chartProperties));
                }
                if (theme.mainSourceProperties) {
                    localStorage.setItem("tradingview.chartproperties.mainSeriesProperties", JSON.stringify(theme.mainSourceProperties));
                }
                await new Promise(r => setTimeout(r, 50));
            }
        }

        // Restore TOOLS templates if selected
        const selectedTools = checkedTemplates.filter(item => item.tool !== "THEMES");
        if (selectedTools.length > 0 && backupData.TOOLS) {
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
            let totalTemplates = selectedTools.length;
            let restoredCount = 0;
            for (const { tool, template } of selectedTools) {
                const content = backupData.TOOLS[tool][template];
                updateStatus(`Restoring ${tool} template "${template}"...`);
                const formData = new FormData();
                formData.append('content', JSON.stringify(content));
                const endpoint = `https://awf.fxreplay.com/chart-storage/2/drawing_templates?client=fxreplay.com&user=${encodeURIComponent(userId)}&tool=${encodeURIComponent(tool)}&name=${encodeURIComponent(template)}`;
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
                    console.error(`Error restoring ${tool} template "${template}":`, err);
                    updateStatus(`Error restoring ${tool} template "${template}". See console.`);
                }
                restoredCount++;
                updateProgressBar((restoredCount / totalTemplates) * 100);
                await new Promise(r => setTimeout(r, 100));
            }
        }
        updateStatus(`<p style="color:green">Templates and theme restored successfully!</p><br>Click <a onclick="location.reload(true);">Refresh</a> to see the changes.`);
    });
})();
