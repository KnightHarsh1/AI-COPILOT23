import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/authService';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const PERSONALITY_OPTIONS = [
  { value: 'direct', label: 'Direct', hint: 'Blunt, leads with the hardest fact first.' },
  { value: 'balanced', label: 'Balanced', hint: 'Professional, fair to risks and positives.' },
  { value: 'encouraging', label: 'Encouraging', hint: 'Supportive, frames challenges as solvable.' },
  { value: 'analytical', label: 'Analytical', hint: 'Heavily data-driven, cites numbers.' },
];

const REPORT_STYLE_OPTIONS = [
  { value: 'concise', label: 'Concise' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'executive', label: 'Executive' },
];

const SUMMARY_LENGTH_OPTIONS = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
];

function SectionCard({ title, description, children }) {
  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-card">
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StatusLine({ status }) {
  if (!status) return null;
  return (
    <p className={`mt-3 text-sm font-medium ${status.type === 'error' ? 'text-risk-high' : 'text-risk-low'}`}>
      {status.message}
    </p>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-center justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-sm text-ink-muted">{description}</span>}
      </span>
      <span
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-pill transition ${
          checked ? 'bg-primary' : 'bg-bg-subtle'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </span>
    </label>
  );
}

function FieldInput({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input
        className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
        {...props}
      />
    </label>
  );
}

function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = useState({ first_name: '', last_name: '', email: '', company_name: '' });
  const [profileStatus, setProfileStatus] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [notifications, setNotifications] = useState({
    email_alerts_enabled: true,
    risk_alerts_enabled: true,
    weekly_reports_enabled: true,
  });
  const [notificationStatus, setNotificationStatus] = useState(null);
  const [notificationSaving, setNotificationSaving] = useState(false);

  const [aiPrefs, setAiPrefs] = useState({
    ai_personality: 'balanced',
    ai_report_style: 'concise',
    ai_summary_length: 'medium',
  });
  const [aiStatus, setAiStatus] = useState(null);
  const [aiSaving, setAiSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfile({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      company_name: user.company_name || '',
    });
    setNotifications({
      email_alerts_enabled: user.email_alerts_enabled ?? true,
      risk_alerts_enabled: user.risk_alerts_enabled ?? true,
      weekly_reports_enabled: user.weekly_reports_enabled ?? true,
    });
    setAiPrefs({
      ai_personality: user.ai_personality || 'balanced',
      ai_report_style: user.ai_report_style || 'concise',
      ai_summary_length: user.ai_summary_length || 'medium',
    });
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileStatus(null);
    try {
      const response = await authService.updateProfile(profile);
      updateUser(response.data);
      setProfileStatus({ type: 'success', message: 'Profile updated.' });
    } catch (error) {
      setProfileStatus({ type: 'error', message: error.response?.data?.detail || 'Could not update profile.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (event) => {
    event.preventDefault();
    setPasswordStatus(null);

    if (passwords.new_password.length < 8) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 8 characters.' });
      return;
    }
    if (passwords.new_password !== passwords.confirm_password) {
      setPasswordStatus({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    setPasswordSaving(true);
    try {
      await authService.changePassword({
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
      setPasswordStatus({ type: 'success', message: 'Password updated.' });
    } catch (error) {
      setPasswordStatus({ type: 'error', message: error.response?.data?.detail || 'Could not update password.' });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleNotificationsSave = async () => {
    setNotificationSaving(true);
    setNotificationStatus(null);
    try {
      const response = await authService.updatePreferences(notifications);
      updateUser(response.data);
      setNotificationStatus({ type: 'success', message: 'Notification preferences saved.' });
    } catch (error) {
      setNotificationStatus({ type: 'error', message: 'Could not save preferences.' });
    } finally {
      setNotificationSaving(false);
    }
  };

  const handleAiSave = async () => {
    setAiSaving(true);
    setAiStatus(null);
    try {
      const response = await authService.updatePreferences(aiPrefs);
      updateUser(response.data);
      setAiStatus({ type: 'success', message: 'AI preferences saved.' });
    } catch (error) {
      setAiStatus({ type: 'error', message: 'Could not save AI preferences.' });
    } finally {
      setAiSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-6">
        <Sidebar />

        <main className="space-y-6 pb-12">
          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            <h1 className="font-display text-3xl font-bold text-ink">Settings</h1>
            <p className="mt-2 text-ink-muted">Manage your profile, security, notifications, and AI preferences.</p>
          </section>

          <SectionCard title="Appearance" description="Choose how Business Copilot looks on this device.">
            <div className="flex flex-wrap gap-2">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={`rounded-pill px-4 py-2 text-sm font-semibold transition ${
                    theme === option.value ? 'bg-primary text-white' : 'bg-bg-subtle text-ink-muted hover:text-ink'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-muted">Saved automatically and remembered after you refresh.</p>
          </SectionCard>

          <SectionCard title="Profile" description="Your name, email, and company details.">
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldInput
                  label="First name"
                  value={profile.first_name}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                />
                <FieldInput
                  label="Last name"
                  value={profile.last_name}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                />
              </div>
              <FieldInput
                label="Email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
              <FieldInput
                label="Company"
                value={profile.company_name}
                onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
              />
              <Button type="submit" loading={profileSaving}>Save profile</Button>
              <StatusLine status={profileStatus} />
            </form>
          </SectionCard>

          <SectionCard title="Change password" description="Use a strong password you don't use elsewhere.">
            <form onSubmit={handlePasswordSave} className="space-y-4">
              <FieldInput
                label="Current password"
                type="password"
                value={passwords.current_password}
                onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldInput
                  label="New password"
                  type="password"
                  value={passwords.new_password}
                  onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                  required
                />
                <FieldInput
                  label="Confirm new password"
                  type="password"
                  value={passwords.confirm_password}
                  onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" loading={passwordSaving}>Update password</Button>
              <StatusLine status={passwordStatus} />
            </form>
          </SectionCard>

          <SectionCard title="Notification preferences" description="Choose what Business Copilot keeps you posted on.">
            <div className="divide-y divide-border">
              <Toggle
                label="Email alerts"
                description="Get emailed when something needs your attention."
                checked={notifications.email_alerts_enabled}
                onChange={(value) => setNotifications({ ...notifications, email_alerts_enabled: value })}
              />
              <Toggle
                label="Risk alerts"
                description="Be notified about customer, inventory, and expense risk."
                checked={notifications.risk_alerts_enabled}
                onChange={(value) => setNotifications({ ...notifications, risk_alerts_enabled: value })}
              />
              <Toggle
                label="Weekly reports"
                description="Receive a weekly executive summary."
                checked={notifications.weekly_reports_enabled}
                onChange={(value) => setNotifications({ ...notifications, weekly_reports_enabled: value })}
              />
            </div>
            <Button className="mt-4" onClick={handleNotificationsSave} loading={notificationSaving}>
              Save preferences
            </Button>
            <StatusLine status={notificationStatus} />
          </SectionCard>

          <SectionCard title="AI preferences" description="Personalize how your Virtual CFO communicates.">
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium text-ink">AI personality</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PERSONALITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAiPrefs({ ...aiPrefs, ai_personality: option.value })}
                      className={`rounded-xl border p-3 text-left text-sm transition ${
                        aiPrefs.ai_personality === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-bg-subtle'
                      }`}
                    >
                      <span className="block font-semibold text-ink">{option.label}</span>
                      <span className="block text-xs text-ink-muted">{option.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-ink">Report style</p>
                <div className="flex flex-wrap gap-2">
                  {REPORT_STYLE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAiPrefs({ ...aiPrefs, ai_report_style: option.value })}
                      className={`rounded-pill px-4 py-2 text-sm font-semibold transition ${
                        aiPrefs.ai_report_style === option.value ? 'bg-primary text-white' : 'bg-bg-subtle text-ink-muted hover:text-ink'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-ink">Summary length</p>
                <div className="flex flex-wrap gap-2">
                  {SUMMARY_LENGTH_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAiPrefs({ ...aiPrefs, ai_summary_length: option.value })}
                      className={`rounded-pill px-4 py-2 text-sm font-semibold transition ${
                        aiPrefs.ai_summary_length === option.value ? 'bg-primary text-white' : 'bg-bg-subtle text-ink-muted hover:text-ink'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={handleAiSave} loading={aiSaving}>Save AI preferences</Button>
              <StatusLine status={aiStatus} />
            </div>
          </SectionCard>

          <SectionCard title="Account">
            <Button variant="danger" onClick={handleLogout}>Log out</Button>
          </SectionCard>
        </main>
      </div>
    </div>
  );
}

export default SettingsPage;
