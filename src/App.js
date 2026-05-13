import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
import TopBar from './components/TopBar';
import EditorPanel from './components/EditorPanel';
import DiffViewer from './components/DiffViewer';
import { beautify, minify } from './utils/jsonUtils';

function App() {
  const ObjectUrlId = () => Math.random().toString(36).substr(2, 9);
  
  const [fileName, setFileName] = useState('Compare Tool');
  const [theme, setTheme] = useState('light-theme');
  const [leftPaneWidth, setLeftPaneWidth] = useState(50);
  const isDragging = useRef(false);

  // Editor states
  const [leftContent, setLeftContent] = useState('{\n  "example": "paste JSON here"\n}');
  const [rightContent, setRightContent] = useState('{\n  "example": "paste JSON here"\n}');
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [isInlineDiff, setIsInlineDiff] = useState(false);

  // Metrics state
  const [leftMetrics, setLeftMetrics] = useState(null);
  const [rightMetrics, setRightMetrics] = useState(null);

  // Persistence States
  const [contentDoc, setContentDoc] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const workerRef = useRef(null);

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
    return id || `json-${ObjectUrlId()}`;
  };

  const [fileId] = useState(() => getFileId());

  // Setup Web Worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const { id, metrics, error } = e.data;
      if (error) {
        console.error('Worker error:', error);
        return;
      }
      if (id === 'left') setLeftMetrics(metrics);
      if (id === 'right') setRightMetrics(metrics);
    };

    return () => {
      workerRef.current.terminate();
    };
  }, []);

  // Recalculate metrics when content changes
  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ id: 'left', text: leftContent, type: 'CALCULATE_METRICS' });
    }
  }, [leftContent]);

  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ id: 'right', text: rightContent, type: 'CALCULATE_METRICS' });
    }
  }, [rightContent]);

  // Resizing logic
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

  // Data Loading
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
              if (savedData.leftContent) setLeftContent(savedData.leftContent);
              if (savedData.rightContent) setRightContent(savedData.rightContent);
              if (savedData.leftPaneWidth) setLeftPaneWidth(savedData.leftPaneWidth);
              if (savedData.theme) setTheme(savedData.theme);
              if (savedData.isDiffMode !== undefined) setIsDiffMode(savedData.isDiffMode);
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
    
    setTimeout(loadInitialData, 100);
  }, [fileId]);

  // Auto Save
  const handleSave = useCallback(async () => {
    if (window.pluginAPI && window.pluginAPI.updateDocument && fileId && isDataLoaded) {
      const payloadData = { leftContent, rightContent, leftPaneWidth, theme, isDiffMode };
      const updatedContents = {
        version: "1.0.0",
        time: Date.now(),
        blocks: [{ type: "json-analyzer", data: payloadData }],
        parent_file: fileId,
        _id: contentDoc?._id,
      };

      try {
        await window.pluginAPI.updateDocument(fileId, [updatedContents]);
      } catch (err) {
        console.error('Save error:', err);
      }
    }
  }, [leftContent, rightContent, leftPaneWidth, theme, isDiffMode, fileId, contentDoc, isDataLoaded]);

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
  }, [leftContent, rightContent, leftPaneWidth, theme, isDiffMode, handleSave, isDataLoaded]);

  // Actions
  const handleFormat = () => {
    setLeftContent(beautify(leftContent, false));
    setRightContent(beautify(rightContent, false));
  };

  const handleMinify = () => {
    setLeftContent(minify(leftContent));
    setRightContent(minify(rightContent));
  };

  const handleSortKeys = () => {
    setLeftContent(beautify(leftContent, true));
    setRightContent(beautify(rightContent, true));
  };

  return (
    <div className={`App ${theme}`}>
      <TopBar 
        fileName={fileName} 
        theme={theme} 
        setTheme={setTheme} 
        onFormat={handleFormat}
        onMinify={handleMinify}
        onSortKeys={handleSortKeys}
        isDiffMode={isDiffMode}
        setIsDiffMode={setIsDiffMode}
        isInlineDiff={isInlineDiff}
        setIsInlineDiff={setIsInlineDiff}
      />

      <div className="workspace">
        <div className="diff-mode-container" style={{ display: isDiffMode ? 'flex' : 'none' }}>
          <DiffViewer 
            theme={theme} 
            original={leftContent} 
            modified={rightContent} 
            inline={isInlineDiff}
          />
        </div>

        <div style={{ display: isDiffMode ? 'none' : 'flex', width: '100%', height: '100%' }}>
          <div className="left-pane" style={{ width: `${leftPaneWidth}%`, padding: 0 }}>
            <EditorPanel 
              title="Original JSON" 
              theme={theme} 
              value={leftContent} 
              onChange={(val) => setLeftContent(val || '')}
              metrics={leftMetrics}
            />
          </div>
          
          <div className="pane-resizer" onMouseDown={handleMouseDown}></div>
          
          <div className="right-pane" style={{ width: `${100 - leftPaneWidth}%`, padding: 0, flex: 'none' }}>
            <EditorPanel 
              title="Modified JSON" 
              theme={theme} 
              value={rightContent} 
              onChange={(val) => setRightContent(val || '')}
              metrics={rightMetrics}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
