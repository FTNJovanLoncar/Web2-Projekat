import { useState } from "react";
import { getJwt } from "./auth";
import "./Createquiz.css";

const Createquiz = () => {
  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [questions, setQuestions] = useState([]);

  const addQuestion = (type) => {
    setQuestions([
      ...questions,
      { type, text: "", options: ["", "", "", ""], correctAnswers: [] },
    ]);
  };

  const deleteQuestion = (index) => {
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated);
  };

  const toggleCorrectAnswer = (qIndex, optionIndex, isSingleChoice) => {
    const updated = [...questions];
    if (isSingleChoice) {
      updated[qIndex].correctAnswers = [optionIndex];
    } else {
      if (updated[qIndex].correctAnswers.includes(optionIndex)) {
        updated[qIndex].correctAnswers = updated[qIndex].correctAnswers.filter(
          (i) => i !== optionIndex
        );
      } else {
        updated[qIndex].correctAnswers.push(optionIndex);
      }
    }
    setQuestions(updated);
  };

  const handleSubmit = async () => {
    try {
      // ✅ Extract proper JWT
      const jwt = getJwt(); // <-- import { getJwt } from "./auth";
      if (!jwt) return alert("You must be logged in to submit a quiz.");

      // ✅ Enum mappings
      const difficultyEnum = { easy: 0, medium: 1, hard: 2 };
      const questionTypeEnum = { 1: 0, 2: 1, 3: 2, 4: 3 };

      // ✅ Build payload
      const payload = {
        title: title.trim() || "Untitled Quiz",
        timeLimitMinutes: parseInt(timeLimit) || 0,
        difficulty: difficultyEnum[difficulty.toLowerCase()],
        questions: questions.map((q) => ({
          text: q.text.trim() || "Untitled Question",
          type: questionTypeEnum[q.type],
          correctTextAnswer: q.type === 4 ? (q.correctAnswers[0] || "") : "",
          options:
            q.type === 4
              ? []
              : q.options.map((opt, i) => ({
                  text: opt.trim() || `Option ${i + 1}`,
                  isCorrect: q.correctAnswers.includes(i),
                })),
        })),
      };

      console.log("🚀 JWT being sent:", jwt);
      console.log("🚀 Submitting payload:", JSON.stringify(payload, null, 2));

      // ✅ Send to backend
      const response = await fetch("https://localhost:7221/api/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`, // must be a plain string
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        return alert("Unauthorized. Please log in again.");
      }

      if (!response.ok) {
        const text = await response.text();
        return alert(`Failed to submit quiz: ${text}`);
      }

      alert("Quiz submitted successfully!");
      setQuestions([]);
      setTitle("");
      setTimeLimit("");
      setDifficulty("easy");
    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error("❌ Create Quiz error:", err);
    }
  };

  return (
    <div className="create-quiz-container">
      <h2>Create a Quiz</h2>

      <label>Quiz Title:</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Enter quiz title"
      />

      <label>Time Limit (minutes):</label>
      <input
        type="number"
        value={timeLimit}
        onChange={(e) => setTimeLimit(e.target.value)}
        placeholder="Enter time limit"
        min="1"
      />

      <label>Difficulty:</label>
      <select
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value)}
      >
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>

      {questions.map((q, index) => (
        <div key={index} className="question-block">
          <label>Question {index + 1}:</label>
          <input
            type="text"
            value={q.text}
            onChange={(e) => {
              const updated = [...questions];
              updated[index].text = e.target.value;
              setQuestions(updated);
            }}
            placeholder="Enter your question"
          />

          <button className="delete-btn" onClick={() => deleteQuestion(index)}>
            ❌ Delete Question
          </button>

          {q.type === 1 && (
            <div>
              {q.options.map((opt, i) => (
                <div key={i} className="option-input">
                  <input
                    type="radio"
                    name={`q${index}`}
                    checked={q.correctAnswers.includes(i)}
                    onChange={() => toggleCorrectAnswer(index, i, true)}
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[index].options[i] = e.target.value;
                      setQuestions(updated);
                    }}
                    placeholder={`Option ${i + 1}`}
                  />
                </div>
              ))}
            </div>
          )}

          {q.type === 2 && (
            <div>
              {q.options.map((opt, i) => (
                <div key={i} className="option-input">
                  <input
                    type="checkbox"
                    checked={q.correctAnswers.includes(i)}
                    onChange={() => toggleCorrectAnswer(index, i, false)}
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[index].options[i] = e.target.value;
                      setQuestions(updated);
                    }}
                    placeholder={`Option ${i + 1}`}
                  />
                </div>
              ))}
            </div>
          )}

          {q.type === 3 && (
            <div>
              {[0, 1].map((i) => (
                <div key={i} className="option-input">
                  <input
                    type="radio"
                    name={`q${index}`}
                    checked={q.correctAnswers.includes(i)}
                    onChange={() => toggleCorrectAnswer(index, i, true)}
                  />
                  <input
                    type="text"
                    value={q.options[i]}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[index].options[i] = e.target.value;
                      setQuestions(updated);
                    }}
                    placeholder={`Option ${i + 1}`}
                  />
                </div>
              ))}
            </div>
          )}

          {q.type === 4 && (
            <div>
              <label>Correct Answer (Text):</label>
              <input
                type="text"
                value={q.correctAnswers[0] || ""}
                onChange={(e) => {
                  const updated = [...questions];
                  updated[index].correctAnswers = [e.target.value];
                  setQuestions(updated);
                }}
                placeholder="Enter correct text answer"
              />
            </div>
          )}
        </div>
      ))}

      <button className="add-btn" onClick={() => addQuestion(1)}>
        Add Single Choice (4 options)
      </button>
      <button className="add-btn" onClick={() => addQuestion(2)}>
        Add Multiple Choice (4 options)
      </button>
      <button className="add-btn" onClick={() => addQuestion(3)}>
        Add Yes/No Question
      </button>
      <button className="add-btn" onClick={() => addQuestion(4)}>
        Add Text Question
      </button>

      <button className="submit-btn" onClick={handleSubmit}>
        Submit Quiz
      </button>
    </div>
  );
};

export default Createquiz;
