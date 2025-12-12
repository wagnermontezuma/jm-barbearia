import React, { useState } from 'react';
import { db } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Mail } from 'lucide-react';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let user;
      if (isLogin) {
        user = await db.login(email, password);
      } else {
        user = await db.register(name, email, password);
      }
      login(user);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md bg-brand-800 p-8 rounded-lg shadow-xl border border-white/5">
        <h2 className="text-3xl font-bold text-center text-brand-500 mb-2">
          {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
        </h2>
        <p className="text-center text-gray-400 mb-8">
          {isLogin ? 'Acesse para agendar seu corte' : 'Junte-se a melhor barbearia da cidade'}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-500 h-5 w-5" />
              <input
                type="text"
                placeholder="Nome Completo"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-brand-900 border border-gray-700 rounded-md py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                required
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-500 h-5 w-5" />
            <input
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-brand-900 border border-gray-700 rounded-md py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-500 h-5 w-5" />
            <input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-brand-900 border border-gray-700 rounded-md py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-400 text-brand-900 font-bold py-3 rounded-md transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-gray-400 hover:text-brand-500 underline"
          >
            {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Fazer Login'}
          </button>
        </div>
      </div>
    </div>
  );
};