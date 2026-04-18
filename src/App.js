import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

function App() {
  const terminalRef = useRef(null);
  const termInstance = useRef(null);
  const fitAddon = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [fileName, setFileName] = useState('Terminal');

  // Scrape FileId from url hash or search params
  const getFileId = () => {
    let id = window.pluginAPI?.context?.fileId;
    if (id) return id;
    try {
      const url = new URL(window.location.href);
      id = url.searchParams.get("fileId");
      if (!id && window.location.hash.includes("?")) {
        const hashParams = new URLSearchParams(window.location.hash.split("?")[1]);
        id = hashParams.get("fileId");
      }
    } catch (e) { }
    return id || `term-${Math.random().toString(36).substr(2, 9)}`;
  };

  const fileId = getFileId();

  useEffect(() => {
    if (window.pluginAPI && fileId && window.pluginAPI.getFileDetailsById) {
      window.pluginAPI.getFileDetailsById(fileId).then(info => {
        if (info && info.title) setFileName(info.title);
      }).catch(err => console.warn(err));
    }
  }, [fileId]);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize Xterm
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        selectionBackground: '#264F78',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
    });

    const fit = new FitAddon();
    const webLinks = new WebLinksAddon();

    term.loadAddon(fit);
    term.loadAddon(webLinks);

    term.open(terminalRef.current);
    fit.fit();

    termInstance.current = term;
    fitAddon.current = fit;

    const proxy = window.terminalAPI || window.pluginAPI?.terminal;
    let unsubscribeData;

    if (proxy) {
      // Connect to Main process PTY
      proxy.create(fileId);

      unsubscribeData = proxy.onData(fileId, (data) => {
        term.write(data);
      });

      term.onData((data) => {
        proxy.input(fileId, data);
      });

      term.onResize((size) => {
        proxy.resize(fileId, size.cols, size.rows);
      });
      
      setIsReady(true);
    } else {
      term.write('\r\n\x1b[31mError: Terminal IPC Bridge missing (terminalAPI or pluginAPI.terminal).\x1b[0m\r\n');
      term.write('\r\nEnsure you have added core-integration files to your Electron main process.\r\n');
    }

    // Auto-resize handler
    const handleResize = () => {
      if (fitAddon.current) {
        fitAddon.current.fit();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (unsubscribeData) unsubscribeData();
      if (proxy) proxy.dispose(fileId);
      term.dispose();
    };
  }, [fileId]);

  return (
    <div className="App dark-theme">
      <header className="terminal-topbar">
        <div className="topbar-left">
          <div className="editor-label">
            <i className="ri-terminal-box-fill"></i>
            <span>TERMINAL</span>
          </div>
          <div className="vertical-divider"></div>
          <div className="file-info">
            <i className="ri-terminal-line file-type-icon"></i>
            <span className="file-name">{fileName}</span>
          </div>
        </div>
        
        <div className="topbar-right">
          <button className="status-indicator" title="Connection Status">
            {isReady ? (
              <><span className="status-dot online"></span> Connected</>
            ) : (
              <><span className="status-dot offline"></span> Disconnected</>
            )}
          </button>
        </div>
      </header>

      <div className="workspace">
        <div className="terminal-container" ref={terminalRef}></div>
      </div>
    </div>
  );
}

export default App;
