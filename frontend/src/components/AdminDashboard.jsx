import React, { useState, useEffect } from "react";
import Spinner from "./Spinner.jsx";

const API_BASE = "/api";

function AdminDashboard({ onLogout }) {
	const [users, setUsers] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		fetchUsers();
	}, []);

	const fetchUsers = async () => {
		const token = localStorage.getItem("token");
		if (!token) {
			setError("No token found");
			setIsLoading(false);
			return;
		}

		try {
			const response = await fetch(`${API_BASE}/auth/admin/users`, {
				headers: {
					"Authorization": `Bearer ${token}`,
				},
			});

			if (!response.ok) {
				if (response.status === 403) {
					setError("Admin access required");
					return;
				}
				throw new Error("Failed to fetch users");
			}

			const data = await response.json();
			setUsers(data);
		} catch (err) {
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="admin-dashboard">
			<div className="dashboard-header">
				<h2>Admin Dashboard</h2>
				<button onClick={onLogout} className="btn btn-logout">
					Logout
				</button>
			</div>

			{isLoading && (
				<div className="loading">
					<Spinner label="Loading users..." block />
				</div>
			)}
			
			{error && <p className="error-message">{error}</p>}
			
			{!isLoading && users.length > 0 && (
				<div className="users-table-container">
					<h3>Registered Users ({users.length})</h3>
					<table className="users-table">
						<thead>
							<tr>
								<th>ID</th>
								<th>Username</th>
								<th>Role</th>
								<th>Quizzes</th>
								<th>Last Login</th>
								<th>Last IP</th>
								<th>Location</th>
								<th>Created At</th>
							</tr>
						</thead>
						<tbody>
							{users.map((user) => (
								<tr key={user.id}>
									<td>{user.id}</td>
									<td className="username-cell">{user.username}</td>
									<td>
										<span className={`role-badge ${user.is_admin ? 'admin' : 'user'}`}>
											{user.is_admin ? 'Admin' : 'User'}
										</span>
									</td>
									<td className="quiz-count">{user.quiz_count}</td>
									<td className="last-login">{user.last_login}</td>
									<td className="ip-cell">{user.last_ip}</td>
									<td className="location-cell">{user.location}</td>
									<td>{user.created_at}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

export default AdminDashboard;
