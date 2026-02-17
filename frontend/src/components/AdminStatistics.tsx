import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import axios from 'axios';
import type { User, CardStatistic } from '../types';

interface CardStatisticWithUser extends CardStatistic {
  user?: User;
}

const AdminStatistics = () => {
  const [statistics, setStatistics] = useState<CardStatisticWithUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        const response = await axios.get('/api/admin/visit-cards/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });

        setStatistics(response.data.all_stats);
        setError('');
      } catch (err: unknown) {
        console.error('Error fetching statistics:', err);
        const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
        setError(axiosErr.response?.data?.error || axiosErr.message || 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-statistics">
          <h1>Statistics</h1>
          <div className="loading">Loading statistics...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="admin-statistics">
          <h1>Statistics</h1>
          <div className="error">Error: {error}</div>
        </div>
      </AdminLayout>
    );
  }

  const totalViews = statistics.reduce((sum, card) => sum + card.view_count, 0);
  const totalBotInteractions = statistics.reduce((sum, card) => sum + card.bot_view_count, 0);
  const totalCards = statistics.length;

  return (
    <AdminLayout>
      <div className="admin-statistics">
        <h1>Statistics</h1>

        <div className="stats-summary">
          <div className="summary-card">
            <h3>Total Visit Cards</h3>
            <p className="summary-number">{totalCards}</p>
          </div>
          <div className="summary-card">
            <h3>Total Views</h3>
            <p className="summary-number">{totalViews}</p>
          </div>
          <div className="summary-card">
            <h3>Total Bot Interactions</h3>
            <p className="summary-number">{totalBotInteractions}</p>
          </div>
          <div className="summary-card">
            <h3>Average Views per Card</h3>
            <p className="summary-number">
              {totalCards > 0 ? Math.round(totalViews / totalCards) : 0}
            </p>
          </div>
        </div>

        <div className="statistics-table-container">
          <h2>Detailed Statistics</h2>
          <table className="statistics-table">
            <thead>
              <tr>
                <th>Card ID</th>
                <th>Title</th>
                <th>Owner</th>
                <th>Company</th>
                <th>Views</th>
                <th>Bot Interactions</th>
              </tr>
            </thead>
            <tbody>
              {statistics.length > 0 ? (
                statistics.map(stat => (
                  <tr key={stat.id}>
                    <td>{stat.id}</td>
                    <td>{stat.title}</td>
                    <td>{stat.user?.name || stat.user?.email}</td>
                    <td>{stat.user?.company_name || 'N/A'}</td>
                    <td>{stat.view_count}</td>
                    <td>{stat.bot_view_count}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>No statistics available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminStatistics;
