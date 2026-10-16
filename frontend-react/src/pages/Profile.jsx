/**
 * LANNENT — Profile
 *
 * /profile shows your own profile; /profile?id=<userId> shows someone else's
 * public one (the people you work with). The user menu's "Profile" item used
 * to open the settings form, so there was no page that simply showed who
 * someone is. Everything here is read from the server's record; your own
 * contact details and balance are shown only to you.
 */
import { Link, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import usePageTitle from '../hooks/usePageTitle';
import { safeHref } from '../utils/helpers';

const ROLE_LABEL = {
  client: 'Client', worker: 'Gig Worker', expert: 'Expert Reviewer', superuser: 'Operations',
  'revenue-admin': 'Revenue Admin', 'intake-admin': 'Intake Admin', 'compliance-admin': 'Compliance Admin',
};

const SETTINGS = {
  client: '/profile-settings', worker: '/worker-settings', expert: '/expert-settings',
};

const CARD = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 };
const LABEL = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)', marginBottom: 6 };
const CHIP = { display: 'inline-block', fontSize: 12, padding: '4px 10px', borderRadius: 9999, background: 'var(--secondary)', marginRight: 6, marginBottom: 6 };

function Stat({ value, label }) {
  return (
    <div style={{ flex: 1, minWidth: 110, padding: 14, borderRadius: 12, background: 'var(--input-bg)', textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{label}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={LABEL}>{label}</div>
      <div style={{ fontSize: 14 }}>{children}</div>
    </div>
  );
}

export default function Profile() {
  const Store = useStore();
  const Auth = useAuth();
  const [searchParams] = useSearchParams();
  const session = Auth.getCurrentUser();
  const id = searchParams.get('id') || session.userId;
  const isMe = id === session.userId;
  const user = Store.getUserById(id) || (isMe ? Store.refreshUser(id) : null);
  usePageTitle(`${user ? user.name : 'Profile'} — Lannent`);

  if (!user) {
    return <EmptyState role={session.role} activePath="/profile" pageTitle="Profile" message="This profile could not be found." />;
  }

  const settingsPath = SETTINGS[session.role] || '/staff-settings';
  const money = n => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Projects this client posted (for the client stats).
  const tasks = Store.getTasks();
  const asClient = tasks.filter(t => t.clientId === user.id);

  return (
    <DashboardLayout role={session.role} activePath={isMe ? '/profile' : ''} pageTitle={isMe ? 'My Profile' : 'Profile'} pageSubtitle={ROLE_LABEL[user.role] || user.role}>
      <div style={{ maxWidth: 900 }}>
        <div style={{ ...CARD, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: user.avatarColor || '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, flex: 'none' }}>
            {user.avatar}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{user.name}</div>
            <div style={{ fontSize: 14, color: 'var(--muted-foreground)', marginTop: 2 }}>
              {[user.jobTitle || user.specialization || ROLE_LABEL[user.role], user.location].filter(Boolean).join(' · ')}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-blue">{ROLE_LABEL[user.role] || user.role}</span>
              {user.status && user.status !== 'active' ? <span className="badge badge-red">{user.status}</span> : null}
              {user.joinDate ? <span style={{ fontSize: 12, color: 'var(--muted-foreground)', alignSelf: 'center' }}>Member since {user.joinDate}</span> : null}
            </div>
          </div>
          {isMe ? (
            <Link to={settingsPath} className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name="settings" style={{ width: 15, height: 15 }} /> Edit profile
            </Link>
          ) : null}
        </div>

        <div style={{ ...CARD, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {user.role === 'worker' && <>
            <Stat value={user.completedProjects || 0} label="Completed on Lannent" />
            <Stat value={user.activeProjects || 0} label="In progress" />
            <Stat value={user.hourlyRate ? '₹' + user.hourlyRate + '/hr' : '—'} label="Stated hourly rate" />
          </>}
          {user.role === 'expert' && <>
            <Stat value={user.reviewsDone || 0} label="Reviews completed" />
            <Stat value={(user.domains || []).length} label="Domains covered" />
            <Stat value={user.hourlyRate ? '₹' + user.hourlyRate + '/hr' : '—'} label="Hourly rate" />
          </>}
          {user.role === 'client' && <>
            <Stat value={asClient.length} label="Projects posted" />
            <Stat value={user.completedProjects || 0} label="Completed" />
            <Stat value={user.activeProjects || 0} label="In progress" />
          </>}
          {isMe && user.walletBalance !== undefined && <Stat value={money(user.walletBalance)} label="Wallet balance" />}
        </div>

        <div style={CARD}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>About</h3>
          <Field label="Bio">{user.bio ? user.bio : <span style={{ color: 'var(--muted-foreground)' }}>{isMe ? 'Add a short bio in your settings.' : 'No bio yet.'}</span>}</Field>
          {isMe && <Field label="Email">{user.email}</Field>}
          {isMe && <Field label="Phone">{user.phone || <span style={{ color: 'var(--muted-foreground)' }}>Not set</span>}</Field>}
          {user.role === 'client' && (user.companyDetails?.name || user.company) && (
            <Field label="Company">
              {user.companyDetails?.name || user.company}
              {user.companyDetails?.industry ? ` · ${user.companyDetails.industry}` : ''}
              {user.companyDetails?.size ? ` · ${user.companyDetails.size}` : ''}
              {safeHref(user.companyDetails?.website) ? <> · <a href={safeHref(user.companyDetails.website)} target="_blank" rel="noopener noreferrer">{user.companyDetails.website}</a></> : null}
            </Field>
          )}
          {user.role === 'worker' && <>
            {user.experienceLevel && <Field label="Experience">{user.experienceLevel}</Field>}
            {user.availability && <Field label="Availability">{String(user.availability)}</Field>}
            {(user.languages || []).length > 0 && <Field label="Languages">{user.languages.join(', ')}</Field>}
            <Field label="Skills">
              {(user.skills || []).length ? user.skills.map(s => <span key={s} style={CHIP}>{s}</span>) : <span style={{ color: 'var(--muted-foreground)' }}>No skills listed</span>}
            </Field>
          </>}
          {user.role === 'expert' && <>
            <Field label="Reviews work in">
              {(user.domains || []).length ? user.domains.map(d => <span key={d} style={CHIP}>{d}</span>) : <span style={{ color: 'var(--muted-foreground)' }}>No domains set</span>}
            </Field>
            {user.availability && typeof user.availability === 'object' && (
              <Field label="Availability">{`${user.availability.status} · up to ${user.availability.maxCases} cases · ${user.availability.type}`}</Field>
            )}
          </>}
        </div>

        {user.role === 'worker' && (
          <div style={CARD}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Portfolio</h3>
            {(user.portfolioProjects || []).length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
                {user.portfolioProjects.map(p => (
                  <div key={p.id} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 8 }}>{p.description}</div>
                    {safeHref(p.url) ? <a href={safeHref(p.url)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>View project ↗</a> : null}
                  </div>
                ))}
              </div>
            ) : <div style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>No portfolio projects yet.</div>}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
