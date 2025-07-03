import * as vscode from 'vscode';
import fetch from 'node-fetch';
import FormData from 'form-data';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import ili2c from 'ili2c';

let currentUmlPanel: vscode.WebviewPanel | undefined = undefined;
let currentMermaidUmlPanel: vscode.WebviewPanel | undefined = undefined;

export function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel('INTERLIS compiler');

    let compileCommand = vscode.commands.registerCommand('ili.compileFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }

        const config = vscode.workspace.getConfiguration('interlisCompiler');
        const compilerUrl = config.get<string>('url') || 'https://ili.sogeo.services/api/compile';

        const document = editor.document;
        if (!document.fileName.endsWith('.ili')) {
            return;
        }

        const result = ili2c.compileModel(document.uri.fsPath, '/tmp/ili2c.log');
        console.log(result);

        const content = document.getText();
        const fileName = document.fileName.split('/').pop() || 'file.ili'; // default filename

        try {
            const form = new FormData();
            form.append('file', Buffer.from(content), fileName);

            const response = await fetch(compilerUrl, {
                method: 'POST',
                body: form,
                headers: form.getHeaders()
            });

            const logText = await response.text();

            outputChannel.clear();
            outputChannel.appendLine(logText);

            outputChannel.appendLine("XXXXX" + result);
            //outputChannel.show();

            if (response.ok) {
                vscode.window.showInformationMessage('Compilation successful!');
                outputChannel.show(true);
            } else {
                vscode.window.showErrorMessage('Compilation failed. Check the "INTERLIS compiler" output.');
                outputChannel.show(true);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Compilation error: ${error}`);
            outputChannel.show(true);
        }
    });

    let prettyPrintCommand = vscode.commands.registerCommand('ili.prettyPrint', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }

        const config = vscode.workspace.getConfiguration('interlisPrettyPrint');
        const prettyPrintUrl = config.get<string>('url') || 'https://ili.sogeo.services/api/prettyprint';

        const document = editor.document;
        if (!document.fileName.endsWith('.ili')) {
            return;
        }
        const content = document.getText();
        const fileName = document.fileName.split('/').pop() || 'file.ili'; // default filename

        try {
            const form = new FormData();
            form.append('file', Buffer.from(content), fileName);

            const response = await fetch(prettyPrintUrl, {
                method: 'POST',
                body: form,
                headers: form.getHeaders()
            });

            if (response.ok) {
                const prettyPrintedContent = await response.text();
                await editor.edit(editBuilder => {
                    const firstLine = document.lineAt(0);
                    const lastLine = document.lineAt(document.lineCount - 1);
                    const range = new vscode.Range(firstLine.range.start, lastLine.range.end);
                    editBuilder.replace(range, prettyPrintedContent);
                });
                vscode.window.showInformationMessage('File pretty printed successfully!');
            } else {
                const errorText = await response.text();
                vscode.window.showErrorMessage(`Pretty print failed: ${response.statusText} - ${errorText}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Pretty print error: ${error}`);
        }
    });

    let umlDiagramCommand = vscode.commands.registerCommand('ili.createUmlDiagram', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }

        const config = vscode.workspace.getConfiguration('interlisUmlDiagram');
        const umlDiagramUrl = config.get<string>('url') || 'https://ili.sogeo.services/api/uml';
        //const umlDiagramUrl = 'http://localhost:8080/api/uml';
        const umlDiagramType = config.get<string>('diagramType');



        const document = editor.document;
        if (!document.fileName.endsWith('.ili')) {
            return;
        }
        const content = document.getText();
        const fileName = document.fileName.split('/').pop() || 'file.ili'; // default filename

        try {
            const form = new FormData();
            form.append('file', Buffer.from(content), fileName);
            form.append('vendor', umlDiagramType);

            const response = await fetch(umlDiagramUrl, {
                method: 'POST',
                body: form,
                headers: form.getHeaders()
            });

            if (response.ok) {
                const buffer = await response.buffer();

                if (umlDiagramType === "PLANTUML") {
                    // Create a temporary file to store the image
                    const tempDir = path.join(context.extensionPath, 'temp');
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir);
                    }
                    const imagePath = path.join(tempDir, 'uml_diagram.png');
                    fs.writeFileSync(imagePath, Buffer.from(buffer));
                    const resourcePath = vscode.Uri.file(imagePath);
                    const webviewUri = (currentUmlPanel?.webview)?.asWebviewUri(resourcePath);
                    const base64Image = Buffer.from(fs.readFileSync(imagePath)).toString('base64');
                    const imageDataUri = `data:image/png;base64,${base64Image}`;

                    const webviewContent = `<!DOCTYPE html>
                                            <html>
                                            <head>
                                                <title>UML Diagram</title>
                                            </head>
                                            <body>
                                                <img src="${imageDataUri}" />
                                            </body>
                                            </html>`;

                    if (currentUmlPanel) {
                        currentUmlPanel.webview.html = webviewContent;
                        currentUmlPanel.reveal(vscode.ViewColumn.Two);
                    } else {
                        currentUmlPanel = vscode.window.createWebviewPanel(
                            'interlisUmlDiagram',
                            'INTERLIS UML Diagram',
                            vscode.ViewColumn.Two,
                            {},
                        );
                        currentUmlPanel.webview.html = webviewContent;

                        currentUmlPanel.onDidDispose(() => {
                            currentUmlPanel = undefined;
                        });
                    }
                } else {
                    const mermaidContent = buffer.toString();

                    const webviewContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Mermaid Diagram</title>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';

    const baseCode = \`
${mermaidContent}
\`
    ;

    const renderDiagram = async () => {
      const { svg } = await mermaid.render('theDiagram', baseCode);
      const container = document.getElementById('diagramContainer');
      container.innerHTML = svg;

      // Enable pan/zoom
      if (window.svgPanZoomInstance) {
        window.svgPanZoomInstance.destroy();
      }
      const svgElement = container.querySelector('svg');
      window.svgPanZoomInstance = svgPanZoom(svgElement, {
        zoomEnabled: true,
        controlIconsEnabled: true,
        zoomScaleSensitivity: 0.2,
        fit: true,
        center: true,
        minZoom: 0.2,
        maxZoom: 10,
        panEnabled: true
      });

      document.getElementById('downloadSvgBtn').onclick = () => {
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diagram.svg';
        a.click();
        URL.revokeObjectURL(url);
      };

      document.getElementById('copyCodeBtn').onclick = async () => {
        const btnSpan = document.querySelector('#copyCodeBtn span');
        try {
          await navigator.clipboard.writeText(baseCode);
          btnSpan.textContent = 'Copied!';
          document.getElementById('copyCodeBtn').disabled = true;
          setTimeout(() => {
            btnSpan.textContent = 'Copy Mermaid Code';
            document.getElementById('copyCodeBtn').disabled = false;
          }, 4000);
        } catch (err) {
          console.error('Clipboard copy failed:', err);
        }
      };
    };
    
    window.addEventListener('DOMContentLoaded', async () => {
      await renderDiagram();
    });
  </script>

  <script src="https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.1/dist/svg-pan-zoom.min.js"></script>

  <style>
    html, body {
      margin: 0;
      padding: 0;
      height: 100vh;
      display: flex;
      flex-direction: column;
      font-family: sans-serif;
    }

    .controls {
      padding: 1em;
      background: white;
      border-bottom: 1px solid #ccc;
      display: flex;
      gap: 1em;
      flex-wrap: wrap;
    }

    button {
      padding: 0.5em 1em;
      font-size: 1em;
      width: 240px;
      cursor: pointer;
      background: #ECECFF;
      border: 2px solid #9370DA;
      border-radius: 5px;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    #diagramContainer {
      flex: 1;
      background: white;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
    }

    svg {
      width: 100%;
      height: 100%;
      max-width: 100% !important;
    }
  </style>
</head>
<body>
  <div class="controls">
    <button id="downloadSvgBtn"><span>Download SVG</span></button>
    <button id="copyCodeBtn"><span>Copy Mermaid Code</span></button>
  </div>
  <div id="diagramContainer"></div>
</body>
</html>`;

                    if (currentMermaidUmlPanel) {
                        currentMermaidUmlPanel.webview.html = webviewContent;
                        currentMermaidUmlPanel.reveal(vscode.ViewColumn.Two);
                    } else {
                        currentMermaidUmlPanel = vscode.window.createWebviewPanel(
                            'interlisMermaidUmlDiagram',
                            'INTERLIS UML Diagram (Mermaid)',
                            vscode.ViewColumn.Two,
                            {enableScripts: true},
                        );
                        currentMermaidUmlPanel.webview.html = webviewContent;

                        currentMermaidUmlPanel.onDidDispose(() => {
                            currentMermaidUmlPanel = undefined;
                        });
                    }
                }
            } else {
                const errorText = await response.text();
                vscode.window.showErrorMessage(`UML diagram generation failed: ${response.statusText} - ${errorText}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`UML diagram generation error: ${error}`);
        }
    });

    context.subscriptions.push(compileCommand);
    context.subscriptions.push(prettyPrintCommand);
    context.subscriptions.push(umlDiagramCommand);

    vscode.workspace.onDidSaveTextDocument((document) => {
        if (vscode.window.activeTextEditor?.document === document) {
            vscode.commands.executeCommand('ili.compileFile');
        }
    });
}

export function deactivate() {}
