import type { ApiCard } from '@starter/shared';
import { PREDEFINED_AVATARS } from '@starter/shared/constants';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { ChildProfile, Preferences, SharedPageProps } from './model';
import './staff.css';

type ContentPage = 'dashboard' | 'profiles' | 'progress' | 'settings' | 'cards';
type Props = SharedPageProps & { page: ContentPage };
const avatarAssets: Record<string, { desktop: string; mobile: string; dashboard: string }> = {
  happy: { desktop: '/assets/staff-profile-happy.svg', mobile: '/assets/staff-mobile-happy.svg', dashboard: '/assets/staff-dashboard-happy.svg' },
  play: { desktop: '/assets/staff-profile-play.svg', mobile: '/assets/staff-mobile-play.svg', dashboard: '/assets/staff-dashboard-play.svg' },
  book: { desktop: '/assets/staff-profile-book.svg', mobile: '/assets/staff-mobile-book.svg', dashboard: '/assets/staff-dashboard-book.svg' },
  sun: { desktop: '/assets/staff-form-sun.svg', mobile: '/assets/staff-form-sun.svg', dashboard: '/assets/staff-form-sun.svg' },
};

function Avatar({ avatar, variant = 'profile' }: { avatar: string; variant?: 'profile' | 'dashboard' }) {
  if (!avatarAssets[avatar]) return <span className="staff-avatar" aria-hidden="true" style={{ fontSize: 56 }}>{avatar}</span>;
  const image = avatarAssets[avatar]!;
  if (variant === 'dashboard') return <span className="staff-avatar staff-avatar-dashboard"><img src={image.dashboard} alt="" /></span>;
  return <span className="staff-avatar staff-avatar-profile"><picture><source media="(max-width: 700px)" srcSet={image.mobile} /><img src={image.desktop} alt="" /></picture></span>;
}

function dayDate(iso: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options }).format(new Date(`${iso}T12:00:00Z`));
}

function recentDates(today: string): string[] {
  const base = new Date(`${today}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + index - 6);
    return d.toISOString().slice(0, 10);
  });
}

function Stats({ data, today }: Pick<Props, 'data' | 'today'>) {
  const todaySchedules = data.schedules.filter((schedule) => schedule.date === today && data.children.some((child) => child.id === schedule.childId));
  const taskCount = todaySchedules.reduce((sum, schedule) => sum + schedule.tasks.length, 0);
  const doneCount = todaySchedules.reduce((sum, schedule) => sum + schedule.tasks.filter((task) => task.status === 'done').length, 0);
  const values = [
    { icon: '/assets/staff-stat-users.svg', value: String(data.children.length), label: 'Child profiles' },
    { icon: '/assets/staff-stat-check.svg', value: `${doneCount} of ${taskCount}`, label: 'Tasks done today' },
    { icon: '/assets/staff-stat-calendar.svg', value: `${todaySchedules.length} of ${data.children.length}`, label: 'Children with a schedule today' },
  ];
  return <div className="staff-stats">{values.map((stat) => <div className="staff-stat-card" key={stat.label}><span className="staff-stat-icon"><img src={stat.icon} alt="" /></span><div><strong>{stat.value}</strong><span>{stat.label}</span></div></div>)}</div>;
}

function WeekView({ data, childId, today, compact = false }: Pick<Props, 'data' | 'today'> & { childId: number; compact?: boolean }) {
  const dates = recentDates(today);
  return <div className={compact ? 'staff-week-grid staff-week-grid-compact' : 'staff-week-grid'}>{dates.map((date) => {
    const summary = data.progress[childId]?.last_7_days.find((item) => item.date === date);
    const total = summary?.total ?? 0;
    const done = summary?.done ?? 0;
    const percent = total ? Math.round(done / total * 100) : 0;
    const short = dayDate(date, { weekday: 'short', day: 'numeric', month: 'short' });
    return <div className="staff-week-day" key={date}>
      <strong className="staff-week-date">{compact ? short.split(',')[0] : short}</strong>
      <span className="staff-week-details">{total ? `${done} of ${total} done` : 'No schedule'}</span>
      <span className="staff-week-percent">{total ? `${percent}%` : '—'}</span>
      <span className="staff-week-mobile-line">{short} · {total ? `${done}/${total} · ${percent}%` : 'No schedule'}</span>
      {total > 0 && <span className="staff-progress-bar" aria-label={`${percent}% complete`}><span style={{ width: `${percent}%` }} /></span>}
    </div>;
  })}</div>;
}

function Dashboard({ data, selectedChildId, today, actions, onAddChild }: Props & { onAddChild: () => void }) {
  const selectedId = data.children.some((child) => child.id === selectedChildId) ? selectedChildId : (data.children[0]?.id ?? 0);
  if (!data.children.length) return <div className="staff-page staff-first-run"><h1>Welcome to Araw</h1><p className="staff-lead">Set up your first child's day in three steps. It takes about ten minutes.</p><div className="staff-panel staff-steps">
    <div className="staff-step"><span className="staff-step-badge active">1</span><div><h2>Add a child</h2><p>Their name, age and a picture. No medical records.</p><button className="staff-button primary" onClick={onAddChild}>Add your first child</button></div></div>
    <div className="staff-step"><span className="staff-step-badge">2</span><div><h2>Build their day</h2><p>Pick activities from the library and put them in order.</p></div></div>
    <div className="staff-step"><span className="staff-step-badge">3</span><div><h2>Open the child view</h2><p>Hand the device over. They tap Done as they go.</p></div></div>
  </div></div>;
  return <div className="staff-page staff-dashboard">
    <h1>Dashboard</h1><p className="staff-lead staff-desktop-date">Today · {dayDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p><p className="staff-lead staff-mobile-date">{dayDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
    <div className="staff-dashboard-action"><button className="staff-button primary" onClick={onAddChild}>Add child</button></div>
    <Stats data={data} today={today} />
    <h2>Your children</h2>
    <div className="staff-child-grid">{data.children.map((child) => {
      const schedule = data.schedules.find((item) => item.childId === child.id && item.date === today);
      const total = schedule?.tasks.length ?? 0;
      const done = schedule?.tasks.filter((task) => task.status === 'done').length ?? 0;
      return <article className="staff-child-card" key={child.id}>
        <Avatar avatar={child.avatar} variant="dashboard" /><h3>{child.name}</h3><p>{schedule ? `${done} of ${total} done · ${total ? Math.round(done / total * 100) : 0}%` : 'No schedule today · —'}</p>
        <button className="staff-button primary" onClick={() => actions.openChild(child.id)}>Open Child view</button>
        <button className="staff-button secondary" onClick={() => { actions.selectChild(child.id); actions.navigate('schedules'); }}>{schedule ? 'View schedule' : 'Create schedule'}</button>
      </article>;
    })}</div>
    <section className="staff-panel staff-last-seven"><div className="staff-last-seven-header"><h2>Last 7 days</h2><label className="staff-field">Child<select value={selectedId} onChange={(event) => actions.selectChild(Number(event.target.value))}>{data.children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label></div><WeekView data={data} childId={selectedId} today={today} compact /><button className="staff-button secondary" onClick={() => actions.navigate('progress')}>View progress</button></section>
  </div>;
}

type ChildDraft = Omit<ChildProfile, 'id'>;
function ChildForm({ child, onCancel, onSubmit }: { child?: ChildProfile; onCancel: () => void; onSubmit: (draft: ChildDraft) => Promise<boolean> }) {
  const [draft, setDraft] = useState<ChildDraft>({ name: child?.name ?? '', age: child?.age ?? 6, delayDomain: child?.delayDomain ?? 'Speech', notes: child?.notes ?? '', avatar: child?.avatar ?? PREDEFINED_AVATARS[0] });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ ...draft, name: draft.name.trim(), notes: draft.notes.trim() });
  }
  return <div className="staff-page staff-form-page"><h1>Child Profiles · {child ? `Edit ${child.name}` : 'Add child'}</h1><p className="staff-lead">Only predefined avatars are used. Notes are optional.</p><form className="staff-panel staff-profile-form" onSubmit={submit}>
    <label className="staff-field">Name or nickname<input required maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
    <label className="staff-field">Age<input required type="number" min={0} max={120} value={draft.age} onChange={(event) => setDraft({ ...draft, age: Number(event.target.value) })} /></label>
    <label className="staff-field">Delay domain<select value={draft.delayDomain} onChange={(event) => setDraft({ ...draft, delayDomain: event.target.value })}>{['Speech', 'Motor', 'Cognitive', 'Social', 'General'].map((domain) => <option key={domain}>{domain}</option>)}</select><small>Speech · Motor · Cognitive · Social · General</small></label>
    <label className="staff-field">Notes (optional)<input maxLength={2000} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /><small>Use practical routine notes. Do not enter medical records.</small></label>
    <fieldset className="staff-avatar-picker"><legend>Choose an avatar</legend><div>{PREDEFINED_AVATARS.map((avatar) => <label className={`staff-avatar-choice ${draft.avatar === avatar ? 'selected' : ''}`} key={avatar}><input type="radio" name="avatar" value={avatar} checked={draft.avatar === avatar} onChange={() => setDraft({ ...draft, avatar })} /><Avatar avatar={avatar} /><span>{draft.avatar === avatar ? '✓ ' : ''}{avatar.charAt(0).toUpperCase() + avatar.slice(1)}</span></label>)}</div></fieldset>
    <div className="staff-form-actions"><button className="staff-button primary" type="submit">Save child</button><button className="staff-button secondary" type="button" onClick={onCancel}>Cancel</button></div>
  </form></div>;
}

function Profiles({ data, today, actions, formChild, formOpen, deleteChild, onEdit, onAdd, onCancel, onDelete }: Props & { formChild?: ChildProfile; formOpen: boolean; deleteChild?: ChildProfile; onEdit: (child: ChildProfile) => void; onAdd: () => void; onCancel: () => void; onDelete: (child: ChildProfile) => void }) {
  if (formOpen) return <ChildForm key={formChild?.id ?? 'new'} child={formChild} onCancel={onCancel} onSubmit={async (draft) => { const ok = formChild ? await actions.updateChild({ ...draft, id: formChild.id }) : await actions.addChild(draft); if (ok) onCancel(); return ok; }} />;
  if (deleteChild) return <div className="staff-page staff-delete-page"><h1>Child Profiles</h1><p className="staff-lead">{deleteChild.name}’s profile remains until deletion succeeds.</p><div className="staff-panel staff-delete-confirm"><h2>Delete {deleteChild.name}’s profile?</h2><p>This deletes {deleteChild.name}’s profile, schedules, tasks and custom picture cards. This cannot be undone.</p><div className="staff-form-actions"><button className="staff-button secondary" onClick={onCancel}>Keep profile</button><button className="staff-button danger" onClick={async () => { if (await actions.deleteChild(deleteChild.id)) onCancel(); }}>Delete {deleteChild.name}</button></div></div></div>;
  return <div className="staff-page staff-profiles"><h1>Child Profiles</h1><p className="staff-lead">Manage the children you support.</p><button className="staff-button primary staff-add-child" onClick={onAdd}>Add child</button>
    <div className="staff-profile-list">{data.children.map((child) => {
      const schedule = data.schedules.find((item) => item.childId === child.id && item.date === today);
      return <article className="staff-profile-card" key={child.id}><div className="staff-profile-identity"><Avatar avatar={child.avatar} /><div><h2>{child.name}</h2><p>Age {child.age} · {child.delayDomain}</p></div></div><div className="staff-profile-actions"><button className="staff-button secondary staff-profile-schedule" onClick={() => { actions.selectChild(child.id); actions.navigate('schedules'); }}>{schedule ? 'View schedule' : 'Create schedule'}</button><button className="staff-button secondary staff-profile-edit" onClick={() => onEdit(child)}><span className="staff-desktop-label">Edit</span><span className="staff-mobile-label">Edit profile</span></button><button className="staff-button secondary staff-profile-cards" onClick={() => { actions.selectChild(child.id); actions.navigate('cards'); }}>Manage picture cards</button><button className="staff-button danger staff-profile-delete" onClick={() => onDelete(child)}><span className="staff-desktop-label">Delete</span><span className="staff-mobile-label">Delete {child.name}</span></button></div></article>;
    })}</div>
  </div>;
}

function Progress({ data, selectedChildId, actions }: Props) {
  const childId = data.children.some((child) => child.id === selectedChildId) ? selectedChildId : (data.children[0]?.id ?? 0);
  const progress = data.progress[childId];
  return <div className="staff-page staff-progress-page"><h1>Progress</h1><p>Completion history from your saved schedules. Dates use UTC.</p>
    <label className="staff-field">Child<select value={childId} onChange={(event) => actions.selectChild(Number(event.target.value))}>{data.children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>
    <div className="staff-panel">{progress ? <WeekView data={data} childId={childId} today={progress.today.date} /> : <p>Add a child to view progress.</p>}</div>
    <section className="staff-panel"><h2>Recent completions</h2>{progress?.recent_completions.length ? progress.recent_completions.map((task) => <p key={task.task_id}>{task.name} · <time dateTime={task.completed_at}>{new Date(task.completed_at).toLocaleString()}</time></p>) : <p>No completed activities yet.</p>}</section>
  </div>;
}

function Settings({ data, actions }: Props) {
  const [draft, setDraft] = useState<Preferences>(data.preferences);
  const [name, setName] = useState(data.user?.name ?? '');
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(data.preferences), [data.preferences]);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaved(false); if (await actions.updatePreferences(draft, name.trim())) setSaved(true); }
  return <div className="staff-page staff-settings-page"><h1>Settings</h1><p className="staff-lead staff-settings-lead">Choose comfortable text and contrast. Settings apply across sessions.</p><form className="staff-panel staff-settings-form" onSubmit={submit}>
    <label className="staff-field">Name<input value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} maxLength={80} required /></label>
    <label className="staff-field">Email<input value={data.user?.email ?? ''} readOnly /><small>Email is read-only in this MVP.</small></label>
    <label className="staff-field">Role<input value={data.user?.role === 'caregiver' ? 'Caregiver' : data.user?.role === 'ot' ? 'OT' : 'SPED Teacher'} readOnly /><small>All Staff roles have the same permissions.</small></label>
    <fieldset className="staff-choice-group"><legend>Text size</legend><div className="staff-choice-row">{(['small', 'medium', 'large'] as const).map((size, index) => <label className={draft.fontSize === size ? 'selected' : ''} key={size}><input type="radio" name="text-size" checked={draft.fontSize === size} onChange={() => { setDraft({ ...draft, fontSize: size }); setSaved(false); }} />{size.charAt(0).toUpperCase() + size.slice(1)} · {16 + index * 2} px</label>)}</div></fieldset>
    <fieldset className="staff-choice-group"><legend>Contrast</legend><div className="staff-choice-row">{(['normal', 'high'] as const).map((contrast) => <label className={draft.contrast === contrast ? 'selected' : ''} key={contrast}><input type="radio" name="contrast" checked={draft.contrast === contrast} onChange={() => { setDraft({ ...draft, contrast }); setSaved(false); }} />{contrast === 'normal' ? 'Normal' : 'High contrast'}</label>)}</div></fieldset>
    <fieldset className="staff-choice-group staff-sound-group"><legend>Schedule sounds</legend><label className={draft.soundOn ? 'selected' : ''}><input type="checkbox" checked={draft.soundOn} onChange={(event) => { setDraft({ ...draft, soundOn: event.target.checked }); setSaved(false); }} />{draft.soundOn ? 'On' : 'Off'}</label><small>Picture cards still speak when intentionally tapped. Timer cues are not included in this MVP.</small></fieldset>
    <div className="staff-form-actions"><button className="staff-button primary" type="submit">{saved ? 'Settings saved' : 'Save settings'}</button><button className="staff-button secondary staff-settings-cancel" type="button" onClick={() => { setDraft(data.preferences); actions.navigate('dashboard'); }}>Cancel</button></div>
  </form></div>;
}

function Cards({ data, selectedChildId, actions }: Props) {
  const child = data.children.find((item) => item.id === selectedChildId);
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<ApiCard['category']>('Needs');
  const [icon, setIcon] = useState('⭐');
  const [notice, setNotice] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!child) return; setNotice('');
    if (await actions.addCard({ childId: child.id, label: label.trim(), category, icon })) { setLabel(''); setNotice('Card saved.'); }
  }
  if (!child) return <section><h1>Picture cards</h1><p>Add a child profile first.</p></section>;
  const cards = data.cards[child.id];
  return <div className="staff-page"><h1>Picture cards</h1>
    <label className="staff-field">Child<select value={child.id} onChange={(event) => actions.selectChild(Number(event.target.value))}>{data.children.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <div className="staff-cards-layout"><form className="staff-panel staff-card-form" onSubmit={submit}><h2>Add picture card</h2>
      <label className="staff-field">Word to speak<input required maxLength={100} value={label} onChange={(event) => setLabel(event.target.value)} /></label>
      <label className="staff-field">Category<select value={category} onChange={(event) => setCategory(event.target.value as ApiCard['category'])}>{['Food', 'Emotions', 'Activities', 'Needs'].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="staff-field">Picture<select value={icon} onChange={(event) => setIcon(event.target.value)}>{['⭐', '💧', '📚', '🥛', '🧸', '😊', '😢', '🚽'].map((item) => <option key={item}>{item}</option>)}</select></label>
      <button className="staff-button primary" type="submit" disabled={!cards}>Add card</button>{notice && <p role="status">{notice}</p>}
    </form><section className="staff-panel"><h2>Saved cards</h2>{cards ? cards.map((card) => <div className="staff-custom-card" key={card.id}><span aria-hidden="true" style={{ fontSize: 40 }}>{card.icon}</span><p>{card.label} · {card.category}{card.is_hidden ? ' · Hidden' : ''}</p>{card.child_id !== null ? <><button className="staff-button secondary" onClick={() => { void actions.hideCard(child.id, card.id, !card.is_hidden); }}>{card.is_hidden ? 'Show' : 'Hide'} {card.label}</button><button className="staff-button danger" onClick={() => { if (window.confirm(`Delete ${card.label}?`)) void actions.deleteCard(child.id, card.id); }}>Delete {card.label}</button></> : <small>Shared default</small>}</div>) : <p>Loading cards…</p>}</section></div>
  </div>;
}

export function StaffPages(props: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [formChild, setFormChild] = useState<ChildProfile>();
  const [deleteChild, setDeleteChild] = useState<ChildProfile>();
  const handlers = useMemo(() => ({
    onAdd: () => { setFormChild(undefined); setDeleteChild(undefined); setFormOpen(true); },
    onEdit: (child: ChildProfile) => { setFormChild(child); setDeleteChild(undefined); setFormOpen(true); },
    onCancel: () => { setFormOpen(false); setFormChild(undefined); setDeleteChild(undefined); },
    onDelete: (child: ChildProfile) => { setFormOpen(false); setDeleteChild(child); },
  }), []);
  if (props.page === 'dashboard') return <Dashboard {...props} onAddChild={() => { props.actions.navigate('profiles'); setTimeout(handlers.onAdd, 0); }} />;
  if (props.page === 'profiles') return <Profiles {...props} formChild={formChild} formOpen={formOpen} deleteChild={deleteChild} {...handlers} />;
  if (props.page === 'progress') return <Progress {...props} />;
  if (props.page === 'settings') return <Settings {...props} />;
  return <Cards {...props} />;
}
