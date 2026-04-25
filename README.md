# JSON Analyzer 🔍

An open-source, highly performant developer tool and plugin for comparing, beautifying, and analyzing JSON and text payloads side-by-side.

Built with **React**, **Monaco Editor**, and **Web Workers**, this tool allows you to easily inspect data size, view structure complexity, and compute visual diffs for massive JSON payloads (logs, APIs, DB dumps) without freezing your browser.

## 🔥 Core Features

* **🆚 Diff Engine**: Powerful side-by-side and inline visual diffing (highlights added, removed, and modified lines).
* **🎨 Beautify & Minify**: Instantly format, minify, or safely sort JSON keys alphabetically.
* **📊 Metrics Dashboard**: Background Web Workers compute and display real-time statistics without blocking the UI:
  * Raw size in Bytes/KB/MB
  * Total key count
  * Maximum object depth
  * Array count
* **🌙 Dynamic Theming**: Toggle between sleek dark and light modes.
* **⚡ Blazing Fast**: Powered by Microsoft's Monaco Editor (the engine behind VS Code) and multi-threaded processing.

## 🧠 Use Cases

* **API Debugging**: Compare API responses before and after making changes.
* **Configuration Management**: Diff `.env` files or config JSON files.
* **Log Analysis**: Compare massive server log structures.
* **Data Validation**: Quickly spot missing or extra fields in deep schemas.

## 🚀 Getting Started

This project was bootstrapped with Create React App.

### Prerequisites

* Node.js (v16+)
* npm or yarn

### Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/your-username/json-analyzer.git
cd json-analyzer
npm install
```

### Development

Run the app in development mode:

```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### Build & Release

To build the app for production into the `build` folder:

```bash
npm run build
```

To package the tool as a plugin release (creates a zip file in `release/`):

```bash
npm run release
```

## 🤝 Contributing

JSON Analyzer is open-source and community contributions are welcome! 

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
