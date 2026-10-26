import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Sun, Moon, Laptop, Save, RotateCcw, Check, Clock, BookOpen, Brain, Bell } from 'lucide-react';
import { useTheme } from '../context/ThemeProvider';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user, updateProfile } = useAuth();

  const [dailyGoal, setDailyGoal] = useState(30);
  const [quizQuestionCount, setQuizQuestionCount] = useState(5);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.preferences) {
      if (user.preferences.daily_goal_minutes !== undefined) {
        setDailyGoal(user.preferences.daily_goal_minutes);
      }
      if (user.preferences.quiz_question_count !== undefined) {
        setQuizQuestionCount(user.preferences.quiz_question_count);
      }
      if (user.preferences.auto_advance !== undefined) {
        setAutoAdvance(user.preferences.auto_advance);
      }
    }
  }, [user]);

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(user?.full_name, {
        theme,
        daily_goal_minutes: Number(dailyGoal),
        quiz_question_count: Number(quizQuestionCount),
        auto_advance: autoAdvance
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error("Error saving settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTheme('system');
    setDailyGoal(30);
    setQuizQuestionCount(5);
    setAutoAdvance(true);
  };

  return (
    <div className="pb-24 space-y-12 max-w-3xl">
      {/* Editorial Header */}
      <div className="pt-4 pb-8 border-b border-[var(--border-subtle)]">
        <div className="text-[10px] font-semibold text-[var(--color-accent-primary)] uppercase tracking-widest mb-2">
          Configuration
        </div>
        <h1 className="text-page-heading text-[var(--text-primary)] mb-2">Preferences</h1>
        <p className="text-base text-[var(--text-tertiary)] leading-relaxed">
          Customize your study experience, color themes, active recall parameters, and workspace behavior.
        </p>
      </div>

      <form onSubmit={handleSavePreferences} className="space-y-12">
        {/* Appearance Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-1">
              Interface Theme
            </h2>
            <p className="text-xs text-[var(--text-tertiary)]">
              Choose your preferred visual aesthetic or follow your operating system settings.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { id: 'dark', label: 'Dark Mode', icon: <Moon size={16} /> },
              { id: 'light', label: 'Light Mode', icon: <Sun size={16} /> },
              { id: 'system', label: 'System', icon: <Laptop size={16} /> }
            ].map((opt) => {
              const isSelected = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTheme(opt.id)}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-24 transition-all duration-200 ${
                    isSelected
                      ? 'bg-[var(--bg-elevated)] border-[var(--text-primary)] text-[var(--text-primary)] shadow-sm'
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-medium)]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    {opt.icon}
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-[var(--color-accent-primary)]" />
                    )}
                  </div>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Learning Preferences */}
        <section className="space-y-6 pt-8 border-t border-[var(--border-subtle)]">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-1">
              Learning & Focus Goals
            </h2>
            <p className="text-xs text-[var(--text-tertiary)]">
              Set target daily study durations and assessment question depths.
            </p>
          </div>

          <div className="space-y-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-[var(--text-primary)] block mb-0.5">
                  Daily Study Goal
                </label>
                <p className="text-[11px] text-[var(--text-tertiary)]">Target active learning time per day</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="300"
                  step="5"
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(e.target.value)}
                  className="w-20 bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-primary)] text-right font-mono outline-none focus:border-[var(--text-primary)]"
                />
                <span className="text-xs text-[var(--text-tertiary)]">min</span>
              </div>
            </div>

            <div className="h-[1px] bg-[var(--border-subtle)]" />

            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-[var(--text-primary)] block mb-0.5">
                  Default Quiz Questions
                </label>
                <p className="text-[11px] text-[var(--text-tertiary)]">Number of practice MCQs generated per video</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={quizQuestionCount}
                  onChange={(e) => setQuizQuestionCount(Number(e.target.value))}
                  className="bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)]"
                >
                  <option value={3}>3 Questions</option>
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                </select>
              </div>
            </div>

            <div className="h-[1px] bg-[var(--border-subtle)]" />

            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-[var(--text-primary)] block mb-0.5">
                  Auto-Advance Modules
                </label>
                <p className="text-[11px] text-[var(--text-tertiary)]">Automatically load the next lesson when marked done</p>
              </div>
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={(e) => setAutoAdvance(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 accent-[var(--color-accent-primary)] cursor-pointer"
              />
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw size={13} />
            <span>Reset to defaults</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-opacity px-6 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 shadow-sm"
          >
            {savedSuccess ? (
              <>
                <Check size={14} className="text-emerald-400" />
                <span>Saved successfully</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
