// ==UserScript==
// @name         TradingView Backup/Restore Manager
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Fetch, export, import, and restore TradingView templates with progress indicators
// @author       Victor
// @match        https://www.tradingview.com/chart/*
// ==/UserScript==

(function () {
    'use strict';

    const userData = {
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

    // Add custom styles for the UI
    const styles = `
        #backupManagerUI {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #1e222d;
            padding: 15px;
            border: 1px solid #363a45;
            border-radius: 3px;
            box-shadow: 0 2px 20px rgba(0, 0, 0, 1);
            z-index: 10000;
            width: 500px;
            color: white;
        }
        #backupManagerUI h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
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
            background-color: #f0f0f0;
        }
        #toolCheckboxes {
            max-height: 200px;
            overflow: auto;
            margin-bottom: 10px;
        }
        #toolCheckboxes label {
            display: block;
            margin-bottom: 5px;
            font-size: 14px;
        }
        #itemsDiv {
            height: 205px;
            overflow-y: auto;
            margin-top: 10px;
            border-top: 1px solid #ccc;
            padding: 4px;
            border: 2px inset #b2b5be;
            resize: auto;
        }
         #itemsDiv li {
            margin-left: 1em;
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
        <div id="toolCheckboxes"></div>
        <div style="display: flex; justify-content: space-around;">
            <div>
                <h4>Backup Settings</h4>
                <button id="fetchSettings" title="">⤵️ Fetch from TradingView</button>
                <button id="exportFile" title="">💾 Export to File</button>
            </div>
            <div>
                <h4>Restore Settings</h4>
                <button id="importFile" title="">📂 Import from File</button>
                <button id="applySettings" title="">⤴️ Apply to TradingView</button>
                <input type="file" id="importFileInput" style="display: none;" />
            </div>
        </div>
        <div id="statusMessage"></div>
        <progress id="progressBar" value="0" min="0" max="100"></progress>
        <div id="itemsDiv">
            <i style="text-align:center; display: block; padding: 4em;">Click fetch or load a file</i>
        </div>
    `;
    document.body.appendChild(ui);

    const toolCheckboxes = document.getElementById('toolCheckboxes');
    const progressBar = document.getElementById('progressBar');
    const statusMessage = document.getElementById('statusMessage');
    const itemsDiv = document.getElementById('itemsDiv');
    const importFileInput = document.getElementById('importFileInput');

    // Create checkboxes for tool types
    TOOL_TYPES.forEach(toolName => {
        const labelElm = document.createElement('label');
        const label = toolName.replace('LineTool', '');
        labelElm.innerHTML = `<input type="checkbox" value="${toolName}" checked /> ${label}`;
        toolCheckboxes.appendChild(labelElm);
    });

    function updateProgressBar(percent) {
        if (percent>=0) progressBar.value = percent;
        else progressBar.removeAttribute('value');
    }

    function updateStatusMessage(message) {
        statusMessage.textContent = message;
    }

    function getCheckedTools() {
        return Array.from(toolCheckboxes.querySelectorAll('input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
    }

    async function fetchSettings() {
        const checkedTools = getCheckedTools();
        if (checkedTools.length === 0) {
            alert('Please select at least one tool to fetch.');
            return;
        }

        try {
            itemsDiv.innerHTML = '';
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
                const toolHeader = document.createElement('h4');
                toolHeader.textContent = `${tool}`;
                toolHeader.style.fontWeight = 'bold';
                itemsDiv.appendChild(toolHeader);
                const ul = document.createElement('ul');
                itemsDiv.appendChild(ul);
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
        const checkedTools = getCheckedTools();
        if (checkedTools.length === 0) {
            alert('Please select at least one tool to restore.');
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


    function exportFile() {
        const checkedTools = getCheckedTools();
        const exportData = {
            TOOLS: {},
        };

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

                itemsDiv.innerHTML = '';
                for (const tool in importedData.TOOLS) {
                    // Display tools and templates
                    const toolHeader = document.createElement('h5');
                    toolHeader.textContent = `${tool}`;
                    toolHeader.style.fontWeight = 'bold';
                    itemsDiv.appendChild(toolHeader);
                    const ul = document.createElement('ul');
                    itemsDiv.appendChild(ul);
                    for (const name in importedData.TOOLS[tool]) {
                        const li = document.createElement('li');
                        li.textContent = name;
                        ul.appendChild(li);
                    }
                }

                alert('Templates imported successfully!\nClick restore to apply the settings to TradingView.');
            } catch (error) {
                console.error('Error importing templates:', error);
                alert('Failed to import templates. Please check the file format.');
            }
        };
        reader.readAsText(file);
    }

    document.getElementById('fetchSettings').addEventListener('click', fetchSettings);
    document.getElementById('applySettings').addEventListener('click', applySettings);
    document.getElementById('exportFile').addEventListener('click', exportFile);
    document.getElementById('importFile').addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importFile);
})();
