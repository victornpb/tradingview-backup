// ==UserScript==
// @name         TradingView Backup/Restore Manager
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Fetch, export, import, and restore TradingView templates
// @author       Victor
// @match        https://www.tradingview.com/chart/*
// ==/UserScript==

(function () {
    'use strict';

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

    const toolsData = {
        Tools: {}
    };

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
        #templateList {
            max-height: 205px;
            overflow-y: auto;
            margin-top: 10px;
            border-top: 1px solid #ccc;
            padding: 4px;
            border: 2px inset #b2b5be;
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
                <button id="fetchTemplates" title="">⤵️ Fetch from TradingView</button>
                <button id="exportTemplates" title="">💾 Export to File</button>
            </div>
            <div>
                <h4>Restore Settings</h4>
                <button id="importTemplates" title="">📂 Import from File</button>
                <button id="restoreTemplates" title="">⤴️ Apply to TradingView</button>
                <input type="file" id="importFile" style="display: none;" />
            </div>
        </div>
        <div id="templateList">
            <i style="text-align:center; display: block; npadding: 4em;">Click fetch or Load a File</i>
        </div>
    `;
    document.body.appendChild(ui);

    const toolCheckboxes = document.getElementById('toolCheckboxes');
    const templateList = document.getElementById('templateList');
    const importFileInput = document.getElementById('importFile');

    // Create checkboxes for tool types
    TOOL_TYPES.forEach(toolName => {
        const labelElm = document.createElement('label');
        const label = toolName.replace('LineTool', '');
        labelElm.innerHTML = `<input type="checkbox" value="${toolName}" checked /> ${label}`;
        toolCheckboxes.appendChild(labelElm);
    });

    // Get checked tools
    function getCheckedTools() {
        return Array.from(toolCheckboxes.querySelectorAll('input[type="checkbox"]:checked')).map(
            checkbox => checkbox.value
        );
    }

    // Fetch templates for checked tools
    async function fetchTemplates() {
        const checkedTools = getCheckedTools();
        if (checkedTools.length === 0) {
            alert('Please select at least one tool to fetch.');
            return;
        }

        try {
            templateList.innerHTML = '';
            for (const tool of checkedTools) {
                const response = await fetch(`https://www.tradingview.com/drawing-templates/${tool}/`, {
                    method: "GET",
                    credentials: "include"
                });
                const templateNames = await response.json();
                toolsData.Tools[tool] = {};

                for (const name of templateNames) {
                    const templateResponse = await fetch(`https://www.tradingview.com/drawing-template/${tool}/?templateName=${encodeURIComponent(name)}`, {
                        method: "GET",
                        credentials: "include"
                    });
                    const templateContent = await templateResponse.json();
                    toolsData.Tools[tool][name] = JSON.parse(templateContent.content);
                }

                // Display fetched tool and templates
                const toolHeader = document.createElement('div');
                toolHeader.textContent = `Tool: ${tool}`;
                toolHeader.style.fontWeight = 'bold';
                templateList.appendChild(toolHeader);

                for (const name in toolsData.Tools[tool]) {
                    const templateItem = document.createElement('div');
                    templateItem.textContent = name;
                    templateList.appendChild(templateItem);
                }
            }

            alert('Templates fetched successfully!');
        } catch (error) {
            console.error('Error fetching templates:', error);
            alert('Failed to fetch templates.');
        }
    }

    // Restore templates for checked tools
    async function restoreTemplates() {
      const checkedTools = getCheckedTools();
      if (checkedTools.length === 0) {
          alert('Please select at least one tool to restore.');
          return;
      }
  
      try {
          for (const tool of checkedTools) {
              const templates = toolsData.Tools[tool];
              if (!templates || Object.keys(templates).length === 0) {
                  alert(`No templates to restore for ${tool}. Fetch or import templates first.`);
                  continue;
              }
  
              for (const name in templates) {
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
          }
  
          alert('Templates restored successfully!');
      } catch (error) {
          console.error('Error restoring templates:', error);
          alert('Failed to restore templates.');
      }
  }


    // Export templates for checked tools
    function exportTemplates() {
        const checkedTools = getCheckedTools();
        const exportData = {};

        for (const tool of checkedTools) {
            if (toolsData.Tools[tool]) {
                exportData[tool] = toolsData.Tools[tool];
            }
        }

        if (Object.keys(exportData).length === 0) {
            alert('No templates to export. Fetch templates first.');
            return;
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tradingview_templates.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Import templates from a file
    function importTemplates(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                Object.assign(toolsData, importedData);

                templateList.innerHTML = '';
                for (const tool in importedData.Tools) {
                    const toolHeader = document.createElement('div');
                    toolHeader.textContent = `Tool: ${tool}`;
                    toolHeader.style.fontWeight = 'bold';
                    templateList.appendChild(toolHeader);

                    for (const name in importedData.Tools[tool]) {
                        const templateItem = document.createElement('div');
                        templateItem.textContent = name;
                        templateList.appendChild(templateItem);
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

    // Attach event listeners to buttons
    document.getElementById('fetchTemplates').addEventListener('click', fetchTemplates);
    document.getElementById('restoreTemplates').addEventListener('click', restoreTemplates);
    document.getElementById('exportTemplates').addEventListener('click', exportTemplates);
    document.getElementById('importTemplates').addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importTemplates);
})();