import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Scissors, User as UserIcon } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-brand-900 text-gray-100">
      <nav className="bg-brand-800 border-b border-brand-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-brand-500 p-2 rounded-full">
                <Scissors className="h-6 w-6 text-brand-900" />
              </div>
              <span className="font-bold text-xl tracking-wide text-brand-500">JM <span className="text-white">BARBEARIA</span></span>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <UserIcon size={16} />
                    <span>Olá, {user.name} ({user.role === 'admin' ? 'Admin' : 'Cliente'})</span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 rounded-md hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    title="Sair"
                  >
                    <LogOut size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="bg-brand-800 py-4 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} JM Barbearia. Todos os direitos reservados.
      </footer>
    </div>
  );
};