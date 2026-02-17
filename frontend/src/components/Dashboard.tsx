import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from './Header';
import axios from 'axios';
import type { User, VisitCard } from '../types';

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [visitCards, setVisitCards] = useState<VisitCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const userResponse = await axios.get('/api/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(userResponse.data.user);

        const cardsResponse = await axios.get('/api/visit-cards/my', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setVisitCards(cardsResponse.data.visit_cards);
      } catch (err: unknown) {
        console.error('Error fetching user data:', err);
        const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
        setError(axiosErr.response?.data?.error || axiosErr.message || 'Failed to load dashboard data');
        localStorage.removeItem('token');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleDeleteCard = async (cardId: number) => {
    if (!window.confirm('Are you sure you want to delete this visit card? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      await axios.delete(`/api/visit-cards/${cardId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setVisitCards(visitCards.filter(card => card.id !== cardId));
    } catch (err: unknown) {
      console.error('Error deleting visit card:', err);
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = axiosErr.response?.data?.error || axiosErr.message || 'Failed to delete visit card';
      setError(errorMessage);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="dashboard">
      <Header />
      <div className="container">
        <h1>Dashboard</h1>
        <div className="user-info">
          <h2>Welcome, {user?.name || user?.email}!</h2>
          <p><strong>Company:</strong> {user?.company_name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <div className="user-actions">
            <a href="/change-password" className="btn btn-outline">Change Password</a>
          </div>
        </div>

        <div className="visit-cards-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Your Visit Cards</h3>
            <Link to="/create-visit-card" className="btn btn-primary">
              + New Visit Card
            </Link>
          </div>

          {visitCards.length === 0 ? (
            <p>You haven't created any visit cards yet.</p>
          ) : (
            <ul>
              {visitCards.map(card => (
                <li key={card.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <h4>{card.title}</h4>
                      <p>{card.description.substring(0, 100)}{card.description.length > 100 ? '...' : ''}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p><strong>Views:</strong> {card.view_count}</p>
                      <p><strong>Bot:</strong> {card.bot_view_count}</p>
                      <div style={{ marginTop: '10px' }}>
                        <Link
                          to={`/edit-visit-card/${card.id}`}
                          className="btn btn-outline"
                          style={{ marginRight: '10px' }}
                        >
                          Edit
                        </Link>
                        <Link
                          to={`/company/${card.id}`}
                          className="btn btn-secondary"
                          style={{ marginRight: '10px' }}
                        >
                          View
                        </Link>
                        {card.domain && (
                          <a
                            href={`/v/${card.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-info"
                            style={{ marginRight: '10px' }}
                          >
                            Visit Domain
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          className="btn btn-danger"
                          style={{ marginRight: '10px' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
