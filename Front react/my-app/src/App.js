import './App.css';
import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Pocetna from './Pocetna';
import Login from './Login';
import Createquiz from './Createquiz';
import Register from './Register';
import AnswerQuiz from './AnswerQuiz';
import ResultQuiz from "./ResultQuiz";
import MyResult from "./MyResult";
import QuizRanking from "./QuizRanking";
import LiveHost from "./LiveHost";
import LiveJoin from "./LiveJoin";
import PreviewQuiz from "./PreviewQuiz";



function App() {
  const [user, setUser] = useState(null); // store logged-in user info or token

  const handleRegister = (userData) => {
    setUser(userData); // save user info or JWT
  };

  return (
    <div>
      <BrowserRouter>
        <Routes>        
          <Route path="/" element={<Pocetna user={user} setUser={setUser} />} />
          <Route path="/login" element={<Login onLogin={setUser}/>} />
          <Route path="/register" element={<Register onRegister={handleRegister} />} />
          <Route path="/createquiz" element={<Createquiz />} />
          <Route path="/answerquiz/:id" element={<AnswerQuiz />} />
          <Route path="/results/:quizId/:answerId" element={<ResultQuiz />} />
          <Route path="/myresults" element={<MyResult />} />
          <Route path="/quizranking/:quizId" element={<QuizRanking />} />
          <Route path="/live/host" element={<LiveHost />} />
          <Route path="/live/join" element={<LiveJoin />} />
          <Route path="/previewquiz/:id" element={<PreviewQuiz />} />

        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
