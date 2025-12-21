import React, { useEffect, useState, useCallback } from "react";
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import "./App.css";
import Login from './components/Login';
import TimeRangePicker from './components/TimeRangePicker';
import Panel from './components/Panel';
import QueryEditor from './components/QueryEditor';
import Alerts from './components/Alerts';
import Logs from './components/Logs';
import AddPanelModal from './components/AddPanelModal';
import axios from "axios";

const API_URL = "http://localhost:4000/api";

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const [dashboards, setDashboards] = useState([]);
  const [currentDashboard, setCurrentDashboard] = useState(null);
  const [panels, setPanels] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [timeRange, setTimeRange] = useState({ from: 'now-1h', to: 'now' });
  const [autoRefresh, setAutoRefresh] = useState(null);
  const [showQueryEditor, setShowQueryEditor] = useState(false);
  const [editingPanel, setEditingPanel] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showAddPanelModal, setShowAddPanelModal] = useState(false);
  const [dataSources, setDataSources] = useState([]);
  // tick to ép panel refetch data
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLoginSuccess = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
  };

  //Logout API 
  const handleLogout = useCallback(async () => {
    try {
      await axios.post(
        `${API_URL}/auth/logout`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      setToken(null);
      setDashboards([]);
      setCurrentDashboard(null);
      setPanels([]);
    }
  }, [token]);

  const fetchDashboards = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/dashboards`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboards(res.data.dashboards);
      if (res.data.dashboards.length > 0 && !currentDashboard) {
        setCurrentDashboard(res.data.dashboards[0]);
      }
    } catch (err) {
      console.error('Error fetching dashboards:', err);
      if (err.response?.status === 401) {
        handleLogout();
      }
    }
  }, [token, currentDashboard, handleLogout]);

  const fetchDataSources = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/datasources`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDataSources(res.data.datasources || []);
    } catch (err) {
      console.error('Error fetching datasources:', err);
    }
  }, [token]);

  const fetchPanels = useCallback(async (dashboardUid) => {
    if (!dashboardUid) return;
    try {
      const res = await axios.get(`${API_URL}/dashboards/${dashboardUid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPanels(res.data.panels || []);
    } catch (err) {
      console.error('Error fetching panels:', err);
    }
  }, [token]);

  // Fetch dashboards when logged in
  useEffect(() => {
    if (token) {
      fetchDashboards();
      fetchDataSources();
    }
  }, [token, fetchDashboards, fetchDataSources]);

  // Load panels when dashboard changes
  useEffect(() => {
    if (currentDashboard && token) {
      fetchPanels(currentDashboard.uid);
    }
  }, [currentDashboard, token, fetchPanels]);

  // Auto-refresh tick
  useEffect(() => {
    if (autoRefresh && currentDashboard && token) {
      const interval = setInterval(() => {
        setRefreshTick((prev) => prev + 1);
      }, autoRefresh * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, currentDashboard, token]);

  // Dashboard CRUD
  const createDashboard = async () => {
    const title = prompt('Dashboard name:');
    if (!title) return;

    try {
      const res = await axios.post(`${API_URL}/dashboards`,
        { title, description: '', tags: [] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDashboards([...dashboards, res.data]);
      setCurrentDashboard(res.data);
    } catch (err) {
      console.error('Error creating dashboard:', err);
    }
  };
  const deleteDashboard = async (uid) => {
    if (!window.confirm('Delete this dashboard?')) return;

    try {
      await axios.delete(`${API_URL}/dashboards/${uid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const remain = dashboards.filter(d => d.uid !== uid);
      setDashboards(remain);
      if (currentDashboard?.uid === uid) {
        setCurrentDashboard(remain[0] || null);
      }
    } catch (err) {
      console.error('Error deleting dashboard:', err);
    }
  };

  // Panel helpers
  const handleOpenAddPanel = () => {
    setShowAddPanelModal(true);
  };

  const handleCreatePanelFromPreset = async (preset) => {
    if (!currentDashboard) return;
    const newPanelPayload = {
      title: preset.title,
      type: preset.type || 'graph',
      position: { x: 0, y: 0, w: 6, h: 4 },
      datasource: preset.datasource,
      targets: [
        {
          refId: 'A',
          datasource: preset.datasource,
          query: preset.query
        }
      ],
      options: {}
    };
    try {
      const res = await axios.post(
        `${API_URL}/dashboards/${currentDashboard.id}/panels`,
        newPanelPayload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPanels(prev => [...prev, res.data]);
    } catch (err) {
      console.error('Error adding panel:', err);
      alert('Không tạo được panel, xem log console.');
    }
  };
  const removePanel = async (panelId) => {
    try {
      await axios.delete(`${API_URL}/panels/${panelId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPanels(panels.filter(p => p.id !== panelId));
    } catch (err) {
      console.error('Error removing panel:', err);
    }
  };
  const updatePanel = async (panelId, updates) => {
    try {
      const existing = panels.find(p => p.id === panelId);
      const payload = existing ? { ...existing, ...updates } : updates;
      const res = await axios.put(`${API_URL}/panels/${panelId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPanels(panels.map(p => (p.id === panelId ? res.data : p)));
    } catch (err) {
      console.error('Error updating panel:', err);
    }
  };

  const onLayoutChange = (layout) => {
    layout.forEach(item => {
      const panel = panels.find(p => p.id.toString() === item.i);
      if (panel) {
        updatePanel(panel.id, {
          ...panel,
          position: { x: item.x, y: item.y, w: item.w, h: item.h }
        });
      }
    });
  };

  const handleManualRefresh = () => {
    // reload panel
    if (currentDashboard) {
      fetchPanels(currentDashboard.uid);
    }
    // ép mọi panel refetch data
    setRefreshTick(prev => prev + 1);
  };


  //show login page if not authenticated
  if (!user || !token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }


  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-left">
          <button className="menu-btn" onClick={() => setShowSidebar(!showSidebar)}>
            ☰
          </button>
          <div className="logo">
            <img src="/logo.svg" alt="Gauge" />
            <span>Gauge</span>
          </div>
        </div>

        <div className="navbar-center">
          {currentPage === 'dashboard' && (
            <select
              className="dashboard-select"
              value={currentDashboard?.uid || ''}
              onChange={(e) => {
                const dash = dashboards.find(d => d.uid === e.target.value);
                setCurrentDashboard(dash);
              }}
            >
              <option value="">Select Dashboard</option>
              {dashboards.map(d => (
                <option key={d.uid} value={d.uid}>{d.title}</option>
              ))}
            </select>
          )}
        </div>

        <div className="navbar-right">
          {currentPage === 'dashboard' && (
            <>
              <TimeRangePicker value={timeRange} onChange={setTimeRange} />
              <select
                className="refresh-select"
                value={autoRefresh || ''}
                onChange={(e) =>
                  setAutoRefresh(e.target.value ? parseInt(e.target.value) : null)
                }
              >
                <option value="">Off</option>
                <option value="5">5s</option>
                <option value="10">10s</option>
                <option value="30">30s</option>
                <option value="60">1m</option>
              </select>
              <button
                className="nav-btn"
                onClick={handleManualRefresh}
                title="Refresh now"
                aria-label="Refresh now"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M21 12a9 9 0 1 1-2.64-6.36"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M21 3v6h-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </>
          )}
          <div className="account-wrapper">
            <button
              className="nav-btn"
              title={`Logged in as ${user.username}`}
              onClick={() => setShowAccountMenu((prev) => !prev)}
            >
              {/* inline svg */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M20 21a8 8 0 0 0-16 0"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {showAccountMenu && (
              <div className="account-menu">
                <div className="account-menu-header">
                  <div className="account-name">{user?.username}</div>
                  <div className="account-email">{user?.email}</div>
                </div>
                <button
                  className="account-menu-item"
                  onClick={() => {
                    setShowAccountModal(true);
                    setShowAccountMenu(false);
                  }}
                >
                  Change Password
                </button>
                <button
                  className="account-menu-item"
                  onClick={() => {
                    setShowAccountMenu(false);
                    handleLogout();
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="main-container">
        {/* Sidebar */}
        {showSidebar && (
          <aside className="sidebar">
            <div className="sidebar-section">
              <h3>Navigation</h3>
              <ul className="nav-list">
                <li
                  className={currentPage === 'dashboard' ? 'active' : ''}
                  onClick={() => setCurrentPage('dashboard')}
                >
                  Dashboards
                </li>
                <li
                  className={currentPage === 'alerts' ? 'active' : ''}
                  onClick={() => setCurrentPage('alerts')}
                >
                  Alerts
                </li>
                <li
                  className={currentPage === 'logs' ? 'active' : ''}
                  onClick={() => setCurrentPage('logs')}
                >
                  Logs
                </li>
              </ul>
            </div>

            {currentPage === 'dashboard' && (
              <>
                <div className="sidebar-section">
                  <h3>Dashboards</h3>
                  <button className="btn-primary" onClick={createDashboard}>
                    + New Dashboard
                  </button>
                  <ul className="dashboard-list">
                    {dashboards.map(d => (
                      <li
                        key={d.uid}
                        className={currentDashboard?.uid === d.uid ? 'active' : ''}
                        onClick={() => setCurrentDashboard(d)}
                      >
                        <span>{d.title}</span>
                        <button
                          className="icon-btn icon-btn--danger"
                          title="Xóa dashboard"
                          aria-label={`Xóa dashboard ${d.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Xóa dashboard "${d.title}"?`)) {
                              deleteDashboard(d.uid);
                            }
                          }}
                        >
                          {/* Trash icon (SVG inline, khỏi cài lib) */}
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M6 6l1 16h10l1-16" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="sidebar-section">
                  <h3>Data Sources</h3>
                  <ul className="data-source-list">
                    {dataSources.length === 0 && (
                      <li className="muted">No data sources available</li>
                    )}
                    {dataSources.map((ds) => (
                      <li key={ds.id}>
                        {ds.type === 'postgres' ? '2.' : ds.type === 'prometheus' ? '1.' : 'PLUG'}{' '}
                        {ds.name || ds.id}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </aside>
        )}

        {/* Main content */}
        <main className="dashboard-content">
          {currentPage === 'dashboard' && currentDashboard ? (
            <>
              <div className="dashboard-header">
                <h2>{currentDashboard.title}</h2>
                <div className="dashboard-controls">
                  <button className="btn" onClick={handleOpenAddPanel}>
                   +  Add Panel
                  </button>
                </div>
              </div>

              {/* Dashboard Grid */}
              <GridLayout
                className="dashboard-grid"
                layout={panels.map(p => ({
                  i: p.id.toString(),
                  x: p.position?.x || 0,
                  y: p.position?.y || 0,
                  w: p.position?.w || 6,
                  h: p.position?.h || 4,
                  minW: 2,
                  minH: 2
                }))}
                cols={12}
                rowHeight={60}
                width={1200}
                onLayoutChange={onLayoutChange}
                draggableHandle=".panel-drag-handle"
              >
                {panels.map(panel => (
                  <div key={panel.id.toString()}>
                    <Panel
                      panel={panel}
                      timeRange={timeRange}
                      token={token}
                      refreshTick={refreshTick}
                      onRemove={removePanel}
                      onEdit={(p) => {
                        setEditingPanel(p);
                        setShowQueryEditor(true);
                      }}
                      onUpdate={updatePanel}
                    />
                  </div>
                ))}
              </GridLayout>
            </>
          ) : currentPage === 'alerts' ? (
            <Alerts />
          ) : currentPage === 'logs' ? (
            <Logs token={token} />
          ) : (
            <div className="empty-state">
              <h2>No dashboard selected</h2>
              <p>Create a new dashboard to get started</p>
              <button className="btn-primary" onClick={createDashboard}>
                + Create Dashboard
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Query Editor Modal */}
      {showQueryEditor && (
        <QueryEditor
          panel={editingPanel}
          onClose={() => setShowQueryEditor(false)}
          onSave={(updates) => {
            updatePanel(editingPanel.id, updates);
            setShowQueryEditor(false);
          }}
        />
      )}

      {/* Add Panel Modal */}
      <AddPanelModal
        isOpen={showAddPanelModal}
        onClose={() => setShowAddPanelModal(false)}
        onCreate={handleCreatePanelFromPreset}
      />

      {showAccountModal && (
        <AccountModal
          onClose={() => setShowAccountModal(false)}
          token={token}
          user={user}
        />
      )}
    </div>
  );
}

function AccountModal({ onClose, token, user }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');
    setError('');
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }
    try {
      setLoading(true);
      await axios.post(
        `${API_URL}/auth/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="query-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Account</h3>
          <p className="modal-subtitle">
            Logged in as <strong>{user?.username}</strong> ({user?.email})
          </p>

          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="editor-section">
              <h4>Current Password</h4>
              <input
                type={showCurrent ? 'text' : 'password'}
                className="editor-select"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <div className="inline-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowCurrent((prev) => !prev)}
                >
                  {showCurrent ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className="editor-section">
              <h4>New Password</h4>
              <input
                type={showNew ? 'text' : 'password'}
                className="editor-select"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <div className="inline-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowNew((prev) => !prev)}
                >
                  {showNew ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className="editor-section">
              <h4>Confirm New Password</h4>
              <input
                type={showConfirm ? 'text' : 'password'}
                className="editor-select"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <div className="inline-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowConfirm((prev) => !prev)}
                >
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            {error && <div className="error-banner">{error}</div>}
            {status && <div className="success-banner">{status}</div>}
            <div className="modal-footer">
              <button type="button" className="btn" onClick={onClose}>Close</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;