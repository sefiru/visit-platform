import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from './Header';
import axios from 'axios';

const EditVisitCard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    logo_url: '',
    domain: '',
    telegram_bot_token: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchVisitCard = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        const response = await axios.get(`/api/visit-cards/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        setFormData({
          title: response.data.visit_card.title,
          description: response.data.visit_card.description,
          logo_url: response.data.visit_card.logo_url,
          domain: response.data.visit_card.domain,
          telegram_bot_token: response.data.visit_card.telegram_bot_token
        });
        setError('');
      } catch (err) {
        console.error('Error fetching visit card:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load visit card');
      } finally {
        setLoading(false);
      }
    };

    fetchVisitCard();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateBotToken = (token) => {
    // Telegram bot tokens follow the format: digits:letters
    // Example: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyz
    // The pattern is: digits+:letters (typically 8-10 digits followed by 35-character base64-like string)
    const botTokenRegex = /^\d+:[a-zA-Z0-9_-]{35}$/;
    return botTokenRegex.test(token);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Client-side validation for bot token format
    if (formData.telegram_bot_token && formData.telegram_bot_token.trim() !== "" && !validateBotToken(formData.telegram_bot_token)) {
      setError('Invalid bot token format. Bot tokens should follow the format: digits:letters (e.g., 123456789:ABCdefGhIJKlmNoPQRsTUVwxyz)');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.put(`/api/visit-cards/${id}`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setSuccess('Visit card updated successfully!');
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      console.error('Error updating visit card:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update visit card';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !formData.title) {
    return (
      <div className="edit-visit-card">
        <Header />
        <div className="container">
          <h1>Edit Visit Card</h1>
          <div className="loading">Loading visit card...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-visit-card">
      <Header />
      <div className="container">
        <h1>Edit Visit Card</h1>
        
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        
        <form onSubmit={handleSubmit} className="visit-card-form">
          <div className="form-group">
            <label htmlFor="title">Company Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="Enter company name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={loading}
              placeholder="Describe your company, services, or products"
              rows="6"
            ></textarea>
          </div>
          
          <div className="form-group">
            <label htmlFor="logo_url">Logo URL</label>
            <input
              type="text"
              id="logo_url"
              name="logo_url"
              value={formData.logo_url}
              onChange={handleChange}
              disabled={loading}
              placeholder="https://example.com/logo.png"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="domain">Custom Domain</label>
            <input
              type="text"
              id="domain"
              name="domain"
              value={formData.domain}
              onChange={handleChange}
              disabled={loading}
              placeholder="yourcompany.com"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="telegram_bot_token">Telegram Bot Token</label>
            <input
              type="text"
              id="telegram_bot_token"
              name="telegram_bot_token"
              value={formData.telegram_bot_token}
              onChange={handleChange}
              disabled={loading}
              placeholder="Enter your Telegram bot token"
            />
            <small className="form-help">
              Connect a Telegram bot to allow customers to interact with your visit card via Telegram
            </small>
          </div>
          
          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Visit Card'}
            </button>
            <Link to="/dashboard" className="btn btn-outline">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditVisitCard;