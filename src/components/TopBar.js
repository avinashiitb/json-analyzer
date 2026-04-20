import React from 'react';

function TopBar({ fileName, isReady }) {
  return (
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
  );
}

export default TopBar;
