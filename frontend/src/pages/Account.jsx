import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Calendar, KeyRound, LogOut, Check, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { playlistService } from '../services/playlistService';

export default function Account() {
  const { user, updateProfile, changePassword, logout } = useAuth();

  // Profile Form
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Live Stats Overview
  const [stats, setStats] = useState({ courses: 0, completed_lessons: 0, hours: 0, streak: 0 });

  useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name);
    }
    playlistService.getDashboardStats().then(setStats).catch(() => {});
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess(false);

    try {
      await updateProfile(fullName.trim());
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 2500);
    } catch (err) {
      console.error(err);
      setProfileError(err.response?.data?.detail || 'Failed to update profile name');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setPasswordError(err.response?.data?.detail || 'Failed to update password. Verify your current password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recent Member';

  return (
    <div className="pb-24 space-y-12 max-w-3xl">
      {/* Editorial Header */}
      <div className="pt-4 pb-8 border-b border-[var(--border-subtle)]">
        <div className="text-[10px] font-semibold text-[var(--color-accent-primary)] uppercase tracking-widest mb-2">
          Security & Identity
        </div>
        <h1 className="text-page-heading text-[var(--text-primary)] mb-2">Account</h1>
        <p className="text-base text-[var(--text-tertiary)] leading-relaxed">
          Manage your personal credentials, contact info, and learning activity footprint.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-medium)] flex items-center justify-center text-xl font-bold text-[var(--color-accent-primary)] shadow-sm">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] leading-tight">
              {user?.full_name || 'Student'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mt-1">
              <Mail size={12} />
              <span>{user?.email}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)] mt-0.5">
              <Calendar size={12} />
              <span>Joined {memberSince}</span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="border border-[var(--border-medium)] hover:border-[var(--color-error)] text-[var(--text-secondary)] hover:text-[var(--color-error)] transition-colors px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 self-start sm:self-auto"
        >
          <LogOut size={14} />
          <span>Log out</span>
        </button>
      </div>

      {/* Activity Summary Strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 rounded-xl text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Enrolled</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.courses}</div>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 rounded-xl text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Lessons Done</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.completed_lessons}</div>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 rounded-xl text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Day Streak</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.streak}</div>
        </div>
      </div>

      {/* Profile Details Form */}
      <section className="space-y-4 pt-6 border-t border-[var(--border-subtle)]">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-1">
            Personal Information
          </h3>
          <p className="text-xs text-[var(--text-tertiary)]">
            Update your public display name.
          </p>
        </div>

        <form onSubmit={handleUpdateProfile} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
          {profileError && (
            <div className="p-3 rounded-xl bg-[var(--color-error)]/10 text-[var(--color-error)] text-xs flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{profileError}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold tracking-widest text-[var(--text-tertiary)] uppercase mb-2">Email Address</label>
            <input
              type="text"
              disabled
              value={user?.email || ''}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-tertiary)] cursor-not-allowed opacity-80"
            />
            <span className="text-[10px] text-[var(--text-tertiary)] mt-1 block">Your email is used for login identification.</span>
          </div>

          <div>
            <label className="block text-[10px] font-semibold tracking-widest text-[var(--text-tertiary)] uppercase mb-2">Display Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)]"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={profileSaving}
              className="bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-50 px-5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-opacity"
            >
              {profileSaving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : profileSuccess ? (
                <Check size={13} className="text-emerald-400" />
              ) : null}
              <span>{profileSuccess ? 'Name Updated' : profileSaving ? 'Saving...' : 'Save Name'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Password Change Form */}
      <section className="space-y-4 pt-6 border-t border-[var(--border-subtle)]">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-1">
            Security & Password
          </h3>
          <p className="text-xs text-[var(--text-tertiary)]">
            Change your account password.
          </p>
        </div>

        <form onSubmit={handleChangePassword} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
          {passwordError && (
            <div className="p-3 rounded-xl bg-[var(--color-error)]/10 text-[var(--color-error)] text-xs flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 rounded-xl bg-[var(--color-success)]/10 text-[var(--color-success)] text-xs flex items-center gap-2">
              <ShieldCheck size={14} />
              <span>Password changed successfully.</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold tracking-widest text-[var(--text-tertiary)] uppercase mb-2">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold tracking-widest text-[var(--text-tertiary)] uppercase mb-2">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold tracking-widest text-[var(--text-tertiary)] uppercase mb-2">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={passwordSaving || !currentPassword || !newPassword}
              className="bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-50 px-5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-opacity"
            >
              {passwordSaving ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
              <span>{passwordSaving ? 'Updating...' : 'Change Password'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
