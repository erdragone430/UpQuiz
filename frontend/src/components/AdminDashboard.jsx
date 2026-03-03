import React, { useState, useEffect } from "react";
import Spinner from "./Spinner.jsx";

const API_BASE = "/api";

function AdminDashboard({ onLogout }) {
	const [users, setUsers] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [sortOrder, setSortOrder] = useState("asc"); // "asc" o "desc"
	const ITEMS_PER_PAGE = 10;

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

	// Filtra gli utenti in base alla ricerca
	const filteredUsers = users.filter((user) =>
		user.username.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// Ordina gli utenti per ID
	const sortedUsers = [...filteredUsers].sort((a, b) => {
		if (sortOrder === "asc") {
			return a.id - b.id;
		} else {
			return b.id - a.id;
		}
	});

	// Calcola la paginazione
	const totalPages = Math.ceil(sortedUsers.length / ITEMS_PER_PAGE);
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const endIndex = startIndex + ITEMS_PER_PAGE;
	const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

	// Reset a pagina 1 quando la ricerca cambia
	const handleSearch = (e) => {
		setSearchQuery(e.target.value);
		setCurrentPage(1);
	};

	// Cambia l'ordine di sort
	const toggleSortOrder = () => {
		setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		setCurrentPage(1);
	};

	return (
		<div className="admin-dashboard">
			{isLoading && (
				<div className="loading">
					<Spinner label="Loading users..." block />
				</div>
			)}
			
			{error && <p className="error-message">{error}</p>}
			
			{!isLoading && users.length > 0 && (
				<div className="users-table-container">
					<div className="users-header">
						<h3>Registered Users ({users.length})</h3>
						<div className="search-and-sort">
							<div className="search-box">
								<input
									type="text"
									placeholder="Search by username..."
									value={searchQuery}
									onChange={handleSearch}
									className="search-input"
								/>
							</div>
							<button
								onClick={toggleSortOrder}
								className="btn btn-sort"
								title={`Sort by ID: ${sortOrder === "asc" ? "Ascending ↑" : "Descending ↓"}`}
							>
								ID {sortOrder === "asc" ? "↑" : "↓"}
							</button>
						</div>
					</div>

					{filteredUsers.length === 0 ? (
						<p className="no-results">No users found matching "{searchQuery}"</p>
					) : (
						<>
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
									{paginatedUsers.map((user) => (
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

							{totalPages > 1 && (
								<div className="pagination">
									<button
										onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
										disabled={currentPage === 1}
										className="btn btn-pagination"
									>
										← Previous
									</button>

									<div className="pagination-info">
										Page {currentPage} of {totalPages}
									</div>

									<button
										onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
										disabled={currentPage === totalPages}
										className="btn btn-pagination"
									>
										Next →
									</button>
								</div>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
}

export default AdminDashboard;
