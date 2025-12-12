import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { ClientDashboard } from './pages/ClientDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

const AppContent: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
        <div className="bg-brand-900 min-h-screen text-gray-100 flex flex-col items-center pt-20 px-4">
             <div className="mb-8 text-center">
                 <h1 className="text-5xl font-bold text-brand-500 tracking-wider">JM <span className="text-white">BARBEARIA</span></h1>
                 <p className="text-gray-400 mt-2">Sistema de Gestão Profissional</p>
             </div>
             <Login />
        </div>
    );
  }

  return (
    <Layout>
      {user?.role === 'admin' ? <AdminDashboard /> : <ClientDashboard />}
    </Layout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}