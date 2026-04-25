import React from 'react';

function TopBar({ fileName, theme, setTheme, onFormat, onMinify, onSortKeys, isDiffMode, setIsDiffMode, isInlineDiff, setIsInlineDiff }) {
  const isLight = theme === 'light-theme';
  
  const buttonStyle = {
    display: "flex",
    alignItems: "center",
    padding: "6px 12px",
    backgroundColor: isLight ? "#ffffff" : "#2d2d2d",
    border: `1px solid ${isLight ? "#e5e7eb" : "#404040"}`,
    borderRadius: "6px",
    fontSize: "12px",
    color: isLight ? "#374151" : "#e5e7eb",
    cursor: "pointer",
    fontWeight: 500,
    gap: "6px",
  };

  const activeButtonStyle = {
    ...buttonStyle,
    backgroundColor: isLight ? "#e0e7ff" : "#3730a3",
    borderColor: isLight ? "#818cf8" : "#4f46e5",
    color: isLight ? "#3730a3" : "#e0e7ff",
  };

  return (
    <header className="terminal-topbar">
      <div className="topbar-left">
        <div className="editor-label">
          <i className="ri-braces-line"></i>
          <span>JSON Analyzer</span>
        </div>
        <div className="vertical-divider"></div>
        <div className="file-info">
          <i className="ri-file-code-line file-type-icon"></i>
          <span className="file-name">{fileName || 'Compare Tool'}</span>
        </div>
      </div>
      
      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        
        {!isDiffMode && (
          <>
            <button style={buttonStyle} onClick={onFormat} title="Beautify JSON (Format)">
              <i className="ri-magic-line"></i> Beautify
            </button>
            <button style={buttonStyle} onClick={onMinify} title="Minify JSON">
              <i className="ri-compress-line"></i> Minify
            </button>
            <button style={buttonStyle} onClick={onSortKeys} title="Sort Keys Alphabetically">
              <i className="ri-sort-asc"></i> Sort Keys
            </button>
          </>
        )}

        <div className="vertical-divider"></div>

        <button 
          style={isDiffMode ? activeButtonStyle : buttonStyle} 
          onClick={() => setIsDiffMode(!isDiffMode)}
        >
          <i className="ri-split-cells-horizontal"></i> Diff Mode
        </button>

        {isDiffMode && (
          <button 
            style={isInlineDiff ? activeButtonStyle : buttonStyle} 
            onClick={() => setIsInlineDiff(!isInlineDiff)}
          >
            <i className="ri-layout-row-line"></i> Inline View
          </button>
        )}

        <div className="vertical-divider"></div>

        <button 
          onClick={() => setTheme(isLight ? 'dark-theme' : 'light-theme')}
          style={{
            background: 'transparent',
            border: 'none',
            color: isLight ? '#374151' : '#e5e7eb',
            cursor: 'pointer',
            padding: '6px',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isLight ? "Switch to Dark Theme" : "Switch to Light Theme"}
        >
          <i className={isLight ? "ri-moon-line" : "ri-sun-line"}></i>
        </button>
      </div>
    </header>
  );
}

export default TopBar;
