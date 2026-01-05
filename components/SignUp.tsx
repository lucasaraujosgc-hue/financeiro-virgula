import React, { useState } from 'react';
import { UserPlus, Mail, Lock, Building2, Phone, FileText, ArrowLeft, ArrowRight, X, ShieldCheck } from 'lucide-react';

interface SignUpProps {
  onSignUp: (data: any) => void;
  onBack: () => void;
  isLoading: boolean;
}

const TERMS_CONTENT = `
1. ACEITAÇÃO DOS TERMOS
Ao acessar, cadastrar-se ou utilizar o Sistema de Conciliação Financeira (doravante "Sistema"), você (doravante "Usuário") concorda em cumprir e estar vinculado a estes Termos e Condições de Uso ("Termos"). Se você não concordar com estes Termos, não utilize o Sistema.

O Sistema é fornecido por VIRGULA CONTABIL LTDA, CNPJ nº 52.613.515/0001-60, com o objetivo de auxiliar na gestão e conciliação de informações financeiras, facilitando a prestação dos serviços de contabilidade.

2. DESCRIÇÃO DO SERVIÇO
O Sistema é uma plataforma online desenvolvida para a organização e conciliação de dados financeiros. Os principais serviços incluem:
- Registro e categorização de lançamentos financeiros.
- Importação de extratos bancários (OFX, PDF ou outros formatos suportados).
- Geração de relatórios financeiros (ex: fluxo de caixa, DRE simplificado).
- Gerenciamento de previsões de lançamentos recorrentes.

3. CADASTRO, CONTA E SEGURANÇA
3.1. Elegibilidade: O Usuário declara ser maior de 18 (dezoito) anos e possuir plena capacidade civil para aceitar e cumprir estes Termos.
3.2. Informações de Cadastro: O Usuário concorda em fornecer informações verdadeiras, precisas e completas durante o registro e em mantê-las atualizadas.
3.3. Responsabilidade pela Conta: O Usuário é o único responsável pela segurança de sua senha e por todas as atividades que ocorram em sua conta. Você deve nos notificar imediatamente sobre qualquer uso não autorizado de sua conta.

4. PROPRIEDADE E ACESSO AOS DADOS (CLÁUSULA CRUCIAL)
4.1. Propriedade dos Dados: O Usuário retém toda a propriedade e direitos sobre os dados financeiros, informações e arquivos (ex: extratos bancários, lançamentos) que insere ou importa no Sistema ("Dados do Usuário").
4.2. Concessão de Acesso: O Usuário expressamente reconhece e concorda que, ao utilizar este Sistema, concede total e irrestrito acesso aos seus Dados do Usuário para a VIRGULA CONTABIL LTDA.
4.3. Finalidade do Acesso: O acesso aos Dados do Usuário pela VIRGULA CONTABIL LTDA é exclusivo para a prestação e otimização dos serviços de contabilidade contratados e/ou para a manutenção e melhoria do próprio Sistema.
4.4. Confidencialidade: A VIRGULA CONTABIL LTDA compromete-se a tratar os Dados do Usuário com a mais estrita confidencialidade, aplicando medidas técnicas e administrativas razoáveis para proteger as informações contra acesso, uso, alteração ou divulgação não autorizados.

5. RESPONSABILIDADES DO USUÁRIO
5.1. Veracidade dos Dados: O Usuário é o único responsável pela precisão, integridade e legalidade dos Dados do Usuário inseridos no Sistema. O Sistema de Conciliação Financeira é uma ferramenta de suporte e não substitui a responsabilidade do Usuário por suas obrigações fiscais e financeiras.
5.2. Licitude: O Usuário concorda em utilizar o Sistema apenas para fins lícitos.

6. EXCLUSÃO DE GARANTIAS E LIMITAÇÃO DE RESPONSABILIDADE
6.1. Precisão dos Dados: O Sistema utiliza os dados fornecidos pelo Usuário. Não garantimos que os relatórios gerados ou as conciliações sejam isentos de erros decorrentes de dados incorretos ou incompletos inseridos pelo Usuário.
6.2. Limitação de Responsabilidade: A VIRGULA CONTABIL LTDA não será responsável por quaisquer danos diretos, indiretos, incidentais, especiais ou consequenciais (incluindo, mas não se limitando a, perda de lucros, dados ou outras perdas intangíveis) resultantes do uso ou da incapacidade de usar o Sistema.

7. PROPRIEDADE INTELECTUAL
O código, design, estrutura e todas as funcionalidades do Sistema são de propriedade exclusiva da VIRGULA CONTABIL LTDA e estão protegidos por leis de direitos autorais e propriedade intelectual.

8. RESCISÃO
8.1. Pelo Usuário: O Usuário pode solicitar o cancelamento de sua conta a qualquer momento, o que pode resultar na exclusão ou anonimização de seus Dados do Usuário, salvo aqueles que somos legalmente obrigados a manter.
8.2. Pela VIRGULA CONTABIL LTDA: Reservamo-nos o direito de suspender ou rescindir o acesso do Usuário ao Sistema, a qualquer momento e sem aviso prévio, em caso de violação destes Termos.

9. DISPOSIÇÕES GERAIS
9.1. Lei Aplicável e Foro: Estes Termos são regidos pelas leis da República Federativa do Brasil. As partes elegem o foro da Comarca de São Gonçalo dos Campos, BAHIA para dirimir quaisquer dúvidas ou litígios decorrentes destes Termos, com renúncia a qualquer outro, por mais privilegiado que seja.
9.2. Alterações: Reservamo-nos o direito de modificar estes Termos a qualquer momento. Quaisquer alterações entrarão em vigor após a publicação da versão atualizada no Sistema. O uso continuado do Sistema após a publicação constitui aceitação de tais alterações.
`;

const SignUp: React.FC<SignUpProps> = ({ onSignUp, onBack, isLoading }) => {
  const [formData, setFormData] = useState({
    cnpj: '',
    razaoSocial: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert("As senhas não coincidem!");
      return;
    }

    if (!acceptedTerms) {
      alert("Você deve aceitar os Termos de Uso para prosseguir.");
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

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2 pt-2">
                <input 
                    type="checkbox" 
                    id="terms"
                    className="mt-1 w-4 h-4 text-primary bg-slate-900 border-slate-700 rounded focus:ring-primary focus:ring-2"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <label htmlFor="terms" className="text-xs text-slate-400">
                    Li e concordo com os <button type="button" onClick={() => setShowTermsModal(true)} className="text-primary hover:underline font-bold">Termos e Condições de Uso</button> da Vírgula Contábil Ltda.
                </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !acceptedTerms}
                className="w-full bg-primary text-slate-950 py-3 rounded-lg font-bold hover:bg-primaryHover transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/50"
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

      {/* Terms Modal */}
      {showTermsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowTermsModal(false)} />
              <div className="relative bg-surface w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl border border-slate-700 flex flex-col animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-950 rounded-t-xl">
                      <div className="flex items-center gap-3">
                          <ShieldCheck className="text-primary" size={24}/>
                          <h3 className="text-xl font-bold text-white">Termos e Condições de Uso</h3>
                      </div>
                      <button onClick={() => setShowTermsModal(false)} className="text-slate-400 hover:text-white transition-colors">
                          <X size={24}/>
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 text-slate-300 text-sm leading-relaxed custom-scroll whitespace-pre-wrap">
                      {TERMS_CONTENT}
                  </div>

                  <div className="p-6 border-t border-slate-700 bg-slate-950 rounded-b-xl flex justify-end gap-4">
                      <button 
                        onClick={() => setShowTermsModal(false)}
                        className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                          Fechar
                      </button>
                      <button 
                        onClick={() => { setAcceptedTerms(true); setShowTermsModal(false); }}
                        className="px-6 py-2 bg-primary text-slate-900 font-bold rounded-lg hover:bg-primaryHover transition-colors"
                      >
                          Li e Concordo
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SignUp;