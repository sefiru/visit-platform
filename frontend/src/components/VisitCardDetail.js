import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Header from './Header';
import axios from 'axios';

const VisitCardDetail = () => {
  const { id, domain } = useParams(); // Either id or domain will be present depending on the route
  const location = useLocation();
  const [visitCard, setVisitCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hasFetched = React.useRef(false);

  useEffect(() => {
    // Prevent double execution in React strict mode
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchVisitCard = async () => {
      try {
        const token = localStorage.getItem('token');
        let response;

        // Determine which parameter to use based on the route
        if (location.pathname.startsWith('/v/')) {
          // Domain-based route - always public
          response = await axios.get(`/api/v/${domain}`);
        } else {
          // ID-based route - use protected endpoint if user is logged in
          if (token) {
            // User is logged in, use the protected endpoint to get detailed info
            response = await axios.get(`/api/visit-cards/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
          } else {
            // User is not logged in, use the public endpoint
            response = await axios.get(`/api/visit-cards/${id}/public`);
          }
        }

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
  }, [id, domain, location.pathname]);

  if (loading) {
    return (
      <div className="visit-card-page">
        <Header />
        <div className="loading">Loading company information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="visit-card-page">
        <Header />
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="visit-card-page">
      <Header />
      
      <main className="company-detail">
        <div className="container">
          <header className="company-header">
            <h1>{visitCard?.title}</h1>
            {visitCard?.logo_url && (
              <div className="company-logo">
                <img src={visitCard.logo_url} alt={`${visitCard.title} logo`} />
              </div>
            )}
          </header>

          <section className="company-info">
            <p>{visitCard?.description}</p>
          </section>

          

        </div>
      </main>
    </div>
  );
};

export default VisitCardDetail;