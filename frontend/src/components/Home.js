import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import axios from 'axios';

const Home = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [limit] = useState(10); // Number of items per page
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Fetch current user info if logged in
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get('/api/profile', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setCurrentUser(response.data.user);
        } catch (err) {
          console.error('Error fetching user profile:', err);
          // User might not be logged in, that's OK
        }
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/visit-cards/public?page=${currentPage}&limit=${limit}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`);
        setCompanies(response.data.visit_cards);
        setTotalPages(response.data.pagination.pages);
        setTotalResults(response.data.pagination.total);
        setError('');
      } catch (error) {
        console.error('Error fetching companies:', error);
        setError(error.response?.data?.error || error.message || 'Failed to load companies');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [currentPage, searchTerm]);

  // Handle search term changes - reset to first page when searching
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Generate page numbers for pagination controls
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <div className="home">
      <Header />
      
      <div className="search-bar-container">
        <input
          type="text"
          placeholder="Search companies..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>

      {/* Main Content - Companies List */}
      <main className="companies-list">
        <div className="container">
          <h2>Featured Companies</h2>
          
          {loading ? (
            <div className="loading">Loading companies...</div>
          ) : error ? (
            <div className="error">Error: {error}</div>
          ) : (
            <>
              <p className="results-count">
                Showing {(currentPage - 1) * limit + 1}-{Math.min(currentPage * limit, totalResults)} of {totalResults} company{totalResults !== 1 ? 'ies' : ''} {searchTerm && `(matching "${searchTerm}")`}
              </p>
              
              <div className="companies-grid">
                {companies.length > 0 ? (
                  companies.map(company => (
                    <div key={company.id} className="company-card">
                      <div className="company-header">
                        <h3>{company.title}</h3>
                      </div>
                      
                      <div className="company-body">
                        <p>{company.description}</p>
                      </div>
                      
                      
                      <div className="company-actions">
                        {/* For regular users - single button that goes to domain if available, otherwise to ID-based view */}
                        {!currentUser && (
                          <>
                            {company.domain ? (
                              <a 
                                href={`/v/${company.domain}`} 
                                className="btn btn-small btn-primary"
                              >
                                View Profile
                              </a>
                            ) : (
                              <Link to={`/company/${company.id}`} className="btn btn-small btn-primary">
                                View Profile
                              </Link>
                            )}
                          </>
                        )}
                        
                        {/* For logged-in users - show appropriate buttons based on role */}
                        {currentUser && (
                          <>
                            {/* If user is admin, show both options for all cards */}
                            {currentUser.role === 'admin' ? (
                              <>
                                {company.domain && (
                                  <a 
                                    href={`/v/${company.domain}`} 
                                    className="btn btn-small btn-primary"
                                    style={{marginRight: '5px'}}
                                  >
                                    Domain View
                                  </a>
                                )}
                                <Link 
                                  to={`/company/${company.id}`} 
                                  className={`btn btn-small ${company.domain ? 'btn-outline' : 'btn-primary'}`}
                                >
                                  {company.domain ? 'ID View' : 'View Profile'}
                                </Link>
                              </>
                            ) : (
                              /* For regular logged-in users - same as regular users */
                              <>
                                {company.domain ? (
                                  <a 
                                    href={`/v/${company.domain}`} 
                                    className="btn btn-small btn-primary"
                                  >
                                    View Profile
                                  </a>
                                ) : (
                                  <Link to={`/company/${company.id}`} className="btn btn-small btn-primary">
                                    View Profile
                                  </Link>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-results">
                    <p>No companies found.</p>
                  </div>
                )}
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pagination-controls">
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)} 
                    disabled={currentPage === 1}
                    className="btn btn-outline"
                  >
                    Previous
                  </button>
                  
                  {getPageNumbers().map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`btn ${currentPage === page ? 'btn-primary' : 'btn-outline'}`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button 
                    onClick={() => handlePageChange(currentPage + 1)} 
                    disabled={currentPage === totalPages}
                    className="btn btn-outline"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;