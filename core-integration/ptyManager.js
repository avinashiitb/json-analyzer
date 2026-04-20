const os = require('os');
const pty = require('node-pty');
const { ipcMain } = require('electron');

// Manage terminal sessions
const terminals = new Map();

function setupPTYManager(mainWindow) {
  const shell = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash';

  ipcMain.on('terminal:create', (event, id) => {
    const sender = event.sender;
    const sendData = (msg) => {
      try {
        if (!sender.isDestroyed()) sender.send(`terminal:data:${id}`, msg);
      } catch (e) {}
    };

    if (terminals.has(id)) {
      sendData(`\r\n\x1b[33m[Backend] Reconnecting orphaned PTY for ${id}...\x1b[0m\r\n`);
      const term = terminals.get(id);
      term.sendData = sendData;
      
      if (term.history) {
        sendData(term.history);
      } else {
        sendData(`\r\n\x1b[33m[Backend] History was entirely empty!\x1b[0m\r\n`);
      }
      return; 
    }

    sendData(`\r\n\x1b[33m[Backend] Creating pristine PTY for ${id}...\x1b[0m\r\n`);
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.env.HOME || process.cwd(),
      env: process.env
    });

    const termObj = {
      pty: ptyProcess,
      history: '',
      sendData: sendData
    };
    const MAX_HISTORY = 100000;

    ptyProcess.onData((data) => {
      termObj.history += data;
      if (termObj.history.length > MAX_HISTORY) {
        termObj.history = termObj.history.slice(-MAX_HISTORY);
      }
      if (termObj.sendData) termObj.sendData(data);
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      if (termObj.sendData) {
        termObj.sendData(`\r\n\x1b[31m[Backend] Process exited artificially (code ${exitCode}).\x1b[0m\r\n`);
      }
      if (terminals.get(id)?.pty === ptyProcess) {
        terminals.delete(id);
      }
    });

    terminals.set(id, termObj);
  });

  ipcMain.on('terminal:input', (event, { id, data }) => {
    const term = terminals.get(id);
    if (term && term.pty) {
      term.pty.write(data);
    }
  });

  ipcMain.on('terminal:resize', (event, { id, cols, rows }) => {
    const term = terminals.get(id);
    if (term && term.pty) {
      try {
        term.pty.resize(cols, rows);
      } catch (err) {
        console.error(`Failed to resize terminal ${id}:`, err);
      }
    }
  });

  ipcMain.on('terminal:dispose', (event, id) => {
    const term = terminals.get(id);
    if (term && term.pty) {
      try { term.pty.kill(); } catch (e) {}
      terminals.delete(id);
    }
  });
}

module.exports = { setupPTYManager };
