import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import "./App.css";
import Login from "./components/Login";

const API_URL = "http://localhost:4000/api";

function App() {
  const [user, setUser] = useState({ username: "Dev User" });
  const [token, setToken] = useState("dev-token");
  
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  
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
    }
  }, [token]);
  //show login page if not authenticated
  if (!user || !token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }


  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-left">
          <button className="menu-btn">
            ☰
          </button>
          <div className="logo">
            <img src="/logo.svg" alt="Gauge" />
            <span>Gauge</span>
          </div>
        </div>
        
        <div className="navbar-center">
        </div>

        <div className="navbar-right">
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
        {/* main content */}
      <div className="main-container">
          <aside className="sidebar">
          </aside>

        <main className="dashboard-content">
        </main>
      </div>

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
