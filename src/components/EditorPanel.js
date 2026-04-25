import React from 'react';
import Editor from '@monaco-editor/react';
import StatsPanel from './StatsPanel';
import './EditorPanel.css';

const EditorPanel = ({ title, value, onChange, theme, language = 'json', metrics }) => {
  const monacoTheme = theme === 'dark-theme' ? 'vs-dark' : 'light';

  return (
    <div className="editor-panel-container">
      <div className="editor-panel-header">
        <span className="editor-title">{title}</span>
      </div>
      <div className="editor-wrapper">
        <Editor
          height="100%"
          language={language}
          theme={monacoTheme}
          value={value}
          onChange={onChange}
          options={{
            minimap: { enabled: false },
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            formatOnPaste: true,
            automaticLayout: true,
            tabSize: 2,
          }}
        />
      </div>
      <StatsPanel title={title} metrics={metrics} />
    </div>
  );
};

export default EditorPanel;
