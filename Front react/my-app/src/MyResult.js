import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MyResult.css";
import { getJwt } from "./auth";

const MyResult = () => {
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      const jwt = getJwt();
      if (!jwt) return; // or redirect to /login

      try {
        const res = await fetch("https://localhost:7221/api/quizzes/myanswers", {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        const answerQuizzes = await res.json();

        const computedResults = [];

        for (const answerQuiz of answerQuizzes) {
          const qRes = await fetch(
            `https://localhost:7221/api/quizzes/answer/${answerQuiz.quizId}`,
            { headers: { Authorization: `Bearer ${jwt}` } }
          );
          const quiz = await qRes.json();

          let correctCount = 0;
          const totalQuestions = quiz.questions.length;

          quiz.questions.forEach((q) => {
            const userAnswer = answerQuiz.questions.find(
              (aq) => aq.questionId === q.id
            );
            let isCorrect = false;

            if (userAnswer) {
              if (q.type === 3) {
                if (
                  userAnswer.userTextAnswer?.trim().toLowerCase() ===
                  q.correctTextAnswer?.trim().toLowerCase()
                ) {
                  isCorrect = true;
                }
              } else {
                const correctOptions = q.options
                  .filter((o) => o.isCorrect)
                  .map((o) => o.id);
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
          });

          computedResults.push({
            quizId: quiz.id,
            answerId: answerQuiz.id,
            quizTitle: quiz.title,
            correctCount,
            totalQuestions,
          });
        }

        setResults(computedResults);
      } catch (err) {
        console.error("Error fetching results:", err);
      }
    };

    fetchResults();
  }, []);

  return (
    <div className="myresults-container">
      <h2 className="section-title">📊 My Quiz Results</h2>
      <div className="quizzes-list">
        {results.length === 0 ? (
          <p className="no-quizzes">You haven’t answered any quizzes yet.</p>
        ) : (
          results.map((res) => (
            <div key={res.answerId} className="quiz-card">
              <h3>{res.quizTitle}</h3>
              <p>
                ✅ Score: {res.correctCount} / {res.totalQuestions}
              </p>
              <button
                className="purple-btn small-btn"
                onClick={() =>
                  navigate(`/results/${res.quizId}/${res.answerId}`)
                }
              >
                View Details
              </button>
            </div>
          ))
        )}
      </div>

      <button className="purple-btn" onClick={() => navigate("/")}>
        ⬅ Back to Home
      </button>
    </div>
  );
};

export default MyResult;
