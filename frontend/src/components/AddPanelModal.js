import React, { useState, useMemo, useEffect } from "react";
import { METRIC_PRESETS } from "../metricPresets";
import { Activity, Droplet, BarChart3, X, Plus } from "lucide-react";

export default function AddPanelModal({ isOpen, onClose, onCreate }) {
  const [datasource, setDatasource] = useState("prometheus");
  const [presetId, setPresetId] = useState("");
  const [title, setTitle] = useState("");
  const [customQuery, setCustomQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const presets = useMemo(() => {
    return METRIC_PRESETS[datasource] || [];
  }, [datasource]);

  const selectedPreset = presets.find((p) => p.id === presetId);

  // khi đổi datasource thì auto chọn preset đầu tiên
  useEffect(() => {
    if (presets.length > 0 && !presetId) {
      setPresetId(presets[0].id);
    }
  }, [presets, presetId]);

  // Update customQuery when preset changes
  useEffect(() => {
    if (selectedPreset) {
      setCustomQuery(selectedPreset.query);
    }
  }, [selectedPreset]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPreset) return;

    const panelTitle = title.trim() || selectedPreset.label;

    try {
      setLoading(true);
      await onCreate({
        title: panelTitle || selectedPreset.title,
        datasource: selectedPreset.datasource,
        type: selectedPreset.type || "graph",
        query: customQuery || selectedPreset.query,
      });

      // reset
      setTitle("");
      setPresetId("");
      setDatasource("prometheus");
      onClose();
    } catch (err) {
      console.error("Error creating panel:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDatasourceIcon = (ds) => {
    const iconProps = { size: 16 };
    switch (ds) {
      case "prometheus":
        return <Activity {...iconProps} />;
      case "juiceShop":
        return <Droplet {...iconProps} />;
      default:
        return <BarChart3 {...iconProps} />;
    }
  };

  return (
    <div className="add-panel-overlay" onClick={onClose}>
      <div className="add-panel-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="add-panel-header">
          <div className="header-content">
            <div className="panel-icon">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <rect x="3" y="3" width="7" height="9" rx="1" strokeWidth="2" />
                <rect
                  x="14"
                  y="3"
                  width="7"
                  height="5"
                  rx="1"
                  strokeWidth="2"
                />
                <rect
                  x="14"
                  y="12"
                  width="7"
                  height="9"
                  rx="1"
                  strokeWidth="2"
                />
                <rect
                  x="3"
                  y="16"
                  width="7"
                  height="5"
                  rx="1"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div>
              <h2>Add New Panel</h2>
              <p>Choose a metric to visualize on your dashboard</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="add-panel-body">
          {/* Datasource Selection */}
          <div className="form-group">
            <label htmlFor="datasource-select">
              Data Source <span className="required">*</span>
            </label>
            <div className="datasource-selector">
              <button
                type="button"
                className={`datasource-option ${
                  datasource === "prometheus" ? "active" : ""
                }`}
                onClick={() => {
                  setDatasource("prometheus");
                  const prometheusPresets = METRIC_PRESETS["prometheus"] || [];
                  if (prometheusPresets.length > 0) {
                    setPresetId(prometheusPresets[0].id);
                  }
                }}
              >
                <Activity size={20} />
                <span>Prometheus</span>
              </button>
              <button
                type="button"
                className={`datasource-option ${
                  datasource === "juiceShop" ? "active" : ""
                }`}
                onClick={() => {
                  setDatasource("juiceShop");
                  const juiceShopPresets = METRIC_PRESETS["juiceShop"] || [];
                  if (juiceShopPresets.length > 0) {
                    setPresetId(juiceShopPresets[0].id);
                  }
                }}
              >
                <Droplet size={20} />
                <span>Juice Shop</span>
              </button>
            </div>
          </div>

          {/* Metric Selection */}
          <div className="form-group">
            <label htmlFor="metric-select">
              Metric Type <span className="required">*</span>
            </label>
            <select
              id="metric-select"
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Panel Title */}
          <div className="form-group">
            <label htmlFor="panel-title">
              Panel Title <span className="optional">(optional)</span>
            </label>
            <input
              id="panel-title"
              type="text"
              placeholder={
                selectedPreset
                  ? `Default: ${selectedPreset.label}`
                  : "e.g., CPU Usage Server 1"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="input-hint">
              Leave blank to use the default metric name
            </div>
          </div>

          {/* Query Editor */}
          {selectedPreset && (
            <div className="form-group">
              <label htmlFor="query-editor">
                Query <span className="optional">(advanced)</span>
              </label>
              <div className="query-editor-wrapper">
                <textarea
                  id="query-editor"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  rows={6}
                  placeholder="Enter your custom query..."
                />
              </div>
              <div className="input-hint">
                Modify the query if needed, or leave as default
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-create"
              disabled={!selectedPreset || loading}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Add Panel
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
