import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import "./Pocetna.css";
import { getJwt, clearJwt } from "./auth";
import { newLiveConnection } from "./realtime";

// -------------------- Admin Page --------------------
const AdminDashboard = ({ user, handleLogout, quizzes, navigate, setQuizzes }) => {
  const [searchText, setSearchText] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");

  // 🗑️ Delete quiz function
const handleDeleteQuiz = async (quizId) => {
  if (!window.confirm("Are you sure you want to delete this quiz?")) return;

  const token = localStorage.getItem("token");
  const parsed = token ? JSON.parse(token) : null;
  const jwt = parsed?.token;

  try {
    const response = await fetch(`https://localhost:7221/api/quizzes/${quizId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (response.status === 204) {
      // ✅ Remove quiz from frontend immediately
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } else if (response.status === 404) {
      alert("Quiz not found. It may already have been deleted.");
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } else {
      const errText = await response.text();
      alert("Failed to delete quiz: " + errText);
    }
  } catch (err) {
    console.error("Error deleting quiz:", err);
    alert("An error occurred while deleting the quiz.");
  }
};


  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesTitle = quiz.title
      .toLowerCase()
      .includes(searchText.toLowerCase());
    const matchesDifficulty =
      difficultyFilter === "" || quiz.difficulty === parseInt(difficultyFilter);
    return matchesTitle && matchesDifficulty;
  });

  return (
    <>
      <div className="greeting">
        👋 Welcome back, <span className="username">{user.username}</span>!
      </div>

      <div className="logout-section">
        <button className="purple-btn" onClick={handleLogout}>
          Logout
        </button>

        <button className="purple-btn" onClick={() => navigate("/live/host")}>
          Live Host (Admin)
        </button>

        <button onClick={() => navigate("/createquiz")} className="purple-btn">
          Create Quiz
        </button>
      </div>

      {/* 🔍 Filters */}
      <div className="filter-section">
        <input
          type="text"
          placeholder="Search by quiz title..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="filter-input"
        />
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">All Difficulties</option>
          <option value="0">Easy</option>
          <option value="1">Medium</option>
          <option value="2">Hard</option>
        </select>
      </div>

      <div className="quizzes-section">
        <h2 className="section-title">All Quizzes (Admin View)</h2>
        <div className="quizzes-list">
          {filteredQuizzes.length === 0 ? (
            <p className="no-quizzes">No quizzes match your filter.</p>
          ) : (
            filteredQuizzes.map((quiz) => (
              <div key={quiz.id} className="quiz-card">
                <h3>{quiz.title}</h3>
                <p><strong>Questions:</strong> {quiz.questions?.length || 0}</p>
                <p><strong>Difficulty:</strong>{" "}
                  {quiz.difficulty === 0
                    ? "Easy"
                    : quiz.difficulty === 1
                    ? "Medium"
                    : "Hard"}
                </p>
                <p><strong>Time Limit:</strong>{" "}
                  {quiz.timeLimitMinutes > 0
                    ? `${quiz.timeLimitMinutes} minutes`
                    : "No limit"}
                </p>
                <button
                  className="purple-btn small-btn"
                  onClick={() => navigate(`/previewquiz/${quiz.id}`)}
                >
                  Preview Quiz
                </button>
                <button
                  className="purple-btn small-btn"
                  onClick={() => navigate(`/quizranking/${quiz.id}`)}
                >
                  Show Global Rankings
                </button>
                <button
                  className="purple-btn small-btn"
                  onClick={() => handleDeleteQuiz(quiz.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};


// -------------------- User Page --------------------
const UserDashboard = ({ user, handleLogout, quizzes, navigate }) => {
  const [searchText, setSearchText] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  async function testLive() {
    try {
       const jwt = getJwt();
       if (!jwt) {
         alert("Please log in first to test the live hub.");
         return;
       }
       const conn = newLiveConnection();
       conn.onreconnecting(err => console.log("SignalR reconnecting:", err));
       conn.onreconnected(id => console.log("SignalR reconnected. ConnId:", id));
       conn.onclose(err => console.log("SignalR closed:", err));
       await conn.start();
       console.log("✅ SignalR connected. ConnId:", conn.connectionId);
      alert("Connected to Live Quiz hub!");
       // If your hub already has methods, you can try calling one:
       // await conn.invoke("Join", "TEMP123");
     } catch (e) {
       console.error("❌ SignalR start failed:", e);
      alert("Failed to connect to live hub. Check console for details.");
     }
   }


  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesTitle = quiz.title
      .toLowerCase()
      .includes(searchText.toLowerCase());
    const matchesDifficulty =
      difficultyFilter === "" || quiz.difficulty === parseInt(difficultyFilter);
    return matchesTitle && matchesDifficulty;
  });

  return (
    <>
      <div className="greeting">
        👋 Welcome back, <span className="username">{user.username}</span>!
      </div>
      <div style={{ marginTop: 16 }}>
  <button className="purple-btn" onClick={testLive}>🔌 Test Live Hub</button>
  </div>

      <div className="logout-section">
        <button className="purple-btn" onClick={handleLogout}>
          Logout
        </button>

        <button className="purple-btn" onClick={() => navigate("/live/join")}>
          Join Live
        </button>

      <button
        className="purple-btn"
        onClick={() => navigate("/myresults")}>      
        My Results
      </button>
      </div>

      {/* 🔍 Filters */}
      <div className="filter-section">
        <input
          type="text"
          placeholder="Search by quiz title..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="filter-input"
        />
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">All Difficulties</option>
          <option value="0">Easy</option>
          <option value="1">Medium</option>
          <option value="2">Hard</option>
        </select>
      </div>

      <div className="quizzes-section">
        <h2 className="section-title">Available Quizzes</h2>
        <div className="quizzes-list">
          {filteredQuizzes.length === 0 ? (
            <p className="no-quizzes">No quizzes match your filter.</p>
          ) : (
            filteredQuizzes.map((quiz) => (
              <div key={quiz.id} className="quiz-card">
                <h3>{quiz.title}</h3>
                <p><strong>Questions:</strong> {quiz.questions?.length || 0}</p>
                <p><strong>Difficulty:</strong>{" "}
                  {quiz.difficulty === 0
                    ? "Easy"
                    : quiz.difficulty === 1
                    ? "Medium"
                    : "Hard"}
                </p>
                <p><strong>Time Limit:</strong>{" "}
                  {quiz.timeLimitMinutes > 0
                    ? `${quiz.timeLimitMinutes} minutes`
                    : "No limit"}
                </p>
                <button
                  className="purple-btn small-btn"
                  onClick={() => navigate(`/answerquiz/${quiz.id}`)}
                >
                  Take Quiz
                </button>
                <button
                  className="purple-btn small-btn"
                  onClick={() => navigate(`/quizranking/${quiz.id}`)}
                >
                  Show Global Rankings
                </button>

              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

// -------------------- Main Pocetna --------------------
const Pocetna = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);

  const handleLogout = () => {
    clearJwt();
    setUser(null);
    navigate("/");
  };

  useEffect(() => {
    const restoreUser = () => {
      const jwt = getJwt();
      if (jwt && !user) {
        try {         
            const base64Url = jwt.split(".")[1];
            const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
            const decoded = JSON.parse(window.atob(base64));

            const username =
              decoded?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ||
              decoded?.unique_name ||
              decoded?.sub ||
              decoded?.name ||
              decoded?.email;

            const role =
              decoded?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
              decoded?.role;

            if (username && role) {
              setUser({ username, role });
            } else {
              clearJwt();
            }         
        } catch (err) {
          console.error("Error restoring user:", err);
          clearJwt();
        }
      }
    };

    const fetchQuizzes = async () => {
      try {
        const jwt = getJwt();

        const response = await fetch("https://localhost:7221/api/quizzes/getall", {
          headers: {
            "Content-Type": "application/json",
            ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
          },
        });

        if (!response.ok) {
          console.error("Failed to fetch quizzes");
          return;
        }

        const data = await response.json();
        setQuizzes(data);
      } catch (err) {
        console.error("Error fetching quizzes:", err);
      }
    };

    restoreUser();
    if (user) {
      fetchQuizzes();
    }
  }, [user, setUser]);

  return (
    <div className="pocetna-container">
      <div className="welcome-section">
      <h1>🎉 Welcome to QuizMaster!</h1>
      <p>Login or Register to start solving and creating quizzes.</p>
    </div>

      {!user ? (        
        <ul className="nav nav-pills nav-fill navigation-bar">      
          <li className="nav-item"><a className="nav-link" href="/login">Login</a></li>
          <li className="nav-item"><a className="nav-link" href="/register">Register</a></li>
        </ul>
      ) : (
        user.role === "admin" ? (
          <AdminDashboard
            user={user}
            handleLogout={handleLogout}
            quizzes={quizzes}
            setQuizzes={setQuizzes} 
            navigate={navigate}
          />
        ) : (
          <UserDashboard
            user={user}
            handleLogout={handleLogout}
            quizzes={quizzes}
            navigate={navigate}
          />
        )
      )}
    </div>
  );
};

Pocetna.propTypes = {
  user: PropTypes.object,
  setUser: PropTypes.func.isRequired,
};

export default Pocetna;
