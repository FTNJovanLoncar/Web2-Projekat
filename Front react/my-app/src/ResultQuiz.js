import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./ResultQuiz.css";
import { getJwt } from "./auth";

const ResultQuiz = () => {
  const { quizId, answerId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const navigate = useNavigate();
  const [answerQuiz, setAnswerQuiz] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const jwt = getJwt();
      if (!jwt) return;

      try {
        // fetch correct quiz
        const qRes = await fetch(
          `https://localhost:7221/api/quizzes/answer/${quizId}`,
          {
            headers: {
              Authorization: `Bearer ${jwt}`,
            },
          }
        );
        setQuiz(await qRes.json());

        // fetch user answer quiz
        const aRes = await fetch(
          `https://localhost:7221/api/quizzes/answerquiz/${answerId}`,
          {
            headers: {
              Authorization: `Bearer ${jwt}`,
            },
          }
        );
        setAnswerQuiz(await aRes.json());
      } catch (err) {
        console.error("Error loading results:", err);
      }
    };

    fetchData();
  }, [quizId, answerId]);

  if (!quiz || !answerQuiz) return <div>Loading results...</div>;

  // ✅ Calculate statistics
  const totalQuestions = quiz.questions.length;

  let correctCount = 0;
  const questionResults = quiz.questions.map((q) => {
    const userAnswer = answerQuiz.questions.find(
      (aq) => aq.questionId === q.id
    );
    let isCorrect = false;

    if (userAnswer) {
      if (q.type === 3) {
        // text answer
        if (
          userAnswer.userTextAnswer?.trim().toLowerCase() ===
          q.correctTextAnswer?.trim().toLowerCase()
        ) {
          isCorrect = true;
        }
      } else {
        // options answer
        const correctOptions = q.options.filter((o) => o.isCorrect).map((o) => o.id);
        const userOptions = userAnswer.options
          .filter((uo) => uo.selected)
          .map((uo) => uo.optionId);

        const setsEqual =
          correctOptions.length === userOptions.length &&
          correctOptions.every((id) => userOptions.includes(id));

        if (setsEqual) isCorrect = true;
      }
    }

    if (isCorrect) correctCount++;

    return { question: q, userAnswer, isCorrect };
  });

  const percentCorrect = ((correctCount / totalQuestions) * 100).toFixed(1);

  return (
    <div className="resultquiz-container">
      <h2 className="quiz-title">Results for: {quiz.title}</h2>

      <div className="stats-box">
        <p>
          📋 Total Questions: <span className="highlight">{totalQuestions}</span>
        </p>
        <p>
          ✅ Correct: <span className="highlight">{correctCount}</span>
        </p>
        <p>
          📊 Score: <span className="highlight">{percentCorrect}%</span>
        </p>
      </div>

      {questionResults.map(({ question: q, userAnswer, isCorrect }) => (
        <div key={q.id} className="question-card">
          <h3>{q.text}</h3>
          <p>
            ✅ Correct Answer:{" "}
            {q.type === 3
              ? q.correctTextAnswer
              : q.options
                  .filter((o) => o.isCorrect)
                  .map((o) => o.text)
                  .join(", ")}
          </p>
          <p className={isCorrect ? "user-answer correct" : "user-answer wrong"}>
            🧑 Your Answer:{" "}
            {q.type === 3
              ? userAnswer?.userTextAnswer || "(no answer)"
              : q.options
                  .filter((o) =>
                    userAnswer?.options?.some(
                      (uo) => uo.optionId === o.id && uo.selected
                    )
                  )
                  .map((o) => o.text)
                  .join(", ") || "(no answer)"}
          </p>
        </div>
      ))}

      <button className="purple-btn" onClick={() => navigate("/")}>
        Back to Home
      </button>
    </div>
  );
};

export default ResultQuiz;
