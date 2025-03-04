// ==UserScript==
// @name         TradingView Backup/Restore Manager
// @namespace    https://github.com/victornpb/tradingview-backup
// @version      1.2
// @description  Backup and Restore your TradingView drawing tool templates and Themes with individual template selection
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
        #tvBackupToolUI {
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
        #tvBackupToolUI h3 {
            color: #2962ff;
            margin: 0 0 10px 0;
            font-size: 16px;
        }
        #tvBackupToolUI h2 {
            margin: 0 0 10px 0;
        }
        #tvBackupToolUI button {
            display: block;
            width: 100%;
            margin-bottom: 10px;
            padding: 8px;
            font-size: 14px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        #tvBackupToolUI button:hover {
            background-color: #434651;
        }
        #tvBackupToolUI #panel {
            height: 405px;
            overflow-y: auto;
            margin-top: 10px;
            border-top: 1px solid #ccc;
            padding: 4px 16px;
            border: 2px inset #b2b5be;
            resize: auto;
            }
        #tvBackupToolUI .sectionTitle {
            font-weight: bold;
            padding: 8px 0;
            font-size: medium;
            color: silver;
        }
        #tvBackupToolUI section:empty:after {
            content: 'Empty';
            opacity: 0.25;
            display: block;
            font-style: italic;
            font-size: 8pt;
        }
        #tvBackupToolUI #panel label {
            display: block;
            font-weight: regular;
        }
        #tvBackupToolUI #progressBar {
            margin: 10px 0;
            height: 20px;
            width: 100%;
        }
        #tvBackupToolUI #statusMessage {
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
    ui.id = 'tvBackupToolUI';
    ui.innerHTML = `
        <h3>Backup Tool</h3>
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
                <input type="file" id="importFileInput" accept="application/json,.json" style="display: none;" />
            </div>
        </div>
        <div id="statusMessage"></div>
        <progress id="progressBar" value="0" min="0" max="100"></progress>
        <div>
            Select templates to backup/restore:
            <a id="selectAll" href="#">Select All</a> | <a id="unselectAll" href="#">Unselect All</a>
        </div>
        <div id="panel"></div>
    `;
    document.body.appendChild(ui);

    const progressBar = document.getElementById('progressBar');
    const statusMessage = document.getElementById('statusMessage');
    const panel = document.getElementById('panel');
    const importFileInput = document.getElementById('importFileInput');

    // Create sections for THEMES and each tool (as titles with template checkboxes underneath)
    ['THEMES', ...TOOL_TYPES].forEach(toolName => {
        const titleElm = document.createElement('div');
        titleElm.className = 'sectionTitle';
        titleElm.textContent = toolName === 'THEMES' ? 'THEMES' : toolName.replace('LineTool', '');
        panel.appendChild(titleElm);

        const el = document.createElement('section');
        el.setAttribute('data-tool', toolName);
        panel.appendChild(el);
    });

    function updateProgressBar(percent) {
        if (percent >= 0) progressBar.value = percent;
        else progressBar.removeAttribute('value');
    }

    function updateStatusMessage(message) {
        statusMessage.innerHTML = message;
    }

    function getCheckedTemplates() {
        const checkboxes = Array.from(panel.querySelectorAll('input[type="checkbox"]:checked'));
        return checkboxes.map(c => ({ tool: c.dataset.tool, template: c.value }));
    }

    async function fetchSettings() {

        updateStatusMessage('Fetching themes...');
        await fetchThemes();

        for (let i = 0; i < TOOL_TYPES.length; i++) {
            const tool = TOOL_TYPES[i];
            updateStatusMessage(`Fetching ${tool} templates...`);
            try {
                const response = await fetch(`https://www.tradingview.com/drawing-templates/${tool}/`, {
                    method: "GET",
                    credentials: "include"
                });
                const templateNames = await response.json();
                userData.TOOLS[tool] = {};

                for (let j = 0; j < templateNames.length; j++) {
                    const name = templateNames[j];
                    updateStatusMessage(`(${j+1} / ${templateNames.length}) Fetching ${tool} template "${name}"...`);
                    const templateResponse = await fetch(`https://www.tradingview.com/drawing-template/${tool}/?templateName=${encodeURIComponent(name)}`, {
                        method: "GET",
                        credentials: "include"
                    });
                    try {
                        const templateContent = await templateResponse.json();
                        userData.TOOLS[tool][name] = JSON.parse(templateContent.content);
                    } catch(err) {
                        throw `Error parsing ${tool} template "${name}"! ` + err;
                    }
                }

                const ul = panel.querySelector(`section[data-tool="${tool}"]`);
                ul.innerHTML = '';
                for (const name in userData.TOOLS[tool]) {
                    const li = document.createElement('label');
                    li.innerHTML = `<input type="checkbox" data-tool="${tool}" value="${name}" checked /> ${name}`;
                    ul.appendChild(li);
                }

                updateProgressBar(((i + 1) / TOOL_TYPES.length) * 100);
                await new Promise((r) => setTimeout(r, 10));
            } catch (error) {
                console.error('Error fetching data for tool:', tool, error);
                updateStatusMessage('Failed to fetch data.');
            }
        }
        updateStatusMessage('Settings successfully fetched!');
    }

    async function applySettings() {

        const checkedTemplates = getCheckedTemplates();
        // Group templates by tool
        const templatesByTool = {};
        checkedTemplates.forEach(({ tool, template }) => {
            if (!templatesByTool[tool]) templatesByTool[tool] = [];
            templatesByTool[tool].push(template);
        });

        // Apply themes
        if (templatesByTool["THEMES"] && Object.keys(userData.THEMES).length > 0) {
            for (let i = 0; i < templatesByTool["THEMES"].length; i++) {
                const theme = templatesByTool["THEMES"][i];
                updateStatusMessage(`Applying theme "${theme}"...`);
                const formData = new FormData();
                formData.append('name', theme);
                formData.append('content', JSON.stringify(userData.THEMES[theme]));
                await fetch("https://www.tradingview.com/save-theme/", {
                    method: "POST",
                    credentials: "include",
                    body: formData,
                });
            }
        }

        // Apply tool templates
        const toolKeys = Object.keys(templatesByTool).filter(tool => tool !== "THEMES");
        if (toolKeys.length === 0) {
            alert('Please select at least one template to restore!');
            return;
        }

        try {
            updateProgressBar(-1);
            updateStatusMessage('Restoring templates...');

            for (let i = 0; i < toolKeys.length; i++) {
                const tool = toolKeys[i];
                const templateNames = templatesByTool[tool];
                if (templateNames.length > 0) {
                    for (let j = 0; j < templateNames.length; j++) {
                        const name = templateNames[j];
                        updateStatusMessage(`(${j+1} / ${templateNames.length}) Applying ${tool} template "${name}"...`);
                        const content = userData.TOOLS[tool][name];
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
                    updateStatusMessage(`Tool ${tool} has no selected templates. Skipping...`);
                }
                updateProgressBar(((i + 1) / toolKeys.length) * 100);
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

            const list = panel.querySelector(`section[data-tool="THEMES"]`);
            list.innerHTML = '';

            for (const theme of themeNames) {
                updateStatusMessage(`Fetching theme: ${theme}...`);
                const themeResponse = await fetch(`https://www.tradingview.com/theme/?themeName=${encodeURIComponent(theme)}`, {
                    method: "GET",
                    credentials: "include"
                });
                const themeContent = await themeResponse.json();
                userData.THEMES[theme] = JSON.parse(themeContent.content);
                
                const item = document.createElement('label');
                item.innerHTML = `<input type="checkbox" data-tool="THEMES" value="${theme}" checked /> ${theme}`;
                list.appendChild(item);
            }

            updateStatusMessage('Themes fetched successfully!');
        } catch (error) {
            console.error('Error fetching themes:', error);
            updateStatusMessage('Failed to fetch themes.');
        }
    }

    function exportFile() {

        let username = '';
        try {
            username = initData.metaInfo.username;
        } catch(_){}

        const exportData = {
            _: {
                INFO: "This file was generated by https://github.com/victornpb/tradingview-backup check for more info",
                USER: username,
                DATE: new Date(),
            },
            THEMES: {},
            TOOLS: {},
        };

        const checkedTemplates = getCheckedTemplates();
        if (checkedTemplates.length === 0) {
            alert('No templates selected to export. Fetch templates first.');
            return;
        }

        checkedTemplates.forEach(({ tool, template }) => {
            if (tool === "THEMES") {
                if (userData.THEMES && userData.THEMES[template]) {
                    exportData.THEMES[template] = userData.THEMES[template];
                }
            } else {
                if (userData.TOOLS[tool] && userData.TOOLS[tool][template]) {
                    if (!exportData.TOOLS[tool]) exportData.TOOLS[tool] = {};
                    exportData.TOOLS[tool][template] = userData.TOOLS[tool][template];
                }
            }
        });

        let filename = `tradingview_${username} (${new Date().toISOString()}).backup.json`;
        filename = filename.replace(/[^a-z0-9-_\.() ]/g,'_').replace(/__/g,'_');

        const blob = new Blob([JSON.stringify(exportData, null, '\t')], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
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

                const listThemes = panel.querySelector(`section[data-tool="THEMES"]`);
                listThemes.innerHTML = '';
                for (const name in importedData.THEMES) {
                    const item = document.createElement('label');
                    item.innerHTML = `<input type="checkbox" data-tool="THEMES" value="${name}" checked /> ${name}`;
                    listThemes.appendChild(item);
                }

                for (const tool in importedData.TOOLS) {
                    const list = panel.querySelector(`section[data-tool="${tool}"]`);
                    if (list) {
                        list.innerHTML = '';
                        for (const name in importedData.TOOLS[tool]) {
                            const item = document.createElement('label');
                            item.innerHTML = `<input type="checkbox" data-tool="${tool}" value="${name}" checked /> ${name}`;
                            list.appendChild(item);
                        }
                    }
                }

                updateStatusMessage('Settings imported successfully!<br>Click Apply settings to TradingView.');
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
        panel.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = true);
    });
    document.getElementById('unselectAll').addEventListener('click', () => {
        panel.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
    });
    updateStatusMessage('<i>Click Fetch or Import a file</i>');
})();
