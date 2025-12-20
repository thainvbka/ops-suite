import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import "./App.css";
import Login from "./components/Login";

const API_URL = "http://localhost:4000/api";

function App() {
  const [user, setUser] = useState({ username: "Dev User" });
  const [token, setToken] = useState("dev-token");

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
          <button className="nav-btn" title={`Logged in as ${user.username}`}>
            Account
          </button>
          <button className="nav-btn" onClick={handleLogout} title="Logout">
            Logout
          </button>
        </div>
      </nav>

      <div className="main-container">
          <aside className="sidebar">
          </aside>

        <main className="dashboard-content">
          {/* content */}
        </main>
      </div>
    </div>
  );
}

export default App;
