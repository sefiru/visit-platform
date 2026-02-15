import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import axios from 'axios';

const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    company_name: '',
    role: 'user'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        const response = await axios.get(`/api/admin/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setUserData({
          name: response.data.user.name || '',
          email: response.data.user.email || '',
          company_name: response.data.user.company_name || '',
          role: response.data.user.role || 'user'
        });
        setError('');
      } catch (err) {
        console.error('Error fetching user:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load user');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      await axios.put(`/api/admin/users/${id}`, userData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('User updated successfully!');
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/admin/users');
      }, 1500);
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err.response?.data?.error || err.message || 'Failed to update user');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="edit-user">
          <h1>Edit User</h1>
          <div className="loading">Loading user data...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="edit-user">
        <h1>Edit User</h1>
        
        {error && <div className="error">Error: {error}</div>}
        {success && <div className="success">{success}</div>}
        
        <form onSubmit={handleSubmit} className="user-form">
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={userData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={userData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="company_name">Company Name</label>
            <input
              type="text"
              id="company_name"
              name="company_name"
              value={userData.company_name}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              value={userData.role}
              onChange={handleChange}
              required
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Update User
            </button>
            <Link to="/admin/users" className="btn btn-outline">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default EditUser;