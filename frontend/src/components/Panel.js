import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import { API_URL } from '../api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Metric type detection
const detectMetricType = (title = '', datasource = '') => {
  const lower = title.toLowerCase();
  if (lower.includes('cpu')) return 'cpu';
  if (lower.includes('memory') || lower.includes('ram') || lower.includes('heap')) return 'memory';
  if (lower.includes('network') || lower.includes('bandwidth') || lower.includes('tx') || lower.includes('rx')) return 'network';
  if (lower.includes('http') || lower.includes('request')) return 'http';
  return 'default';
};

// Color schemes by metric type
const METRIC_COLORS = {
  cpu: {
    stroke: '#f59e0b',
    fill: '#f59e0b',
    glow: '0 0 20px rgba(245, 158, 11, 0.4)',
    gradient: { start: '#f59e0b', end: '#ef4444' }
  },
  memory: {
    stroke: '#8b5cf6',
    fill: '#8b5cf6',
    glow: '0 0 20px rgba(139, 92, 246, 0.4)',
    gradient: { start: '#8b5cf6', end: '#a78bfa' }
  },
  network: {
    stroke: '#06b6d4',
    fill: '#06b6d4',
    glow: '0 0 20px rgba(6, 182, 212, 0.4)',
    gradient: { start: '#3b82f6', end: '#06b6d4' }
  },
  http: {
    stroke: '#10b981',
    fill: '#10b981',
    glow: '0 0 20px rgba(16, 185, 129, 0.4)',
    gradient: { start: '#10b981', end: '#34d399' }
  },
  default: {
    stroke: '#3b82f6',
    fill: '#3b82f6',
    glow: '0 0 20px rgba(59, 130, 246, 0.4)',
    gradient: { start: '#3b82f6', end: '#60a5fa' }
  }
};


function Panel({ panel, timeRange, refreshTick, onRemove, onEdit, onUpdate, token }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(panel.title);
  const [panelType, setPanelType] = useState(panel.type || 'graph');

  // Detect metric type for coloring
  const metricType = useMemo(
    () => detectMetricType(panel.title, panel.datasource),
    [panel.title, panel.datasource]
  );
  const colorScheme = METRIC_COLORS[metricType];

  const parsedTargets = useMemo(() => {
    if (Array.isArray(panel.targets)) return panel.targets;
    if (typeof panel.targets === 'string') {
      try {
        const parsed = JSON.parse(panel.targets);
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        console.warn('Cannot parse panel targets', err);
      }
    }
    return [];
  }, [panel.targets]);

  const primaryTarget = parsedTargets[0] || {};
  const effectiveDatasource = panel.datasource || primaryTarget.datasource || 'prometheus';
  const effectiveMetric = panel.metric || primaryTarget.metric || 'cpu_usage';
  const effectiveQuery = panel.query || primaryTarget.query || '';

  const normalizeResponseData = (responseData) => {
    if (!responseData) return [];
    if (Array.isArray(responseData.data)) return sanitizeData(responseData.data);

    if (Array.isArray(responseData.series) && responseData.series.length > 0) {
      return sanitizeData(responseData.series[0].data || []);
    }

    return [];
  };

  const sanitizeData = (arr) => {
    return arr
      .map((item) => {
        if (!item) return null;
        const ts =
          item.timestamp ||
          item.time ||
          item.ts ||
          item.date ||
          item.Time ||
          item.TS;
        const val =
          item.value !== undefined
            ? item.value
            : item.Value !== undefined
              ? item.Value
              : item.val;
        const parsedTs = ts ? new Date(ts) : null;
        if (!parsedTs || Number.isNaN(parsedTs.getTime())) return null;
        return {
          ...item,
          timestamp: parsedTs.toISOString(),
          value: typeof val === 'string' ? parseFloat(val) : val
        };
      })
      .filter(Boolean);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/metrics`, {
          params: {
            datasource: effectiveDatasource,
            metric: effectiveMetric,
            query: effectiveQuery,
            from: timeRange.from,
            to: timeRange.to,
          },
          headers: token
            ? {
              Authorization: `Bearer ${token}`,
            }
            : undefined,
        });

        const responseData = res.data || {};
        const normalizedData = normalizeResponseData(responseData);
        setData(normalizedData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    panel.id,
    effectiveMetric,
    effectiveDatasource,
    effectiveQuery,
    timeRange.from,
    timeRange.to,
    refreshTick
  ]);

  const handleSave = () => {
    onUpdate(panel.id, { title, type: panelType });
    setIsEditing(false);
  };

  const renderVisualization = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading data...</p>
        </div>
      );
    }

    switch (panelType) {
      case 'graph':
        return <GraphVisualization data={data} colorScheme={colorScheme} />;
      case 'bar':
        return <BarVisualization data={data} colorScheme={colorScheme} />;
      case 'pie':
        return <PieVisualization data={data} />;
      case 'stat':
        return <StatVisualization data={data} colorScheme={colorScheme} />;
      case 'table':
        return <TableVisualization data={data} />;
      default:
        return <GraphVisualization data={data} colorScheme={colorScheme} />;
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-drag-handle">⋮⋮</span>
          {isEditing ? (
            <input
              type="text"
              className="panel-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          ) : (
            <h3>{title}</h3>
          )}
        </div>

        <div className="panel-actions fixed-right">
          {isEditing ? (
            <>
              <button className="panel-btn" onClick={handleSave} title="Save" aria-label="Save">
                {/* Check */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M20 6 9 17l-5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <button
                className="panel-btn"
                onClick={() => setIsEditing(false)}
                title="Cancel"
                aria-label="Cancel"
              >
                {/* X */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M18 6 6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                className="panel-btn"
                onClick={() => setIsEditing(true)}
                title="Edit"
                aria-label="Edit"
              >
                {/* edit */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 20h9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <button
                className="panel-btn"
                onClick={() => onEdit(panel)}
                title="Settings"
                aria-label="Settings"
              >
                {/* setting */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
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
              </button>

              <button
                className="panel-btn"
                onClick={() => onRemove(panel.id)}
                title="Delete"
                aria-label="Delete"
              >
                {/* delete */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M3 6h18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 6l1 16a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 11v7M14 11v7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="panel-content">
        {isEditing && (
          <div className="panel-type-selector">
            <label>Visualization:</label>
            <select
              value={panelType}
              onChange={(e) => setPanelType(e.target.value)}
            >
              <option value="graph">Line Graph</option>
              <option value="bar">Bar Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="stat">Stat</option>
              <option value="table">Table</option>
            </select>
          </div>
        )}
        {renderVisualization()}
      </div>
    </div>
  );
}

function GraphVisualization({ data, colorScheme = METRIC_COLORS.default }) {
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colorScheme.gradient.start} stopOpacity={0.8} />
            <stop offset="95%" stopColor={colorScheme.gradient.end} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2f" />
        <XAxis
          dataKey="timestamp"
          stroke="#9b9b9b"
          tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
        />
        <YAxis stroke="#9b9b9b" />
        <Tooltip
          contentStyle={{
            background: '#1f1f23',
            border: `1px solid ${colorScheme.stroke}`,
            borderRadius: '8px',
            boxShadow: colorScheme.glow
          }}
          labelStyle={{ color: '#d8d9da', fontWeight: 600 }}
          itemStyle={{ color: colorScheme.stroke }}
          labelFormatter={(label) => new Date(label).toLocaleString()}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={colorScheme.stroke}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function BarVisualization({ data, colorScheme = METRIC_COLORS.default }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2f" />
        <XAxis
          dataKey="timestamp"
          stroke="#9b9b9b"
          tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
        />
        <YAxis stroke="#9b9b9b" />
        <Tooltip
          contentStyle={{
            background: '#1f1f23',
            border: `1px solid ${colorScheme.stroke}`,
            borderRadius: '8px'
          }}
          labelStyle={{ color: '#d8d9da', fontWeight: 600 }}
          itemStyle={{ color: colorScheme.stroke }}
          labelFormatter={(label) => new Date(label).toLocaleString()}
        />
        <Bar
          dataKey="value"
          fill={colorScheme.fill}
          animationDuration={500}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PieVisualization({ data }) {
  const pieData = data.slice(-5).map((item, index) => ({
    name: `Data ${index + 1}`,
    value: item.value
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={(entry) => entry.name}
        >
          {pieData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#1f1f23', border: '1px solid #2c2c2f' }}
          labelStyle={{ color: '#d8d9da' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function StatVisualization({ data, colorScheme = METRIC_COLORS.default }) {
  const latest = data[data.length - 1]?.value || 0;
  const previous = data[data.length - 2]?.value || 0;
  const change = latest - previous;
  const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
  const isPositive = change >= 0;

  return (
    <div className="stat-container">
      <div
        className="stat-value"
        style={{
          background: `linear-gradient(135deg, ${colorScheme.gradient.start}, ${colorScheme.gradient.end})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}
      >
        {latest.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </div>
      <div className="stat-label">Current Value</div>
      <div
        className={`stat-trend ${isPositive ? 'positive' : 'negative'}`}
        style={{ color: isPositive ? '#10b981' : '#ef4444' }}
      >
        <span className="stat-arrow">{isPositive ? '↑' : '↓'}</span>
        <span className="stat-percent">{Math.abs(changePercent).toFixed(1)}%</span>
        <span className="stat-change">
          ({isPositive ? '+' : ''}{change.toFixed(2)})
        </span>
      </div>
    </div>
  );
}

function TableVisualization({ data }) {
  const rows = data.slice(-20).reverse();
  return (
    <div className="table-container">
      <div className="metrics-table-wrapper">
        <div className="metrics-table-header">
          <div className="metrics-col time">Time</div>
          <div className="metrics-col value">Value</div>
        </div>
        <div className="metrics-table-body">
          {rows.map((row, idx) => (
            <div className="metrics-row" key={idx}>
              <div className="metrics-col time">
                {new Date(row.timestamp).toLocaleString()}
              </div>
              <div className="metrics-col value">
                {row.value.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Panel;



