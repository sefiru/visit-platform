import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import axios from 'axios';

const ChangePassword = () => {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate form
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.put('/api/profile/password', {
        old_password: formData.oldPassword,
        new_password: formData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Password updated successfully!');
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Optionally redirect after a delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Error updating password:', err);
      setError(err.response?.data?.error || err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password">
      <Header />
      
      <div className="container">
        <h1>Change Password</h1>
        
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        
        <form onSubmit={handleSubmit} className="password-form">
          <div className="form-group">
            <label htmlFor="oldPassword">Current Password</label>
            <input
              type="password"
              id="oldPassword"
              name="oldPassword"
              value={formData.oldPassword}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="Enter your current password"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              required
              minLength="6"
              disabled={loading}
              placeholder="Enter your new password (min 6 characters)"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="Confirm your new password"
            />
          </div>
          
          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>
            <button 
              type="button" 
              className="btn btn-outline"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;