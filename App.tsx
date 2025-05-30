import React from 'react';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import MainAppLayout from './components/MainAppLayout';

const App: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 text-white">
      {isAuthenticated ? <MainAppLayout /> : <LoginPage />}
    </div>
  );
};

export default App;