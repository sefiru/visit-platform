import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import axios from 'axios';

const ManageVisitCards = () => {
  const [visitCards, setVisitCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchVisitCards = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        const response = await axios.get('/api/admin/visit-cards', {
          headers: { Authorization: `Bearer ${token}` }
        });

        setVisitCards(response.data.visit_cards);
        setError('');
      } catch (err) {
        console.error('Error fetching visit cards:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load visit cards');
      } finally {
        setLoading(false);
      }
    };

    fetchVisitCards();
  }, []);

  // Filter visit cards based on search term
  const filteredVisitCards = visitCards.filter(card =>
    card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.user?.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="manage-visit-cards">
          <h1>Manage Visit Cards</h1>
          <div className="loading">Loading visit cards...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="manage-visit-cards">
          <h1>Manage Visit Cards</h1>
          <div className="error">Error: {error}</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="manage-visit-cards">
        <div className="admin-header">
          <h1>Manage Visit Cards</h1>
          <div className="admin-search">
            <input
              type="text"
              placeholder="Search visit cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="visit-cards-grid">
          {filteredVisitCards.length > 0 ? (
            filteredVisitCards.map(card => (
              <div key={card.id} className="visit-card-admin">
                <div className="visit-card-header">
                  <h3>{card.title}</h3>
                  <span className="card-id">ID: {card.id}</span>
                </div>
                
                <div className="visit-card-user">
                  <p><strong>Owner:</strong> {card.user?.name || card.user?.email}</p>
                  <p><strong>Company:</strong> {card.user?.company_name}</p>
                </div>
                
                <div className="visit-card-description">
                  <p>{card.description.substring(0, 150)}{card.description.length > 150 ? '...' : ''}</p>
                </div>
                
                <div className="visit-card-stats">
                  <p><strong>Views:</strong> {card.view_count}</p>
                  <p><strong>Bot Interactions:</strong> {card.bot_view_count}</p>
                </div>
                
                <div className="visit-card-actions">
                  <Link 
                    to={`/company/${card.id}`} 
                    target="_blank"
                    className="btn btn-outline btn-small"
                  >
                    View Public
                  </Link>
                  <Link 
                    to={`/admin/visit-cards/${card.id}/edit`} 
                    className="btn btn-primary btn-small"
                    style={{ marginLeft: '5px' }}
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">
              <p>No visit cards found.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManageVisitCards;