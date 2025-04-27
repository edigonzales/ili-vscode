import * as vscode from 'vscode';
import axios from 'axios';
import FormData = require('form-data');

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('filevalidator.validateFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found!');
            return;
        }

        const document = editor.document;
        const fileContent = document.getText();
        const fileName = document.fileName.split('/').pop() || 'file'; // Get just the filename part

        try {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Validating ${fileName}`,
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0 });

                try {
                    // Create form data
                    const formData = new FormData();
                    formData.append('file', fileContent, {
                        filename: fileName,
                        contentType: 'text/plain'
                    });

                    const response = await axios.post('http://localhost:8080/api/compile', formData, {
                        headers: {
                            ...formData.getHeaders(),
                            'Content-Type': 'multipart/form-data'
                            //'Accept': 'text/plain'
                        }
                    });

                    progress.report({ increment: 100 });
                    
                    if (response.status === 200) {
                        showValidationResults('Validation successful', response.data, false);
                    } else {
                        showValidationResults('Validation failed', response.data, true);
                    }
                } catch (error: any) {
                    progress.report({ increment: 100 });
                    if (error.response) {
                        // Server responded with a status other than 2xx
                        showValidationResults('Validation failed', error.response.data, true);
                    } else {
                        vscode.window.showErrorMessage(`Validation error: ${error.message}`);
                    }
                }
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to validate file: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

function showValidationResults(title: string, content: string, isError: boolean) {
    const panel = vscode.window.createWebviewPanel(
        'validationResults',
        title,
        vscode.ViewColumn.Beside,
        {}
    );

    // Format the content with proper line breaks and styling
    //const formattedContent = content.replace(/\n/g, '<br>');
    const formattedContent = content;
    
    panel.webview.html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Validation Results</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 20px;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                }
                .header {
                    color: ${isError ? 'var(--vscode-errorForeground)' : 'var(--vscode-gitDecoration-addedResourceForeground)'};
                    margin-bottom: 15px;
                    font-weight: bold;
                }
                .log {
                    white-space: pre-wrap;
                    background-color: var(--vscode-textBlockQuote-background);
                    padding: 10px;
                    border-radius: 3px;
                    font-family: var(--vscode-editor-font-family);
                    font-size: var(--vscode-editor-font-size);
                }
            </style>
        </head>
        <body>
            <div class="header">${title}</div>
            <div class="log">${formattedContent}</div>
        </body>
        </html>`;
}

export function deactivate() {}