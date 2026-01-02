import React, { useState, useEffect } from "react";
import Auth from "./components/Auth.jsx";
import Dashboard from "./components/Dashboard.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import Quiz from "./components/Quiz.jsx";
import Logo from "./components/Logo.jsx";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [guestMode, setGuestMode] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUsername = localStorage.getItem("username");
    const savedIsAdmin = localStorage.getItem("isAdmin") === "true";
    
    if (token && savedUsername) {
      setIsAuthenticated(true);
      setUsername(savedUsername);
      setIsAdmin(savedIsAdmin);
    }
  }, []);

  const handleLogin = (user, token, admin = false) => {
    setIsAuthenticated(true);
    setUsername(user);
    setIsAdmin(admin);
    setGuestMode(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("isAdmin");
    setIsAuthenticated(false);
    setUsername(null);
    setIsAdmin(false);
    setShowQuiz(false);
    setGuestMode(false);
  };

  const handleGuestMode = () => {
    setGuestMode(true);
    setShowQuiz(true);
  };

  // Guest mode (no authentication)
  if (!isAuthenticated && !guestMode) {
    return <Auth onLogin={handleLogin} onGuestMode={handleGuestMode} />;
  }

  // Guest mode view
  if (guestMode && !isAuthenticated) {
    return (
      <div className="app">
        <Logo size="large" className="app-logo" />
        <h1>Exam Quiz</h1>
        
        <div className="guest-notice">
          <p>You are using <strong>Guest Mode</strong> - statistics are not saved</p>
          <button onClick={() => setGuestMode(false)} className="btn btn-secondary">
            Login to Save Progress
          </button>
        </div>

        <Quiz username={null} />
      </div>
    );
  }

  // Authenticated user view
  return (
    <div className="app">
      <Logo size="large" className="app-logo" />
      <h1>Exam Quiz</h1>
      
      {isAdmin ? (
        <AdminDashboard onLogout={handleLogout} />
      ) : (
        <>
          <Dashboard username={username} onLogout={handleLogout} />
          
          <div className="quiz-toggle">
            <button 
              onClick={() => setShowQuiz(!showQuiz)} 
              className="btn btn-primary"
            >
              {showQuiz ? "Hide Quiz" : "Start New Quiz"}
            </button>
          </div>

          {showQuiz && <Quiz username={username} />}
        </>
      )}
    </div>
  );
}

export default App;
