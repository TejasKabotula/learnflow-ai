import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, PlayCircle, BookOpen } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('tejas@example.com');
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col justify-between relative overflow-hidden transition-colors duration-300">
      {/* Ambient background glow accents */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none opacity-20"
        style={{ background: 'radial-gradient(circle, var(--color-accent-primary) 0%, transparent 70%)' }}
      />


      {/* Top Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-medium)] flex items-center justify-center text-[var(--text-primary)] font-bold text-sm shadow-[0_0_12px_rgba(139,92,246,0.25)] shrink-0">
            L
          </div>
          <span className="text-sm font-semibold tracking-wide text-[var(--text-primary)] whitespace-nowrap">
            LEARN FLOW <span className="font-bold text-[var(--text-primary)] opacity-80">AI</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content: Split / Centered Grid */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Visual Brand Story (hidden on small screens) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-center space-y-6 pr-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px] font-semibold tracking-wider text-[var(--color-accent-primary)] uppercase w-fit">
              <Sparkles size={12} /> Next-Gen Learning
            </div>

            <h1 className="text-3xl xl:text-4xl font-bold tracking-tight leading-tight text-[var(--text-primary)]">
              Transform passive video into <br />
              active mastery.
            </h1>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Curate modular curriculum pathways, chat with timestamped video intelligence, and test your recall with instant AI notes.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                <div className="w-5 h-5 rounded-md bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] flex items-center justify-center">
                  <CheckCircle2 size={13} />
                </div>
                <span>4-tier resilient YouTube speech transcription</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                <div className="w-5 h-5 rounded-md bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] flex items-center justify-center">
                  <PlayCircle size={13} />
                </div>
                <span>Timestamp-grounded lecture citations & RAG</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <BookOpen size={13} />
                </div>
                <span>Automated note synthesis & active-recall quizzes</span>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Login Card */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:col-span-7 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-8 sm:p-10 shadow-xl backdrop-blur-md relative"
          >
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Welcome back</h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-1.5">
                Sign in to resume your learning pathway and active streaks.
              </p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs p-3.5 rounded-xl mb-6 flex items-center gap-2.5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span className="flex-1">{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail size={16} className="absolute left-4 text-[var(--text-tertiary)] pointer-events-none" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl pl-11 pr-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-accent-primary)] focus:ring-1 focus:ring-[var(--color-accent-primary)] transition-all"
                    placeholder="student@example.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Password
                  </label>
                  <button 
                    type="button" 
                    onClick={fillDemoCredentials}
                    className="text-[11px] text-[var(--color-accent-primary)] hover:underline cursor-pointer"
                  >
                    Use Demo Account
                  </button>
                </div>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-4 text-[var(--text-tertiary)] pointer-events-none" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl pl-11 pr-11 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-accent-primary)] focus:ring-1 focus:ring-[var(--color-accent-primary)] transition-all"
                    placeholder="••••••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 font-medium rounded-xl px-4 py-3.5 mt-2 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-[var(--text-inverse)] border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <>
                    <span>Sign In to Learn Flow</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="pt-6 mt-6 border-t border-[var(--border-subtle)] text-center">
              <p className="text-xs text-[var(--text-tertiary)]">
                New to Learn Flow?{' '}
                <Link to="/register" className="text-[var(--color-accent-primary)] font-semibold hover:underline">
                  Create an account
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-[11px] text-[var(--text-tertiary)] z-10">
        <span>© {new Date().getFullYear()} Learn Flow AI. EdTech Reimagined.</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-400" /> Secure JWT Session
          </span>
        </div>
      </footer>
    </div>
  );
}
