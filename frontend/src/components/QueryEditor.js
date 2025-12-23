import React, { useState } from "react";
import axios from "axios";
import { API_URL } from "../api";
import {
  Activity,
  Database,
  Zap,
  HardDrive,
  Disc,
  Network,
  TrendingUp,
  Clock,
  AlertTriangle,
  X,
  Lightbulb,
} from "lucide-react";

const DATASOURCES = [
  { id: "prometheus", name: "Prometheus", type: "prometheus", icon: Activity },
  { id: "postgres", name: "PostgreSQL", type: "postgres", icon: Database },
];

const METRICS = [
  { value: "cpu_usage", label: "CPU Usage", icon: Zap },
  { value: "memory_usage", label: "Memory Usage", icon: HardDrive },
  { value: "disk_io", label: "Disk I/O", icon: Disc },
  { value: "network_traffic", label: "Network Traffic", icon: Network },
  { value: "request_count", label: "Request Count", icon: TrendingUp },
  { value: "response_time", label: "Response Time", icon: Clock },
  { value: "error_rate", label: "Error Rate", icon: AlertTriangle },
];

const INTERVALS = [
  { value: "10s", label: "10 seconds", desc: "High frequency" },
  { value: "30s", label: "30 seconds", desc: "Balanced" },
  { value: "1m", label: "1 minute", desc: "Standard" },
  { value: "5m", label: "5 minutes", desc: "Low frequency" },
];

function QueryEditor({ panel, onClose, onSave, token }) {
  const [datasource, setDatasource] = useState(
    panel.datasource || "prometheus"
  );
  const [metric, setMetric] = useState(panel.metric || "cpu_usage");
  const [query, setQuery] = useState(panel.query || "");
  const [interval, setInterval] = useState(panel.interval || "1m");
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("configuration");

  const runQuery = async () => {
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/query`,
        {
          datasource,
          query: query || `SELECT ${metric} FROM metrics`,
          metric,
        },
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        }
      );
      setPreviewData(res.data.result);
      setActiveTab("preview");
    } catch (err) {
      console.error("Query error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    onSave({ datasource, metric, query, interval });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="query-editor-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-section">
            <h3>Panel Configuration</h3>
            <p className="modal-subtitle">{panel.title}</p>
          </div>
          <button className="close-btn" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`modal-tab ${
              activeTab === "configuration" ? "active" : ""
            }`}
            onClick={() => setActiveTab("configuration")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M19.4 12.97a7.7 7.7 0 0 0 0-1.94l2-1.15-2-3.46-2.3.78a7.6 7.6 0 0 0-1.68-.97L14.9 2h-3.8l-.52 2.23c-.59.23-1.16.55-1.68.97l-2.3-.78-2 3.46 2 1.15a7.7 7.7 0 0 0 0 1.94l-2 1.15 2 3.46 2.3-.78c.52.42 1.09.74 1.68.97L11.1 22h3.8l.52-2.23c.59-.23 1.16-.55 1.68-.97l2.3.78 2-3.46-2-1.15Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
            Configuration
          </button>
          <button
            className={`modal-tab ${activeTab === "preview" ? "active" : ""}`}
            onClick={() => setActiveTab("preview")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle
                cx="12"
                cy="12"
                r="3"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            Preview
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {activeTab === "configuration" ? (
            <>
              {/* Data Source Section */}
              <div className="editor-section">
                <h4 className="section-title">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points="3.27 6.96 12 12.01 20.73 6.96"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <line
                      x1="12"
                      y1="22.08"
                      x2="12"
                      y2="12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Data Source
                </h4>
                <div className="datasource-grid">
                  {DATASOURCES.map((ds) => {
                    const DatasourceIcon = ds.icon;
                    return (
                      <div
                        key={ds.id}
                        className={`datasource-card ${
                          datasource === ds.id ? "selected" : ""
                        }`}
                        onClick={() => setDatasource(ds.id)}
                      >
                        <span className="datasource-icon">
                          <DatasourceIcon size={20} />
                        </span>
                        <span className="datasource-name">{ds.name}</span>
                        {datasource === ds.id && (
                          <svg
                            className="check-icon"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M20 6 9 17l-5-5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Metric Section */}
              <div className="editor-section">
                <h4 className="section-title">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <line
                      x1="12"
                      y1="20"
                      x2="12"
                      y2="10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="18"
                      y1="20"
                      x2="18"
                      y2="4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="6"
                      y1="20"
                      x2="6"
                      y2="16"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Metric
                </h4>
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  className="editor-select modern-select"
                >
                  {METRICS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Query Section */}
              <div className="editor-section">
                <h4 className="section-title">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <polyline
                      points="16 18 22 12 16 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points="8 6 2 12 8 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Custom Query
                  <span className="optional-badge">Optional</span>
                </h4>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    datasource === "postgres"
                      ? `Example SQL:\nSELECT\n  timestamp AS "time",\n  value\nFROM metrics\nWHERE metric_name = '${metric}'\n  AND timestamp BETWEEN $__from AND $__to\nORDER BY timestamp`
                      : `Example PromQL:\n${metric}`
                  }
                  className="query-textarea"
                  rows={6}
                />
                <p
                  className="help-text"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Lightbulb size={16} /> Leave empty to use the default query
                  for the selected metric
                </p>
              </div>

              {/* Interval Section */}
              <div className="editor-section">
                <h4 className="section-title">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <polyline
                      points="12 6 12 12 16 14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Refresh Interval
                </h4>
                <div className="interval-grid">
                  {INTERVALS.map((int) => (
                    <div
                      key={int.value}
                      className={`interval-card ${
                        interval === int.value ? "selected" : ""
                      }`}
                      onClick={() => setInterval(int.value)}
                    >
                      <div className="interval-label">{int.label}</div>
                      <div className="interval-desc">{int.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Query Button */}
              <div className="editor-actions">
                <button
                  className="btn test-query-btn"
                  onClick={runQuery}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner-small"></div>
                      Running...
                    </>
                  ) : (
                    <>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <polygon
                          points="5 3 19 12 5 21 5 3"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="currentColor"
                        />
                      </svg>
                      Test Query
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="preview-section">
              {previewData ? (
                <>
                  <div className="preview-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <polyline
                        points="22 12 18 12 15 21 9 3 6 12 2 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <h4>Query Results</h4>
                  </div>
                  <div className="query-results">
                    <pre>{JSON.stringify(previewData, null, 2)}</pre>
                  </div>
                </>
              ) : (
                <div className="empty-preview">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  <p>No preview data</p>
                  <span>Run a test query to see results here</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="17 21 17 13 7 13 7 21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="7 3 7 8 15 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default QueryEditor;
