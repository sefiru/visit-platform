import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Header = ({ showAuthButtons = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    // Get user role from token or localStorage when component mounts
    const token = localStorage.getItem('token');
    if (token) {
      // Decode JWT token to get role
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const decodedToken = JSON.parse(jsonPayload);
        setUserRole(decodedToken.role || '');
      } catch (error) {
        console.error('Error decoding token:', error);
        // Fallback: try to get role from localStorage if available
        const storedRole = localStorage.getItem('role');
        if (storedRole) {
          setUserRole(storedRole);
        }
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role'); // Remove role from localStorage
    setUserRole('');
    navigate('/');
  };

  const isAuthenticated = !!localStorage.getItem('token');

  const isHomePage = location.pathname === '/';

  return (
    <header className="top-bar">
      <div className="logo">
        <Link to="/">
          <h1>Visit Platform</h1>
        </Link>
      </div>

      {showAuthButtons && (
        <nav className="auth-buttons">
          {isAuthenticated ? (
            <>
              {!isHomePage && (
                <Link to="/" className="btn btn-outline">Home</Link>
              )}
              {userRole === 'admin' && (
                <Link to="/admin/dashboard" className="btn btn-outline">Admin</Link>
              )}
              <Link to="/dashboard" className="btn btn-secondary">Dashboard</Link>
              <Link to="/change-password" className="btn btn-outline">Change Password</Link>
              <button onClick={handleLogout} className="btn btn-outline">Logout</button>
            </>
          ) : (
            <>
              {!isHomePage && (
                <Link to="/" className="btn btn-outline">Home</Link>
              )}
              <Link to="/login" className="btn btn-outline">Login</Link>
              <Link to="/register" className="btn btn-primary">Sign Up</Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
};

export default Header;