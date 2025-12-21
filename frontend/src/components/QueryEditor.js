import React from 'react';
export default function QueryEditor({ onClose, onSave }) {
  return (
<div className="modal-overlay" onClick={onClose}>
    <div className="query-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
            <h3>Query Editor</h3>
            <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">Query editor placeholder</div>
        <div className="modal-footer">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={() => onSave?.({})}>Save</button>
        </div>
    </div>
</div>
  );
}