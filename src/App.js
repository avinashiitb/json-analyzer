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
  const ObjectUrlId = () => Math.random().toString(36).substr(2, 9);
  
  const [isReady, setIsReady] = useState(false);
  const [fileName, setFileName] = useState('Terminal');
  const [commands, setCommands] = useState([{ id: ObjectUrlId(), text: '' }]);
  const [leftPaneWidth, setLeftPaneWidth] = useState(50);
  const isDragging = useRef(false);

  // Persistence States
  const [contentDoc, setContentDoc] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

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
    return id || `term-${ObjectUrlId()}`;
  };

  const [fileId] = useState(() => getFileId());
  const [sessionId] = useState(() => `sess-${ObjectUrlId()}`);

  const executeCommand = (id) => {
    const proxy = window.terminalAPI || window.pluginAPI?.terminal;
    const cmd = commands.find(c => c.id === id);
    if (proxy && cmd && cmd.text.trim()) {
      proxy.input(sessionId, cmd.text + '\r');
    }
  };

  const handleKeyDown = (e, id) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand(id);
    }
  };

  const updateCommandText = (id, newText) => {
    setCommands(prev => prev.map(c => c.id === id ? { ...c, text: newText } : c));
  };

  const updateCommandTitle = (id, newTitle) => {
    setCommands(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
  };

  const addCommandBlock = () => {
    setCommands(prev => [...prev, { id: ObjectUrlId(), text: '' }]);
  };

  const removeCommandBlock = (id) => {
    setCommands(prev => prev.filter(c => c.id !== id));
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const newWidth = (e.clientX / window.innerWidth) * 100;
    if (newWidth >= 20 && newWidth <= 80) {
      setLeftPaneWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    if (isDragging.current) {
      isDragging.current = false;
      document.body.style.cursor = 'default';
      // Fit terminal layout to new bounds
      if (fitAddon.current) {
        fitAddon.current.fit();
      }
    }
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []); // Handlers rely on refs and simple state setting, empty deps is fine

  useEffect(() => {
    const loadInitialData = async () => {
      if (window.pluginAPI && fileId) {
        try {
          const fileInfo = await window.pluginAPI.getFileDetailsById(fileId);
          if (fileInfo && fileInfo.title) setFileName(fileInfo.title);

          const data = await window.pluginAPI.getDocumentsByParentFile(fileId);
          if (data && data.length > 0) {
            const document = data[0];
            setContentDoc(document);

            let savedData = document?.blocks?.[0]?.data;
            if (typeof savedData === 'string') {
              try { savedData = JSON.parse(savedData); } catch (e) {}
            }

            if (savedData && typeof savedData === 'object') {
              if (savedData.commands && Array.isArray(savedData.commands)) setCommands(savedData.commands);
              if (savedData.leftPaneWidth) setLeftPaneWidth(savedData.leftPaneWidth);
            }
          }
        } catch (err) {
          console.warn('Failed to load initial data:', err);
        } finally {
          setIsDataLoaded(true);
        }
      } else {
        setIsDataLoaded(true);
      }
    };
    
    // Slight delay to ensure IPC is ready
    setTimeout(loadInitialData, 100);
  }, [fileId]);

  const handleSave = React.useCallback(async () => {
    if (window.pluginAPI && window.pluginAPI.updateDocument && fileId && isDataLoaded) {
      const payloadData = { commands, leftPaneWidth };
      const updatedContents = {
        version: "1.0.0",
        time: Date.now(),
        blocks: [{ type: "terminal-scratchpad", data: payloadData }],
        parent_file: fileId,
        _id: contentDoc?._id,
      };

      try {
        await window.pluginAPI.updateDocument(fileId, [updatedContents]);
      } catch (err) {
        console.error('Save error:', err);
      }
    }
  }, [commands, leftPaneWidth, fileId, contentDoc, isDataLoaded]);

  // Command binding for manual save (Cmd/Ctrl + S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Auto-save debounce effect
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!isDataLoaded) return;

    const timeoutId = setTimeout(() => {
      handleSave();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [commands, leftPaneWidth, handleSave, isDataLoaded]);

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
    
    // Fit must be delayed slightly on remount or it causes crash loops in xterm
    setTimeout(() => {
      try { fit.fit(); } catch (e) { console.warn("Fit error", e); }
    }, 50);

    termInstance.current = term;
    fitAddon.current = fit;

    const proxy = window.terminalAPI || window.pluginAPI?.terminal;
    let unsubscribeData;

    if (proxy) {
      console.log(`[Plugin Frontend] Setting up IPC proxy listener for ${sessionId}...`);
      unsubscribeData = proxy.onData(sessionId, (data) => {
        console.log(`[Plugin Frontend] Received stdout (${data?.length || 0} bytes)`);
        if (data) term.write(data);
      });

      term.onData((data) => {
        console.log(`[Plugin Frontend] User typed input`);
        proxy.input(sessionId, data);
      });

      term.onResize((size) => {
        proxy.resize(sessionId, size.cols, size.rows);
      });

      console.log(`[Plugin Frontend] Requesting terminal create/reconnect against main process for ${sessionId}...`);
      proxy.create(sessionId);
      
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
      if (proxy) {
        proxy.dispose(sessionId);
      }
      term.dispose();
    };
  }, [sessionId]);

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
        <div className="left-pane" style={{ width: `${leftPaneWidth}%`, flex: 'none' }}>
          <div className="scratchpad-header">
            <span>Command Scratchpad</span>
          </div>
          <div className="commands-list">
            {commands.map((cmd, index) => (
              <div key={cmd.id} className="command-block">
                <div className="command-actions">
                    <input 
                      className="command-title-input command-number" 
                      value={cmd.title !== undefined ? cmd.title : ''} 
                      onChange={(e) => updateCommandTitle(cmd.id, e.target.value)}
                      placeholder={`CMD ${index + 1}`}
                      title="Rename command block"
                      spellCheck={false}
                    />
                    <div className="command-btn-group">
                      <button className="icon-btn" onClick={() => executeCommand(cmd.id)} title="Run">
                        <i className="ri-play-fill run-icon"></i>
                      </button>
                      <button className="icon-btn" onClick={() => removeCommandBlock(cmd.id)} title="Remove">
                        <i className="ri-delete-bin-line remove-icon"></i>
                      </button>
                    </div>
                </div>
                <textarea
                  className="scratchpad-textarea block-textarea"
                  value={cmd.text}
                  onChange={(e) => updateCommandText(cmd.id, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, cmd.id)}
                  placeholder="Type shell command...&#10;Enter to run, Shift+Enter for newline."
                  spellCheck={false}
                />
              </div>
            ))}
          </div>
          <button className="add-command-btn" onClick={addCommandBlock}>
            <i className="ri-add-line"></i> Add Command Block
          </button>
        </div>
        <div className="pane-resizer" onMouseDown={handleMouseDown}></div>
        <div className="right-pane" style={{ width: `${100 - leftPaneWidth}%`, flex: 'none' }}>
          <div className="terminal-container" ref={terminalRef}></div>
        </div>
      </div>
    </div>
  );
}

export default App;
