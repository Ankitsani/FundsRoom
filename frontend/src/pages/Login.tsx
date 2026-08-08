import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Package, Lock, Mail, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      showToast('Logged in successfully', 'success');
      navigate('/');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Invalid email or password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d111c] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex bg-brand-500/10 text-brand-400 p-3.5 rounded-2xl border border-brand-500/20 mb-4 shadow-lg shadow-brand-500/5">
            <Package className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Fundsroom</h1>
          <p className="text-gray-400 mt-2 text-sm">Mini ERP & CRM Operations Portal</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900/60 border border-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email field */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="block w-full pl-10 pr-4 py-3 bg-gray-950/60 border border-gray-800 rounded-xl text-white placeholder-gray-500 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="block w-full pl-10 pr-10 py-3 bg-gray-950/60 border border-gray-800 rounded-xl text-white placeholder-gray-500 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-brand-600/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In to Portal</span>
              )}
            </button>
          </form>

          {/* Test Credentials helper */}
          <div className="mt-8 pt-6 border-t border-gray-800/80 text-center">
            <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wide">Demo Accounts Credentials</p>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 text-left bg-gray-950/30 p-3 rounded-xl border border-gray-800/40">
              <div><strong className="text-brand-400">Admin:</strong> admin@fundsroom.com</div>
              <div><strong className="text-brand-400">PW:</strong> admin123</div>
              <div><strong className="text-brand-400">Sales:</strong> sales@fundsroom.com</div>
              <div><strong className="text-brand-400">PW:</strong> sales123</div>
              <div><strong className="text-brand-400">Warehouse:</strong> warehouse@fundsroom.com</div>
              <div><strong className="text-brand-400">PW:</strong> warehouse123</div>
              <div><strong className="text-brand-400">Accounts:</strong> accounts@fundsroom.com</div>
              <div><strong className="text-brand-400">PW:</strong> accounts123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Login;
