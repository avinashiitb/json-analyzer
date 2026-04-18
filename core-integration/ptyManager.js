const os = require('os');
const pty = require('node-pty');
const { ipcMain } = require('electron');

// Manage terminal sessions
const terminals = new Map();

function setupPTYManager(mainWindow) {
  const shell = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash';

  ipcMain.on('terminal:create', (event, id) => {
    if (terminals.has(id)) {
      console.warn(`Terminal ${id} already exists.`);
      return;
    }

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.env.HOME || process.cwd(),
      env: process.env
    });

    // Stream output directly to the renderer
    ptyProcess.onData((data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(`terminal:data:${id}`, data);
      }
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`Terminal ${id} exited with code ${exitCode} and signal ${signal}`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(`terminal:data:${id}`, `\r\n[Process exited with code ${exitCode}]\r\n`);
      }
      terminals.delete(id);
    });

    terminals.set(id, ptyProcess);
  });

  ipcMain.on('terminal:input', (event, { id, data }) => {
    const ptyProcess = terminals.get(id);
    if (ptyProcess) {
      ptyProcess.write(data);
    }
  });

  ipcMain.on('terminal:resize', (event, { id, cols, rows }) => {
    const ptyProcess = terminals.get(id);
    if (ptyProcess) {
      try {
        ptyProcess.resize(cols, rows);
      } catch (err) {
        console.error(`Failed to resize terminal ${id}:`, err);
      }
    }
  });

  ipcMain.on('terminal:dispose', (event, id) => {
    const ptyProcess = terminals.get(id);
    if (ptyProcess) {
      ptyProcess.kill();
      terminals.delete(id);
    }
  });
}

module.exports = { setupPTYManager };
