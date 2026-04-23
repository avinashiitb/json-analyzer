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
      const payloadData = { commands, leftPaneWidth };
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
  }, [commands, leftPaneWidth, fileId, contentDoc, isDataLoaded]);

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
  }, [commands, leftPaneWidth, handleSave, isDataLoaded]);

  return (
    <div className="App dark-theme">
      <TopBar fileName={fileName} isReady={isReady} />

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
          <TerminalView sessionId={sessionId} setIsReady={setIsReady} />
        </div>
      </div>
    </div>
  );
}

export default App;
