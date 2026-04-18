const { contextBridge, ipcRenderer } = require('electron');

// To be added to your existing preload script, inside contextBridge.exposeInMainWorld('pluginAPI', { ... })
// or exposed as 'terminalAPI'. Here we expose it as its own object or assuming it will be merged.

const terminalBridge = {
  create: (id) => ipcRenderer.send('terminal:create', id),
  input: (id, data) => ipcRenderer.send('terminal:input', { id, data }),
  resize: (id, cols, rows) => ipcRenderer.send('terminal:resize', { id, cols, rows }),
  dispose: (id) => ipcRenderer.send('terminal:dispose', id),
  onData: (id, callback) => {
    const channel = `terminal:data:${id}`;
    const listener = (event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    // Return an unsubscribe function
    return () => ipcRenderer.removeListener(channel, listener);
  }
};

contextBridge.exposeInMainWorld('terminalAPI', terminalBridge);

// Example merged context (if you prefer to inject it into pluginAPI):
/*
contextBridge.exposeInMainWorld('pluginAPI', {
    ...existingPluginAPI,
    terminal: terminalBridge
});
*/
