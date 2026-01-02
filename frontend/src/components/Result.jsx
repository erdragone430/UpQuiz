import React from "react";

function Result({ data, questions }) {
	if (!data) return null;

	// Create a map of questions for quick access
	const questionsMap = {};
	if (questions) {
		questions.forEach(q => {
			questionsMap[q.question] = q;
		});
	}

	return (
		<div className="result">
			<h3>Quiz Result</h3>
			{typeof data.total_score !== "undefined" && (
				<div className="score-display">
					<div className="score-number">{data.total_score} / {data.max_score}</div>
					<div className="score-details">
						<span className="correct">Correct: {data.correct_answers}</span>
						<span className="separator">•</span>
						<span className="wrong">Wrong: {data.wrong_answers}</span>
						<span className="separator">•</span>
						<span className="no-answer">Unanswered: {data.no_answers}</span>
					</div>
					<div className="score-legend">
						<span className="legend-item"><span className="legend-correct">+1</span> Correct</span>
						<span className="legend-separator">|</span>
						<span className="legend-item"><span className="legend-wrong">-0.33</span> Wrong</span>
						<span className="legend-separator">|</span>
						<span className="legend-item"><span className="legend-no-answer">0</span> Not provided</span>
					</div>
				</div>
			)}
			{Array.isArray(data.results) && data.results.length > 0 && (
				<ul className="results-list">
					{data.results.map((item, idx) => {
						const questionData = questionsMap[item.question];
						return (
							<li key={idx} className={`result-item ${item.is_correct ? "" : "incorrect"}`}>
								<strong>{idx + 1}. {item.question}</strong>
								<div className="result-item-details">
									{/* Show all options if available */}
									{questionData && questionData.options && (
										<div className="options-list">
											{questionData.options.map((opt, optIdx) => {
												const isUserAnswer = opt === item.your_answer;
												const isCorrectAnswer = opt === item.correct_answer;
												let optionClass = "";
												
												if (isCorrectAnswer) optionClass = "correct-option";
												if (isUserAnswer && !isCorrectAnswer) optionClass = "incorrect-option";
												
												return (
													<div key={optIdx} className={`option-result ${optionClass}`}>
														{opt}
														{isUserAnswer && !isCorrectAnswer && " (Your answer)"}
														{isCorrectAnswer && " (Correct)"}
													</div>
												);
											})}
										</div>
									)}
									{!questionData && (
										<>
											<div className="your-answer">
												Your answer: {item.your_answer}
											</div>
											{!item.is_correct && (
												<div className="correct-answer">
													Correct answer: {item.correct_answer}
												</div>
											)}
										</>
									)}
									
									{/* Always show user's answer at the bottom */}
									<div className="user-answer-summary">
										<strong>Your answer:</strong> {item.your_answer || "Not provided"}
										{item.is_correct && <span className="check-icon"> ✓</span>}
										{!item.is_correct && item.your_answer && <span className="cross-icon"> ✗</span>}
									</div>
								</div>
								{item.comment && (
									<div className="result-item-comment">
										{item.comment}
									</div>
								)}
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

export default Result;
