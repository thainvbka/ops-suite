import React from 'react';
export default function AddPanelModal({ isOpen, onClose, onCreate }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
        <div className="query-editor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
                <h3>Add Panel</h3>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>
            <div className="modal-body">
                <button className="btn-primary" onClick={() => onCreate?.({ title: 'New Panel' })}>
                    Create dummy panel
                </button>
            </div>
        </div>
    </div>
  );
}