import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_URL } from "../api";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Package,
} from "lucide-react";

export default function ContainerOverview({ token }) {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchContainers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/containers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContainers(res.data.containers || []);
    } catch (err) {
      console.error("Error fetching containers:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchContainers();
  }, [fetchContainers]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchContainers, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchContainers]);

  const getHealthColor = (health) => {
    switch (health) {
      case "healthy":
      case "running":
        return "#10b981"; // green
      case "unhealthy":
      case "stopped":
        return "#ef4444"; // red
      case "starting":
      case "restarting":
        return "#f59e0b"; // yellow
      default:
        return "#6b7280"; // gray
    }
  };

  const getHealthIcon = (health) => {
    const iconProps = { size: 24 };
    switch (health) {
      case "healthy":
      case "running":
        return <CheckCircle {...iconProps} />;
      case "unhealthy":
      case "stopped":
        return <XCircle {...iconProps} />;
      case "starting":
      case "restarting":
        return <AlertCircle {...iconProps} />;
      default:
        return <HelpCircle {...iconProps} />;
    }
  };

  const getMetricColor = (value) => {
    const num = parseFloat(value);
    if (num >= 90) return "#ef4444"; // red
    if (num >= 70) return "#f59e0b"; // yellow
    return "#10b981"; // green
  };

  return (
    <div className="containers-page">
      <div className="page-header" style={{ marginTop: 24 }}>
        <h2>Container Overview</h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              color: "#d8d9da",
            }}
          >
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (10s)
          </label>
          <button className="btn" onClick={fetchContainers}>
            <RefreshCw size={16} style={{ marginRight: "4px" }} /> Refresh Now
          </button>
        </div>
      </div>

      {loading && containers.length === 0 ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading containers...</p>
        </div>
      ) : (
        <div
          className="containers-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          {containers.map((container) => (
            <div
              key={container.id}
              className="container-card"
              style={{
                background: "#1e1e21",
                border: `2px solid ${getHealthColor(container.health)}`,
                borderRadius: "8px",
                padding: "20px",
                position: "relative",
              }}
            >
              {/* Status indicator */}
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  fontSize: "24px",
                }}
              >
                {getHealthIcon(container.health)}
              </div>

              {/* Container name */}
              <h3
                style={{
                  margin: "0 0 10px 0",
                  color: "#fff",
                  fontSize: "18px",
                  fontWeight: 600,
                }}
              >
                {container.name}
              </h3>

              {/* Image */}
              <div
                style={{
                  fontSize: "12px",
                  color: "#9ca3af",
                  marginBottom: "10px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Package size={14} /> {container.image}
              </div>

              {/* Status */}
              <div
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: 500,
                  background: `${getHealthColor(container.health)}22`,
                  color: getHealthColor(container.health),
                  marginBottom: "15px",
                }}
              >
                {container.health.toUpperCase()}
              </div>

              {/* Metrics */}
              {container.state === "running" && (
                <div
                  style={{
                    marginTop: "15px",
                    paddingTop: "15px",
                    borderTop: "1px solid #2c2c2f",
                  }}
                >
                  {container.cpu && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                        fontSize: "14px",
                      }}
                    >
                      <span style={{ color: "#9ca3af" }}>CPU:</span>
                      <span
                        style={{
                          color: getMetricColor(container.cpu),
                          fontWeight: 600,
                        }}
                      >
                        {container.cpu}%
                      </span>
                    </div>
                  )}
                  {container.memUsage && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                        fontSize: "14px",
                      }}
                    >
                      <span style={{ color: "#9ca3af" }}>Memory:</span>
                      <span
                        style={{
                          color: getMetricColor(container.memPerc),
                          fontWeight: 600,
                        }}
                      >
                        {container.memUsage} ({container.memPerc}%)
                      </span>
                    </div>
                  )}
                  {container.uptime && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "14px",
                      }}
                    >
                      <span style={{ color: "#9ca3af" }}>Uptime:</span>
                      <span style={{ color: "#fff", fontWeight: 500 }}>
                        {container.uptime}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Container ID */}
              <div
                style={{
                  marginTop: "15px",
                  fontSize: "11px",
                  color: "#6b7280",
                  fontFamily: "monospace",
                }}
              >
                ID: {container.id}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && containers.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
          No containers found
        </div>
      )}
    </div>
  );
}
