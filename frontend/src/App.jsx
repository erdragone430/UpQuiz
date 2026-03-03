import React, { useState, useEffect } from "react";
import Auth from "./components/Auth.jsx";
import Dashboard from "./components/Dashboard.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import Quiz from "./components/Quiz.jsx";
import Logo from "./components/Logo.jsx";

const getCurrentPage = () => {
  if (typeof window === "undefined") return "home";
  if (window.location.pathname === "/quiz") return "quiz";
  if (window.location.pathname === "/upquiz") return "upquiz";
  return "home";
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(getCurrentPage());
  const [activeHomeTab, setActiveHomeTab] = useState(() => {
    // Default to "profile" if user is logged in, otherwise "homepage"
    const token = localStorage.getItem("token");
    return token ? "profile" : "homepage";
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUsername = localStorage.getItem("username");
    const savedIsAdmin = localStorage.getItem("isAdmin") === "true";
    
    if (token && savedUsername) {
      setIsAuthenticated(true);
      setUsername(savedUsername);
      setIsAdmin(savedIsAdmin);
      
      // Load profile picture immediately
      const loadProfilePicture = async () => {
        try {
          const response = await fetch("http://localhost:3000/api/auth/profile-picture", {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.profile_picture) {
              setProfilePicture(`http://localhost:3000${data.profile_picture}`);
            }
          }
        } catch (error) {
          console.error("Error loading profile picture:", error);
        }
      };
      
      loadProfilePicture();
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(getCurrentPage());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Only images are allowed");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Max size is 5MB");
      return;
    }

    setUploadingPicture(true);

    try {
      // Load and check image dimensions
      const img = new Image();
      const reader = new FileReader();

      reader.onload = async (e) => {
        img.src = e.target.result;
        
        img.onload = async () => {
          const MAX_DIMENSION = 2048;
          const MIN_DIMENSION = 50;

          // Check minimum dimensions
          if (img.width < MIN_DIMENSION || img.height < MIN_DIMENSION) {
            alert(`Image too small. Minimum ${MIN_DIMENSION}x${MIN_DIMENSION} pixels required`);
            setUploadingPicture(false);
            return;
          }

          let processedFile = file;

          // Resize if image is too large
          if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
            // Calculate new dimensions maintaining aspect ratio
            let newWidth = img.width;
            let newHeight = img.height;

            if (img.width > img.height) {
              if (img.width > MAX_DIMENSION) {
                newWidth = MAX_DIMENSION;
                newHeight = (img.height * MAX_DIMENSION) / img.width;
              }
            } else {
              if (img.height > MAX_DIMENSION) {
                newHeight = MAX_DIMENSION;
                newWidth = (img.width * MAX_DIMENSION) / img.height;
              }
            }

            // Create canvas and resize
            const canvas = document.createElement('canvas');
            canvas.width = newWidth;
            canvas.height = newHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            // Convert to blob
            const blob = await new Promise((resolve) => {
              canvas.toBlob(resolve, file.type, 0.92);
            });

            processedFile = new File([blob], file.name, { type: file.type });
            console.log(`Image resized from ${img.width}x${img.height} to ${newWidth}x${newHeight}`);
          }

          // Upload the processed file
          const formData = new FormData();
          formData.append("file", processedFile);

          const token = localStorage.getItem("token");
          const response = await fetch("http://localhost:3000/api/auth/profile-picture", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`
            },
            body: formData
          });

          if (response.ok) {
            const data = await response.json();
            setProfilePicture(`http://localhost:3000${data.profile_picture}`);
          } else {
            const error = await response.json();
            alert(error.detail || "Failed to upload profile picture");
          }
          
          setUploadingPicture(false);
        };

        img.onerror = () => {
          alert("Failed to load image");
          setUploadingPicture(false);
        };
      };

      reader.onerror = () => {
        alert("Failed to read file");
        setUploadingPicture(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      alert("Failed to upload profile picture");
      setUploadingPicture(false);
    }
  };

  const navigateToQuiz = () => {
    if (window.location.pathname !== "/quiz") {
      window.history.pushState({}, "", "/quiz");
    }
    setCurrentPage("quiz");
  };

  const navigateToHome = () => {
    if (window.location.pathname !== "/") {
      window.history.pushState({}, "", "/");
    }
    setCurrentPage("home");
  };

  const openHomepage = () => {
    setActiveHomeTab("homepage");
    navigateToHome();
  };

  const openUpQuiz = () => {
    if (window.location.pathname !== "/upquiz") {
      window.history.pushState({}, "", "/upquiz");
    }
    setCurrentPage("upquiz");
  };

  const openProfile = () => {
    setActiveHomeTab("profile");
    navigateToHome();
  };

  const openAdminDashboard = () => {
    setActiveHomeTab("admin");
    navigateToHome();
  };

  const openQuiz = () => {
    setActiveHomeTab("homepage");
    navigateToQuiz();
  };

  const goToAuth = () => {
    setActiveHomeTab("homepage");
    setGuestMode(false);
    navigateToHome();
  };

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
    setGuestMode(false);
    navigateToHome();
  };

  const handleGuestMode = () => {
    setGuestMode(true);
    navigateToQuiz();
  };

  const TopBar = () => (
    <div className="top-nav">
      <div className="top-nav-inner">
        <div className="top-nav-spacer" aria-hidden="true" />

        <nav className="top-nav-center" aria-label="Main navigation">
          <a
            href="/upquiz"
            className={`top-nav-link ${currentPage === "upquiz" ? "active" : ""}`.trim()}
            onClick={(e) => {
              e.preventDefault();
              openUpQuiz();
            }}
          >
            UpQuiz
          </a>
          <a
            href="/"
            className={`top-nav-link ${currentPage === "home" && activeHomeTab === "profile" ? "active" : ""}`.trim()}
            onClick={(e) => {
              e.preventDefault();
              openProfile();
            }}
          >
            Profile
          </a>
          {isAdmin && (
            <a
              href="/"
              className={`top-nav-link ${currentPage === "home" && activeHomeTab === "admin" ? "active" : ""}`.trim()}
              onClick={(e) => {
                e.preventDefault();
                openAdminDashboard();
              }}
            >
              Admin Dashboard
            </a>
          )}
          <a
            href="/quiz"
            className={`top-nav-link ${currentPage === "quiz" ? "active" : ""}`.trim()}
            onClick={(e) => {
              e.preventDefault();
              openQuiz();
            }}
          >
            Start Quiz
          </a>
        </nav>

        <div className="top-nav-right">
          {isAuthenticated ? (
            <div className="user-menu-container">
              <div 
                className="top-nav-profile-pic" 
                onClick={() => setShowUserMenu(!showUserMenu)} 
                style={{ cursor: 'pointer' }}
              >
                {profilePicture ? (
                  <img src={profilePicture} alt="Profile" className="top-nav-profile-img" />
                ) : (
                  <div className="top-nav-profile-placeholder">
                    <span>{username ? username[0].toUpperCase() : "U"}</span>
                  </div>
                )}
              </div>
              
              {showUserMenu && (
                <div className="user-menu-dropdown">
                  <div className="user-menu-header">
                    <div className="user-menu-avatar">
                      {profilePicture ? (
                        <img src={profilePicture} alt="Profile" className="user-menu-avatar-img" />
                      ) : (
                        <div className="user-menu-avatar-placeholder">
                          <span>{username ? username[0].toUpperCase() : "U"}</span>
                        </div>
                      )}
                    </div>
                    <div className="user-menu-info">
                      <div className="user-menu-username">{username}</div>
                      <div className="user-menu-role">{isAdmin ? "Administrator" : "User"}</div>
                    </div>
                  </div>
                  
                  <div className="user-menu-divider"></div>
                  
                  <div className="user-menu-items">
                    <button 
                      className="user-menu-item" 
                      onClick={() => { 
                        setShowUserMenu(false); 
                        openProfile(); 
                      }}
                    >
                      <svg className="user-menu-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      <span>Profile</span>
                    </button>
                    
                    {isAdmin && (
                      <button 
                        className="user-menu-item" 
                        onClick={() => { 
                          setShowUserMenu(false); 
                          openAdminDashboard(); 
                        }}
                      >
                        <svg className="user-menu-icon" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        </svg>
                        <span>Admin Dashboard</span>
                      </button>
                    )}
                    
                    <div className="user-menu-divider"></div>
                    
                    <button 
                      className="user-menu-item user-menu-item-danger" 
                      onClick={() => { 
                        setShowUserMenu(false); 
                        handleLogout(); 
                      }}
                    >
                      <svg className="user-menu-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                      </svg>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button type="button" className="top-nav-logout" onClick={goToAuth}>
              Log in
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const UpQuizPresentation = () => (
    <div className="upquiz-presentation top-nav-page">
      <section className="upquiz-hero">
        <p className="upquiz-kicker">Welcome to UpQuiz</p>
        <h1>Practice smarter, improve faster.</h1>
        <p>
          UpQuiz is a focused exam practice platform that helps you train with realistic quizzes,
          review mistakes clearly, and track your progress over time.
        </p>
      </section>

      <section className="upquiz-story">
        <h2>Why I created UpQuiz</h2>
        <p>
          UpQuiz was born from the need to have a platform to upload a file with quizzes and generate exam simulations. 
          I know how frustrating it can be to prepare for exams you don't enjoy, where the exam format itself is a joke. 
          I hope this tool can help you.
        </p>
        <p>
          If it helped you, feel free to contact me and star the{" "}
          <a href="https://github.com/erdragone430/UpQuiz" target="_blank" rel="noopener noreferrer" className="github-link">
            GitHub repo
          </a>.
        </p>
        <div className="social-links">
          <a href="https://www.linkedin.com/in/fabio-tommaselli-5b58b7327/" target="_blank" rel="noopener noreferrer" className="social-link" title="LinkedIn">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
          <a href="https://github.com/erdragone430" target="_blank" rel="noopener noreferrer" className="social-link" title="GitHub">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          <a href="https://fabiotommaselli.net" target="_blank" rel="noopener noreferrer" className="social-link" title="Portfolio">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
            </svg>
          </a>
        </div>
      </section>
    </div>
  );

  if (currentPage === "upquiz") {
    return (
      <div className="app-shell">
        <TopBar />
        <UpQuizPresentation />
      </div>
    );
  }

  if (!isAuthenticated && (!guestMode || currentPage !== "quiz")) {
    return <Auth onLogin={handleLogin} onGuestMode={handleGuestMode} />;
  }

  if (guestMode && !isAuthenticated && currentPage === "quiz") {
    return (
      <div className="app-shell">
        <TopBar />
        <div className="quiz-page top-nav-page">
          <div className="quiz-page-header">
            <div className="quiz-page-title">
              <span className="quiz-page-kicker">Upquiz Session</span>
              <h1>Exam Quiz</h1>
              <div className="quiz-page-meta">
                <span className="quiz-user-pill">Guest User</span>
                <span className="quiz-status-pill guest">Guest Mode</span>
              </div>
            </div>
          </div>

          <div className="quiz-page-body">
            <div className="quiz-page-main">
              <Quiz username={null} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === "quiz") {
    return (
      <div className="app-shell">
        <TopBar />
        <div className="quiz-page top-nav-page">
          <div className="quiz-page-header">
            <div className="quiz-page-title">
              <span className="quiz-page-kicker">Upquiz Session</span>
              <h1>Quiz Session</h1>
              <div className="quiz-page-meta">
                <span className="quiz-user-pill">{username}</span>
                <span className="quiz-status-pill">In Progress</span>
              </div>
            </div>
          </div>

          <div className="quiz-page-body">
            <div className="quiz-page-main">
              <Quiz username={username} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar />
      <div className="app app-wide top-nav-page">
        {activeHomeTab === "admin" && isAdmin ? (
          <div className="admin-view">
            <div className="admin-header">
              <h2>Admin Dashboard</h2>
            </div>
            <AdminDashboard onLogout={handleLogout} />
          </div>
        ) : activeHomeTab === "profile" ? (
          <div className="profile-view">
            <div className="profile-header">
              <div className="profile-picture-section">
                <div className="profile-picture-container">
                  {profilePicture ? (
                    <img src={profilePicture} alt="Profile" className="profile-picture" />
                  ) : (
                    <div className="profile-picture-placeholder">
                      <span>{username ? username[0].toUpperCase() : "U"}</span>
                    </div>
                  )}
                  <label htmlFor="profile-picture-input" className="profile-picture-upload-btn">
                    {uploadingPicture ? "Uploading..." : "Change Photo"}
                  </label>
                  <input
                    id="profile-picture-input"
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureUpload}
                    style={{ display: "none" }}
                    disabled={uploadingPicture}
                  />
                </div>
                <h2>Welcome, {username}</h2>
              </div>
            </div>
            <Dashboard username={username} onLogout={handleLogout} view="profile" />
          </div>
        ) : (
          <Dashboard username={username} onLogout={handleLogout} />
        )}
      </div>
    </div>
  );
}

export default App;
