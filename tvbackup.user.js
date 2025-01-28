// ==UserScript==
// @name         TradingView Backup/Restore Manager
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Fetch, export, import, and restore TradingView templates and themes with progress indicators
// @author       Victor
// @match        https://www.tradingview.com/chart/*
// ==/UserScript==

(function () {
    'use strict';

    const userData = {
        THEMES: {},
        TOOLS: {},
    };

    const TOOL_TYPES = [
        // Lines
        'LineToolTrendLine', 'LineToolRay', 'LineToolInfoLine', 'LineToolExtended', 'LineToolTrendAngle',
        'LineToolHorzLine', 'LineToolHorzRay', 'LineToolVertLine', 'LineToolCrossLine',
        // Fib
        'LineToolFibRetracement', 'LineToolTrendBasedFibExtension', 'LineToolFibChannel', 'LineToolFibTimeZone',
        'LineToolFibSpeedResistanceFan', 'LineToolTrendBasedFibTime', 'LineToolFibCircles', 'LineToolFibSpiral',
        'LineToolFibSpeedResistanceArcs', 'LineToolFibWedge', 'LineToolPitchfan',
        // Gann
        'LineToolGannSquare', 'LineToolGannFixed', 'LineToolGannComplex', 'LineToolGannFan',
        // Projection
        'LineToolRiskRewardLong', 'LineToolRiskRewardShort',
        // Brushes
        'LineToolBrush', 'LineToolHighlighter',
        // Arrows
        'LineToolArrowMarker', 'LineToolArrow','LineToolArrowMarkUp','LineToolArrowMarkDown',
        // Shapes
        'LineToolRectangle', 'LineToolRotatedRectangle', 'LineToolPath', 'LineToolCircle', 'LineToolEllipse', 'LineToolPolyline',
        'LineToolTriangle', 'LineToolArc', 'LineToolBezierQuadro', 'LineToolBezierCubic',
        // Text
        'LineToolText', 'LineToolTextAbsolute', 'LineToolTextNote', 'LineToolPriceNote', 'LineToolNote',
        'LineToolTable', 'LineToolCallout', 'LineToolComment', 'LineToolPriceLabel', 'LineToolSignpost'
    ];

    const styles = `
        #backupManagerUI {
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
        #backupManagerUI h3 {
            color: #2962ff;
            margin: 0 0 10px 0;
            font-size: 16px;
        }
        #backupManagerUI h2 {
            margin: 0 0 10px 0;
        }
        #backupManagerUI button {
            display: block;
            width: 100%;
            margin-bottom: 10px;
            padding: 8px;
            font-size: 14px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        #backupManagerUI button:hover {
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

    const styleSheet = document.createElement('style');
    styleSheet.type = 'text/css';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // Inject UI into the page
    const ui = document.createElement('div');
    ui.id = 'backupManagerUI';
    ui.innerHTML = `
        <h3>Backup Manager</h3>
        <div style="display: flex; justify-content: space-around;">
            <div>
                <h2>💾 Backup Settings</h2>
                <button id="fetchSettings" title="">Fetch from TradingView</button>
                <button id="exportFile" title="">Export to File</button>
            </div>
            <div>
                <h2>↩️ Restore Settings</h2>
                <button id="importFile" title="">Import from File</button>
                <button id="applySettings" title="">Apply to TradingView</button>
                <input type="file" id="importFileInput" style="display: none;" />
            </div>
        </div>
        <div id="statusMessage"></div>
        <progress id="progressBar" value="0" min="0" max="100"></progress>
        <div>
            Select items to backup/restore:
            <a id="selectAll" href="#">Select All</a> | <a id="unselectAll" href="#">Unselect All</a>
        </div>
        <div id="itemsDiv"></div>
    `;
    document.body.appendChild(ui);

    const progressBar = document.getElementById('progressBar');
    const statusMessage = document.getElementById('statusMessage');
    const itemsDiv = document.getElementById('itemsDiv');
    const importFileInput = document.getElementById('importFileInput');

    ['THEMES', ...TOOL_TYPES].forEach(toolName => {
        const labelElm = document.createElement('label');
        const label = toolName.replace('LineTool', '');
        labelElm.innerHTML = `<input type="checkbox" value="${toolName}" checked /> ${label}`;
        itemsDiv.appendChild(labelElm);

        const ul = document.createElement('ul');
        ul.name = toolName;
        itemsDiv.appendChild(ul);
    });


    function updateProgressBar(percent) {
        if (percent>=0) progressBar.value = percent;
        else progressBar.removeAttribute('value');
    }

    function updateStatusMessage(message) {
        statusMessage.innerHTML = message;
    }

    function getCheckboxes() {
        return Object.fromEntries(Array.from(itemsDiv.querySelectorAll('input[type="checkbox"]')).map(c => [c.value, c.checked]));
    }

    function getCheckedTools() {
        return Array.from(itemsDiv.querySelectorAll('input[type="checkbox"]:checked')).filter(c=>c.value.includes('Tool')).map(c => c.value);
    }

    async function fetchSettings() {

        const checkboxes = getCheckboxes();
        if (checkboxes.THEMES) await fetchThemes();
        else userData.THEMES = {};

        const checkedTools = getCheckedTools();

        try {
            updateProgressBar(-1);
            updateStatusMessage('Fetching templates...');

            for (let i = 0; i < checkedTools.length; i++) {
                const tool = checkedTools[i];

                updateStatusMessage(`Fetching ${tool} tool...`);
                const response = await fetch(`https://www.tradingview.com/drawing-templates/${tool}/`, {
                    method: "GET",
                    credentials: "include"
                });
                const templateNames = await response.json();
                userData.TOOLS[tool] = {};

                for (let j = 0; j<templateNames.length; j++) {
                    const name = templateNames[j];
                    updateStatusMessage(`(${j+1} / ${templateNames.length}) Fetching ${tool} tool template "${name}"...`);
                    const templateResponse = await fetch(`https://www.tradingview.com/drawing-template/${tool}/?templateName=${encodeURIComponent(name)}`, {
                        method: "GET",
                        credentials: "include"
                    });
                    const templateContent = await templateResponse.json();
                    userData.TOOLS[tool][name] = JSON.parse(templateContent.content);
                }

                // Display tools and templates
                const ul = [...itemsDiv.querySelectorAll('ul')].find(ul => ul.name === tool);
                ul.innerHTML = '';
                for (const name in userData.TOOLS[tool]) {
                    const li = document.createElement('li');
                    li.textContent = name;
                    ul.appendChild(li);
                }

                updateProgressBar(((i + 1) / checkedTools.length) * 100);

                await new Promise((r) => setTimeout(r, 10));
            }

            updateStatusMessage('Settings successfully fetched!');
        } catch (error) {
            console.error('Error fetching data:', error);
            updateStatusMessage('Failed to fetch data.');
        }
    }


    async function applySettings() {

        const checkboxes = await getCheckboxes();
        if (checkboxes.THEMES) {
            saveThemes();
        }

        const checkedTools = getCheckedTools();
        if (checkedTools.length === 0) {
            alert('Please select at least one tool to restore!');
            return;
        }

        try {
            updateProgressBar(-1);
            updateStatusMessage('Restoring templates...');

            for (let i = 0; i < checkedTools.length; i++) {
                const tool = checkedTools[i];
                const templates = userData.TOOLS[tool];
                if (templates && Object.keys(templates).length > 0) {
                    for (let j = 0; j<templates.length; j++) {
                        const name = templates[j];
                        updateStatusMessage(`(${j+1} / ${templates.length}) Applying ${tool} tool template "${name}"...`);
                        const content = templates[name];
                        const formData = new FormData();
                        formData.append('name', name);
                        formData.append('tool', tool);
                        formData.append('content', JSON.stringify(content));
                        await fetch("https://www.tradingview.com/save-drawing-template/", {
                            method: "POST",
                            credentials: "include",
                            body: formData,
                        });
                    }
                } else { 
                    updateStatusMessage(`Tool ${tool} has no templates. Skipping...`);
                }
                updateProgressBar(((i + 1) / checkedTools.length) * 100);
            }

            updateStatusMessage('Templates restored successfully!');
        } catch (error) {
            console.error('Error restoring templates:', error);
            updateStatusMessage('Failed to restore templates.');
        }
    }


    async function fetchThemes() {
        try {
            updateStatusMessage('Fetching themes...');
            const response = await fetch("https://www.tradingview.com/themes/", {
                method: "GET",
                credentials: "include"
            });
            const themeNames = await response.json();
            userData.THEMES = {};

            const ul = [...itemsDiv.querySelectorAll('ul')].find(ul => ul.name === 'THEMES');
            ul.innerHTML = '';

            for (const theme of themeNames) {
                updateStatusMessage(`Fetching theme: ${theme}...`);
                const themeResponse = await fetch(`https://www.tradingview.com/theme/?themeName=${encodeURIComponent(theme)}`, {
                    method: "GET",
                    credentials: "include"
                });
                const themeContent = await themeResponse.json();
                userData.THEMES[theme] = JSON.parse(themeContent.content);
                
                // display on the list
                const li = document.createElement('li');
                li.textContent = theme;
                ul.appendChild(li);
            }

            updateStatusMessage('Themes fetched successfully!');
        } catch (error) {
            console.error('Error fetching themes:', error);
            updateStatusMessage('Failed to fetch themes.');
        }
    }

    async function saveThemes() {
        try {
            const themes = userData.THEMES;
            for (const theme in themes) {
                updateStatusMessage(`Saving theme: ${theme}...`);
                const formData = new FormData();
                formData.append('name', theme);
                formData.append('content', JSON.stringify(themes[theme]));
                await fetch("https://www.tradingview.com/save-theme/", {
                    method: "POST",
                    credentials: "include",
                    body: formData
                });
            }

            updateStatusMessage('Themes saved successfully!');
        } catch (error) {
            console.error('Error saving themes:', error);
            updateStatusMessage('Failed to save themes.');
        }
    }

    function exportFile() {
        const checkedTools = getCheckedTools();
        const exportData = {
            THEMES: {},
            TOOLS: {},
        };

        const checkboxes = getCheckboxes();
        if (checkboxes.THEMES){
            exportData.THEMES = userData.THEMES;
        }


        for (const tool of checkedTools) {
            if (userData.TOOLS[tool]) {
                exportData.TOOLS[tool] = userData.TOOLS[tool];
            }
        }

        if (Object.keys(exportData).length === 0) {
            alert('No templates to export. Fetch templates first.');
            return;
        }

        const blob = new Blob([JSON.stringify(exportData, null, '\t')], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tradingview_backup.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function importFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                Object.assign(userData, importedData);

                const ul = [...itemsDiv.querySelectorAll('ul')].find(ul => ul.name === 'THEMES');
                ul.innerHTML = '';
                for (const name in importedData.THEMES) {
                    const li = document.createElement('li');
                    li.textContent = name;
                    ul.appendChild(li);
                }

                for (const tool in importedData.TOOLS) {
                    const ul = [...itemsDiv.querySelectorAll('ul')].find(ul => ul.name === tool);
                    ul.innerHTML = '';
                    for (const name in importedData.TOOLS[tool]) {
                        const li = document.createElement('li');
                        li.textContent = name;
                        ul.appendChild(li);
                    }
                }

                updateStatusMessage('Settings imported successfully!\n Click Apply settings to TradingView.');
            } catch (error) {
                console.error('Error importing templates:', error);
                updateStatusMessage('Failed to import templates. Please check the file format.');
            }
        };
        reader.readAsText(file);
    }

    document.getElementById('fetchSettings').addEventListener('click', fetchSettings);
    document.getElementById('applySettings').addEventListener('click', applySettings);
    document.getElementById('exportFile').addEventListener('click', exportFile);
    document.getElementById('importFile').addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importFile);
    document.getElementById('selectAll').addEventListener('click', () => {
        itemsDiv.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = true);
    });
    document.getElementById('unselectAll').addEventListener('click', () => {
        itemsDiv.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
    });
    updateStatusMessage('<i>Click Fetch or Import a file</i>');
})();
