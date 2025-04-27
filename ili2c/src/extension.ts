import * as vscode from 'vscode';
import fetch from 'node-fetch';
import FormData from 'form-data';

export function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel('File Compilation');

    let validateCommand = vscode.commands.registerCommand('ili2c.compileFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }

        const document = editor.document;
        const content = document.getText();
        const fileName = document.fileName.split('/').pop() || 'file.ili'; // default filename

        try {
            const form = new FormData();
            form.append('file', Buffer.from(content), fileName);

            const response = await fetch('https://ili2.sogeo.services/api/compile', {
                method: 'POST',
                body: form,
                headers: form.getHeaders()
            });

            const logText = await response.text();

            outputChannel.clear();
            outputChannel.appendLine(logText);
            outputChannel.show();

            if (response.ok) {
                vscode.window.showInformationMessage('Compilation successful!');
            } else {
                vscode.window.showErrorMessage('Compilation failed. Check the "File Compilation" output.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Compilation error: ${error}`);
        }
    });

    context.subscriptions.push(validateCommand);

    vscode.workspace.onDidSaveTextDocument((document) => {
        if (vscode.window.activeTextEditor?.document === document) {
            vscode.commands.executeCommand('ili2c.compileFile');
        }
    });
}

export function deactivate() {}
