const nsharpweb = {
    async load(script) {
        let lastPicked = "";
        let fileCache = new Map();

        const print = (...args) => console.log(...args);

        const gui = {
            alert: (msg) => window.alert(msg),
            error: (msg) => window.alert("Error: " + msg),
            info: (msg) => window.alert(msg),
            notify: (title, body) => {
                if (typeof title === 'string' && !body) {
                    window.alert(title);
                } else {
                    window.alert(`${title}: ${body}`);
                }
            },
            input: (promptText = "Enter value:") => window.prompt(promptText),
            filepicker: async () => {
                return new Promise((resolve) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            lastPicked = file.name;
                            const text = await file.text();
                            fileCache.set(file.name, text);
                            resolve(file.name);
                        } else {
                            resolve("");
                        }
                    };
                    input.click();
                });
            },
            filepicked: () => lastPicked
        };

        const fs = {
            open: () => {},
            read: async (filename) => {
                if (filename && fileCache.has(filename)) {
                    return fileCache.get(filename);
                }
                return new Promise((resolve) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (!file) {
                            resolve("");
                            return;
                        }
                        lastPicked = file.name;
                        const text = await file.text();
                        fileCache.set(file.name, text);
                        resolve(text);
                    };
                    input.click();
                });
            },
            write: (content) => {
                const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = lastPicked || 'output.txt';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        };

        const net = {
            get: async (url) => {
                try {
                    const resp = await fetch(url);
                    return resp.statusText || resp.status.toString();
                } catch { return ""; }
            },
            download: async (url, filename) => {
                try {
                    const resp = await fetch(url);
                    const blob = await resp.blob();
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = filename || 'downloaded';
                    link.click();
                } catch (e) {
                    console.error("Download failed", e);
                }
            },
            post: async (url, body = "") => {
                try {
                    const resp = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain' },
                        body: body
                    });
                    return resp.statusText;
                } catch { return ""; }
            },
            put: async (url, body = "") => {
                try {
                    const resp = await fetch(url, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'text/plain' },
                        body: body
                    });
                    return resp.statusText;
                } catch { return ""; }
            },
            patch: async (url, body = "") => {
                try {
                    const resp = await fetch(url, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'text/plain' },
                        body: body
                    });
                    return resp.statusText;
                } catch { return ""; }
            },
            delete: async (url) => {
                try {
                    const resp = await fetch(url, { method: 'DELETE' });
                    return resp.statusText;
                } catch { return ""; }
            }
        };

        let jsCode = script
            .replace(/\/\/.*/g, '')
            .replace(/\belseif\s*\(/g, 'else if (')
            .replace(/\belseif\b/g, 'else if')
            .replace(/\bif\s+([^\({]+)\{/g, 'if ($1) {')
            .split('\n')
            .map(line => {
                let trimmed = line.trim();
                if (
                    trimmed.includes('=') && 
                    !trimmed.includes('==') && 
                    !trimmed.startsWith('if') && 
                    !trimmed.startsWith('else') &&
                    !trimmed.startsWith('let ') &&
                    !trimmed.startsWith('const ')
                ) {
                    const parts = trimmed.split('=');
                    const varName = parts[0].trim();
                    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
                        line = line.replace(varName, `let ${varName}`);
                    }
                }
                
                line = line.replace(/\b(fs\.read|fs\.filepicker|gui\.filepicker|net\.get|net\.download|net\.post|net\.put|net\.patch|net\.delete)\b/g, 'await $1');
                
                return line;
            })
            .join('\n');

        try {
            const wrappedFn = new AsyncFunction('print', 'gui', 'fs', 'net', jsCode);
            await wrappedFn(print, gui, fs, net);
        } catch (err) {
            console.error("NanoSharp Runtime Error:", err);
        }
    }
};

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
