import React, { useState } from "react";
import Result from "./Result.jsx";
import FileFormatInfo from "./FileFormatInfo.jsx";

const API_BASE = "/api";

function Quiz({ username }) {
const [file, setFile] = useState(null);
const [fileContent, setFileContent] = useState("");
const [questions, setQuestions] = useState([]);
const [answers, setAnswers] = useState({});
const [result, setResult] = useState(null);
const [isLoading, setIsLoading] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
const [error, setError] = useState(null);
const [warnings, setWarnings] = useState([]);
const [showFormatInfo, setShowFormatInfo] = useState(false);
const [startTime, setStartTime] = useState(null);

const handleFileChange = (e) => {
const selected = e.target.files?.[0] || null;
setFile(selected);
setQuestions([]);
setAnswers({});
setResult(null);
setError(null);
setWarnings([]);

if (selected) {
const reader = new FileReader();
reader.onload = (event) => {
setFileContent(event.target?.result || "");
};
reader.readAsText(selected);
} else {
setFileContent("");
}
};

const startQuiz = async () => {
if (!file) {
setError("Select a .txt file");
return;
}

const formData = new FormData();
formData.append("file", file);

setIsLoading(true);
setError(null);
setWarnings([]);
setResult(null);
try {
const resp = await fetch(`${API_BASE}/quiz/simulate`, {
method: "POST",
body: formData,
});
if (!resp.ok) {
const detail = await resp.json().catch(() => ({}));
throw new Error(detail.detail || `API Error ${resp.status}`);
}
const data = await resp.json();
setQuestions(data.questions || []);
setAnswers({});
if (data.warnings && data.warnings.length > 0) {
setWarnings(data.warnings);
}
setStartTime(Date.now()); // Start timer
} catch (err) {
setError(err.message || "Error loading quiz");
} finally {
setIsLoading(false);
}
};

const handleAnswerChange = (questionText, option) => {
setAnswers((prev) => ({ ...prev, [questionText]: option }));
};

const submitQuiz = async () => {
if (!questions.length) return;

const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
const token = localStorage.getItem("token");

const payload = {
original_file_content: fileContent,
quiz_name: file?.name || "Unknown Quiz",
time_spent: timeSpent,
questions: questions.map((q) => ({
question: q.question,
answer: answers[q.question] || "",
})),
};

setIsSubmitting(true);
setError(null);
try {
const headers = { "Content-Type": "application/json" };
if (token) {
headers["Authorization"] = `Bearer ${token}`;
}

const resp = await fetch(`${API_BASE}/quiz/submit`, {
method: "POST",
headers: headers,
body: JSON.stringify(payload),
});
if (!resp.ok) {
const detail = await resp.json().catch(() => ({}));
throw new Error(detail.detail || `Submission Error ${resp.status}`);
}
const data = await resp.json();
setResult(data);
} catch (err) {
setError(err.message || "Error submitting quiz");
} finally {
setIsSubmitting(false);
}
};

return (
<div>
<div className="upload-form">
<div className="upload-header">
<h2>Upload .txt File</h2>
<button 
onClick={() => setShowFormatInfo(true)} 
className="format-help-link"
type="button"
>
<span className="help-icon">?</span> File Format Guide
</button>
</div>
<div className="form-group">
<input 
type="file" 
accept=".txt" 
onChange={handleFileChange}
className="file-input"
/>
<button 
onClick={startQuiz} 
disabled={!file || isLoading}
className="btn btn-primary"
>
{isLoading ? "Loading..." : "Start Quiz"}
</button>
</div>
    {error && (
      <div className="error-message">
        <strong>❌ Error:</strong>
        <p>{error}</p>
      </div>
    )}
    {warnings.length > 0 && (
      <div className="warning-message">
        <strong>⚠️ Warnings:</strong>
        <ul>
          {warnings.map((warning, idx) => (
            <li key={idx}>{warning}</li>
          ))}
        </ul>
      </div>
    )}
  </div>

{showFormatInfo && <FileFormatInfo onClose={() => setShowFormatInfo(false)} />}

{!result && questions.length > 0 && (
<div className="quiz-section">
<h3>Questions ({questions.length})</h3>
{questions.map((q, idx) => (
<div key={`${q.question}-${idx}`} className="question">
<p>{idx + 1}. {q.question}</p>
<div className="options">
{q.options.map((opt, optIdx) => (
<label key={optIdx} className="option-label">
<input
type="radio"
name={`question-${idx}`}
value={opt}
checked={answers[q.question] === opt}
onChange={() => handleAnswerChange(q.question, opt)}
/>
{opt}
</label>
))}
</div>
</div>
))}

<div className="btn-container">
<button 
onClick={submitQuiz} 
disabled={isSubmitting}
className="btn btn-primary btn-submit"
>
{isSubmitting ? "Submitting..." : "Submit Answers"}
</button>
</div>
</div>
)}

{result && <Result data={result} questions={questions} />}
</div>
);
}

export default Quiz;
