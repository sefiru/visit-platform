import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import axios from 'axios';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVisitCards: 0,
    totalViews: 0,
    totalBotInteractions: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        // Fetch all users to get user count
        const usersResponse = await axios.get('/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Fetch all visit cards to get card count and aggregate stats
        const cardsResponse = await axios.get('/api/admin/visit-cards', {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Calculate aggregated stats
        const visitCards = cardsResponse.data.visit_cards;
        const totalViews = visitCards.reduce((sum, card) => sum + card.view_count, 0);
        const totalBotInteractions = visitCards.reduce((sum, card) => sum + card.bot_view_count, 0);

        setStats({
          totalUsers: usersResponse.data.users.length,
          totalVisitCards: visitCards.length,
          totalViews,
          totalBotInteractions
        });
        setError('');
      } catch (err) {
        console.error('Error fetching admin stats:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load admin statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-dashboard">
          <h1>Admin Dashboard</h1>
          <div className="loading">Loading statistics...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="admin-dashboard">
          <h1>Admin Dashboard</h1>
          <div className="error">Error: {error}</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-dashboard">
        <h1>Admin Dashboard</h1>
        
        <div className="admin-stats-grid">
          <div className="stat-card">
            <h3>Total Users</h3>
            <p className="stat-number">{stats.totalUsers}</p>
            <Link to="/admin/users" className="btn btn-outline">Manage Users</Link>
          </div>
          
          <div className="stat-card">
            <h3>Total Visit Cards</h3>
            <p className="stat-number">{stats.totalVisitCards}</p>
            <Link to="/admin/visit-cards" className="btn btn-outline">Manage Cards</Link>
          </div>
          
          <div className="stat-card">
            <h3>Total Views</h3>
            <p className="stat-number">{stats.totalViews}</p>
            <Link to="/admin/statistics" className="btn btn-outline">View Details</Link>
          </div>
          
          <div className="stat-card">
            <h3>Total Bot Interactions</h3>
            <p className="stat-number">{stats.totalBotInteractions}</p>
            <Link to="/admin/statistics" className="btn btn-outline">View Details</Link>
          </div>
        </div>
        
        <div className="admin-quick-links">
          <h2>Quick Actions</h2>
          <div className="quick-links-grid">
            <Link to="/admin/users" className="quick-link-card">
              <h3>User Management</h3>
              <p>Add, edit, or delete users</p>
            </Link>
            <Link to="/admin/visit-cards" className="quick-link-card">
              <h3>Visit Card Management</h3>
              <p>View and manage all visit cards</p>
            </Link>
            <Link to="/admin/statistics" className="quick-link-card">
              <h3>Statistics</h3>
              <p>Detailed analytics and reports</p>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;