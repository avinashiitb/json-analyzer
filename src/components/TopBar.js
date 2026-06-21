import React from 'react';

function TopBar({ breadcrumbs = [], fileName, theme, setTheme, onFormat, onMinify, onSortKeys, isDiffMode, setIsDiffMode, isInlineDiff, setIsInlineDiff }) {
  const isLight = theme === 'light-theme';

  const displaySegments = breadcrumbs.length > 0
    ? breadcrumbs
    : [{ label: fileName || 'Compare Tool', isFile: true }];
  
  const buttonStyle = {
    display: "flex",
    alignItems: "center",
    padding: "6px 12px",
    backgroundColor: isLight ? "#ffffff" : "var(--bg-secondary)",
    border: `1px solid ${isLight ? "#e5e7eb" : "var(--border-color)"}`,
    borderRadius: "6px",
    fontSize: "12px",
    color: isLight ? "#374151" : "var(--text-color)",
    cursor: "pointer",
    fontWeight: 500,
    gap: "6px",
  };

  const activeButtonStyle = {
    ...buttonStyle,
    backgroundColor: isLight ? "var(--accent-soft, #e0e7ff)" : "var(--accent-soft)",
    borderColor: isLight ? "var(--accent, #818cf8)" : "var(--accent)",
    color: isLight ? "var(--accent, #3730a3)" : "var(--accent)",
  };

  return (
    <header className="terminal-topbar">
      <div className="topbar-left">
        <nav className="breadcrumb-path" aria-label="file path">
          <i className="fa-solid fa-folder" style={{ marginRight: 6, fontSize: 11, opacity: 0.8 }}></i>
          {displaySegments.map((seg, idx) => (
            <React.Fragment key={idx}>
              {!seg.isFile && (
                <>
                  <span className="breadcrumb-segment breadcrumb-folder" title={seg.label}>
                    {seg.label}
                  </span>
                  <span className="breadcrumb-sep">›</span>
                </>
              )}
              {seg.isFile && (
                <span className="breadcrumb-segment breadcrumb-file" title={seg.label}>
                  {seg.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
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

      </div>
    </header>
  );
}

export default TopBar;
