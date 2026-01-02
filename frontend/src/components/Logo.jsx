import React from "react";
import logoImage from "../../assets/img/UpQuizNoBack.png";

function Logo({ size = "medium", className = "" }) {
  const sizes = {
    small: { width: "150px", height: "auto" },
    medium: { width: "220px", height: "auto" },
    large: { width: "320px", height: "auto" }
  };

  return (
    <div className={`logo-container ${className}`}>
      <img 
        src={logoImage} 
        alt="UpQuiz Logo" 
        style={sizes[size]}
        className="logo"
      />
    </div>
  );
}

export default Logo;
