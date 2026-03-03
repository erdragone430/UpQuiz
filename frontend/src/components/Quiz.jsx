import React, { useState, useEffect } from "react";
import Result from "./Result.jsx";
import FileFormatInfo from "./FileFormatInfo.jsx";
import Spinner from "./Spinner.jsx";

const API_BASE = "/api";
const DEFAULT_MAX_QUESTIONS = 33;
const DEFAULT_CORRECT_POINTS = 1;
const DEFAULT_WRONG_PENALTY = 0.33;

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
const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
const [useAdvancedOptions, setUseAdvancedOptions] = useState(false);
const [maxQuestions, setMaxQuestions] = useState(DEFAULT_MAX_QUESTIONS);
const [correctPoints, setCorrectPoints] = useState(DEFAULT_CORRECT_POINTS);
const [wrongPenalty, setWrongPenalty] = useState(DEFAULT_WRONG_PENALTY);

useEffect(() => {
  if (result) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}, [result]);

const handleFileChange = (e) => {
const selected = e.target.files?.[0] || null;
setFile(selected);
setQuestions([]);
setAnswers({});
setResult(null);
setError(null);
setWarnings([]);
setCurrentQuestionIndex(0);

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

const effectiveMaxQuestions = useAdvancedOptions ? Number(maxQuestions) : DEFAULT_MAX_QUESTIONS;
const effectiveCorrectPoints = useAdvancedOptions ? Number(correctPoints) : DEFAULT_CORRECT_POINTS;
const effectiveWrongPenalty = useAdvancedOptions ? Number(wrongPenalty) : DEFAULT_WRONG_PENALTY;

if (effectiveMaxQuestions < 1 || effectiveMaxQuestions > 33) {
setError("Maximum questions must be between 1 and 33");
return;
}

if (effectiveCorrectPoints < 1) {
setError("Correct answer score must be at least 1");
return;
}

if (effectiveWrongPenalty < 0) {
setError("Wrong answer penalty cannot be negative");
return;
}

const formData = new FormData();
formData.append("file", file);

setIsLoading(true);
setError(null);
setWarnings([]);
setResult(null);
try {
const resp = await fetch(`${API_BASE}/quiz/simulate?max_questions=${effectiveMaxQuestions}`, {
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
setCurrentQuestionIndex(0);
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

const goToPreviousQuestion = () => {
setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
};

const goToNextQuestion = () => {
setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1));
};

const submitQuiz = async () => {
if (!questions.length) return;

const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
const token = localStorage.getItem("token");
const effectiveCorrectPoints = useAdvancedOptions ? Number(correctPoints) : DEFAULT_CORRECT_POINTS;
const effectiveWrongPenalty = useAdvancedOptions ? Number(wrongPenalty) : DEFAULT_WRONG_PENALTY;

const payload = {
original_file_content: fileContent,
quiz_name: file?.name || "Unknown Quiz",
time_spent: timeSpent,
correct_points: effectiveCorrectPoints,
wrong_penalty: effectiveWrongPenalty,
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
{isLoading ? <Spinner label="Loading" size="sm" /> : "Start Quiz"}
</button>
</div>
<div className="advanced-toggle">
<button
type="button"
className="btn btn-secondary advanced-toggle-btn"
onClick={() => setUseAdvancedOptions((prev) => !prev)}
>
{useAdvancedOptions ? "Use Default Options" : "Set Advanced Options"}
</button>
</div>
{useAdvancedOptions ? (
<div className="advanced-options">
<h4>Advanced Options</h4>
<div className="advanced-grid">
<div className="advanced-field">
<label htmlFor="max-questions">Max Questions (1-33)</label>
<input
id="max-questions"
type="number"
min="1"
max="33"
value={maxQuestions}
onChange={(e) => setMaxQuestions(Number(e.target.value))}
className="advanced-input"
/>
</div>
<div className="advanced-field">
<label htmlFor="correct-points">Correct Answer Score</label>
<input
id="correct-points"
type="number"
min="1"
step="1"
value={correctPoints}
onChange={(e) => setCorrectPoints(Number(e.target.value))}
className="advanced-input"
/>
</div>
<div className="advanced-field">
<label htmlFor="wrong-penalty">Wrong Answer Penalty</label>
<input
id="wrong-penalty"
type="number"
min="0"
step="0.01"
value={wrongPenalty}
onChange={(e) => setWrongPenalty(Number(e.target.value))}
className="advanced-input"
/>
</div>
</div>
<button
type="button"
className="btn btn-secondary btn-reset-default"
onClick={() => {
setMaxQuestions(DEFAULT_MAX_QUESTIONS);
setCorrectPoints(DEFAULT_CORRECT_POINTS);
setWrongPenalty(DEFAULT_WRONG_PENALTY);
}}
>
Reset to Default
</button>
</div>
) : (
<p className="advanced-default-note">
Default options: max questions {DEFAULT_MAX_QUESTIONS}, correct +{DEFAULT_CORRECT_POINTS}, wrong -{DEFAULT_WRONG_PENALTY}
</p>
)}
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

  {isLoading && (
    <div className="loading">
      <Spinner label="Preparing quiz..." block />
    </div>
  )}

{showFormatInfo && <FileFormatInfo onClose={() => setShowFormatInfo(false)} />}

{!result && questions.length > 0 && (
<div className="quiz-section">
<h3>Questions ({questions.length})</h3>

<div className="quiz-layout">
<div className="quiz-main-panel">
<div className="quiz-progress">
Question {currentQuestionIndex + 1} of {questions.length}
</div>

<div className="question">
<p>{currentQuestionIndex + 1}. {questions[currentQuestionIndex]?.question}</p>
<div className="options">
{questions[currentQuestionIndex]?.options.map((opt, optIdx) => (
<label key={optIdx} className="option-label">
<input
type="radio"
name={`question-${currentQuestionIndex}`}
value={opt}
checked={answers[questions[currentQuestionIndex].question] === opt}
onChange={() => handleAnswerChange(questions[currentQuestionIndex].question, opt)}
/>
{opt}
</label>
))}
</div>
</div>

<div className="btn-container quiz-navigation-controls">
<button
onClick={goToPreviousQuestion}
disabled={currentQuestionIndex === 0}
className="btn btn-secondary"
>
Previous
</button>
<button
onClick={goToNextQuestion}
disabled={currentQuestionIndex === questions.length - 1}
className="btn btn-secondary"
>
Next
</button>
</div>
  </div>

<details className="quiz-sidebar quiz-sidebar-collapsible" open>
<summary className="quiz-sidebar-toggle">Question Navigator</summary>
<h4>Question Navigator</h4>
<div className="quiz-nav-grid">
{questions.map((q, idx) => {
const isCurrent = idx === currentQuestionIndex;
const isAnswered = !!answers[q.question];
return (
<button
key={`${q.question}-${idx}`}
type="button"
className={`quiz-nav-item ${isCurrent ? "current" : ""} ${isAnswered ? "answered" : ""}`.trim()}
onClick={() => setCurrentQuestionIndex(idx)}
>
{idx + 1}
</button>
);
})}
</div>
</details>
</div>

<div className="btn-container">
<button 
onClick={submitQuiz} 
disabled={isSubmitting}
className="btn btn-primary btn-submit"
>
{isSubmitting ? <Spinner label="Submitting" size="sm" /> : "Submit Answers"}
</button>
</div>
</div>
)}

{result && <Result data={result} questions={questions} />}
</div>
);
}

export default Quiz;
