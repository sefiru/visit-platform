import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import VisitCardDetail from './components/VisitCardDetail';
import CreateVisitCard from './components/CreateVisitCard';
import EditVisitCard from './components/EditVisitCard';
import AdminDashboard from './components/AdminDashboard';
import ManageUsers from './components/ManageUsers';
import ManageVisitCards from './components/ManageVisitCards';
import AdminStatistics from './components/AdminStatistics';
import EditUser from './components/EditUser';
import ChangePassword from './components/ChangePassword';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/company/:id" element={<VisitCardDetail />} />
          <Route path="/v/:domain" element={<VisitCardDetail />} />
          <Route path="/create-visit-card" element={<CreateVisitCard />} />
          <Route path="/edit-visit-card/:id" element={<EditVisitCard />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<ManageUsers />} />
          <Route path="/admin/users/:id/edit" element={<EditUser />} />
          <Route path="/admin/visit-cards" element={<ManageVisitCards />} />
          <Route path="/admin/visit-cards/:id/edit" element={<EditVisitCard />} />
          <Route path="/admin/statistics" element={<AdminStatistics />} />

          {/* Protected Routes */}
          <Route path="/change-password" element={<ChangePassword />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
