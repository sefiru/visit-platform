import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import axios from 'axios';
import type { VisitCard, User } from '../types';

const Home = () => {
  const [companies, setCompanies] = useState<VisitCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [limit] = useState<number>(10);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
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
      } catch (err: unknown) {
        console.error('Error fetching companies:', err);
        const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
        setError(axiosErr.response?.data?.error || axiosErr.message || 'Failed to load companies');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [currentPage, searchTerm, limit]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
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

                        {currentUser && (
                          <>
                            {currentUser.role === 'admin' ? (
                              <>
                                {company.domain && (
                                  <a
                                    href={`/v/${company.domain}`}
                                    className="btn btn-small btn-primary"
                                    style={{ marginRight: '5px' }}
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
