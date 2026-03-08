import React from "react";

function FileFormatInfo({ onClose }) {
	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal-content" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h3>File Format Guide</h3>
					<button onClick={onClose} className="modal-close">×</button>
				</div>

				<div className="modal-body">
					<p className="format-intro">
						Quiz files must be <strong>.txt</strong> files with the following format:
					</p>

					<div className="format-example">
						<h4>Multiple Choice Format:</h4>
						<pre>{`Esercizio 1.
Question text here?
A) Option A
B) Option B
C) Option C
D) Option D
Risposta: B
Commento: Explanation text here

Esercizio 2.
Another question?
A) Option A
B) Option B
C) Option C
Risposta: A
Commento: Another explanation`}</pre>
					</div>

					<div className="format-example">
						<h4>Numeric Answer Format:</h4>
						<pre>{`Esercizio 3.
What is the square root of 144?
Risposta: 12
Commento: The square root of 144 is 12

Esercizio 4.
Calculate 25 × 4
Risposta: 100
Commento: 25 multiplied by 4 equals 100`}</pre>
					</div>

					<div className="format-rules">
						<h4>Important Rules:</h4>
						<ul>
							<li><strong>Exercise header:</strong> Must be "Esercizio X." on its own line</li>
							<li><strong>Question:</strong> Must be on the next line after "Esercizio X."</li>
							<li><strong>Multiple choice:</strong> Options must start with A), B), C), or D). Answer must be A, B, C, or D</li>
							<li><strong>Numeric answer:</strong> No options needed. Answer must be a number (with ±5% tolerance)</li>
							<li><strong>Answer:</strong> Must be "Risposta: " followed by letter or number</li>
							<li><strong>Comment:</strong> Must start with "Commento: " (optional)</li>
							<li><strong>Blank line:</strong> Leave a blank line between exercises</li>
						</ul>
					</div>

					<div className="format-tips">
						<h4>Tips:</h4>
						<ul>
							<li>File must be UTF-8 encoded</li>
							<li>Maximum file size: 5 MB</li>
							<li>Multiple choice: 2-4 options per question</li>
							<li>Numeric answers: ±5% tolerance is automatically applied</li>
							<li>Comments are optional but recommended</li>
							<li>You can mix multiple choice and numeric questions in the same file</li>
						</ul>
					</div>
				</div>

				<div className="modal-footer">
					<button onClick={onClose} className="btn btn-primary">
						Got it
					</button>
				</div>
			</div>
		</div>
	);
}

export default FileFormatInfo;
