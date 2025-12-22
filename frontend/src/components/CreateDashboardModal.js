import React, { useState } from 'react';

export default function CreateDashboardModal({ isOpen, onClose, onCreate }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!title.trim()) {
            setError('Dashboard name is required');
            return;
        }

        try {
            setLoading(true);
            const tagsArray = tags
                .split(',')
                .map(t => t.trim())
                .filter(t => t.length > 0);

            await onCreate({
                title: title.trim(),
                description: description.trim(),
                tags: tagsArray
            });

            // Reset form
            setTitle('');
            setDescription('');
            setTags('');
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to create dashboard');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-dashboard-overlay" onClick={onClose}>
            <div className="create-dashboard-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="create-dashboard-header">
                    <div className="header-content">
                        <div className="dashboard-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="2" />
                                <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="2" />
                                <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="2" />
                                <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="2" />
                            </svg>
                        </div>
                        <div>
                            <h2>Create New Dashboard</h2>
                            <p>Design your custom monitoring dashboard</p>
                        </div>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="create-dashboard-body">
                    {/* Dashboard Name */}
                    <div className="form-group">
                        <label htmlFor="dashboard-name">
                            Dashboard Name <span className="required">*</span>
                        </label>
                        <div className="input-with-icon">
                            <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <input
                                id="dashboard-name"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Production Monitoring, System Overview..."
                                autoFocus
                                required
                            />
                        </div>
                        {title.length > 0 && title.length < 3 && (
                            <div className="input-hint error">Name must be at least 3 characters</div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label htmlFor="dashboard-desc">
                            Description <span className="optional">(optional)</span>
                        </label>
                        <div className="input-with-icon">
                            <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeWidth="2" strokeLinecap="round" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <textarea
                                id="dashboard-desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description of what this dashboard monitors..."
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="form-group">
                        <label htmlFor="dashboard-tags">
                            Tags <span className="optional">(optional)</span>
                        </label>
                        <div className="input-with-icon">
                            <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="7" y1="7" x2="7. 01" y2="7" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <input
                                id="dashboard-tags"
                                type="text"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                placeholder="production, kubernetes, monitoring (comma-separated)"
                            />
                        </div>
                        {tags && (
                            <div className="tags-preview">
                                {tags.split(',').map((tag, i) => {
                                    const trimmed = tag.trim();
                                    return trimmed ? (
                                        <span key={i} className="tag-badge">{trimmed}</span>
                                    ) : null;
                                })}
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="error-message">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" />
                                <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-create" disabled={loading || !title.trim() || title.length < 3}>
                            {loading ? (
                                <>
                                    <div className="spinner"></div>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <line x1="12" y1="5" x2="12" y2="19" strokeWidth="2" strokeLinecap="round" />
                                        <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                    Create Dashboard
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
