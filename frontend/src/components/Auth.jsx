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
const data = await response.json();
throw new Error(data.detail || "Authentication failed");
}

const data = await response.json();

// Save token and username
localStorage.setItem("token", data.access_token);
localStorage.setItem("username", data.username);
		localStorage.setItem("isAdmin", data.is_admin || false);

		// Notify parent component
		onLogin(data.username, data.access_token, data.is_admin || false);
} catch (err) {
setError(err.message);
} finally {
setIsLoading(false);
}
};

return (
<div className="auth-container">
<Logo size="large" className="auth-logo" />
<div className="auth-box">
<h2>{isLogin ? "Login" : "Register"}</h2>

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

<button 
type="submit" 
className="btn btn-primary auth-btn"
disabled={isLoading}
>
{isLoading ? <Spinner label="Loading" size="sm" /> : (isLogin ? "Login" : "Register")}
</button>
</form>

<div className="auth-toggle">
<p>
{isLogin ? "Don't have an account? " : "Already have an account? "}
<button
onClick={() => {
setIsLogin(!isLogin);
setError("");
}}
className="toggle-link"
>
{isLogin ? "Register" : "Login"}
</button>
</p>
</div>

<div className="guest-mode-section">
<div className="divider">
<span>OR</span>
</div>
<button 
onClick={onGuestMode} 
className="btn btn-secondary guest-btn"
>
Continue as Guest
</button>
<p className="guest-notice-text">
Practice without saving statistics
</p>
</div>
</div>
</div>
);
}

export default Auth;
