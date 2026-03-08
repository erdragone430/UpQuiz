import React, { useState } from "react";
import Spinner from "./Spinner.jsx";
import FileFormatInfo from "./FileFormatInfo.jsx";

const API_BASE = "/api";

function PDFUpload({ username, onQuizGenerated }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Processing, 3: Preview
  const [pdfFile, setPdfFile] = useState(null);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState(null); // null, true, false
  const [error, setError] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [showApiKeyInfo, setShowApiKeyInfo] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;
    if (selected && selected.type === "application/pdf") {
      setPdfFile(selected);
      setError(null);
    } else {
      setPdfFile(null);
      setError("Please select a valid PDF file");
    }
  };

  const handleTestApiKey = async () => {
    if (!geminiApiKey || geminiApiKey.trim().length < 20) {
      setError("Please enter a valid Gemini API key");
      return;
    }

    setIsTestingKey(true);
    setError(null);
    setApiKeyValid(null);

    try {
      const response = await fetch(`${API_BASE}/pdf/test-api-key`, {
        method: "POST",
        headers: {
          "X-Gemini-API-Key": geminiApiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Invalid API key");
      }

      const data = await response.json();
      setApiKeyValid(true);
      
    } catch (err) {
      setApiKeyValid(false);
      setError(err.message || "API key validation failed");
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleUploadAndParse = async () => {
    if (!pdfFile) {
      setError("Please select a PDF file");
      return;
    }

    if (!geminiApiKey || geminiApiKey.trim().length < 20) {
      setError("Please enter a valid Gemini API key");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setStep(2);

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);

      const response = await fetch(`${API_BASE}/pdf/parse`, {
        method: "POST",
        headers: {
          "X-Gemini-API-Key": geminiApiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }

      const data = await response.json();
      
      setParsedData(data);
      setWarnings(data.warnings || []);
      setStep(3); // Move to preview step

    } catch (err) {
      setError(err.message || "Error processing PDF");
      setStep(1); // Go back to upload step
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseQuiz = () => {
    if (parsedData && parsedData.quiz_txt_format) {
      // Create a Blob with the quiz text format
      const blob = new Blob([parsedData.quiz_txt_format], { type: "text/plain" });
      const file = new File([blob], "parsed_quiz.txt", { type: "text/plain" });
      
      // Call parent callback to load the quiz
      if (onQuizGenerated) {
        onQuizGenerated(file, parsedData.quiz_txt_format);
      }
    }
  };

  const handleDownloadTxt = () => {
    if (parsedData && parsedData.quiz_txt_format) {
      const blob = new Blob([parsedData.quiz_txt_format], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "parsed_quiz.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleReset = () => {
    setStep(1);
    setPdfFile(null);
    setGeminiApiKey("");
    setParsedData(null);
    setWarnings([]);
    setError(null);
  };

  return (
    <div className="pdf-upload-container">
      <div className="pdf-upload-header">
        <h2>📄 PDF Quiz Parser</h2>
        <p className="pdf-upload-subtitle">
          Upload a Moodle exam PDF and let AI extract the questions
        </p>
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="pdf-upload-step">
          <div className="form-group">
            <label htmlFor="pdf-file">1. Select PDF File</label>
            <input
              id="pdf-file"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="file-input"
            />
            {pdfFile && (
              <div className="selected-file">
                ✓ Selected: {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="gemini-key">
              2. Enter Your Gemini API Key
              <button
                type="button"
                onClick={() => setShowApiKeyInfo(true)}
                className="info-icon-btn"
                title="What is this?"
              >
                ?
              </button>
            </label>
            <div className="api-key-input-group">
              <input
                id="gemini-key"
                type="password"
                placeholder="AIzaSy..."
                value={geminiApiKey}
                onChange={(e) => {
                  setGeminiApiKey(e.target.value);
                  setApiKeyValid(null); // Reset validation when key changes
                }}
                className="api-key-input"
              />
              <button
                type="button"
                onClick={handleTestApiKey}
                disabled={!geminiApiKey || isTestingKey}
                className="btn btn-secondary btn-test-key"
              >
                {isTestingKey ? <Spinner label="" size="sm" /> : apiKeyValid === true ? "✓ Valid" : apiKeyValid === false ? "✗ Invalid" : "Test Key"}
              </button>
            </div>
            {apiKeyValid === true && (
              <div className="api-key-status valid">
                ✓ API key is valid and ready to use
              </div>
            )}
            {apiKeyValid === false && (
              <div className="api-key-status invalid">
                ✗ API key is invalid. Please check and try again.
              </div>
            )}
            <small className="help-text">
              Your API key is only used for this request and never stored on our servers.
              <br />
              Get a free key at{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google AI Studio
              </a>
            </small>
          </div>

          <button
            onClick={handleUploadAndParse}
            disabled={!pdfFile || !geminiApiKey || isProcessing || apiKeyValid === false}
            className="btn btn-primary btn-large"
          >
            Parse PDF with AI
          </button>

          {error && (
            <div className="error-message">
              <strong>❌ Error:</strong>
              <p>{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Processing */}
      {step === 2 && (
        <div className="pdf-processing">
          <Spinner label="Processing PDF with AI..." block />
          <p className="processing-message">
            This may take 10-30 seconds depending on PDF size...
          </p>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && parsedData && (
        <div className="pdf-preview-step">
          <div className="preview-header">
            <h3>✓ PDF Parsed Successfully!</h3>
            <div className="preview-stats">
              <span className="stat-badge">
                📝 {parsedData.metadata.questions_found} questions found
              </span>
              <span className="stat-badge">
                📄 {parsedData.metadata.pages} pages
              </span>
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="warning-message">
              <strong>⚠️ Warnings:</strong>
              <ul>
                {warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
              <p>
                <small>
                  These warnings indicate incomplete data in the PDF. You can still use the
                  quiz, but you may want to review and manually correct the questions.
                </small>
              </p>
            </div>
          )}

          {parsedData.parsed_data.student_name && (
            <div className="metadata-box">
              <h4>Exam Metadata:</h4>
              <ul>
                {parsedData.parsed_data.student_name && (
                  <li><strong>Student:</strong> {parsedData.parsed_data.student_name}</li>
                )}
                {parsedData.parsed_data.course_name && (
                  <li><strong>Course:</strong> {parsedData.parsed_data.course_name}</li>
                )}
                {parsedData.parsed_data.exam_date && (
                  <li><strong>Date:</strong> {parsedData.parsed_data.exam_date}</li>
                )}
              </ul>
            </div>
          )}

          <div className="questions-preview">
            <h4>Questions Preview:</h4>
            <div className="preview-scroll">
              {parsedData.parsed_data.questions.slice(0, 3).map((q, idx) => (
                <div key={idx} className="question-preview-item">
                  <strong>Q{q.question_number}:</strong> {q.question_text}
                  {q.question_type === "multiple_choice" && q.options && (
                    <div className="options-preview">
                      {q.options.map((opt, oidx) => (
                        <div key={oidx}>• {opt}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {parsedData.parsed_data.questions.length > 3 && (
                <p className="preview-more">
                  ... and {parsedData.parsed_data.questions.length - 3} more questions
                </p>
              )}
            </div>
          </div>

          <div className="preview-actions">
            <button onClick={handleUseQuiz} className="btn btn-primary btn-large">
              Use This Quiz
            </button>
            <button onClick={handleDownloadTxt} className="btn btn-secondary">
              Download as .txt
            </button>
            <button onClick={handleReset} className="btn btn-secondary">
              Parse Another PDF
            </button>
          </div>
        </div>
      )}

      {showApiKeyInfo && (
        <div className="modal-overlay" onClick={() => setShowApiKeyInfo(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>About Gemini API Key</h3>
              <button onClick={() => setShowApiKeyInfo(false)} className="modal-close">
                ×
              </button>
            </div>
            <div className="modal-body">
              <h4>Why do I need an API key?</h4>
              <p>
                This feature uses Google's Gemini AI to intelligently parse PDF documents
                and extract quiz questions. The API key allows the AI to process your PDF.
              </p>

              <h4>Is it free?</h4>
              <p>
                Yes! Google provides a generous free tier for Gemini API that includes:
              </p>
              <ul>
                <li>15 requests per minute</li>
                <li>1 million tokens per day</li>
                <li>1500 requests per day</li>
              </ul>
              <p>This is more than enough for personal quiz creation!</p>

              <h4>How to get an API key?</h4>
              <ol>
                <li>
                  Visit{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google AI Studio
                  </a>
                </li>
                <li>Sign in with your Google account</li>
                <li>Click "Create API Key"</li>
                <li>Copy the key and paste it here</li>
              </ol>

              <h4>Is my key safe?</h4>
              <p>
                Yes! Your API key is only sent directly from your browser to Google's
                servers. We never store or log your API key on our servers.
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowApiKeyInfo(false)} className="btn btn-primary">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PDFUpload;
