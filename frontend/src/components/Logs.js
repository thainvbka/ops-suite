import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_URL } from "../api";
import { Droplet, Globe, Info, XCircle, BarChart3 } from "lucide-react";

export default function Logs({ token }) {
  const [activeTab, setActiveTab] = useState("datasource");
  const [dsLogs, setDsLogs] = useState([]);
  const [juiceShopLogs, setJuiceShopLogs] = useState([]);
  const [accessLogs, setAccessLogs] = useState([]);
  const [dsLoading, setDsLoading] = useState(false);
  const [jsLoading, setJsLoading] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);
  const [datasources, setDatasources] = useState([]);
  const [selectedDs, setSelectedDs] = useState("");
  const [logFilter, setLogFilter] = useState("all"); // Filter for Juice Shop logs
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchDatasources = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/datasources`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDatasources(res.data.datasources || []);
      if (res.data.datasources?.length) {
        setSelectedDs(res.data.datasources[0].id);
      }
    } catch (err) {
      console.error("Error fetching datasources:", err);
    }
  }, [token]);

  const fetchDsLogs = useCallback(
    async (id) => {
      setDsLoading(true);
      try {
        const res = await axios.get(`${API_URL}/datasources/${id}/logs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDsLogs(res.data.logs || []);
      } catch (err) {
        console.error("Error fetching datasource logs:", err);
      } finally {
        setDsLoading(false);
      }
    },
    [token]
  );

  const fetchJuiceShopLogs = useCallback(async () => {
    setJsLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/logs/juice-shop?lines=200&filter=${logFilter}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setJuiceShopLogs(res.data.logs || []);
    } catch (err) {
      console.error("Error fetching Juice Shop logs:", err);
    } finally {
      setJsLoading(false);
    }
  }, [token, logFilter]);

  const fetchAccessLogs = useCallback(async () => {
    setAccessLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/logs/juice-shop-access?lines=200`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAccessLogs(res.data.logs || []);
    } catch (err) {
      console.error("Error fetching access logs:", err);
    } finally {
      setAccessLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDatasources();
  }, [fetchDatasources]);

  useEffect(() => {
    if (selectedDs) {
      fetchDsLogs(selectedDs);
      setPage(1);
    }
  }, [selectedDs, fetchDsLogs]);

  useEffect(() => {
    if (activeTab === "juiceshop") {
      fetchJuiceShopLogs();
    }
  }, [activeTab, fetchJuiceShopLogs]);

  useEffect(() => {
    if (activeTab === "access") {
      fetchAccessLogs();
    }
  }, [activeTab, fetchAccessLogs]);

  const currentLogs =
    activeTab === "juiceshop"
      ? juiceShopLogs
      : activeTab === "access"
      ? accessLogs
      : dsLogs;
  const isLoading =
    activeTab === "juiceshop"
      ? jsLoading
      : activeTab === "access"
      ? accessLoading
      : dsLoading;

  const totalPages = Math.max(1, Math.ceil(currentLogs.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const visibleLogs = currentLogs.slice(start, start + pageSize);

  return (
    <div className="logs-page">
      <div className="page-header" style={{ marginTop: 24 }}>
        <h2>System Logs</h2>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === "datasource" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("datasource");
            setPage(1);
          }}
        >
          Datasource Logs
        </button>
        <button
          className={`tab-btn ${activeTab === "juiceshop" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("juiceshop");
            setPage(1);
          }}
        >
          <Droplet size={16} style={{ marginRight: "4px" }} /> Juice Shop Logs
        </button>
        <button
          className={`tab-btn ${activeTab === "access" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("access");
            setPage(1);
          }}
        >
          <Globe size={16} style={{ marginRight: "4px" }} /> HTTP Access Logs
        </button>
      </div>

      {/* Datasource Logs Tab */}
      {activeTab === "datasource" && (
        <div className="logs-filter-row">
          <select
            className="editor-select"
            value={selectedDs}
            onChange={(e) => setSelectedDs(e.target.value)}
          >
            {datasources.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name || ds.id}
              </option>
            ))}
          </select>
          <button className="btn" onClick={() => fetchDsLogs(selectedDs)}>
            Refresh
          </button>
        </div>
      )}

      {/* Juice Shop Logs Tab */}
      {activeTab === "juiceshop" && (
        <div className="logs-filter-row">
          <select
            className="editor-select"
            value={logFilter}
            onChange={(e) => {
              setLogFilter(e.target.value);
              setPage(1);
            }}
            style={{ marginRight: "10px" }}
          >
            <option value="all">All Logs</option>
            <option value="access">Access Logs (HTTP Requests)</option>
            <option value="info">Info Only</option>
            <option value="error">Errors Only</option>
          </select>
          <button className="btn" onClick={fetchJuiceShopLogs}>
            Refresh
          </button>
        </div>
      )}

      {/* Access Logs Tab */}
      {activeTab === "access" && (
        <div className="logs-filter-row">
          <span
            style={{
              color: "#d8d9da",
              marginRight: "10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <BarChart3 size={16} /> HTTP Requests to Juice Shop (Port 3001)
          </span>
          <button className="btn" onClick={fetchAccessLogs}>
            Refresh
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading logs...</p>
        </div>
      ) : (
        <>
          <div className="logs-list scrollable">
            {visibleLogs.length === 0 ? (
              <p>No logs available</p>
            ) : (
              visibleLogs.map((log, idx) => (
                <div key={idx} className={`log-item log-${log.level}`}>
                  <span className="log-time">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  <span className="log-level">
                    [{log.level?.toUpperCase() || "INFO"}]
                  </span>
                  <span className="log-msg">{log.message}</span>
                </div>
              ))
            )}
          </div>
          <div className="logs-actions">
            <div className="pagination">
              <button
                className="btn"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span className="logs-count">
                Page {currentPage} / {totalPages} ({visibleLogs.length}/
                {currentLogs.length})
              </span>
              <button
                className="btn"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
            {activeTab === "datasource" && (
              <button
                className="btn danger"
                onClick={async () => {
                  try {
                    await axios.delete(
                      `${API_URL}/datasources/${selectedDs}/logs`,
                      {
                        headers: { Authorization: `Bearer ${token}` },
                      }
                    );
                    setDsLogs([]);
                    setPage(1);
                  } catch (err) {
                    alert(err.response?.data?.error || "Failed to clear logs");
                  }
                }}
              >
                Clear Logs
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
