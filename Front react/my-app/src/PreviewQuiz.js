import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./AnswerQuiz.css"; // reuse styles
import { getJwt } from "./auth";

const PreviewQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);

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
      } catch (err) {
        console.error("Error fetching quiz:", err);
      }
    };

    fetchQuiz();
  }, [id]);

  if (!quiz) return <div className="loading">Loading quiz preview...</div>;

  return (
    <div className="answerquiz-container">
      <h2>📘 Preview: {quiz.title}</h2>
      <div className="quiz-info">
        <p>
          Quiz ID: <span className="highlight">{quiz.id}</span>
        </p>
        <p>
          Difficulty: <span className="highlight">{quiz.difficulty}</span>
        </p>
        <p>
          Time Limit:{" "}
          <span className="highlight">
            {quiz.timeLimitMinutes > 0
              ? `${quiz.timeLimitMinutes} minutes`
              : "No limit"}
          </span>
        </p>
      </div>

      {quiz.questions?.map((q) => (
        <div key={q.id} className="question-card">
          <h3>{q.text}</h3>
          <ul>
            {q.options?.map((opt) => (
              <li key={opt.id}>{opt.text}</li>
            ))}
          </ul>
          {q.type === 3 && (
            <p className="highlight">📝 Text Answer Question</p>
          )}
        </div>
      ))}

      <button className="purple-btn" onClick={() => navigate("/")}>
        ⬅ Back to Home
      </button>
    </div>
  );
};

export default PreviewQuiz;
