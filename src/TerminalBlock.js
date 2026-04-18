import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

export default class TerminalBlock {
  constructor({ data, api, config, readOnly, block }) {
    this.api = api;
    this.config = config;
    this.readOnly = readOnly;
    this.blockAPI = block;
    this.id = data?.id || `term-${Math.random().toString(36).substr(2, 9)}`;
    
    this.wrapper = undefined;
    this.term = undefined;
    this.fitAddon = undefined;
    this.unsubscribeData = undefined;
    
    // API access. Change depending on whether you inject via terminalAPI or pluginAPI.terminal
    this.proxy = window.terminalAPI || window.pluginAPI?.terminal;
  }

  static get toolbox() {
    return {
      title: 'Terminal',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 3h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm1 2v14h16V5H4zm4.293 4.293 1.414-1.414L14.414 12l-4.707 4.707-1.414-1.414L11.586 12 8.293 8.293zM14 15h4v2h-4v-2z"/></svg>'
    };
  }

  render() {
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('cdx-terminal-block');
    this.wrapper.style.width = '100%';
    this.wrapper.style.height = '400px';
    this.wrapper.style.backgroundColor = '#1e1e1e';
    this.wrapper.style.padding = '8px';
    this.wrapper.style.borderRadius = '8px';
    this.wrapper.style.overflow = 'hidden';

    // Wait until the container is actually appended to the DOM to initialize xterm
    setTimeout(() => {
      this._initTerminal();
    }, 100);

    return this.wrapper;
  }

  _initTerminal() {
    if (!this.proxy) {
      console.error("Terminal API (terminalAPI or pluginAPI.terminal) is not available.");
      this.wrapper.innerHTML = `<div style="color:red;font-family:monospace;padding:10px">Error: Terminal IPC Bridge missing.</div>`;
      return;
    }

    this.term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff'
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14
    });

    this.fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    this.term.loadAddon(this.fitAddon);
    this.term.loadAddon(webLinksAddon);

    this.term.open(this.wrapper);
    this.fitAddon.fit();

    // Create the terminal in the main process
    this.proxy.create(this.id);

    // Setup bidirectional streaming
    this.unsubscribeData = this.proxy.onData(this.id, (data) => {
      this.term.write(data);
    });

    this.term.onData((data) => {
      this.proxy.input(this.id, data);
    });

    // Handle Resize
    this.term.onResize((size) => {
      this.proxy.resize(this.id, size.cols, size.rows);
    });

    // Debounced automatic window resize handling
    this.resizeObserver = new ResizeObserver(() => {
      if (this.fitAddon) {
        this.fitAddon.fit();
      }
    });
    this.resizeObserver.observe(this.wrapper);
  }

  save(blockContent) {
    // A terminal block usually just saves its identity/state config, not the output 
    return {
      id: this.id
    };
  }

  destroy() {
    if (this.unsubscribeData) this.unsubscribeData();
    if (this.resizeObserver) this.resizeObserver.disconnect();
    
    // Dispose PTY backend
    if (this.proxy && this.id) {
      this.proxy.dispose(this.id);
    }

    // Dispose frontend
    if (this.term) {
      this.term.dispose();
    }
  }
}
