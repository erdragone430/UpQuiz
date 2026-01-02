import React from "react";

function Spinner({ label = null, size = "md", block = false }) {
  const sizeClass = size === "sm" ? "spinner-sm" : size === "lg" ? "spinner-lg" : "";
  const blockClass = block ? "spinner-block" : "";

  return (
    <span className={`spinner-wrapper ${sizeClass} ${blockClass}`.trim()} role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {label && <span className="spinner-label">{label}</span>}
    </span>
  );
}

export default Spinner;
