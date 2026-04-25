import React from 'react';
import './StatsPanel.css';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const StatsPanel = ({ metrics, title }) => {
  if (!metrics) return null;

  return (
    <div className="stats-panel">
      <div className="stats-title">{title}</div>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Size:</span>
          <span className="stat-value">{formatBytes(metrics.sizeBytes || 0)}</span>
        </div>
        {metrics.isValidJson ? (
          <>
            <div className="stat-item">
              <span className="stat-label">Keys:</span>
              <span className="stat-value">{metrics.keysCount || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Depth:</span>
              <span className="stat-value">{metrics.maxDepth || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Arrays:</span>
              <span className="stat-value">{metrics.arraysCount || 0}</span>
            </div>
          </>
        ) : (
          <div className="stat-item invalid-json">
            <span className="stat-label">Status:</span>
            <span className="stat-value">Plain Text / Invalid JSON</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsPanel;
