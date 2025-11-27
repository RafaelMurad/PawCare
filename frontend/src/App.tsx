import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Dogs from './pages/Dogs';
import DogProfile from './pages/DogProfile';
import FoodSafety from './pages/FoodSafety';
import Vaccinations from './pages/Vaccinations';
import Events from './pages/Events';
import Toys from './pages/Toys';
import Health from './pages/Health';
import AIAssistant from './pages/AIAssistant';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dogs" element={<Dogs />} />
        <Route path="dogs/:id" element={<DogProfile />} />
        <Route path="food" element={<FoodSafety />} />
        <Route path="vaccinations" element={<Vaccinations />} />
        <Route path="events" element={<Events />} />
        <Route path="toys" element={<Toys />} />
        <Route path="health" element={<Health />} />
        <Route path="ai" element={<AIAssistant />} />
      </Route>
    </Routes>
  );
}

export default App;
