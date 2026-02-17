import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Header from './Header';
import axios from 'axios';
import MarkdownPreview from './MarkdownPreview';
import type { VisitCard } from '../types';

const VisitCardDetail = () => {
  const { id, domain } = useParams<{ id?: string; domain?: string }>();
  const location = useLocation();
  const [visitCard, setVisitCard] = useState<VisitCard | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchVisitCard = async () => {
      try {
        const token = localStorage.getItem('token');
        let response;

        if (location.pathname.startsWith('/v/')) {
          response = await axios.get(`/api/v/${domain}`);
        } else {
          if (token) {
            response = await axios.get(`/api/visit-cards/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
          } else {
            response = await axios.get(`/api/visit-cards/${id}/public`);
          }
        }

        setVisitCard(response.data.visit_card);
        setError('');
      } catch (err: unknown) {
        console.error('Error fetching visit card:', err);
        const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
        setError(axiosErr.response?.data?.error || axiosErr.message || 'Failed to load company information');
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
            <MarkdownPreview content={visitCard?.description || ''} />
          </section>
        </div>
      </main>
    </div>
  );
};

export default VisitCardDetail;
