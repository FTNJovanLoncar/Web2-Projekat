import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./QuizRanking.css";
import { getJwt } from "./auth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const QuizRanking = () => {
  const { quizId } = useParams();
  const [rankings, setRankings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRankings = async () => {
      const jwt = getJwt();
      if (!jwt) return;

      try {
        const res = await fetch(
          `https://localhost:7221/api/quizzes/globalanswers/${quizId}`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        const answerQuizzes = await res.json();

        const qRes = await fetch(
          `https://localhost:7221/api/quizzes/answer/${quizId}`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        const quiz = await qRes.json();

        const computedRankings = [];

        for (const answerQuiz of answerQuizzes) {
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

          computedRankings.push({
            username: answerQuiz.username,
            quizId: quiz.id,
            answerId: answerQuiz.id,
            correctCount,
            totalQuestions,
            scorePercent: ((correctCount / totalQuestions) * 100).toFixed(1),
          });
        }

        computedRankings.sort((a, b) => b.correctCount - a.correctCount);
        setRankings(computedRankings);
      } catch (err) {
        console.error("Error fetching rankings:", err);
      }
    };

    fetchRankings();
  }, [quizId]);

  return (
    <div className="ranking-container">
      <h2 className="section-title">🌍 Global Rankings</h2>

      {/* 📊 Results Chart */}
      {rankings.length > 0 && (
        <div style={{ width: "100%", height: 300, marginBottom: 30 }}>
          <ResponsiveContainer>
            <BarChart data={rankings} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="username" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="correctCount" fill="#6a0dad" name="Correct Answers" />
              <Bar dataKey="totalQuestions" fill="#82ca9d" name="Total Questions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="ranking-list">
        {rankings.length === 0 ? (
          <p className="no-quizzes">No results yet for this quiz.</p>
        ) : (
          rankings.map((r, i) => (
            <div key={r.answerId} className="ranking-card">
              <h3>
                #{i + 1} {r.username}
              </h3>
              <p>
                ✅ Score: {r.correctCount} / {r.totalQuestions} ({r.scorePercent}%)
              </p>
              <button
                className="purple-btn small-btn"
                onClick={() => navigate(`/results/${r.quizId}/${r.answerId}`)}
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

export default QuizRanking;
