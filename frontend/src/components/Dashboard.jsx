import React, { useState, useEffect } from "react";

const API_BASE = "/api";

function Dashboard({ username, onLogout }) {
	const [stats, setStats] = useState(null);
	const [history, setHistory] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		fetchStats();
		fetchHistory();
	}, []);

	const fetchStats = async () => {
		const token = localStorage.getItem("token");
		if (!token) {
			setError("No token found");
			setIsLoading(false);
			return;
		}

		try {
			const response = await fetch(`${API_BASE}/auth/stats`, {
				headers: {
					"Authorization": `Bearer ${token}`,
				},
			});

			if (!response.ok) {
				if (response.status === 401) {
					setError("Session expired. Please login again.");
					onLogout();
					return;
				}
				throw new Error("Failed to fetch statistics");
			}

			const data = await response.json();
			setStats(data);
		} catch (err) {
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchHistory = async () => {
		const token = localStorage.getItem("token");
		if (!token) return;

		try {
			const response = await fetch(`${API_BASE}/auth/history`, {
				headers: {
					"Authorization": `Bearer ${token}`,
				},
			});

			if (response.ok) {
				const data = await response.json();
				setHistory(data);
			}
		} catch (err) {
			console.error("Failed to fetch history:", err);
		}
	};

	const formatTime = (seconds) => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
	};

	return (
		<div className="dashboard">
			<div className="dashboard-header">
				<h2>Welcome, {username}!</h2>
				<button onClick={onLogout} className="btn btn-logout">
					Logout
				</button>
			</div>

			{isLoading && <p className="loading">Loading statistics...</p>}
			
			{error && <p className="error-message">{error}</p>}
			
			{stats && !isLoading && (
			<>
				{stats.total_quizzes === 0 ? (
					<div className="no-stats">
						<p>No statistics yet</p>
						<p className="no-stats-hint">Complete your first quiz to see your stats here!</p>
					</div>
				) : (
					<div className="stats-grid">
						<div className="stat-card">
							<div className="stat-value">{stats.total_quizzes}</div>
							<div className="stat-label">Total Quizzes</div>
						</div>

						<div className="stat-card">
							<div className="stat-value">{stats.average_score.toFixed(1)}</div>
							<div className="stat-label">Average Score</div>
						</div>

						<div className="stat-card">
							<div className="stat-value correct">{stats.total_correct}</div>
							<div className="stat-label">Correct Answers</div>
						</div>

					<div className="stat-card">
						<div className="stat-value no-answer">{stats.total_unanswered}</div>
						<div className="stat-label">Unanswered</div>
					</div>

					<div className="stat-card">
						<div className="stat-value">{formatTime(stats.total_time_spent)}</div>
						<div className="stat-label">Time Spent</div>
					</div>
				</div>
				)}

				{history.length > 0 && (
					<div className="quiz-history">
						<h3>Quiz History</h3>
						<div className="history-list">
							{history.map((item, idx) => (
								<div key={idx} className="history-item">
									<div className="history-quiz-name">{item.quiz_name}</div>
									<div className="history-details">
										<span className="history-score">
											Score: {item.score.toFixed(2)} / {item.max_score} ({item.score_percentage}%)
										</span>
										<span className="history-attempt">Attempt #{item.attempt_number}</span>
										<span className="history-time">Time: {formatTime(item.time_spent)}</span>
										<span className="history-date">{item.completed_at}</span>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</>
		)}
		</div>
	);
}

export default Dashboard;
