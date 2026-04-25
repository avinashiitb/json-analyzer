import React from 'react';
import { DiffEditor } from '@monaco-editor/react';
import './DiffViewer.css';

const DiffViewer = ({ original, modified, theme, language = 'json', inline = false }) => {
  const monacoTheme = theme === 'dark-theme' ? 'vs-dark' : 'light';

  return (
    <div className="diff-viewer-container">
      <div className="diff-viewer-header">
        <span className="diff-title">Difference Viewer {inline ? '(Inline)' : '(Side-by-Side)'}</span>
      </div>
      <div className="diff-wrapper">
        <DiffEditor
          height="100%"
          language={language}
          theme={monacoTheme}
          original={original}
          modified={modified}
          options={{
            renderSideBySide: !inline,
            minimap: { enabled: false },
            wordWrap: 'on',
            readOnly: true,
            automaticLayout: true,
            ignoreTrimWhitespace: false,
          }}
        />
      </div>
    </div>
  );
};

export default DiffViewer;
