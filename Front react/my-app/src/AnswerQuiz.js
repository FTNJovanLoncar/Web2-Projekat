import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./AnswerQuiz.css";
import { getJwt } from "./auth";

// 🔑 Simple JWT decode (without external libs)
function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(window.atob(base64));
  } catch {
    return null;
  }
}

const AnswerQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);

  const handleFinish = useCallback(async () => {
    try {
      const jwt = getJwt();
      if (!jwt) throw new Error("Not authenticated. Please log in again.");


      // 🔓 Decode username from JWT
      const user = jwt ? parseJwt(jwt) : null;
      console.log("Decoded JWT:", user);
      const username =
  user?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ||
  user?.unique_name ||
  user?.sub ||
  user?.name ||
  user?.email ||
  "";


      // 🔄 Transform answers → API format
      const questionsPayload = quiz.questions.map((q) => {
        const userAnswers = answers[q.id] || [];

        return {
          questionId: q.id,
          userTextAnswer: q.type === 3 ? userAnswers[0] || "" : "",
          options: (q.options || []).map((opt) => ({
            optionId: opt.id,
            selected: userAnswers.includes(opt.id),
          })),
        };
      });

      const payload = {
        quizId: quiz.id,
        username, // ✅ include username
        questions: questionsPayload,
      };

      console.log("Submitting payload:", payload);

      const res = await fetch(`https://localhost:7221/api/quizzes/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(payload),
      });

      // 🔍 Check response details
      if (!res.ok) {
        const text = await res.text(); // try to read raw text
        let errorMsg = text;
        try {
          const data = JSON.parse(text); // try to parse as JSON
          errorMsg = JSON.stringify(data, null, 2);
        } catch {
          // keep plain text if not JSON
        }
        throw new Error(
          `Failed to submit answers. Status: ${res.status} ${res.statusText}. Response: ${errorMsg}`
        );
      }

      const result = await res.json(); // ✅ read saved AnswerQuiz with Id
      navigate(`/results/${quiz.id}/${result.id}`);
    } catch (err) {
      console.error("Error submitting quiz:", err);
      alert(`Failed to submit quiz.\n\nDetails: ${err.message}`);
    }
  }, [answers, quiz, navigate]);

  // Fetch quiz
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const jwt = getJwt();
        if (!jwt) throw new Error("Not authenticated. Please log in again.");

        const res = await fetch(
          `https://localhost:7221/api/quizzes/answer/${id}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${jwt}`,
            },
          }
        );

        if (!res.ok) throw new Error("Failed to fetch quiz");
        const data = await res.json();

        // ✅ Ensure options have IDs
        if (data.questions) {
          data.questions = data.questions.map((q) => {
            const options = (q.options ?? []).map((opt, index) => ({
              ...opt,
              id: opt.id ?? index + 1,
            }));

            return { ...q, options };
          });
        }

        setQuiz(data);
        setTimeLeft(data.timeLimitMinutes * 60);
      } catch (err) {
        console.error(err);
      }
    };

    fetchQuiz();
  }, [id]);

  // Timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft === 0) handleFinish();
  }, [timeLeft, handleFinish]);

  const handleOptionChange = (qId, value, multiple = false) => {
    setAnswers((prev) => {
      if (multiple) {
        const current = prev[qId] || [];
        return {
          ...prev,
          [qId]: current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value],
        };
      }
      return { ...prev, [qId]: [value] };
    });
  };

  const handleTextChange = (qId, text) => {
    setAnswers((prev) => ({ ...prev, [qId]: [text] }));
  };

  if (!quiz) return <div className="loading">Loading quiz...</div>;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="answerquiz-container">
      <h2>{quiz.title}</h2>
      <div className="quiz-info">
        <p>
          Difficulty: <span className="highlight">{quiz.difficulty}</span>
        </p>
        <p>
          Time Left:{" "}
          <span className="highlight">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
        </p>
      </div>

      {quiz.questions?.map((q) => (
        <div key={q.id} className="question-card">
          <h3>{q.text}</h3>

          {/* Single Choice */}
          {q.type === 0 &&
            q.options.map((opt) => (
              <label key={opt.id} className="option-label">
                <input
                  type="radio"
                  name={`q${q.id}`}
                  checked={answers[q.id]?.includes(opt.id) || false}
                  onChange={() => handleOptionChange(q.id, opt.id)}
                />
                {opt.text}
              </label>
            ))}

          {/* Multiple Choice */}
          {q.type === 1 &&
            q.options.map((opt) => (
              <label key={opt.id} className="option-label">
                <input
                  type="checkbox"
                  checked={answers[q.id]?.includes(opt.id) || false}
                  onChange={() => handleOptionChange(q.id, opt.id, true)}
                />
                {opt.text}
              </label>
            ))}

          {/* True/False */}
          {q.type === 2 &&
            q.options.map((opt) => (
              <label key={opt.id} className="option-label">
                <input
                  type="radio"
                  name={`q${q.id}`}
                  checked={answers[q.id]?.includes(opt.id) || false}
                  onChange={() => handleOptionChange(q.id, opt.id)}
                />
                {opt.text}
              </label>
            ))}

          {/* Text Answer */}
          {q.type === 3 && (
            <input
              type="text"
              className="text-answer"
              placeholder="Type your answer..."
              value={answers[q.id]?.[0] || ""}
              onChange={(e) => handleTextChange(q.id, e.target.value)}
            />
          )}
        </div>
      ))}

      <button className="finish-btn" onClick={handleFinish}>
        Finish Quiz
      </button>
    </div>
  );
};

export default AnswerQuiz;
