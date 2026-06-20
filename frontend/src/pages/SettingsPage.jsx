import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/authService';
import CommandCenterService from '../services/commandCenterService';
import GrowthService from '../services/growthService';
import BillingService from '../services/billingService';

const AVATAR_COLORS = {
  indigo: '#4338ca', emerald: '#059669', amber: '#d97706',
  rose: '#e11d48', sky: '#0284c7', violet: '#7c3aed',
};

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

  const [business, setBusiness] = useState({
    industry: '', upload_frequency: 'monthly', business_goal: 'grow_revenue', monthly_revenue_goal: '',
  });
  const [businessStatus, setBusinessStatus] = useState(null);
  const [businessSaving, setBusinessSaving] = useState(false);

  const [riskAppetite, setRiskAppetite] = useState('balanced');
  const [avatarPreset, setAvatarPreset] = useState(null);
  const [avatarStatus, setAvatarStatus] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);

  const [compliance, setCompliance] = useState({ gstin: '', pan: '', gst_filing_frequency: 'monthly' });
  const [complianceStatus, setComplianceStatus] = useState(null);
  const [complianceSaving, setComplianceSaving] = useState(false);

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
    setRiskAppetite(user.risk_appetite || 'balanced');
    setAvatarPreset(user.avatar_preset || null);
    setAvatarUrl(user.avatar_url || null);
  }, [user]);

  // Pull current compliance + business values so the fields show what's
  // already saved rather than starting blank.
  useEffect(() => {
    let active = true;
    CommandCenterService.getCommandCenter()
      .then((data) => {
        if (!active) return;
        const c = data?.compliance;
        if (c?.gstin) setCompliance((prev) => ({ ...prev, gstin: c.gstin }));
      })
      .catch(() => { /* non-fatal */ });
    return () => { active = false; };
  }, []);

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

  const handleBusinessSave = async () => {
    setBusinessSaving(true);
    setBusinessStatus(null);
    try {
      await CommandCenterService.updateBusinessProfile(business);
      setBusinessStatus({ type: 'success', message: 'Business profile saved. Your Market Radar will refresh.' });
    } catch (error) {
      setBusinessStatus({ type: 'error', message: 'Could not save business profile.' });
    } finally {
      setBusinessSaving(false);
    }
  };

  const handleRiskSave = async (value) => {
    setRiskAppetite(value);
    try {
      const response = await authService.updatePreferences({ risk_appetite: value });
      updateUser(response.data);
    } catch (_) { /* non-fatal */ }
  };

  const handleAvatarSave = async (presetId) => {
    setAvatarPreset(presetId);
    setAvatarUrl(null);
    setAvatarStatus(null);
    try {
      const response = await authService.updateProfile({ avatar_preset: presetId, avatar_url: '' });
      updateUser(response.data);
      setAvatarStatus({ type: 'success', message: 'Avatar updated.' });
    } catch (_) {
      setAvatarStatus({ type: 'error', message: 'Could not update avatar.' });
    }
  };

  const handlePictureUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarStatus(null);

    if (!file.type.startsWith('image/')) {
      setAvatarStatus({ type: 'error', message: 'Please choose an image file.' });
      return;
    }
    if (file.size > 1024 * 1024) {
      setAvatarStatus({ type: 'error', message: 'Image must be under 1 MB. Try a smaller photo.' });
      return;
    }

    // Read as a data URL so it persists with the profile without needing a
    // separate file-storage service — keeps the feature self-contained.
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      try {
        const response = await authService.updateProfile({ avatar_url: dataUrl, avatar_preset: '' });
        updateUser(response.data);
        setAvatarUrl(dataUrl);
        setAvatarPreset(null);
        setAvatarStatus({ type: 'success', message: 'Profile picture updated.' });
      } catch (_) {
        setAvatarStatus({ type: 'error', message: 'Could not save the picture.' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleComplianceSave = async () => {
    setComplianceSaving(true);
    setComplianceStatus(null);
    try {
      await CommandCenterService.updateComplianceProfile(compliance);
      setComplianceStatus({ type: 'success', message: 'Compliance details saved. Your filing calendar will refresh.' });
    } catch (_) {
      setComplianceStatus({ type: 'error', message: 'Could not save compliance details.' });
    } finally {
      setComplianceSaving(false);
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

          <SectionCard title="Business profile" description="Powers your Market Radar and keeps your data fresh with reminders.">
            <StatusLine status={businessStatus} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-ink">Industry</span>
                <select
                  value={business.industry}
                  onChange={(e) => setBusiness({ ...business, industry: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select…</option>
                  {['manufacturing','retail','wholesale','construction','textile','plastics','steel','food processing','services'].map((i) => (
                    <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Upload frequency</span>
                <select
                  value={business.upload_frequency}
                  onChange={(e) => setBusiness({ ...business, upload_frequency: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {['daily','weekly','monthly','quarterly','yearly'].map((f) => (
                    <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Main goal</span>
                <select
                  value={business.business_goal}
                  onChange={(e) => setBusiness({ ...business, business_goal: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="grow_revenue">Grow revenue</option>
                  <option value="improve_margin">Improve margins</option>
                  <option value="reduce_risk">Reduce risk</option>
                  <option value="expand">Expand the business</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Monthly revenue goal (₹)</span>
                <input
                  type="text"
                  value={business.monthly_revenue_goal}
                  onChange={(e) => setBusiness({ ...business, monthly_revenue_goal: e.target.value })}
                  placeholder="e.g. 500000"
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </label>
            </div>
            <div className="mt-4">
              <Button onClick={handleBusinessSave} loading={businessSaving}>Save business profile</Button>
            </div>
          </SectionCard>

          <SectionCard title="Profile picture" description="Upload a photo or pick a colored avatar shown across Business Copilot.">
            <StatusLine status={avatarStatus} />
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {/* Current avatar preview */}
              <div className="shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/20" />
                ) : (
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-full ring-2 ring-primary/20"
                    style={{ backgroundColor: avatarPreset ? AVATAR_COLORS[avatarPreset] : 'var(--tw-prose-pre-bg, #4338ca)' }}
                  >
                    <span className="text-2xl font-bold text-white">
                      {(user?.first_name?.[0] || 'B').toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path d="M12 16V4M12 4L8 8M12 4l4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Upload photo
                  <input type="file" accept="image/*" hidden onChange={handlePictureUpload} />
                </label>
                <p className="text-xs text-ink-muted">JPG or PNG, up to 1 MB.</p>

                <div>
                  <p className="mb-2 text-xs font-medium text-ink-muted">Or pick a color avatar:</p>
                  <div className="flex flex-wrap gap-3">
                    {['indigo','emerald','amber','rose','sky','violet'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleAvatarSave(c)}
                        className={`h-10 w-10 rounded-full ring-2 transition ${avatarPreset === c ? 'ring-primary' : 'ring-transparent hover:ring-border'}`}
                        style={{ backgroundColor: AVATAR_COLORS[c] }}
                        aria-label={`${c} avatar`}
                      >
                        <span className="text-sm font-bold text-white">
                          {(user?.first_name?.[0] || 'B').toUpperCase()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Compliance details" description="Your GSTIN and PAN power the GST, TDS, and ITR deadline tracker.">
            <StatusLine status={complianceStatus} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-ink">GSTIN</span>
                <input
                  type="text"
                  value={compliance.gstin}
                  onChange={(e) => setCompliance({ ...compliance, gstin: e.target.value.toUpperCase() })}
                  maxLength={15}
                  placeholder="e.g. 09ABCDE1234F1Z5"
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">PAN</span>
                <input
                  type="text"
                  value={compliance.pan}
                  onChange={(e) => setCompliance({ ...compliance, pan: e.target.value.toUpperCase() })}
                  maxLength={10}
                  placeholder="e.g. ABCDE1234F"
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">GST filing frequency</span>
                <select
                  value={compliance.gst_filing_frequency}
                  onChange={(e) => setCompliance({ ...compliance, gst_filing_frequency: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </label>
            </div>
            <div className="mt-4">
              <Button onClick={handleComplianceSave} loading={complianceSaving}>Save compliance details</Button>
            </div>
          </SectionCard>

          <SectionCard title="Plan & billing" description="Upgrade to unlock Market Radar, WhatsApp alerts, team access and more.">
            <PlansManager />
          </SectionCard>

          <SectionCard title="Notifications & WhatsApp" description="Get alerts and your weekly summary on email or WhatsApp.">
            <NotificationSettings />
          </SectionCard>

          <SectionCard title="Team access" description="Invite your accountant or partner with the right role.">
            <TeamManager />
          </SectionCard>

          <SectionCard title="Your data" description="Export everything or erase your business data.">
            <DataPrivacy />
          </SectionCard>

          <SectionCard title="Risk preferences" description="Tune how cautious your alerts and recommendations are.">
            <div className="inline-flex rounded-pill bg-bg-subtle p-1">
              {['cautious','balanced','aggressive'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRiskSave(r)}
                  className={`rounded-pill px-4 py-2 text-sm font-semibold capitalize transition ${riskAppetite === r ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
                >
                  {r}
                </button>
              ))}
            </div>
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

function PlansManager() {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    BillingService.getStatus().then(setStatus).catch(() => {});
  }, []);

  const choose = async (planId) => {
    if (!status || planId === status.plan) return;
    setBusy(planId);
    try {
      const order = await BillingService.createOrder(planId);
      if (order.manual_mode) {
        await BillingService.activate(planId);
      } else if (window.Razorpay) {
        await new Promise((resolve) => {
          const rzp = new window.Razorpay({
            key: order.razorpay_key_id, amount: order.amount, currency: order.currency,
            name: 'Business Copilot', order_id: order.order_id,
            handler: async (resp) => { await BillingService.activate(planId, resp.razorpay_payment_id, resp.razorpay_signature); resolve(); },
          });
          rzp.open();
        });
      } else {
        await BillingService.activate(planId);
      }
      const s = await BillingService.getStatus();
      setStatus(s);
    } catch (_) { /* non-fatal */ }
    setBusy(null);
  };

  if (!status) return <p className="text-sm text-ink-muted">Loading plans…</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {status.all_plans.map((p) => {
        const current = p.id === status.plan;
        return (
          <div key={p.id} className={`rounded-card border p-4 ${current ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <p className="font-display text-lg font-bold text-ink">{p.name}</p>
            <p className="figure mt-1 text-2xl font-bold text-ink">{p.price_inr === 0 ? 'Free' : `₹${p.price_inr}`}<span className="text-sm font-normal text-ink-muted">{p.price_inr ? '/mo' : ''}</span></p>
            <ul className="mt-3 space-y-1 text-xs text-ink-muted">
              {['market_radar','whatsapp','team','forecast'].map((f) => (
                <li key={f} className={p.features.includes(f) ? 'text-ink' : 'line-through opacity-50'}>
                  {p.features.includes(f) ? '✓' : '✕'} {f.replace('_',' ')}
                </li>
              ))}
            </ul>
            <button type="button" disabled={current || busy === p.id} onClick={() => choose(p.id)}
              className={`mt-4 w-full rounded-pill px-4 py-2 text-sm font-semibold transition ${current ? 'bg-bg-subtle text-ink-muted' : 'bg-primary text-white hover:bg-primary-hover'} disabled:opacity-60`}>
              {current ? 'Current plan' : busy === p.id ? 'Processing…' : `Choose ${p.name}`}
            </button>
            {current && p.id !== 'starter' && (
              <button type="button" onClick={async () => { await BillingService.cancel(); const s = await BillingService.getStatus(); setStatus(s); }}
                className="mt-2 w-full text-xs font-semibold text-risk-high">
                Cancel &amp; downgrade
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NotificationSettings() {
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  const savePhone = async () => {
    setSaving(true); setStatus(null);
    try { await GrowthService.updatePhone(phone); setStatus({ type: 'success', message: 'WhatsApp number saved.' }); }
    catch (_) { setStatus({ type: 'error', message: 'Could not save number.' }); }
    setSaving(false);
  };

  const sendDigest = async () => {
    setStatus(null);
    try {
      const r = await GrowthService.sendDigest();
      setStatus({ type: 'success', message: r.sent ? 'Digest sent.' : 'Digest queued (configure email/WhatsApp provider to deliver).' });
    } catch (_) { setStatus({ type: 'error', message: 'Could not send digest.' }); }
  };

  return (
    <div className="space-y-4">
      <StatusLine status={status} />
      <label className="block">
        <span className="text-sm font-medium text-ink">WhatsApp number</span>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210"
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none" />
          <button type="button" onClick={savePhone} disabled={saving}
            className="rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        <p className="mt-1 text-xs text-ink-muted">Alerts and your weekly summary can be sent here.</p>
      </label>
      <button type="button" onClick={sendDigest} className="rounded-pill border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10">
        Send me a summary now
      </button>
    </div>
  );
}

function DataPrivacy() {
  const [status, setStatus] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const exportData = async () => {
    setStatus(null);
    try {
      const data = await GrowthService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'business-copilot-export.json'; a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', message: 'Your data was exported.' });
    } catch (_) { setStatus({ type: 'error', message: 'Could not export data.' }); }
  };

  const erase = async () => {
    if (!confirming) { setConfirming(true); return; }
    setStatus(null);
    try {
      await GrowthService.deleteAccountData();
      setConfirming(false);
      setStatus({ type: 'success', message: 'All business data erased. You can re-import anytime.' });
    } catch (_) { setStatus({ type: 'error', message: 'Could not erase data.' }); }
  };

  return (
    <div className="space-y-3">
      <StatusLine status={status} />
      <button type="button" onClick={exportData}
        className="rounded-pill border border-border px-4 py-2 text-sm font-semibold text-ink hover:bg-bg-subtle">
        Export my data (JSON)
      </button>
      <div>
        <button type="button" onClick={erase}
          className={`rounded-pill px-4 py-2 text-sm font-semibold ${confirming ? 'bg-risk-high text-white' : 'border border-risk-high/40 text-risk-high hover:bg-risk-high/10'}`}>
          {confirming ? 'Click again to confirm erase' : 'Erase all business data'}
        </button>
        {confirming && (
          <button type="button" onClick={() => setConfirming(false)} className="ml-3 text-xs text-ink-muted">Cancel</button>
        )}
      </div>
    </div>
  );
}

function TeamManager() {
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('read_only');

  useEffect(() => {
    GrowthService.getTeam().then((d) => setMembers(d.members || [])).catch(() => {});
  }, []);

  const invite = async () => {
    if (!email.trim()) return;
    try {
      await GrowthService.inviteMember({ email: email.trim(), role });
      setEmail('');
      const d = await GrowthService.getTeam();
      setMembers(d.members || []);
    } catch (_) { /* non-fatal */ }
  };

  const remove = async (id) => {
    try { await GrowthService.removeMember(id); setMembers((m) => m.filter((x) => x.id !== id)); }
    catch (_) { /* non-fatal */ }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="accountant@email.com"
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none" />
        <select value={role} onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none">
          <option value="accountant">Accountant</option>
          <option value="manager">Manager</option>
          <option value="read_only">Read only</option>
        </select>
        <button type="button" onClick={invite} className="rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
          Invite
        </button>
      </div>
      {members.length > 0 && (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg bg-bg-subtle px-3 py-2 text-sm">
              <span className="text-ink">{m.email} <span className="text-ink-muted">· {m.role} · {m.status}</span></span>
              <button type="button" onClick={() => remove(m.id)} className="text-xs font-semibold text-risk-high">Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
