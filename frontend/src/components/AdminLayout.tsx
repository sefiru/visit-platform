import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="admin-layout">
      <nav className="admin-nav">
        <div className="admin-nav-header">
          <h2>Admin Panel</h2>
        </div>
        <ul>
          <li>
            <Link
              to="/admin/dashboard"
              className={isActive('/admin/dashboard') ? 'active' : ''}
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              to="/admin/users"
              className={isActive('/admin/users') ? 'active' : ''}
            >
              Manage Users
            </Link>
          </li>
          <li>
            <Link
              to="/admin/visit-cards"
              className={isActive('/admin/visit-cards') ? 'active' : ''}
            >
              Manage Visit Cards
            </Link>
          </li>
          <li>
            <Link
              to="/admin/statistics"
              className={isActive('/admin/statistics') ? 'active' : ''}
            >
              Statistics
            </Link>
          </li>
        </ul>
        <div className="admin-nav-footer">
          <Link to="/">Back to Site</Link>
        </div>
      </nav>
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
