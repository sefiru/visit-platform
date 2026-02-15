import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Header from './Header';
import axios from 'axios';

const VisitCardPage = () => {
  const { id } = useParams();
  const [visitCard, setVisitCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hasFetched = useRef(false);

  useEffect(() => {
    // Prevent double execution in React strict mode
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchVisitCard = async () => {
      try {
        const response = await axios.get(`/api/visit-cards/${id}/public`);
        setVisitCard(response.data.visit_card);
        setError('');
      } catch (err) {
        console.error('Error fetching visit card:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load company information');
      } finally {
        setLoading(false);
      }
    };

    fetchVisitCard();
  }, [id]);

  if (loading) {
    return (
      <div className="visit-card-page">
        <Header showAuthButtons={false} />
        <div className="loading">Loading company information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="visit-card-page">
        <Header showAuthButtons={false} />
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="visit-card-page">
      <Header showAuthButtons={false} />
      
      <main className="company-detail">
        <div className="container">
          <header className="company-header">
            <h1>{visitCard?.title}</h1>
          </header>

          <section className="company-info">
            <p>{visitCard?.description}</p>
          </section>

          {visitCard?.view_count && (
            <section className="company-stats">
              <div className="stat-item">
                <h3>Statistics</h3>
                <p><strong>Website Views:</strong> {visitCard?.view_count}</p>
                <p><strong>Bot Interactions:</strong> {visitCard?.bot_view_count}</p>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default VisitCardPage;