import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

const CreateVisitCard = () => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    domain: '',
    telegram_bot_token: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<EditorTab>('edit');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
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

      // First, create the visit card
      const response = await axios.post('/api/visit-cards', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const cardId = response.data.visit_card.id;

      // If logo file is selected, upload it
      if (logoFile) {
        const formDataLogo = new FormData();
        formDataLogo.append('logo', logoFile);

        await axios.put(`/api/visit-cards/${cardId}/logo`, formDataLogo, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

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
            <label>Logo</label>
            <div className="logo-upload-container">
              {logoPreview ? (
                <div className="logo-preview-wrapper">
                  <img src={logoPreview} alt="Logo preview" className="logo-preview" />
                  <button
                    type="button"
                    className="btn btn-danger btn-small remove-logo-btn"
                    onClick={handleRemoveLogo}
                    disabled={loading}
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
                  placeholder="Describe your company, services, or products using Markdown..."
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
