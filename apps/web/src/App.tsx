import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { PublicUser } from '@starter/shared';
import { ChildView } from './ChildView';
import { SchedulePages } from './SchedulePages';
import { StaffPages } from './StaffPages';
import { StaffLayout } from './components/StaffLayout';
import { Brand } from './components/ui';
import { ApiClient } from './lib/client';
import { activityFromApi, childFromApi, childToApi, draftToApi, emptyData, mergeSchedule, preferencesFromApi, preferencesToApi, scheduleFromApi, taskFromApi } from './lib/adapters';
import type { AppActions, AppData, DailySchedule, Page, StaffPage } from './model';

import { localDate } from './lib/date';
import { tokenKey, readToken, clearToken, writeToken, hasTabSession } from './lib/session';
const base = import.meta.env.VITE_API_BASE_URL ?? '';
function pageFromHash(): Page {
  const requested = location.hash.slice(1);
  return ['dashboard', 'profiles', 'schedules', 'tasks', 'progress', 'settings', 'cards', 'child', 'login', 'register'].includes(requested) ? requested as Page : 'dashboard';
}
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'The change could not be saved. Please retry.';
function AuthScreen({ page, onPage, onLogin }: { page: 'login' | 'register'; onPage: (page: Page) => void; onLogin: (token: string, remember: boolean) => void }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [role, setRole] = useState<PublicUser['role']>('caregiver'); const [remember, setRemember] = useState(false);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [registered, setRegistered] = useState(false); const register = page === 'register' && !registered;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      const api = new ApiClient(null, undefined, base);
      if (new TextEncoder().encode(password).length > 72) throw new Error('Password must be at most 72 UTF-8 bytes.');
      if (register) { await api.register({ name, email, password, role }); setRegistered(true); }
      const result = await api.login(email, password); onLogin(result.token, remember);
    } catch (error) { setError(messageOf(error)); } finally { setBusy(false); }
  }
  return <main className="auth-page"><div className="auth-layout">
    <section className="auth-intro"><Brand reversed /><h1>A clear day,<br />one step at a time.</h1><p>Visual schedules and picture cards</p><img className="auth-hero-sun" src="/araw/brand/peeking-sun-clouds.svg" alt="" aria-hidden="true" /></section>
    <form className={`auth-card ${register ? 'auth-card--register' : 'auth-card--login'}`} onSubmit={submit}><div className="auth-mobile-logo"><Brand /></div><h2>{register ? 'Create your account' : 'Welcome back'}</h2><p>{registered ? 'Your account was created. Log in to continue.' : 'For caregivers, OTs and SPED teachers.'}</p>
      <fieldset className="workspace-lock" disabled={busy}>
        {register && <label className="auth-field auth-field--name">Name<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Enter your name" /></label>}
        <label className="auth-field auth-field--email">Email<input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="Enter your email" /></label>
        <label className="auth-field auth-field--password">Password<input required minLength={register ? 8 : 1} maxLength={72} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'Create a password' : 'Enter your password'} /></label>
        {register && <fieldset className="auth-role-group"><legend>Role</legend>{(['caregiver', 'ot', 'sped_teacher'] as const).map((item) => <label className={`auth-role ${role === item ? 'selected' : ''}`} key={item}><input type="radio" name="role" checked={role === item} onChange={() => setRole(item)} />{item === 'caregiver' ? 'Caregiver' : item === 'ot' ? 'OT' : 'SPED Teacher'}</label>)}</fieldset>}
        <label className="auth-role auth-remember"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />Remember me on this device</label>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button className="button button-primary" type="submit">{busy ? 'Please wait…' : register ? 'Create account' : 'Log in'}</button>
        <button className="button button-outline" type="button" onClick={() => { setError(''); setRegistered(false); onPage(register ? 'login' : 'register'); }}>{register ? 'Back to log in' : 'Create an account'}</button>
      </fieldset>
    </form></div></main>;
}

export function App() {
  const [token, setToken] = useState(readToken); const tokenRef = useRef(token); tokenRef.current = token;
  const epoch = useRef(0); const busyRef = useRef(false); const cardRevisions = useRef(new Map<number, number>());
  const [data, setData] = useState<AppData>(emptyData); const dataRef = useRef(data); dataRef.current = data;
  const [page, setPage] = useState<Page>(pageFromHash); const [selectedChildId, setSelectedChildId] = useState(0);
  const pageRef = useRef(page); pageRef.current = page;
  const leaveGuard = useRef<() => boolean>(() => true);
  const setNavigationGuard = useCallback((guard: () => boolean) => { leaveGuard.current = guard; return () => { if (leaveGuard.current === guard) leaveGuard.current = () => true; }; }, []);
  const [menuOpen, setMenuOpen] = useState(false); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(!!token);
  const [message, setMessage] = useState(''); const [loadError, setLoadError] = useState(''); const [retry, setRetry] = useState(0);
  const [today, setToday] = useState(() => localDate());
  function navigate(next: Page, confirmed = false) { if (next !== pageRef.current && !confirmed && !leaveGuard.current()) return; pageRef.current = next; setPage(next); setMenuOpen(false); location.hash = next; }
  const logout = useCallback((reason = '') => {
    if (!reason && !leaveGuard.current()) return;
    const previous = tokenRef.current; epoch.current++; tokenRef.current = null; busyRef.current = false; clearToken(previous); setToken(null); setData(emptyData()); setSelectedChildId(0); setBusy(false); setLoading(false); setMessage(reason); pageRef.current = 'login'; setPage('login'); location.hash = 'login';
  }, []);
  const api = useMemo(() => new ApiClient(token, () => { if (tokenRef.current === token) logout('Your session expired. Please log in again.'); }, base), [token, logout]);
  useEffect(() => {
    const hash = () => { const next = pageFromHash(); if (next !== pageRef.current && !leaveGuard.current()) { history.replaceState(null, '', '#' + pageRef.current); return; } pageRef.current = next; setPage(next); setMenuOpen(false); };
    const storage = (event: StorageEvent) => { const current = tokenRef.current; if (current && !hasTabSession(current) && (event.key === tokenKey || event.key === null) && readToken() !== current) logout('Your session changed in another tab. Please log in again.'); };
    window.addEventListener('hashchange', hash); window.addEventListener('storage', storage);
    const timer = setInterval(() => { if (!busyRef.current && pageRef.current !== 'schedules') setToday(localDate()); }, 60_000);
    return () => { clearInterval(timer); window.removeEventListener('hashchange', hash); window.removeEventListener('storage', storage); };
  }, [logout]);
  useEffect(() => {
    if (!token) return;
    const generation = ++epoch.current; let cancelled = false; busyRef.current = false; setBusy(false); setLoading(true); setLoadError('');
    void (async () => {
      try {
        const [user, children, activities, settings] = await Promise.all([api.me(), api.children(), api.activities(), api.settings(), api.health()]);
        const mappedActivities = activities.map(activityFromApi);
        const records = await Promise.all(children.map(async (child) => ({ child, schedule: await api.schedule(child.id, today), progress: await api.progress(child.id) })));
        if (cancelled || generation !== epoch.current) return;
        setData({ user, children: children.map(childFromApi), activities: mappedActivities, preferences: preferencesFromApi(settings), schedules: records.flatMap((item) => item.schedule ? [scheduleFromApi(item.schedule, mappedActivities)] : []), cards: {}, progress: Object.fromEntries(records.map((item) => [item.child.id, item.progress])) });
        setSelectedChildId((id) => children.some((child) => child.id === id) ? id : children[0]?.id ?? 0);
      } catch (error) { if (!cancelled && generation === epoch.current) setLoadError(messageOf(error)); }
      finally { if (!cancelled && generation === epoch.current) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [token, api, retry, today]);
  const loadSchedule = useCallback(async (childId: number, date: string) => {
    const generation = epoch.current;
    try {
      const result = await api.schedule(childId, date);
      if (generation !== epoch.current) return undefined;
      const schedule = result ? scheduleFromApi(result, dataRef.current.activities) : null;
      setData((current) => schedule ? mergeSchedule(current, schedule) : { ...current, schedules: current.schedules.filter((item) => !(item.childId === childId && item.date === date)) }); return schedule;
    } catch (error) { if (generation === epoch.current) setMessage(messageOf(error)); return undefined; }
  }, [api]);
  useEffect(() => {
    if (!token || !selectedChildId || loading || loadError) return;
    const generation = epoch.current; const revision = cardRevisions.current.get(selectedChildId) ?? 0; let cancelled = false;
    void api.cards(selectedChildId).then((groups) => { if (!cancelled && generation === epoch.current && revision === (cardRevisions.current.get(selectedChildId) ?? 0)) setData((current) => ({ ...current, cards: { ...current.cards, [selectedChildId]: Object.values(groups).flat() } })); }).catch((error) => { if (!cancelled && generation === epoch.current) setMessage(messageOf(error)); });
    return () => { cancelled = true; };
  }, [api, token, selectedChildId, loading, loadError]);
  async function perform(work: () => Promise<(current: AppData) => AppData>): Promise<boolean> {
    if (busyRef.current) return false;
    const generation = epoch.current; busyRef.current = true; setBusy(true); setMessage('');
    try { const update = await work(); if (generation !== epoch.current) return false; setData(update); return true; }
    catch (error) { if (generation === epoch.current) setMessage(messageOf(error)); return false; }
    finally { if (generation === epoch.current) { busyRef.current = false; setBusy(false); } }
  }
  const refreshNumbers = useRef(new Map<number, number>());
  function refreshProgress(childId: number) {
    const generation = epoch.current;
    const revision = (refreshNumbers.current.get(childId) ?? 0) + 1;
    refreshNumbers.current.set(childId, revision);
    void api.progress(childId).then((progress) => { if (generation === epoch.current && refreshNumbers.current.get(childId) === revision) setData((current) => ({ ...current, progress: { ...current.progress, [childId]: progress } })); }).catch((error) => { if (generation === epoch.current) setMessage(`Saved, but progress could not refresh: ${messageOf(error)}`); });
  }
  function refreshAfter(childId: number, work: () => Promise<(current: AppData) => AppData>) {
    return perform(work).then((ok) => { if (ok) refreshProgress(childId); return ok; });
  }
  function mergeCard(current: AppData, childId: number, card: NonNullable<AppData['cards'][number]>[number]) {
    return { ...current, cards: { ...current.cards, [childId]: [...(current.cards[childId] ?? []).filter((item) => item.id !== card.id), card] } };
  }
  const actions: AppActions = {
    navigate, setNavigationGuard, selectChild: (id) => { if (id !== selectedChildId && !leaveGuard.current()) return; setSelectedChildId(id); }, loadSchedule,
    openChild: (id) => { if (!leaveGuard.current()) return; void (async () => { const ok = await perform(async () => { const [child, schedule, groups] = await Promise.all([api.child(id), api.schedule(id, today), api.cards(id)]); return (current) => ({ ...(schedule ? mergeSchedule(current, scheduleFromApi(schedule, current.activities)) : { ...current, schedules: current.schedules.filter((item) => !(item.childId === id && item.date === today)) }), children: current.children.map((item) => item.id === id ? childFromApi(child) : item), cards: { ...current.cards, [id]: Object.values(groups).flat() } }); }); if (ok) { setSelectedChildId(id); navigate('child', true); } })(); },
    addChild: async (input) => { let id = 0; const ok = await perform(async () => { const child = await api.createChild(childToApi(input)); id = child.id; return (current) => ({ ...current, children: [...current.children, childFromApi(child)] }); }); if (ok) { setSelectedChildId(id); refreshProgress(id); } return ok; },
    updateChild: (input) => perform(async () => { const child = await api.updateChild(input.id, childToApi(input)); return (current) => ({ ...current, children: current.children.map((item) => item.id === child.id ? childFromApi(child) : item) }); }),
    deleteChild: async (id) => { const ok = await perform(async () => { await api.deleteChild(id); return (current) => ({ ...current, children: current.children.filter((child) => child.id !== id), schedules: current.schedules.filter((item) => item.childId !== id), cards: Object.fromEntries(Object.entries(current.cards).filter(([key]) => Number(key) !== id)), progress: Object.fromEntries(Object.entries(current.progress).filter(([key]) => Number(key) !== id)) }); }); if (ok && selectedChildId === id) setSelectedChildId(data.children.find((child) => child.id !== id)?.id ?? 0); return ok; },
    updatePreferences: (preferences, name) => perform(async () => { const generation = epoch.current; const user = name === undefined ? data.user : await api.updateProfile(name); if (generation === epoch.current) setData((current) => ({ ...current, user })); try { const settings = await api.updateSettings(preferencesToApi(preferences)); return (current) => ({ ...current, user, preferences: preferencesFromApi(settings) }); } catch (error) { throw new Error(`Profile saved. Preferences could not be saved: ${messageOf(error)}`); } }),
    updateSchedule: async (draft, original) => { let saved: DailySchedule | undefined; const ok = await refreshAfter(draft.childId, async () => { const result = await api.saveSchedule(draftToApi(draft, original)); saved = scheduleFromApi(result, dataRef.current.activities); return (current) => mergeSchedule(current, saved!); }); return ok ? saved : undefined; },
    copySchedule: (childId, date, from) => refreshAfter(childId, async () => { const saved = await api.createSchedule(childId, date, from); return (current) => mergeSchedule(current, scheduleFromApi(saved, current.activities)); }),
    moveSchedule: (schedule, date) => refreshAfter(schedule.childId, async () => { const moved = await api.moveSchedule(Number(schedule.id), date); return (current) => mergeSchedule({ ...current, schedules: current.schedules.filter((item) => item.id !== schedule.id) }, scheduleFromApi(moved, current.activities)); }),
    deleteSchedule: (schedule) => refreshAfter(schedule.childId, async () => { await api.deleteSchedule(Number(schedule.id)); return (current) => ({ ...current, schedules: current.schedules.filter((item) => item.id !== schedule.id) }); }),
    createActivity: async (input) => {
      const generation = epoch.current;
      const activity = activityFromApi(await api.createActivity(input));
      if (generation !== epoch.current) return undefined;
      setData((current) => current.activities.some((item) => item.activityId === activity.activityId)
        ? current : { ...current, activities: [activity, ...current.activities] });
      return activity;
    },
    markTask: (childId, taskId, done, date = today) => refreshAfter(childId, async () => { const task = await api.completeTask(Number(taskId), done); return (current) => ({ ...current, schedules: current.schedules.map((schedule) => schedule.childId === childId && schedule.date === date ? { ...schedule, tasks: schedule.tasks.map((item) => item.id === taskId ? taskFromApi(task, current.activities) : item) } : schedule) }); }),
    addTask: (schedule, activityId) => refreshAfter(schedule.childId, async () => { const task = await api.createTask(Number(schedule.id), Number(activityId)); return (current) => ({ ...current, schedules: current.schedules.map((item) => item.id === schedule.id ? { ...item, tasks: [...item.tasks, taskFromApi(task, current.activities)] } : item) }); }),
    moveTask: (schedule, taskId, position) => perform(async () => { const task = await api.updateTask(Number(taskId), { position }); return (current) => ({ ...current, schedules: current.schedules.map((item) => { if (item.id !== schedule.id) return item; const tasks = item.tasks.filter((entry) => entry.id !== taskId); tasks.splice(task.position - 1, 0, taskFromApi(task, current.activities)); return { ...item, tasks }; }) }); }),
    removeTask: (schedule, taskId) => refreshAfter(schedule.childId, async () => { await api.deleteTask(Number(taskId)); return (current) => ({ ...current, schedules: current.schedules.map((item) => item.id === schedule.id ? { ...item, tasks: item.tasks.filter((task) => task.id !== taskId) } : item) }); }),
    addCard: (input) => perform(async () => { const card = await api.createCard(input); cardRevisions.current.set(input.childId, (cardRevisions.current.get(input.childId) ?? 0) + 1); return (current) => mergeCard(current, input.childId, card); }),
    hideCard: (childId, id, hidden) => perform(async () => { const card = await api.hideCard(id, hidden); cardRevisions.current.set(childId, (cardRevisions.current.get(childId) ?? 0) + 1); return (current) => mergeCard(current, childId, card); }),
    deleteCard: (childId, id) => perform(async () => { await api.deleteCard(id); cardRevisions.current.set(childId, (cardRevisions.current.get(childId) ?? 0) + 1); return (current) => ({ ...current, cards: { ...current.cards, [childId]: (current.cards[childId] ?? []).filter((card) => card.id !== id) } }); }),
    activityProgress: async (childId, range) => {
      try { return await api.activityProgress(childId, range); }
      catch (error) { setMessage(messageOf(error)); return undefined; }
    },
  };
  const rootClass = `app-root font-${data.preferences.fontSize} contrast-${data.preferences.contrast}`;
  const banner = message && <div className="auth-error" role="alert"><p>{message}</p><button className="button button-outline" onClick={() => setMessage('')}>Dismiss</button><button className="button button-outline" onClick={() => { if (window.confirm('Reload saved data? Unsaved drafts will be discarded.')) { setMessage(''); setRetry((value) => value + 1); } }}>Reload saved data</button></div>;
  if (!token || page === 'login' || page === 'register') return <div className={rootClass}>{banner}<AuthScreen key={page} page={page === 'register' ? 'register' : 'login'} onPage={navigate} onLogin={(value, remember) => { const previous = tokenRef.current; epoch.current++; tokenRef.current = value; setLoading(true); if (!writeToken(value, remember, previous)) setMessage('Signed in for this tab only. Browser storage is unavailable.'); setData(emptyData()); setToken(value); navigate('dashboard'); }} /></div>;
  if (loading || loadError || !data.user) return <main className={rootClass} aria-busy={loading}><div className="staff-main"><Brand /><p role={loadError ? 'alert' : 'status'}>{loadError || 'Loading your workspace…'}</p>{!loading && <button className="button button-primary" onClick={() => setRetry((value) => value + 1)}>Retry</button>}<button className="button button-outline" onClick={() => logout()}>Log out</button></div></main>;
  const content = page === 'child' ? <ChildView data={data} selectedChildId={selectedChildId} today={today} actions={actions} /> : <StaffLayout
    user={data.user}
    page={page as StaffPage}
    menuOpen={menuOpen}
    onMenuToggle={() => setMenuOpen((open) => !open)}
    onNavigate={(next) => navigate(next)}
    onLogout={() => logout()}
  >{page === 'schedules' || page === 'tasks' ? <SchedulePages key={selectedChildId} page={page} data={data} selectedChildId={selectedChildId} today={today} actions={actions} /> : <StaffPages page={page} data={data} selectedChildId={selectedChildId} today={today} actions={actions} />}</StaffLayout>;
  return <div className={rootClass} aria-busy={busy}>{banner}{busy && <div className="request-status" role="status">Saving…</div>}<fieldset className="workspace-lock" disabled={busy}>{content}</fieldset></div>;
}
