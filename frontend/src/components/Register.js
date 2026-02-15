import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from './Header';
import axios from 'axios';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('/api/register', {
        email,
        password,
        name,
        companyName
      });
      
      // Store the token in localStorage
      localStorage.setItem('token', response.data.token);
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Registration failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Header showAuthButtons={false} />
      <div className="auth-form-container">
        <h2>Create Account</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
              disabled={loading}
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        <p className="auth-note">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;