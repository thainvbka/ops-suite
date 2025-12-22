import React from 'react';

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger', // 'danger', 'warning', 'info'
    loading = false
}) {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger':
                return (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        <line x1="15" y1="9" x2="9" y2="15" strokeWidth="2" strokeLinecap="round" />
                        <line x1="9" y1="9" x2="15" y2="15" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="12" y1="9" x2="12" y2="13" strokeWidth="2" strokeLinecap="round" />
                        <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                );
            default:
                return (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        <line x1="12" y1="16" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" />
                        <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                );
        }
    };

    const getColorClass = () => {
        switch (type) {
            case 'danger':
                return 'confirm-danger';
            case 'warning':
                return 'confirm-warning';
            default:
                return 'confirm-info';
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
                <div className="confirm-icon">
                    {getIcon()}
                </div>

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
