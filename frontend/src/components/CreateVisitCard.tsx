import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import axios from 'axios';
import MarkdownPreview from './MarkdownPreview';
import './MarkdownEditor.css';

interface FormData {
  title: string;
  description: string;
  logo_url: string;
  domain: string;
  telegram_bot_token: string;
}

type EditorTab = 'edit' | 'preview';

const CreateVisitCard = () => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    logo_url: '',
    domain: '',
    telegram_bot_token: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<EditorTab>('edit');
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateBotToken = (token: string): boolean => {
    const botTokenRegex = /^\d+:[a-zA-Z0-9_-]{35}$/;
    return botTokenRegex.test(token);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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

      await axios.post('/api/visit-cards', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      navigate('/dashboard');
    } catch (err: unknown) {
      console.error('Error creating visit card:', err);
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = axiosErr.response?.data?.error || axiosErr.message || 'Failed to create visit card';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-visit-card">
      <Header />
      <div className="container">
        <h1>Create New Visit Card</h1>

        {error && <div className="error">{error}</div>}

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
            <label>Description (Markdown supported)</label>
            <div className="markdown-editor">
              <div className="markdown-editor-tabs">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
                  onClick={() => setActiveTab('edit')}
                >
                  Write
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('preview')}
                >
                  Preview
                </button>
              </div>
              {activeTab === 'edit' ? (
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Describe your company, services, or products using Markdown...

## Welcome to Our Company

We offer **amazing services** including:
- Service 1
- Service 2
- Service 3

Visit our [website](https://example.com) for more info."
                  rows={12}
                  className="markdown-textarea"
                />
              ) : (
                <div className="markdown-preview-container">
                  <MarkdownPreview content={formData.description} />
                </div>
              )}
            </div>
            <small className="form-help">
              Format your description using <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" rel="noopener noreferrer">Markdown</a> syntax
            </small>
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
            <label htmlFor="domain">Custom Domain (optional)</label>
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
            <label htmlFor="telegram_bot_token">Telegram Bot Token (optional)</label>
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
              {loading ? 'Creating...' : 'Create Visit Card'}
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

export default CreateVisitCard;
