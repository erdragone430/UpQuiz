import React, { useState } from "react";

function Result({ data, questions }) {
	if (!data) return null;
	const [activeIndex, setActiveIndex] = useState(0);

	// Create a map of questions for quick access
	const questionsMap = {};
	if (questions) {
		questions.forEach(q => {
			questionsMap[q.question] = q;
		});
	}

	const getNavigatorStatus = (item) => {
		if (!item.your_answer) return "unanswered";
		return item.is_correct ? "correct" : "wrong";
	};

	const scoringRules = data.scoring_rules || {
		correct_points: 1,
		wrong_penalty: 0.33,
		no_answer_points: 0,
	};

	const formatPoints = (value) => {
		const fixed = Number(value).toFixed(2);
		return fixed.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
	};

	if (!Array.isArray(data.results) || data.results.length === 0) {
		return null;
	}

	const currentItem = data.results[activeIndex];
	const currentQuestionData = questionsMap[currentItem.question];
	const goToPrevious = () => setActiveIndex((prev) => Math.max(0, prev - 1));
	const goToNext = () => setActiveIndex((prev) => Math.min(data.results.length - 1, prev + 1));

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
						<span className="legend-item"><span className="legend-correct">+{formatPoints(scoringRules.correct_points)}</span> Correct</span>
						<span className="legend-separator">|</span>
						<span className="legend-item"><span className="legend-wrong">-{formatPoints(scoringRules.wrong_penalty)}</span> Wrong</span>
						<span className="legend-separator">|</span>
						<span className="legend-item"><span className="legend-no-answer">{formatPoints(scoringRules.no_answer_points)}</span> Not provided</span>
					</div>
				</div>
			)}
			<div className="result-layout">
				<div className="result-main-panel">
					<div className={`result-item ${currentItem.is_correct ? "" : "incorrect"} active`}>
						<div className="result-progress">
							Question {activeIndex + 1} of {data.results.length}
						</div>
						<strong>{activeIndex + 1}. {currentItem.question}</strong>
						<div className="result-item-details">
							{currentQuestionData && currentQuestionData.options && (
								<div className="options-list">
									{currentQuestionData.options.map((opt, optIdx) => {
										const isUserAnswer = opt === currentItem.your_answer;
										const isCorrectAnswer = opt === currentItem.correct_answer;
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
							{!currentQuestionData && (
								<>
									<div className="your-answer">
										Your answer: {currentItem.your_answer}
									</div>
									{!currentItem.is_correct && (
										<div className="correct-answer">
											Correct answer: {currentItem.correct_answer}
										</div>
									)}
								</>
							)}

							<div className="user-answer-summary">
								<strong>Your answer:</strong> {currentItem.your_answer || "Not provided"}
								{currentItem.is_correct && <span className="check-icon"> ✓</span>}
								{!currentItem.is_correct && currentItem.your_answer && <span className="cross-icon"> ✗</span>}
							</div>
						</div>
						{currentItem.comment && (
							<div className="result-item-comment">
								{currentItem.comment}
							</div>
						)}
					</div>

					<div className="btn-container quiz-navigation-controls result-navigation-controls">
						<button
							type="button"
							onClick={goToPrevious}
							disabled={activeIndex === 0}
							className="btn btn-secondary"
						>
							Previous
						</button>
						<button
							type="button"
							onClick={goToNext}
							disabled={activeIndex === data.results.length - 1}
							className="btn btn-secondary"
						>
							Next
						</button>
					</div>
				</div>

				<details className="result-sidebar result-sidebar-collapsible" open>
					<summary className="result-sidebar-toggle">Question Navigator</summary>
					<h4>Question Navigator</h4>
					<div className="result-nav-grid">
						{data.results.map((item, idx) => {
							const status = getNavigatorStatus(item);
							return (
								<button
									key={`result-nav-${idx}`}
									type="button"
									className={`result-nav-item ${status} ${idx === activeIndex ? "active" : ""}`.trim()}
									onClick={() => setActiveIndex(idx)}
								>
									{idx + 1}
								</button>
							);
						})}
					</div>
				</details>
			</div>
		</div>
	);
}

export default Result;
