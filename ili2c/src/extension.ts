import * as vscode from 'vscode';
import fetch from 'node-fetch';
import FormData from 'form-data';
import * as path from 'path';
import * as fs from 'fs';

let currentUmlPanel: vscode.WebviewPanel | undefined = undefined;

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

        const document = editor.document;
        if (!document.fileName.endsWith('.ili')) {
            return;
        }
        const content = document.getText();
        const fileName = document.fileName.split('/').pop() || 'file.ili'; // default filename

        try {
            const form = new FormData();
            form.append('file', Buffer.from(content), fileName);

            const response = await fetch(umlDiagramUrl, {
                method: 'POST',
                body: form,
                headers: form.getHeaders()
            });

            if (response.ok) {
                const buffer = await response.buffer();

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
