import { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import './Login.css';

// 🔑 Simple JWT decode helper
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  } catch {
    return null;
  }
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!username || !password) {
      setError("All fields are required");
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('https://localhost:7221/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: username, 
          password: password,
        }),
      });

      setLoading(false);

      if (!response.ok) {
        const errText = await response.text();
        setError("Login failed: " + errText);
        return;
      }

      const { token } = await response.json(); // JWT comes as plain text
      const decoded = parseJwt(token);

      // extract username + role from JWT
      const jwtUsername =
        decoded?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ||
        decoded?.unique_name ||
        decoded?.sub ||
        decoded?.name ||
        decoded?.email;

      const jwtRole =
        decoded?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
        decoded?.role ||
        "korisnik"; // default fallback

      // ✅ save JWT as plain string, and claims separately
      localStorage.setItem("token", token);
      localStorage.setItem("username", jwtUsername);
      localStorage.setItem("role", jwtRole);

      // update app state
      onLogin({ username: jwtUsername, role: jwtRole, token });

      navigate("/");
    } catch (err) {
      setLoading(false);
      setError(`An error occurred: ${err.message}`);
      console.error("Login error details:", err);
    }
  };

  return (
    <div className='login-form-container'>
      {loading && <div className='loading-message'>Loading...</div>}
      <form onSubmit={handleSubmit} className='login-form'>
        <h2 className='login-title'>Login</h2>

        <div className='form-group'>
          <label className='form-label'>Username or Email:</label>
          <input
            type="text"
            className="form-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className='form-group'>
          <label className='form-label'>Password:</label>
          <input
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" className="form-button2" disabled={loading}>
          {loading ? "Logging in..." : "Submit"}
        </button>
      </form>
    </div>
  );
}

Login.propTypes = {
  onLogin: PropTypes.func.isRequired,
};

export default Login;
