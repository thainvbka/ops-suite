import React, { useState, useMemo, useEffect } from 'react';
import { METRIC_PRESETS } from '../metricPresets';

export default function AddPanelModal({ isOpen, onClose, onCreate }) {
  const [datasource, setDatasource] = useState('prometheus');
  const [presetId, setPresetId] = useState('');
  const [title, setTitle] = useState('');
  const [customQuery, setCustomQuery] = useState('');

  const presets = useMemo(() => {
    return METRIC_PRESETS[datasource] || [];
  }, [datasource]);

  const selectedPreset = presets.find(p => p.id === presetId);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPreset) return;

    const panelTitle = title.trim() || selectedPreset.label;

    onCreate({
      title: panelTitle || selectedPreset.title,
      datasource: selectedPreset.datasource,
      type: selectedPreset.type || 'graph',
      query: customQuery || selectedPreset.query
    });

    // reset
    setTitle('');
    setPresetId('');
    setDatasource('prometheus');
    onClose();
  };

  return (
    <div className="add-panel-modal-backdrop" onClick={onClose}>
      <div className="add-panel-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Thêm panel mới</h2>

        <form onSubmit={handleSubmit}>
          {/* Datasource */}
          <div className="form-group">
            <label>Datasource</label>
            <select
              value={datasource}
              onChange={(e) => {
                setDatasource(e.target.value);
                setPresetId('');
              }}
            >
              <option value="prometheus">Prometheus</option>
              <option value="postgres">PostgreSQL</option>
              <option value="juiceShop">🧃 Juice Shop</option>
            </select>
          </div>

          {/* Loại metric */}
          <div className="form-group">
            <label>Loại dữ liệu hiển thị</label>
            <select
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
            >
              {presets.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tiêu đề panel */}
          <div className="form-group">
            <label>Tiêu đề panel</label>
            <input
              type="text"
              placeholder="VD: CPU usage server 1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Query Editor */}
          {selectedPreset && (
            <div className="form-group">
              <label>Query</label>
              <textarea
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                rows={6}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
                placeholder="Enter your query here..."
              />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" disabled={!selectedPreset}>
              Tạo panel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
