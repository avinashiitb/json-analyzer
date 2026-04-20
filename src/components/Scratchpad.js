import React from 'react';

function Scratchpad({ commands, setCommands, sessionId, leftPaneWidth, ObjectUrlId }) {
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

  return (
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
  );
}

export default Scratchpad;
