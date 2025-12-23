import React from "react";
import { AlertTriangle, XCircle, Info } from "lucide-react";

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger", // 'danger', 'warning', 'info'
  loading = false,
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    const iconProps = { size: 48, strokeWidth: 2 };
    switch (type) {
      case "danger":
        return <XCircle {...iconProps} />;
      case "warning":
        return <AlertTriangle {...iconProps} />;
      default:
        return <Info {...iconProps} />;
    }
  };

  const getColorClass = () => {
    switch (type) {
      case "danger":
        return "confirm-danger";
      case "warning":
        return "confirm-warning";
      default:
        return "confirm-info";
    }
  };

  const handleConfirm = () => {
    onConfirm();
    if (!loading) {
      onClose();
    }
  };

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className={`confirm-dialog ${getColorClass()}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-icon">{getIcon()}</div>

        <div className="confirm-content">
          <h2 className="confirm-title">{title}</h2>
          <p className="confirm-message">{message}</p>
        </div>

        <div className="confirm-actions">
          <button
            type="button"
            className="btn-confirm-cancel"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn-confirm-action btn-confirm-${type}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="btn-spinner"></div>
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
