import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

function NotificationChannels() {
    const [channels, setChannels] = useState([]);
    const [showEditor, setShowEditor] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        fetchChannels();
    }, []);

    const fetchChannels = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/notification-channels`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setChannels(res.data.channels || []);
            setErrorMsg('');
        } catch (err) {
            console.error('Error fetching channels:', err);
            setErrorMsg('Failed to fetch notification channels');
        }
    };

    const deleteChannel = async (id) => {
        if (!window.confirm('Delete this notification channel?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/notification-channels/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchChannels();
        } catch (err) {
            console.error('Error deleting channel:', err);
            alert('Failed to delete channel');
        }
    };

    const testChannel = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/notification-channels/${id}/test`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Test notification sent! Check your configured channel.');
        } catch (err) {
            console.error('Error testing channel:', err);
            alert(err.response?.data?.error || 'Failed to send test notification');
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'email': return '📧';
            case 'slack': return '💬';
            case 'discord': return '🎮';
            case 'webhook': return '🔗';
            default: return '🔔';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'email': return '#3b82f6';
            case 'slack': return '#4a154b';
            case 'discord': return '#5865f2';
            case 'webhook': return '#10b981';
            default: return '#6b7280';
        }
    };

    return (
        <div className="alerts-page">
            <div className="page-header">
                <h2>Notification Channels</h2>
                <button className="btn-primary" onClick={() => setShowEditor(true)}>
                    + Add Channel
                </button>
            </div>

            {errorMsg && <div className="error-banner">{errorMsg}</div>}

            <div className="channels-grid">
                {channels.length === 0 ? (
                    <div className="empty-state">
                        <h3>No notification channels configured</h3>
                        <p>Add a channel to receive alert notifications</p>
                    </div>
                ) : (
                    channels.map(channel => (
                        <div key={channel.id} className="channel-card">
                            <div className="channel-header">
                                <div className="channel-icon" style={{ background: getTypeColor(channel.type) }}>
                                    {getTypeIcon(channel.type)}
                                </div>
                                <div className="channel-info">
                                    <h3>{channel.name}</h3>
                                    <span className="channel-type">{channel.type}</span>
                                </div>
                                <div className={`channel-status ${channel.is_enabled ? 'enabled' : 'disabled'}`}>
                                    {channel.is_enabled ? '✓ Enabled' : '✗ Disabled'}
                                </div>
                            </div>

                            <div className="channel-actions">
                                <button
                                    className="btn"
                                    onClick={() => testChannel(channel.id)}
                                    disabled={!channel.is_enabled}
                                >
                                    Test
                                </button>
                                <button className="btn" onClick={() => {
                                    setSelectedChannel(channel);
                                    setShowEditor(true);
                                }}>
                                    Edit
                                </button>
                                <button className="btn btn-danger" onClick={() => deleteChannel(channel.id)}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showEditor && (
                <ChannelEditor
                    channel={selectedChannel}
                    onClose={() => {
                        setShowEditor(false);
                        setSelectedChannel(null);
                    }}
                    onSave={() => {
                        fetchChannels();
                        setShowEditor(false);
                        setSelectedChannel(null);
                    }}
                />
            )}
        </div>
    );
}

function ChannelEditor({ channel, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: channel?.name || '',
        type: channel?.type || 'email',
        is_enabled: channel?.is_enabled !== false,
        config: channel?.config || {}
    });
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Parse config if it's a string
    useEffect(() => {
        if (channel?.config) {
            const config = typeof channel.config === 'string'
                ? JSON.parse(channel.config)
                : channel.config;
            setFormData(prev => ({ ...prev, config }));
        }
    }, [channel]);

    const updateConfig = (key, value) => {
        setFormData(prev => ({
            ...prev,
            config: { ...prev.config, [key]: value }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate config
        if (formData.type === 'email' && !formData.config.recipients) {
            setErrorMsg('Email recipients are required');
            return;
        }
        if (['slack', 'webhook', 'discord'].includes(formData.type) && !formData.config.url) {
            setErrorMsg('Webhook URL is required');
            return;
        }

        try {
            setSaving(true);
            const token = localStorage.getItem('token');

            const payload = {
                name: formData.name,
                type: formData.type,
                config: formData.config,
                is_enabled: formData.is_enabled
            };

            if (channel) {
                await axios.put(`${API_URL}/notification-channels/${channel.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/notification-channels`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            onSave();
            setErrorMsg('');
        } catch (err) {
            console.error('Error saving channel:', err);
            setErrorMsg(err.response?.data?.error || 'Failed to save channel');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="query-editor-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{channel ? 'Edit Channel' : 'Add Notification Channel'}</h3>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="editor-section">
                        <h4>Channel Name</h4>
                        <input
                            type="text"
                            className="editor-select"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Production Alerts"
                            required
                        />
                    </div>

                    <div className="editor-section">
                        <h4>Channel Type</h4>
                        <select
                            className="editor-select"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value, config: {} })}
                            disabled={!!channel}
                        >
                            <option value="email">📧 Email</option>
                            <option value="slack">💬 Slack</option>
                            <option value="discord">🎮 Discord</option>
                            <option value="webhook">🔗 Generic Webhook</option>
                        </select>
                        {channel && <p className="help-text">Type cannot be changed after creation</p>}
                    </div>

                    {formData.type === 'email' && (
                        <div className="editor-section">
                            <h4>Email Recipients</h4>
                            <input
                                type="text"
                                className="editor-select"
                                value={formData.config.recipients || ''}
                                onChange={(e) => updateConfig('recipients', e.target.value)}
                                placeholder="admin@example.com, team@example.com"
                                required
                            />
                            <p className="help-text">Comma-separated email addresses</p>
                        </div>
                    )}

                    {formData.type === 'slack' && (
                        <div className="editor-section">
                            <h4>Slack Webhook URL</h4>
                            <input
                                type="url"
                                className="editor-select"
                                value={formData.config.url || ''}
                                onChange={(e) => updateConfig('url', e.target.value)}
                                placeholder="https://hooks.slack.com/services/..."
                                required
                            />
                            <p className="help-text">
                                Get webhook URL from Slack: <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noreferrer">Incoming Webhooks</a>
                            </p>
                        </div>
                    )}

                    {formData.type === 'discord' && (
                        <div className="editor-section">
                            <h4>Discord Webhook URL</h4>
                            <input
                                type="url"
                                className="editor-select"
                                value={formData.config.url || ''}
                                onChange={(e) => updateConfig('url', e.target.value)}
                                placeholder="https://discord.com/api/webhooks/..."
                                required
                            />
                            <p className="help-text">
                                Get webhook URL from Discord server settings → Integrations → Webhooks
                            </p>
                        </div>
                    )}

                    {formData.type === 'webhook' && (
                        <>
                            <div className="editor-section">
                                <h4>Webhook URL</h4>
                                <input
                                    type="url"
                                    className="editor-select"
                                    value={formData.config.url || ''}
                                    onChange={(e) => updateConfig('url', e.target.value)}
                                    placeholder="https://your-webhook-endpoint.com/alerts"
                                    required
                                />
                            </div>
                            <div className="editor-section">
                                <h4>HTTP Method</h4>
                                <select
                                    className="editor-select"
                                    value={formData.config.method || 'POST'}
                                    onChange={(e) => updateConfig('method', e.target.value)}
                                >
                                    <option value="POST">POST</option>
                                    <option value="PUT">PUT</option>
                                </select>
                            </div>
                        </>
                    )}

                    <div className="editor-section">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="checkbox"
                                checked={formData.is_enabled}
                                onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                            />
                            <span>Enabled</span>
                        </label>
                    </div>

                    {errorMsg && <div className="error-banner">{errorMsg}</div>}

                    <div className="modal-footer">
                        <button type="button" className="btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Channel'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default NotificationChannels;
