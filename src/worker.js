/* eslint-disable no-restricted-globals */

// worker.js for JSON Analyzer Metrics
self.onmessage = (e) => {
  const { id, text, type } = e.data;

  if (type === 'CALCULATE_METRICS') {
    try {
      const sizeBytes = new Blob([text]).size;
      let obj = null;
      let isValidJson = false;

      try {
        obj = JSON.parse(text);
        isValidJson = true;
      } catch (err) {
        // Not valid JSON, just return size
      }

      let keysCount = 0;
      let maxDepth = 0;
      let arraysCount = 0;

      if (isValidJson && obj !== null && typeof obj === 'object') {
        const analyze = (currentObj, depth) => {
          maxDepth = Math.max(maxDepth, depth);

          if (Array.isArray(currentObj)) {
            arraysCount++;
            for (let i = 0; i < currentObj.length; i++) {
              if (currentObj[i] !== null && typeof currentObj[i] === 'object') {
                analyze(currentObj[i], depth + 1);
              }
            }
          } else {
            const keys = Object.keys(currentObj);
            keysCount += keys.length;
            for (let i = 0; i < keys.length; i++) {
              const val = currentObj[keys[i]];
              if (val !== null && typeof val === 'object') {
                analyze(val, depth + 1);
              }
            }
          }
        };

        analyze(obj, 1);
        if (Array.isArray(obj) && maxDepth === 1 && obj.length === 0) {
            maxDepth = 0;
        } else if (!Array.isArray(obj) && maxDepth === 1 && Object.keys(obj).length === 0) {
            maxDepth = 0;
        }
      }

      self.postMessage({
        id,
        metrics: {
          sizeBytes,
          isValidJson,
          keysCount,
          maxDepth,
          arraysCount
        }
      });
    } catch (err) {
      self.postMessage({
        id,
        error: err.message
      });
    }
  }
};
