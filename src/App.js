import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
import TopBar from './components/TopBar';
import Scratchpad from './components/Scratchpad';
import TerminalView from './components/TerminalView';

function App() {
  const ObjectUrlId = () => Math.random().toString(36).substr(2, 9);
  
  const [isReady, setIsReady] = useState(false);
  const [fileName, setFileName] = useState('Promptly');
  const [commands, setCommands] = useState([{ id: ObjectUrlId(), text: '' }]);
  const [leftPaneWidth, setLeftPaneWidth] = useState(50);
  const [theme, setTheme] = useState('dark-theme');
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

  const handleMouseDown = (e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const newWidth = (e.clientX / window.innerWidth) * 100;
    if (newWidth >= 20 && newWidth <= 80) {
      setLeftPaneWidth(newWidth);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      document.body.style.cursor = 'default';
      // Terminals resize observer triggers fit naturally, or we trigger global resize
      window.dispatchEvent(new Event('resize'));
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

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
              if (savedData.theme) setTheme(savedData.theme);
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

  const handleSave = useCallback(async () => {
    if (window.pluginAPI && window.pluginAPI.updateDocument && fileId && isDataLoaded) {
      const payloadData = { commands, leftPaneWidth, theme };
      const updatedContents = {
        version: "1.0.0",
        time: Date.now(),
        blocks: [{ type: "promptly", data: payloadData }],
        parent_file: fileId,
        _id: contentDoc?._id,
      };

      try {
        await window.pluginAPI.updateDocument(fileId, [updatedContents]);
      } catch (err) {
        console.error('Save error:', err);
      }
    }
  }, [commands, leftPaneWidth, theme, fileId, contentDoc, isDataLoaded]);

  // Command binding for manual save (Cmd/Ctrl + S)
  useEffect(() => {
    const stopSave = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', stopSave);
    return () => document.removeEventListener('keydown', stopSave);
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
  }, [commands, leftPaneWidth, theme, handleSave, isDataLoaded]);

  const handleExportDS = () => {
    try {
      const payload = JSON.stringify({
        _id: contentDoc?._id || `promptly-${Date.now()}`,
        version: contentDoc?.version || 1,
        time: Date.now(),
        parent_file: fileId || "standalone-export",
        blocks: [
          {
            type: "promptly",
            data: { commands, leftPaneWidth }
          }
        ],
        createdAt: contentDoc?.createdAt || Date.now(),
        updatedAt: Date.now(),
        fileType: "promptly"
      }, null, 2);

      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = fileName ? fileName.split('.')[0] : 'export';
      a.download = `${safeName}.ds`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (window.pluginAPI && window.pluginAPI.notify) {
        window.pluginAPI.notify("Exported successfully", "success");
      }
    } catch (err) {
      console.error("Export failed:", err);
      if (window.pluginAPI && window.pluginAPI.notify) {
        window.pluginAPI.notify("Export failed", "error");
      }
    }
  };

  return (
    <div className={`App ${theme}`}>
      <TopBar fileName={fileName} isReady={isReady} onExportDS={handleExportDS} theme={theme} setTheme={setTheme} />

      <div className="workspace">
        <Scratchpad 
          commands={commands} 
          setCommands={setCommands} 
          sessionId={sessionId} 
          leftPaneWidth={leftPaneWidth} 
          ObjectUrlId={ObjectUrlId} 
        />
        
        <div className="pane-resizer" onMouseDown={handleMouseDown}></div>
        
        <div className="right-pane" style={{ width: `${100 - leftPaneWidth}%`, flex: 'none' }}>
          <TerminalView sessionId={sessionId} setIsReady={setIsReady} theme={theme} />
        </div>
      </div>
    </div>
  );
}

export default App;
