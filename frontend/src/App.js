import React, { useState, useEffect, useCallback } from "react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import axios from "axios";
import "./App.css";
import Login from "./components/Login";
import TimeRangePicker from "./components/TimeRangePicker";
import Panel from "./components/Panel";
import QueryEditor from "./components/QueryEditor";
import Alerts from "./components/Alerts";
import Logs from "./components/Logs";
import AddPanelModal from "./components/AddPanelModal";
import NotificationChannels from "./components/NotificationChannels";
import ContainerOverview from "./components/ContainerOverview";
import JuiceShopApp from "./components/JuiceShopApp";
import CreateDashboardModal from "./components/CreateDashboardModal";
import ConfirmDialog from "./components/ConfirmDialog";
import { API_URL } from "./api";
import {
  Menu,
  LayoutDashboard,
  Bell,
  Radio,
  FileText,
  Container,
  Droplet,
  Plus,
  Database,
  Activity,
  Check,
  Circle,
} from "lucide-react";

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const [dashboards, setDashboards] = useState([]);
  const [currentDashboard, setCurrentDashboard] = useState(null);
  const [panels, setPanels] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [timeRange, setTimeRange] = useState({ from: "now-1h", to: "now" });
  const [autoRefresh, setAutoRefresh] = useState(null);
  const [showQueryEditor, setShowQueryEditor] = useState(false);
  const [editingPanel, setEditingPanel] = useState(null);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [showAddPanelModal, setShowAddPanelModal] = useState(false);
  const [showCreateDashboardModal, setShowCreateDashboardModal] =
    useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    onConfirm: null,
    title: "",
    message: "",
  });
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
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboards(res.data.dashboards);
      if (res.data.dashboards.length > 0 && !currentDashboard) {
        setCurrentDashboard(res.data.dashboards[0]);
      }
    } catch (err) {
      console.error("Error fetching dashboards:", err);
      if (err.response?.status === 401) {
        handleLogout();
      }
    }
  }, [token, currentDashboard, handleLogout]);

  const fetchDataSources = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/datasources`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDataSources(res.data.datasources || []);
    } catch (err) {
      console.error("Error fetching datasources:", err);
    }
  }, [token]);

  const fetchPanels = useCallback(
    async (dashboardUid) => {
      if (!dashboardUid) return;
      try {
        const res = await axios.get(`${API_URL}/dashboards/${dashboardUid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPanels(res.data.panels || []);
      } catch (err) {
        console.error("Error fetching panels:", err);
      }
    },
    [token]
  );

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
  const createDashboard = async (data) => {
    try {
      const res = await axios.post(`${API_URL}/dashboards`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboards([...dashboards, res.data]);
      setCurrentDashboard(res.data);
    } catch (err) {
      console.error("Error creating dashboard:", err);
      throw err;
    }
  };
  const deleteDashboard = async (uid, dashboardName) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Dashboard?",
      message: `Are you sure you want to delete "${dashboardName}"? This action cannot be undone and all panels will be lost.`,
      type: "danger",
      confirmText: "Delete Dashboard",
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/dashboards/${uid}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const remain = dashboards.filter((d) => d.uid !== uid);
          setDashboards(remain);
          if (currentDashboard?.uid === uid) {
            setCurrentDashboard(remain[0] || null);
          }
        } catch (err) {
          console.error("Error deleting dashboard:", err);
        }
      },
    });
  };

  // Panel helpers
  const handleOpenAddPanel = () => {
    setShowAddPanelModal(true);
  };

  const handleCreatePanelFromPreset = async (preset) => {
    if (!currentDashboard) return;
    const newPanelPayload = {
      title: preset.title,
      type: preset.type || "graph",
      position: { x: 0, y: 0, w: 6, h: 4 },
      datasource: preset.datasource,
      targets: [
        {
          refId: "A",
          datasource: preset.datasource,
          query: preset.query,
        },
      ],
      options: {},
    };
    try {
      const res = await axios.post(
        `${API_URL}/dashboards/${currentDashboard.id}/panels`,
        newPanelPayload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPanels((prev) => [...prev, res.data]);
    } catch (err) {
      console.error("Error adding panel:", err);
      alert("Không tạo được panel, xem log console.");
    }
  };
  const removePanel = async (panelId, panelTitle) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Panel?",
      message: `Are you sure you want to delete the panel "${panelTitle}"? This action cannot be undone.`,
      type: "danger",
      confirmText: "Delete Panel",
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/panels/${panelId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setPanels(panels.filter((p) => p.id !== panelId));
        } catch (err) {
          console.error("Error removing panel:", err);
        }
      },
    });
  };
  const updatePanel = async (panelId, updates) => {
    try {
      const existing = panels.find((p) => p.id === panelId);
      const payload = existing ? { ...existing, ...updates } : updates;
      const res = await axios.put(`${API_URL}/panels/${panelId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPanels(panels.map((p) => (p.id === panelId ? res.data : p)));
    } catch (err) {
      console.error("Error updating panel:", err);
    }
  };

  const onLayoutChange = (layout) => {
    layout.forEach((item) => {
      const panel = panels.find((p) => p.id.toString() === item.i);
      if (panel) {
        updatePanel(panel.id, {
          ...panel,
          position: { x: item.x, y: item.y, w: item.w, h: item.h },
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
    setRefreshTick((prev) => prev + 1);
  };

  //show login page if not authenticated
  if (!user || !token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-left">
          <button
            className="menu-btn"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            <Menu size={20} />
          </button>
          <div className="logo">
            <img src="/logo.svg" alt="Gauge" />
            <span>Gauge</span>
          </div>
        </div>

        <div className="navbar-center">
          {currentPage === "dashboard" && (
            <select
              className="dashboard-select"
              value={currentDashboard?.uid || ""}
              onChange={(e) => {
                const dash = dashboards.find((d) => d.uid === e.target.value);
                setCurrentDashboard(dash);
              }}
            >
              <option value="">Select Dashboard</option>
              {dashboards.map((d) => (
                <option key={d.uid} value={d.uid}>
                  {d.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="navbar-right">
          {currentPage === "dashboard" && (
            <>
              <TimeRangePicker value={timeRange} onChange={setTimeRange} />
              <select
                className="refresh-select"
                value={autoRefresh || ""}
                onChange={(e) =>
                  setAutoRefresh(
                    e.target.value ? parseInt(e.target.value) : null
                  )
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
              <ul className="sidebar-nav">
                <li
                  className={currentPage === "dashboard" ? "active" : ""}
                  onClick={() => setCurrentPage("dashboard")}
                >
                  <LayoutDashboard size={18} /> Dashboards
                </li>
                <li
                  className={currentPage === "alerts" ? "active" : ""}
                  onClick={() => setCurrentPage("alerts")}
                >
                  <Bell size={18} /> Alerts
                </li>
                <li
                  className={currentPage === "channels" ? "active" : ""}
                  onClick={() => setCurrentPage("channels")}
                >
                  <Radio size={18} /> Notification Channels
                </li>
                <li
                  className={currentPage === "logs" ? "active" : ""}
                  onClick={() => setCurrentPage("logs")}
                >
                  <FileText size={18} /> Logs
                </li>
                <li
                  className={currentPage === "containers" ? "active" : ""}
                  onClick={() => setCurrentPage("containers")}
                >
                  <Container size={18} /> Containers
                </li>
                <li
                  className={currentPage === "juiceshop" ? "active" : ""}
                  onClick={() => setCurrentPage("juiceshop")}
                >
                  <Droplet size={18} /> Juice Shop
                </li>
              </ul>
            </div>

            {currentPage === "dashboard" && (
              <>
                <div className="sidebar-section">
                  <h3>Dashboards</h3>
                  <button
                    className="btn-primary"
                    onClick={() => setShowCreateDashboardModal(true)}
                  >
                    + New Dashboard
                  </button>
                  <ul className="dashboard-list">
                    {dashboards.map((d) => (
                      <li
                        key={d.uid}
                        className={
                          currentDashboard?.uid === d.uid ? "active" : ""
                        }
                        onClick={() => setCurrentDashboard(d)}
                      >
                        <span>{d.title}</span>
                        <button
                          className="icon-btn icon-btn--danger"
                          title="Xóa dashboard"
                          aria-label={`Xóa dashboard ${d.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDashboard(d.uid, d.title);
                          }}
                        >
                          {/* Trash icon (SVG inline, khỏi cài lib) */}
                          <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
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
                        {ds.type === "postgres" ? (
                          <Database size={14} />
                        ) : ds.type === "prometheus" ? (
                          <Activity size={14} />
                        ) : (
                          "PLUG"
                        )}{" "}
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
          {currentPage === "dashboard" && currentDashboard ? (
            <>
              <div className="dashboard-header">
                <h2>{currentDashboard.title}</h2>
                <div className="dashboard-controls">
                  <button className="btn" onClick={handleOpenAddPanel}>
                    <Plus size={16} style={{ marginRight: "4px" }} /> Add Panel
                  </button>
                </div>
              </div>

              {/* Dashboard Grid */}
              <GridLayout
                className="dashboard-grid"
                layout={panels.map((p) => ({
                  i: p.id.toString(),
                  x: p.position?.x || 0,
                  y: p.position?.y || 0,
                  w: p.position?.w || 6,
                  h: p.position?.h || 4,
                  minW: 2,
                  minH: 2,
                }))}
                cols={12}
                rowHeight={60}
                width={1200}
                onLayoutChange={onLayoutChange}
                draggableHandle=".panel-drag-handle"
              >
                {panels.map((panel) => (
                  <div key={panel.id.toString()}>
                    <Panel
                      panel={panel}
                      timeRange={timeRange}
                      refreshTick={refreshTick}
                      onRemove={() => removePanel(panel.id, panel.title)}
                      onEdit={(p) => {
                        setEditingPanel(p);
                        setShowQueryEditor(true);
                      }}
                      onUpdate={updatePanel}
                      token={token}
                    />
                  </div>
                ))}
              </GridLayout>
            </>
          ) : currentPage === "alerts" ? (
            <Alerts />
          ) : currentPage === "channels" ? (
            <NotificationChannels token={token} />
          ) : currentPage === "logs" ? (
            <Logs token={token} />
          ) : currentPage === "containers" ? (
            <ContainerOverview token={token} />
          ) : currentPage === "juiceshop" ? (
            <JuiceShopApp token={token} />
          ) : (
            <div className="empty-state">
              <h2>No dashboard selected</h2>
              <p>Create a new dashboard to get started</p>
              <button className="btn-primary" onClick={() => setShowCreateDashboardModal(true)}>
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
          token={token}
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

      {/* Create Dashboard Modal */}
      <CreateDashboardModal
        isOpen={showCreateDashboardModal}
        onClose={() => setShowCreateDashboardModal(false)}
        onCreate={createDashboard}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type || "danger"}
        confirmText={confirmDialog.confirmText || "Confirm"}
        cancelText={confirmDialog.cancelText || "Cancel"}
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: "", color: "" };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    const strengths = {
      0: { label: "Too weak", color: "#ef4444" },
      1: { label: "Weak", color: "#f59e0b" },
      2: { label: "Fair", color: "#eab308" },
      3: { label: "Good", color: "#84cc16" },
      4: { label: "Strong", color: "#22c55e" },
      5: { label: "Very Strong", color: "#10b981" },
    };

    return { score, ...strengths[score] };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${API_URL}/auth/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Auto close after 2 seconds on success
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="account-modal-overlay" onClick={onClose}>
      <div className="account-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="account-modal-header">
          <div className="account-info">
            <div className="user-avatar">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="24" fill="url(#avatarGradient)" />
                <text
                  x="24"
                  y="29"
                  textAnchor="middle"
                  fill="white"
                  fontSize="20"
                  fontWeight="600"
                >
                  {user?.username?.[0]?.toUpperCase() || "U"}
                </text>
                <defs>
                  <linearGradient
                    id="avatarGradient"
                    x1="0"
                    y1="0"
                    x2="48"
                    y2="48"
                  >
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="user-details">
              <h2>{user?.username}</h2>
              <p>{user?.email}</p>
            </div>
          </div>
          <button className="account-close-btn" onClick={onClose}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="account-modal-body">
          <h3 className="section-title">Change Password</h3>

          <form onSubmit={handleSubmit} className="password-form">
            {/* Current Password */}
            <div className="password-field">
              <label>Current Password</label>
              <div className="password-input-wrapper">
                <svg
                  className="input-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                    ry="2"
                    strokeWidth="2"
                  />
                  <path d="M7 11V7a5 5 0 0110 0v4" strokeWidth="2" />
                </svg>
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <line
                        x1="1"
                        y1="1"
                        x2="23"
                        y2="23"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                        strokeWidth="2"
                      />
                      <circle cx="12" cy="12" r="3" strokeWidth="2" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="password-field">
              <label>New Password</label>
              <div className="password-input-wrapper">
                <svg
                  className="input-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                    ry="2"
                    strokeWidth="2"
                  />
                  <path d="M7 11V7a5 5 0 0110 0v4" strokeWidth="2" />
                </svg>
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <line
                        x1="1"
                        y1="1"
                        x2="23"
                        y2="23"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                        strokeWidth="2"
                      />
                      <circle cx="12" cy="12" r="3" strokeWidth="2" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="password-strength">
                  <div className="strength-bars">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="strength-bar"
                        style={{
                          background:
                            i <= passwordStrength.score
                              ? passwordStrength.color
                              : "#2c2c2f",
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}

              {/* Password Requirements */}
              {newPassword && (
                <div className="password-requirements">
                  <div
                    className={
                      newPassword.length >= 8
                        ? "requirement-met"
                        : "requirement"
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {newPassword.length >= 8 ? (
                      <Check size={14} />
                    ) : (
                      <Circle size={14} />
                    )}{" "}
                    At least 8 characters
                  </div>
                  <div
                    className={
                      /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)
                        ? "requirement-met"
                        : "requirement"
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? (
                      <Check size={14} />
                    ) : (
                      <Circle size={14} />
                    )}{" "}
                    Upper & lowercase
                  </div>
                  <div
                    className={
                      /\d/.test(newPassword) ? "requirement-met" : "requirement"
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {/\d/.test(newPassword) ? (
                      <Check size={14} />
                    ) : (
                      <Circle size={14} />
                    )}{" "}
                    Numbers
                  </div>
                  <div
                    className={
                      /[^a-zA-Z0-9]/.test(newPassword)
                        ? "requirement-met"
                        : "requirement"
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {/[^a-zA-Z0-9]/.test(newPassword) ? (
                      <Check size={14} />
                    ) : (
                      <Circle size={14} />
                    )}{" "}
                    Special characters
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="password-field">
              <label>Confirm New Password</label>
              <div className="password-input-wrapper">
                <svg
                  className="input-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M9 11l3 3L22 4"
                    strokeWidth="2"
                    strokeLinecap="round"
                    stroke
                    Lin
                    ejoin="round"
                  />
                  <path
                    d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <line
                        x1="1"
                        y1="1"
                        x2="23"
                        y2="23"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                        strokeWidth="2"
                      />
                      <circle cx="12" cy="12" r="3" strokeWidth="2" />
                    </svg>
                  )}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <div className="password-mismatch">Passwords do not match</div>
              )}
              {confirmPassword &&
                confirmPassword === newPassword &&
                newPassword.length >= 8 && (
                  <div
                    className="password-match"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Check size={14} /> Passwords match
                  </div>
                )}
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="account-error-message">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <line
                    x1="15"
                    y1="9"
                    x2="9"
                    y2="15"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="9"
                    y1="9"
                    x2="15"
                    y2="15"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                {error}
              </div>
            )}

            {status && (
              <div className="account-success-message">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M22 11.08V12a10 10 0 11-5.93-9.14"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points="22 4 12 14.01 9 11.01"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {status}
              </div>
            )}

            {/* Buttons */}
            <div className="account-modal-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={
                  loading ||
                  !newPassword ||
                  !confirmPassword ||
                  newPassword !== confirmPassword
                }
              >
                {loading ? (
                  <>
                    <div className="btn-spinner"></div>
                    Changing...
                  </>
                ) : (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
                        strokeWidth="2"
                      />
                      <polyline
                        points="17 21 17 13 7 13 7 21"
                        strokeWidth="2"
                      />
                      <polyline points="7 3 7 8 15 8" strokeWidth="2" />
                    </svg>
                    Save New Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
