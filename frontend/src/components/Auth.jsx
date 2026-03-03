import React, { useState } from "react";
import Logo from "./Logo.jsx";
import Spinner from "./Spinner.jsx";

const API_BASE = "/api";

function Auth({ onLogin, onGuestMode }) {
	const [isLogin, setIsLogin] = useState(true);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const switchMode = (loginMode) => {
		setIsLogin(loginMode);
		setError("");
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);

		const endpoint = isLogin ? "/auth/login" : "/auth/register";

		try {
			const response = await fetch(`${API_BASE}${endpoint}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, password }),
			});

			if (!response.ok) {
				let errorMessage = "Authentication failed";
				try {
					const data = await response.json();
					errorMessage = data.detail || errorMessage;
				} catch {
					errorMessage = `Server error: ${response.status}`;
				}
				throw new Error(errorMessage);
			}

			const data = await response.json();
			localStorage.setItem("token", data.access_token);
			localStorage.setItem("username", data.username);
			localStorage.setItem("isAdmin", String(data.is_admin || false));
			onLogin(data.username, data.access_token, data.is_admin || false);
		} catch (err) {
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="auth-container">
			<div className="auth-shell">
				<div className="auth-box auth-card">
					<Logo size="medium" className="auth-logo" />
					<h2>{isLogin ? "Log in to your account" : "Create your account"}</h2>
					<p className="auth-subtitle">
						{isLogin ? "Welcome back! Please enter your details." : "Join Upquiz and start tracking your progress."}
					</p>

					<div className="auth-mode-switch" role="tablist" aria-label="Authentication mode">
						<button
							type="button"
							className={`auth-mode-btn ${isLogin ? "active" : ""}`.trim()}
							onClick={() => switchMode(true)}
						>
							Login
						</button>
						<button
							type="button"
							className={`auth-mode-btn ${!isLogin ? "active" : ""}`.trim()}
							onClick={() => switchMode(false)}
						>
							Register
						</button>
					</div>

					<form onSubmit={handleSubmit} className="auth-form">
						<div className="form-field">
							<label htmlFor="username">Username</label>
							<input
								id="username"
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								placeholder="Enter username"
								required
								minLength={3}
								className="auth-input"
							/>
						</div>

						<div className="form-field">
							<label htmlFor="password">Password</label>
							<input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Enter password"
								required
								minLength={6}
								className="auth-input"
							/>
						</div>

						{error && <p className="error-message">{error}</p>}

						<button type="submit" className="btn btn-primary auth-btn" disabled={isLoading}>
							{isLoading ? <Spinner label="Loading" size="sm" /> : (isLogin ? "Sign in" : "Create account")}
						</button>
					</form>

					<div className="guest-mode-section">
						<div className="divider">
							<span>OR</span>
						</div>
						<button onClick={onGuestMode} className="btn btn-secondary guest-btn">
							Continue as Guest
						</button>
						<p className="guest-notice-text">
							{isLogin ? "No account yet? Switch to Register above." : "Already have an account? Switch to Login above."}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

export default Auth;
