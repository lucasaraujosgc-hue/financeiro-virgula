import React, { useState } from 'react';
import { UserPlus, Mail, Lock, Building2, Phone, FileText, ArrowLeft, ArrowRight } from 'lucide-react';

interface SignUpProps {
  onSignUp: (data: any) => void;
  onBack: () => void;
  isLoading: boolean;
}

const SignUp: React.FC<SignUpProps> = ({ onSignUp, onBack, isLoading }) => {
  const [formData, setFormData] = useState({
    cnpj: '',
    razaoSocial: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert("As senhas não coincidem!");
      return;
    }

    onSignUp(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-800">
        
        {/* Left Side - Hero */}
        <div className="bg-slate-950 p-8 text-white md:w-2/5 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-6 border border-primary/30">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Primeiro Acesso</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Crie sua conta empresarial para ter controle total sobre suas finanças, conciliação bancária e previsões.
            </p>
          </div>
          
          <div className="mt-8 relative z-10">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Já tem conta?</p>
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:text-emerald-400 transition-colors"
            >
              <ArrowLeft size={16} /> Voltar para Login
            </button>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="p-8 md:w-3/5">
          <h3 className="text-xl font-bold text-white mb-6">Dados da Empresa</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-4">
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  name="cnpj"
                  type="text"
                  required
                  value={formData.cnpj}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-white placeholder-slate-600"
                  placeholder="CNPJ (apenas números)"
                />
              </div>

              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  name="razaoSocial"
                  type="text"
                  required
                  value={formData.razaoSocial}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-white placeholder-slate-600"
                  placeholder="Razão Social"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-white placeholder-slate-600"
                    placeholder="Email Corporativo"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-white placeholder-slate-600"
                    placeholder="Telefone"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-white placeholder-slate-600"
                    placeholder="Senha"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-white placeholder-slate-600"
                    placeholder="Confirmar Senha"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-slate-950 py-3 rounded-lg font-bold hover:bg-primaryHover transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/50"
              >
                {isLoading ? (
                  'Cadastrando...'
                ) : (
                  <>
                    Finalizar Cadastro <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;