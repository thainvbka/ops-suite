import React, {useState, useEffect, useCallback} from 'react';
import axios from 'axios';

const API_URL = "http://localhost:4000/api";

export default function Logs({ token }) {
  const [dsLogs, setDsLogs] = useState([]);
  const [dsLoading, setDsLoading] = useState(false);
  const [datasources, setDatasources] = useState([]);
  const [selectedDs, setSelectedDs] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchDatasources = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/datasources`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDatasources(res.data.datasources || []);
      if (res.data.datasources?.length) {
        setSelectedDs(res.data.datasources[0].id);
      }
    } catch (err) {
      console.error('Error fetching datasources:', err);
    }
  }, [token]);

  const fetchDsLogs = useCallback(async (id) => {
    setDsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/datasources/${id}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDsLogs(res.data.logs || []);
    } catch (err) {
      console.error('Error fetching datasource logs:', err);
    } finally {
      setDsLoading(false);
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

  const totalPages = Math.max(1, Math.ceil(dsLogs.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const visibleLogs = dsLogs.slice(start, start + pageSize);

  return (
    <div className="logs-page">
      <div className="page-header" style={{ marginTop: 24 }}>
        <h2>Datasource Logs</h2>
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
          <button className="btn" onClick={() => fetchDsLogs(selectedDs)}>Refresh</button>
        </div>
      </div>
      {dsLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading datasource logs...</p>
        </div>
      ) : (
        <>
          <div className="logs-list scrollable">
            {visibleLogs.length === 0 ? (
              <p>No datasource logs</p>
            ) : (
              visibleLogs.map((log, idx) => (
                <div key={idx} className={`log-item log-${log.level}`}>
                  <span className="log-time">{new Date(log.timestamp).toLocaleString()}</span>
                  <span className="log-level">[{log.level?.toUpperCase() || 'INFO'}]</span>
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
                Page {currentPage} / {totalPages} ({visibleLogs.length}/{dsLogs.length})
              </span>
              <button
                className="btn"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
            <button className="btn danger" onClick={async () => {
              try {
                await axios.delete(`${API_URL}/datasources/${selectedDs}/logs`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                setDsLogs([]);
                setPage(1);
              } catch (err) {
                alert(err.response?.data?.error || 'Failed to clear logs');
              }
            }}>
              Clear Logs
            </button>
          </div>
        </>
      )}
    </div>
  );
}