import React from 'react';
import './App.css';

function App() {
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
