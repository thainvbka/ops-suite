import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function JuiceShopApp({ token }) {
    const [loading, setLoading] = useState(true);
    const [challenges, setChallenges] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        solved: 0,
        completion: 0
    });

    useEffect(() => {
        fetchChallenges();
    }, []);

    const fetchChallenges = async () => {
        try {
            setLoading(true);
            // Fetch from Juice Shop API
            const response = await axios.get('http://localhost:3001/api/Challenges');
            const data = response.data.data || [];

            setChallenges(data);

            // Calculate stats
            const solved = data.filter(c => c.solved === true || c.solved === 1).length;
            const total = data.length;
            const completion = total > 0 ? Math.round((solved / total) * 100) : 0;

            setStats({ total, solved, completion });
            setLoading(false);
        } catch (err) {
            console.error('Error fetching Juice Shop challenges:', err);
            setLoading(false);
        }
    };

    const getDifficultyColor = (difficulty) => {
        const colors = {
            1: '#10b981', // easy - green
            2: '#3b82f6', // medium - blue
            3: '#f59e0b', // hard - orange
            4: '#ef4444', // very hard - red
            5: '#dc2626', // extreme - dark red
            6: '#7c2d12'  // insane - very dark red
        };
        return colors[difficulty] || '#6b7280';
    };

    const getDifficultyLabel = (difficulty) => {
        const labels = {
            1: '⭐ Easy',
            2: '⭐⭐ Medium',
            3: '⭐⭐⭐ Hard',
            4: '⭐⭐⭐⭐ Very Hard',
            5: '⭐⭐⭐⭐⭐ Extreme',
            6: '⭐⭐⭐⭐⭐⭐ Insane'
        };
        return labels[difficulty] || 'Unknown';
    };

    const groupedByCategory = challenges.reduce((acc, challenge) => {
        const category = challenge.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(challenge);
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="juice-shop-app">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading Juice Shop challenges...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="juice-shop-app">
            {/* Header */}
            <div className="juice-shop-header">
                <div className="juice-shop-title">
                    <img
                        src="http://localhost:3001/assets/public/images/JuiceShop_Logo.png"
                        alt="Juice Shop"
                        style={{ height: 60, marginRight: 16 }}
                    />
                    <div>
                        <h1>🧃 OWASP Juice Shop</h1>
                        <p>Security Training & CTF Platform</p>
                    </div>
                </div>
                <button className="btn-primary" onClick={fetchChallenges}>
                    🔄 Refresh
                </button>
            </div>

            {/* Stats Overview */}
            <div className="juice-shop-stats">
                <div className="stat-card">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Total Challenges</div>
                </div>
                <div className="stat-card success">
                    <div className="stat-value">{stats.solved}</div>
                    <div className="stat-label">Solved</div>
                </div>
                <div className="stat-card primary">
                    <div className="stat-value">{stats.completion}%</div>
                    <div className="stat-label">Completion</div>
                </div>
                <div className="stat-card progress">
                    <div className="progress-bar-container">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${stats.completion}%` }}
                        ></div>
                    </div>
                    <div className="stat-label">Progress</div>
                </div>
            </div>

            {/* Challenges by Category */}
            <div className="juice-shop-challenges">
                {Object.entries(groupedByCategory).map(([category, categoryChallenges]) => {
                    const categorySolved = categoryChallenges.filter(c => c.solved).length;
                    const categoryTotal = categoryChallenges.length;
                    const categoryProgress = Math.round((categorySolved / categoryTotal) * 100);

                    return (
                        <div key={category} className="challenge-category">
                            <div className="category-header">
                                <h2>{category}</h2>
                                <div className="category-progress">
                                    <span>{categorySolved}/{categoryTotal}</span>
                                    <div className="mini-progress">
                                        <div
                                            className="mini-progress-fill"
                                            style={{ width: `${categoryProgress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            <div className="challenges-grid">
                                {categoryChallenges
                                    .sort((a, b) => a.difficulty - b.difficulty)
                                    .map((challenge) => (
                                        <div
                                            key={challenge.id}
                                            className={`challenge-card ${challenge.solved ? 'solved' : ''}`}
                                        >
                                            <div className="challenge-header">
                                                <h3>{challenge.name}</h3>
                                                {challenge.solved && (
                                                    <div className="solved-badge">✓ Solved</div>
                                                )}
                                            </div>

                                            <p className="challenge-description">{challenge.description}</p>

                                            <div className="challenge-footer">
                                                <div
                                                    className="difficulty-badge"
                                                    style={{
                                                        background: getDifficultyColor(challenge.difficulty),
                                                        color: '#fff',
                                                        padding: '4px 12px',
                                                        borderRadius: '12px',
                                                        fontSize: '12px',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    {getDifficultyLabel(challenge.difficulty)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
