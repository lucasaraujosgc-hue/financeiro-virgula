import React, { useState } from 'react';
import { Lock, Mail, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLogin: (data: any) => void;
  onForgotPassword: () => void;
  onSignUp: () => void;
  isLoading: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, onForgotPassword, onSignUp, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({ email, password });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 bg-blue-600 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <span className="text-3xl font-bold text-white">S</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Bem-vindo de volta</h2>
          <p className="text-blue-100 mt-2">Acesse sua conta para gerenciar suas finanças</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Senha</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-blue-200"
            >
              {isLoading ? (
                'Entrando...'
              ) : (
                <>
                  Acessar Sistema <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3 text-center">
            <button 
              onClick={onForgotPassword}
              className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              Esqueceu sua senha? Recuperar acesso
            </button>
            <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-400">Ou</span>
                </div>
            </div>
            <button 
              onClick={onSignUp}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Primeiro acesso? Crie sua conta empresarial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;