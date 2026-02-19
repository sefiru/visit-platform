import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from './Header';
import axios from 'axios';
import MarkdownPreview from './MarkdownPreview';
import './MarkdownEditor.css';
import './LogoUpload.css';

interface FormData {
  title: string;
  description: string;
  domain: string;
  telegram_bot_token: string;
}

type EditorTab = 'edit' | 'preview';

const EditVisitCard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    domain: '',
    telegram_bot_token: ''
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [activeTab, setActiveTab] = useState<EditorTab>('edit');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

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

        const card = response.data.visit_card;
        setFormData({
          title: card.title,
          description: card.description,
          domain: card.domain,
          telegram_bot_token: card.telegram_bot_token
        });

        // If there's an existing logo URL, fetch and display it
        if (card.logo_url) {
          setLogoPreview(`/api/images/${card.logo_url}`);
        }

        setError('');
      } catch (err: unknown) {
        console.error('Error fetching visit card:', err);
        const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
        setError(axiosErr.response?.data?.error || axiosErr.message || 'Failed to load visit card');
      } finally {
        setLoading(false);
      }
    };

    fetchVisitCard();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload PNG, JPEG, GIF, WEBP, or SVG.');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit.');
      return;
    }

    setLogoFile(file);
    setError('');

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      setUploadingLogo(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      await axios.delete(`/api/visit-cards/${id}/logo`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setLogoFile(null);
      setLogoPreview('');
      setFormData(prev => ({ ...prev, logo_url: '' }));
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
      setSuccess('Logo removed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      console.error('Error removing logo:', err);
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      setError(axiosErr.response?.data?.error || 'Failed to remove logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const validateBotToken = (token: string): boolean => {
    const botTokenRegex = /^\d+:[a-zA-Z0-9_-]{35}$/;
    return botTokenRegex.test(token);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

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

      // Update visit card details
      await axios.put(`/api/visit-cards/${id}`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // If logo file is selected, upload it
      if (logoFile) {
        const formDataLogo = new FormData();
        formDataLogo.append('logo', logoFile);

        await axios.put(`/api/visit-cards/${id}/logo`, formDataLogo, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      setSuccess('Visit card updated successfully!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: unknown) {
      console.error('Error updating visit card:', err);
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = axiosErr.response?.data?.error || axiosErr.message || 'Failed to update visit card';
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
            <label>Logo</label>
            <div className="logo-upload-container">
              {logoPreview ? (
                <div className="logo-preview-wrapper">
                  <img src={logoPreview} alt="Logo preview" className="logo-preview" />
                  <button
                    type="button"
                    className="btn btn-danger btn-small remove-logo-btn"
                    onClick={handleRemoveLogo}
                    disabled={uploadingLogo || loading}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div 
                  className={`logo-upload-area ${isDragging ? 'drag-active' : ''}`}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    ref={logoInputRef}
                    type="file"
                    id="logo-upload"
                    accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                    onChange={handleLogoChange}
                    disabled={loading}
                    className="logo-input"
                  />
                  <label htmlFor="logo-upload" className="logo-upload-label">
                    <span className="upload-icon">📁</span>
                    <span>Click to upload or drag and drop</span>
                    <span className="upload-hint">PNG, JPEG, GIF, WEBP, SVG (max 5MB)</span>
                  </label>
                </div>
              )}
            </div>
            <small className="form-help">Upload a company logo (optional)</small>
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
