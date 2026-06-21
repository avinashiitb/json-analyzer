import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import './App.css';
import TopBar from './components/TopBar';
import EditorPanel from './components/EditorPanel';
import DiffViewer from './components/DiffViewer';
import { beautify, minify } from './utils/jsonUtils';

function App() {
  const ObjectUrlId = () => Math.random().toString(36).substr(2, 9);
  
  const [fileName, setFileName] = useState('Compare Tool');
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const getThemeFromUrl = () => {
    try {
      const url = new URL(window.location.href);
      let t = url.searchParams.get("theme");
      if (!t && window.location.hash.includes("?")) {
        t = new URLSearchParams(window.location.hash.split("?")[1]).get("theme");
      }
      return t;
    } catch (e) {
      return null;
    }
  };

  const [theme, setTheme] = useState(() => {
    const urlTheme = getThemeFromUrl();
    if (urlTheme === "dark") return "dark-theme";
    if (urlTheme === "light") return "light-theme";
    const preloadTheme = window.pluginAPI?.context?.theme;
    if (preloadTheme === "dark") return "dark-theme";
    if (preloadTheme === "light") return "light-theme";
    return 'light-theme';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const urlTheme = getThemeFromUrl();
      if (urlTheme === "dark") {
        setTheme("dark-theme");
      } else if (urlTheme === "light") {
        setTheme("light-theme");
      } else {
        const preloadTheme = window.pluginAPI?.context?.theme;
        if (preloadTheme === "dark") {
          setTheme("dark-theme");
        } else if (preloadTheme === "light") {
          setTheme("light-theme");
        }
      }
    };

    const handleThemeChange = (e) => {
      const newTheme = e.detail?.theme || e.theme;
      if (newTheme === "dark") {
        setTheme("dark-theme");
      } else if (newTheme === "light") {
        setTheme("light-theme");
      }
    };

    const handleMessage = (e) => {
      if (e.data && e.data.type === "theme-changed") {
        const newTheme = e.data.theme;
        if (newTheme === "dark") {
          setTheme("dark-theme");
        } else if (newTheme === "light") {
          setTheme("light-theme");
        }
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("theme-changed", handleThemeChange);
    window.addEventListener("message", handleMessage);
    handleHashChange();
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("theme-changed", handleThemeChange);
      window.removeEventListener("message", handleMessage);
    };
  }, []);
  const [leftPaneWidth, setLeftPaneWidth] = useState(50);
  const isDragging = useRef(false);

  const isPreview = useMemo(() => {
    try {
      const url = new URL(window.location.href);
      let p = url.searchParams.get("preview");
      if (!p && window.location.hash.includes("?")) {
        const hashParams = new URLSearchParams(window.location.hash.split("?")[1]);
        p = hashParams.get("preview");
      }
      return p === "true";
    } catch (e) {
      return false;
    }
  }, []);

  // Listen for initial load and messages in preview mode
  useEffect(() => {
    if (!isPreview) return;

    const handleMessage = (e) => {
      if (!e.data) return;

      if (e.data.type === 'LOAD_PREVIEW') {
        const savedData = e.data.data;
        let calculatedHeight = 200;
        if (savedData && typeof savedData === 'object') {
          if (savedData.leftContent) setLeftContent(savedData.leftContent);
          if (savedData.rightContent) setRightContent(savedData.rightContent);
          if (savedData.leftPaneWidth) setLeftPaneWidth(savedData.leftPaneWidth);
          if (savedData.theme) setTheme(savedData.theme);
          if (savedData.isDiffMode !== undefined) setIsDiffMode(savedData.isDiffMode);

          // Calculate height of Monaco editors based on lines count
          const left = savedData.leftContent || '';
          const right = savedData.rightContent || '';
          const isDiff = savedData.isDiffMode || false;

          const leftLines = left.split('\n').length;
          const rightLines = right.split('\n').length;
          // In diff mode, add a spacer multiplier to account for layout spacer alignments
          const linesCount = isDiff 
            ? Math.max(leftLines, rightLines) * 1.3 
            : Math.max(leftLines, rightLines);

          const textHeight = linesCount * 19;
          // Min height 200px, max height 800px
          calculatedHeight = Math.min(Math.max(textHeight + 110, 200), 800);
        }
        setIsDataLoaded(true);
        // Report calculated height of preview to parent frame
        window.parent.postMessage({ type: 'RESIZE_PREVIEW', height: calculatedHeight }, '*');
      }
    };

    window.addEventListener('message', handleMessage);
    window.parent.postMessage({ type: 'PREVIEW_READY' }, '*');

    return () => window.removeEventListener('message', handleMessage);
  }, [isPreview]);

  // Report height of preview to parent frame
  useEffect(() => {
    if (!isPreview) return;
    window.parent.postMessage({ type: 'RESIZE_PREVIEW', height: 200 }, '*');
  }, [isPreview]);

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
      if (isPreview) return; // Skip standard loading in preview mode
      if (window.pluginAPI && fileId) {
        try {
          const fileInfo = await window.pluginAPI.getFileDetailsById(fileId);
          if (fileInfo && fileInfo.title) setFileName(fileInfo.title);

          // Fetch breadcrumb path
          if (window.pluginAPI.getNestedPath) {
            window.pluginAPI.getNestedPath({ fileId }).then((result) => {
              if (result) {
                const segs = [
                  ...result.folders.map((f) => ({ label: f.name, isFile: false })),
                  ...(result.file ? [{ label: result.file.title, isFile: true }] : []),
                ];
                setBreadcrumbs(segs);
              }
            }).catch(() => {});
          }

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
    if (isPreview) return; // Skip saving in preview mode
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
    if (isPreview) return;
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
    if (isPreview) return; // Skip auto-save in preview mode
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
    <div className={`App ${theme} ${isPreview ? 'preview-mode' : ''}`}>
      {!isPreview && (
        <TopBar 
          breadcrumbs={breadcrumbs}
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
      )}

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
              readOnly={isPreview}
            />
          </div>
          
          {!isPreview && <div className="pane-resizer" onMouseDown={handleMouseDown}></div>}
          {isPreview && <div style={{ width: '1px', backgroundColor: theme === 'dark-theme' ? '#404040' : '#e5e7eb' }}></div>}
          
          <div className="right-pane" style={{ width: `${100 - leftPaneWidth}%`, padding: 0, flex: 'none' }}>
            <EditorPanel 
              title="Modified JSON" 
              theme={theme} 
              value={rightContent} 
              onChange={(val) => setRightContent(val || '')}
              metrics={rightMetrics}
              readOnly={isPreview}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
