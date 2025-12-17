import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Wallet } from 'lucide-react';

interface LoginProps {
  onLogin: (data: any, rememberMe: boolean) => void;
  onForgotPassword: () => void;
  onSignUp: () => void;
  isLoading: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, onForgotPassword, onSignUp, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({ email, password }, rememberMe);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-800">
        <div className="p-8 bg-slate-950 text-center border-b border-slate-800">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/30">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-white">Virgula Contábil</h2>
          <p className="text-slate-400 mt-2">Acesse seus indicadores financeiros</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-white placeholder-slate-600"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">Senha</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-white placeholder-slate-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-slate-700 rounded bg-slate-800"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400">
                Permanecer conectado
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-slate-950 py-3 rounded-lg font-bold hover:bg-primaryHover transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/50"
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
              className="text-sm text-slate-500 hover:text-primary transition-colors"
            >
              Esqueceu sua senha? Recuperar acesso
            </button>
            <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-surface px-2 text-slate-600">Ou</span>
                </div>
            </div>
            <button 
              onClick={onSignUp}
              className="text-sm font-semibold text-primary hover:text-emerald-400 transition-colors"
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