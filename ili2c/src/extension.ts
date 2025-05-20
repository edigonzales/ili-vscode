import * as vscode from 'vscode';
import fetch from 'node-fetch';
import FormData from 'form-data';

export function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel('INTERLIS compiler');

    let compileCommand = vscode.commands.registerCommand('ili2c.compileFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }

        const config = vscode.workspace.getConfiguration('interlisCompiler');
        const compilerUrl = config.get<string>('url') || 'https://ili2c.sogeo.services/api/compile';

        const document = editor.document;
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
            } else {
                vscode.window.showErrorMessage('Compilation failed. Check the "INTERLIS compiler" output.');
                outputChannel.show(true);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Compilation error: ${error}`);
            outputChannel.show(true);
        }
    });

    context.subscriptions.push(compileCommand);

    vscode.workspace.onDidSaveTextDocument((document) => {
        if (vscode.window.activeTextEditor?.document === document) {
            vscode.commands.executeCommand('ili2c.compileFile');
        }
    });
}

export function deactivate() {}
