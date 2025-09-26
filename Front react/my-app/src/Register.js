import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router-dom';
import './Register.css';

function Register({ onRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/Registracija') {
      document.body.classList.add('custom-page-background');
    }
    return () => document.body.classList.remove('custom-page-background');
  }, [location.pathname]);

  const handleBack = () => navigate('/');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!username || !password || !email || !image) {
      setError('All fields are required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('https://localhost:7221/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: username,
          email,
          password,
          image,
          role: 'korisnik', // backend default
        }),
      });

      setLoading(false);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        setError(`Registration failed: ${errData.error || 'Unknown error'}`);
        return;
      }

      const { token } = await response.json(); // backend returns token as plain text
      localStorage.setItem('token', token); // store JWT
      onRegister({ name: username, token }); // pass user info to parent
      alert('Registration successful!');
      navigate('/'); // redirect to home
    } catch (err) {
      setLoading(false);
      setError(`An error occurred: ${err.message}`);
      console.error('Registration error details:', err);
    }
  };

  return (
    <div>
      <div className='container'>
        <h3 style={{ fontWeight: 'bold', padding: '50px' }}>Create account</h3>
        {loading && <div>Loading...</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="email">Email</label>
            <input
              type="text"
              id="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="new-password"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="image">Image</label>
            <input
              type="text"
              id="image"
              className="form-control"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="Enter your image URL"
              autoComplete="off"
            />
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <button type="submit" className="form-button" disabled={loading}>
            {loading ? 'Loading...' : 'Register'}
          </button>
        </form>
      </div>
      <button className='form-button2' type="button" onClick={handleBack}>
        back
      </button>
    </div>
  );
}

Register.propTypes = {
  onRegister: PropTypes.func.isRequired,
};

export default Register;
