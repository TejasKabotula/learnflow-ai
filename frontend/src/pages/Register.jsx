import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, PlayCircle, BookOpen } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, fullName);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col justify-between relative overflow-hidden transition-colors duration-300">
      {/* Ambient background glow accents */}
      <div 
        className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none opacity-20"
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

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Visual Brand Story */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-center space-y-6 pr-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px] font-semibold tracking-wider text-[var(--color-accent-primary)] uppercase w-fit">
              <Sparkles size={12} /> Start Free
            </div>

            <h1 className="text-3xl xl:text-4xl font-bold tracking-tight leading-tight text-[var(--text-primary)]">
              Build your personal <br />
              knowledge vault.
            </h1>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Join thousands of self-directed learners converting long playlists into high-yield, structured flashcards, quizzes, and structured lecture notes.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                <div className="w-5 h-5 rounded-md bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] flex items-center justify-center">
                  <CheckCircle2 size={13} />
                </div>
                <span>Unlimited YouTube playlist import & progress tracking</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                <div className="w-5 h-5 rounded-md bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] flex items-center justify-center">
                  <PlayCircle size={13} />
                </div>
                <span>RAG transcript search & interactive video tutor</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <BookOpen size={13} />
                </div>
                <span>Export notes in Markdown and test with active-recall quizzes</span>
              </div>
            </div>
          </div>

          {/* Right Column: Register Card */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:col-span-7 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-8 sm:p-10 shadow-xl backdrop-blur-md relative"
          >
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Create your account</h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-1.5">
                Get started in under 30 seconds. No credit card required.
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User size={16} className="absolute left-4 text-[var(--text-tertiary)] pointer-events-none" />
                  <input 
                    type="text" 
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl pl-11 pr-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-accent-primary)] focus:ring-1 focus:ring-[var(--color-accent-primary)] transition-all"
                    placeholder="Tejas Kumar"
                  />
                </div>
              </div>

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
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-4 text-[var(--text-tertiary)] pointer-events-none" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl pl-11 pr-11 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-accent-primary)] focus:ring-1 focus:ring-[var(--color-accent-primary)] transition-all"
                    placeholder="At least 6 characters"
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
                    Creating account...
                  </span>
                ) : (
                  <>
                    <span>Create Free Account</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="pt-6 mt-6 border-t border-[var(--border-subtle)] text-center">
              <p className="text-xs text-[var(--text-tertiary)]">
                Already have an account?{' '}
                <Link to="/login" className="text-[var(--color-accent-primary)] font-semibold hover:underline">
                  Sign in
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
            <ShieldCheck size={13} className="text-emerald-400" /> End-to-end Encrypted
          </span>
        </div>
      </footer>
    </div>
  );
}
