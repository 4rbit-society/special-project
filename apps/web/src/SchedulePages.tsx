import { PREDEFINED_ICONS } from '@starter/shared/constants';
import { ChildView } from './ChildView';
import { useEffect, useMemo, useState } from 'react';
import type { DailySchedule, ScheduleTask, SharedPageProps } from './model';
import './schedule.css';

type SchedulePageProps = SharedPageProps & { page: 'schedules' | 'tasks' };

type LibraryActivity = Pick<ScheduleTask, 'activityId' | 'name' | 'icon' | 'category'>;

const previousDate = (date: string) => {
  const day = new Date(`${date}T12:00:00`);
  day.setDate(day.getDate() - 1);
  return [day.getFullYear(), String(day.getMonth() + 1).padStart(2, '0'), String(day.getDate()).padStart(2, '0')].join('-');
};

function dateLabel(date: string, weekday = false) {
  return new Intl.DateTimeFormat('en-GB', {
    ...(weekday ? { weekday: 'long' as const } : {}), day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(`${date}T12:00:00`));
}

function newTask(activity: LibraryActivity): ScheduleTask {
  return {
    ...activity,
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startTime: '', duration: null, status: 'pending',
  };
}

function ActivityIcon({ src, className = '' }: { src: string; className?: string }) {
  return <span className={`schedule-icon ${className}`}>{src.startsWith('/') ? <img src={src} alt="" /> : <span aria-hidden="true" style={{ fontSize: 32 }}>{src}</span>}</span>;
}

function CategoryChip({ category }: { category: string }) {
  return <span className={`schedule-chip schedule-chip-${category.toLowerCase()}`}>● {category}</span>;
}

export function SchedulePages({ page, data, selectedChildId, today, actions }: SchedulePageProps) {
  const activities = data.activities;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [moveDate, setMoveDate] = useState(today);
  const [quickActivity, setQuickActivity] = useState(activities[0]?.activityId ?? '');
  useEffect(() => { let cancelled = false; setReady(false); setFailed(false); setMoveDate(date); if (selectedChildId) void actions.loadSchedule(selectedChildId, date).then((result) => { if (!cancelled) { setReady(result !== undefined); setFailed(result === undefined); } }); return () => { cancelled = true; }; }, [selectedChildId, date, actions.loadSchedule, reload]);
  const [draft, setDraft] = useState<ScheduleTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);
  const [mobileEditing, setMobileEditing] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyDate, setCopyDate] = useState(previousDate(today));
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState('⭐');
  const [customCategory, setCustomCategory] = useState('Other');
  const [notice, setNotice] = useState('');
  const child = data.children.find((item) => item.id === selectedChildId);
  const savedSchedule = useMemo(
    () => data.schedules.find((item) => item.childId === selectedChildId && item.date === date),
    [data.schedules, selectedChildId, date],
  );
  const savedKey = savedSchedule ? JSON.stringify(savedSchedule.tasks) : '';

  useEffect(() => {
    const tasks = savedSchedule?.tasks.map((task) => ({ ...task })) ?? [];
    setDraft(tasks);
    setSelectedTaskId(tasks[4]?.id ?? tasks[0]?.id ?? null);
    setMobileEditing(false);
  }, [selectedChildId, date, savedKey]);
  useEffect(() => setNotice(''), [selectedChildId, date]);

  const selected = draft.find((task) => task.id === selectedTaskId) ?? null;
  useEffect(() => {
    setTime(selected?.startTime ?? '');
    setDuration(selected?.duration?.toString() ?? '');
  }, [selectedTaskId, selected?.startTime, selected?.duration]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(savedSchedule?.tasks ?? []);
  const done = savedSchedule?.tasks.filter((task) => task.status === 'done').length ?? 0;

  async function save() {
    const schedule: DailySchedule = {
      id: savedSchedule?.id ?? `schedule-${selectedChildId}-${date}`,
      childId: selectedChildId, date, tasks: draft,
    };
    if (await actions.updateSchedule(schedule)) setNotice('Schedule saved');
  }

  function add(activity: LibraryActivity) {
    const task = newTask(activity);
    setDraft((current) => [...current, task]);
    setSelectedTaskId(task.id);
    setShowLibrary(false);
    setMobileEditing(false);
    setNotice('');
  }

  function move(index: number, amount: number) {
    setNotice('');
    const nextIndex = index + amount;
    if (nextIndex < 0 || nextIndex >= draft.length) return;
    setDraft((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
      return next;
    });
  }

  function remove(id: string) {
    setNotice('');
    setDraft((current) => current.filter((task) => task.id !== id));
    if (selectedTaskId === id) { setSelectedTaskId(null); setMobileEditing(false); }
  }

  function applyDetails() {
    if (!selected) return;
    const parsedDuration = duration.trim() === '' ? null : Number(duration);
    if (parsedDuration !== null && (!Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 1440)) {
      setNotice('Enter a whole number from 1 to 1440 for duration.');
      return;
    }
    setDraft((current) => current.map((task) => task.id === selected.id
      ? { ...task, startTime: time, duration: parsedDuration } : task));
    setNotice('Activity details updated in draft.');
    setMobileEditing(false);
  }

  async function copySchedule() {
    if (!savedSchedule) { if (draft.length && !window.confirm('Replace this unsaved draft with the copied schedule?')) return; if (await actions.copySchedule(selectedChildId, date, copyDate)) { setCopyOpen(false); setNotice('Copied schedule saved'); } return; }
    const source = await actions.loadSchedule(selectedChildId, copyDate);
    if (!source) {
      setNotice(`No schedule found for ${dateLabel(copyDate)}.`);
      return;
    }
    setDraft(source.tasks.map((task) => ({ ...task, id: newTask(task).id, status: 'pending', completedAt: null })));
    setCopyOpen(false);
    setNotice(`Copied ${source.tasks.length} activities from ${dateLabel(copyDate)} into the draft.`);
  }

  if (!child) return <section className="schedule-empty"><h1>Schedules</h1><p>Add a child profile to get started.</p><button className="button button-primary" onClick={() => actions.navigate('profiles')}>Add child</button></section>;

  if (!ready) return <section><h1>Schedules</h1><p role={failed ? 'alert' : 'status'}>{failed ? 'Could not load this schedule.' : 'Loading schedule…'}</p>{failed && <button className="button button-primary" onClick={() => setReload((value) => value + 1)}>Retry</button>}</section>;

  if (previewOpen) return <div><button className="button button-outline" onClick={() => setPreviewOpen(false)}>Back to editor</button><ChildView data={data} selectedChildId={selectedChildId} today={date} actions={{ ...actions, navigate: () => setPreviewOpen(false) }} preview={{ id: savedSchedule?.id ?? 'preview', childId: selectedChildId, date, tasks: draft }} /></div>;

  if (page === 'tasks') {
    const tasks = savedSchedule?.tasks ?? [];
    return <div className="schedule-page schedule-status-page">
      <header className="schedule-page-heading">
        <h1>Schedules · Task status</h1>
        <p>{child.name} · {dateLabel(date)} · Completion changes save immediately.</p>
      </header>
      <div className="schedule-status-actions">
        <button className="button button-outline" onClick={() => actions.navigate('schedules')}>Edit schedule</button>
        <button className="button button-primary" onClick={() => actions.openChild(child.id)}>Open Child view</button>
      </div>
      <div className="schedule-status-controls"><label>Child<select value={selectedChildId} onChange={(event) => actions.selectChild(Number(event.target.value))}>{data.children.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label></div>
      {savedSchedule && <div><label>Add activity<select value={quickActivity} onChange={(event) => setQuickActivity(event.target.value)}>{activities.map((item) => <option key={item.activityId} value={item.activityId}>{item.name}</option>)}</select></label><button className="button button-primary" disabled={!quickActivity} onClick={() => { void actions.addTask(savedSchedule, quickActivity); }}>Add activity</button></div>}
      <h2 className="schedule-status-count">{done} of {tasks.length} done · {tasks.length ? Math.round(done / tasks.length * 100) : 0}%</h2>
      {tasks.length ? <div className="schedule-status-list">{tasks.map((task, index) => <article className="schedule-status-row" key={task.id}>
        <ActivityIcon src={task.icon} />
        <div className="schedule-status-description"><strong>{index + 1}. {task.name}</strong><span>{task.status === 'done' ? 'Completed' : 'Pending'}</span></div>
        <span className={`schedule-status-badge ${task.status}`}>{task.status === 'done' ? '✓ Done' : '○ Pending'}</span>
        <button className={`button ${task.status === 'done' ? 'button-outline' : 'button-primary'}`} onClick={() => actions.markTask(child.id, task.id, task.status !== 'done', date)}>{task.status === 'done' ? 'Undo completion' : 'Mark done'}</button>{savedSchedule && <><button className="button button-outline" disabled={index === 0} onClick={() => { void actions.moveTask(savedSchedule, task.id, index); }}>Move up</button><button className="button button-outline" onClick={() => { if (window.confirm(`Remove ${task.name}?`)) void actions.removeTask(savedSchedule, task.id); }}>Remove</button></>}
      </article>)}</div> : <div className="schedule-empty"><p>No activities for this day yet.</p><button className="button button-primary" onClick={() => actions.navigate('schedules')}>Create schedule</button></div>}
    </div>;
  }

  return <div className="schedule-page">
    <header className="schedule-page-heading"><h1>Schedules</h1><p>{child.name} · {dateLabel(date, true)}</p></header>
    {notice && <div className={`schedule-notice ${notice === 'Schedule saved' ? 'success' : ''}`} role="status">{notice}</div>}
    <div className="schedule-controls">
      <label>Child<select value={selectedChildId} onChange={(event) => actions.selectChild(Number(event.target.value))}>{data.children.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <button className="button button-outline schedule-copy" onClick={() => { setCopyDate(previousDate(date)); setCopyOpen(true); }}>Copy from date</button>
      <button className="button button-outline schedule-preview" onClick={() => setPreviewOpen(true)}>Preview</button>
      <button className="button button-primary schedule-save-top" onClick={save}>Save schedule</button>
    </div>
    <div className="schedule-mobile-add"><button className="button button-primary" onClick={() => setShowLibrary(true)}>Add activity</button><button className="button button-outline" onClick={() => setCopyOpen(true)}>Copy from date</button></div>
    {savedSchedule && <div className="schedule-controls"><label>Move saved schedule to date<input type="date" value={moveDate} onChange={(event) => setMoveDate(event.target.value)} /></label><button className="button button-outline" disabled={dirty || !moveDate || moveDate === date} onClick={async () => { if (await actions.moveSchedule(savedSchedule, moveDate)) setDate(moveDate); }}>Change date</button><button className="button button-danger" onClick={async () => { if (window.confirm('Delete this saved schedule and all its tasks?') && await actions.deleteSchedule(savedSchedule)) setReload((value) => value + 1); }}>Delete schedule</button></div>}
    <p className="schedule-count">{draft.length} {draft.length === 1 ? 'activity' : 'activities'}</p>
    <div className="schedule-columns">
      <section className={`schedule-panel schedule-library ${showLibrary ? 'is-open' : ''}`}>
        <div className="schedule-panel-header"><h2>Activity library</h2><button className="schedule-close" onClick={() => setShowLibrary(false)} aria-label="Close activity library">×</button></div>
        <div className="schedule-library-items">{activities.map((activity) => <article className="schedule-library-item" key={activity.activityId}>
          <div className="schedule-library-row"><ActivityIcon src={activity.icon} /><div><strong>{activity.name}</strong><CategoryChip category={activity.category} /></div></div>
          <button className="button button-outline" onClick={() => add(activity)}>Add</button>
        </article>)}</div>
        <button className="button button-outline schedule-custom" onClick={() => { setCustomOpen(true); setShowLibrary(false); }}>Custom activity</button>
      </section>
      <section className="schedule-panel schedule-ordered">
        <h2>Today’s schedule</h2><p className="schedule-helper">Drag to reorder, or use Move up / Move down.</p>
        <div className="schedule-tasks">{draft.length ? draft.map((task, index) => <article className={`schedule-task ${selectedTaskId === task.id ? 'selected' : ''}`} key={task.id} draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const value = event.dataTransfer.getData('text/plain'); if (!/^\d+$/.test(value)) return; const from = Number(value); if (from < 0 || from >= draft.length) return; setDraft((items) => { const next = [...items]; const [item] = next.splice(from, 1); next.splice(index, 0, item!); return next; }); }}>
          <div className="schedule-task-main"><strong className="schedule-task-number">{index + 1}</strong><ActivityIcon src={task.icon} /><div className="schedule-task-description"><strong>{task.name}</strong><span className={task.startTime ? '' : 'no-time'}>{task.startTime ? `${task.startTime}${task.duration ? ` · ${task.duration} min` : ''}` : 'Time not set'}</span></div><CategoryChip category={task.category} /></div>
          <div className="schedule-task-actions"><span className="schedule-grip" aria-hidden="true">⠿</span><button className="schedule-arrow" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${task.name} up`}>↑</button><button className="schedule-arrow" onClick={() => move(index, 1)} disabled={index === draft.length - 1} aria-label={`Move ${task.name} down`}>↓</button><button className="button button-outline schedule-mobile-move" onClick={() => move(index, -1)} disabled={index === 0}>Move up</button><button className="button button-outline schedule-mobile-move" onClick={() => move(index, 1)} disabled={index === draft.length - 1}>Move down</button><button className="button button-outline" onClick={() => { setSelectedTaskId(task.id); setMobileEditing(true); }}>Edit</button><button className="button button-outline schedule-row-remove" onClick={() => remove(task.id)}>Remove</button></div>
        </article>) : <div className="schedule-empty"><p>No activities added yet.</p><button className="button button-primary" onClick={() => setShowLibrary(true)}>Add activity</button></div>}</div>
      </section>
      <aside className={`schedule-panel schedule-details ${mobileEditing ? 'mobile-visible' : ''}`}>
        {selected ? <><h2>{selected.name}</h2><ActivityIcon src={selected.icon} /><p className="schedule-detail-category">{selected.category}</p><label>Start time (optional)<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label><label>Duration (minutes)<input type="number" min="1" max="1440" value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="Optional" /><small>Optional. Enter a positive number.</small></label><button className="button button-primary" onClick={applyDetails}>Apply to draft</button><button className="button button-outline" onClick={() => { setSelectedTaskId(null); setMobileEditing(false); }}>Cancel edit</button><button className="button button-danger" onClick={() => remove(selected.id)}>Remove from schedule</button></> : <><h2>Activity details</h2><p className="schedule-helper">Select an activity to edit its time or duration.</p></>}
      </aside>
    </div>
    <div className="schedule-unsaved"><span><i />{dirty ? 'You have unsaved changes' : 'Schedule is up to date'}</span><div><button className="button button-outline" onClick={() => { setDraft(savedSchedule?.tasks.map((task) => ({ ...task })) ?? []); setSelectedTaskId(null); }}>Discard changes</button><button className="button button-primary" onClick={save}>Save schedule</button></div></div>
    <button className="schedule-status-link" onClick={() => actions.navigate('tasks')}>Recording what actually happened? Open Task status →</button>
    {copyOpen && <div className="schedule-modal-backdrop"><div className="schedule-modal" role="dialog" aria-modal="true" aria-labelledby="copy-title"><h2 id="copy-title">Copy schedule from date</h2><p>Choose a day to copy activities into this draft.</p><label>Source date<input type="date" value={copyDate} onChange={(event) => setCopyDate(event.target.value)} /></label><div className="schedule-modal-actions"><button className="button button-outline" onClick={() => setCopyOpen(false)}>Cancel</button><button className="button button-primary" onClick={copySchedule}>Copy schedule</button></div></div></div>}
    {customOpen && <div className="schedule-modal-backdrop"><form className="schedule-modal" role="dialog" aria-modal="true" aria-labelledby="custom-title" onSubmit={(event) => { event.preventDefault(); if (!customName.trim()) return; add({ activityId: `custom-${Date.now()}`, name: customName.trim(), icon: customIcon, category: customCategory }); setCustomName(''); setCustomOpen(false); }}><h2 id="custom-title">Custom activity</h2><label>Name<input required maxLength={100} value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Activity name" /></label><label>Picture<select value={customIcon} onChange={(event) => setCustomIcon(event.target.value)}>{PREDEFINED_ICONS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}</select></label><label>Category<select value={customCategory} onChange={(event) => setCustomCategory(event.target.value)}>{['Hygiene', 'Food', 'School', 'Play', 'Other'].map((category) => <option key={category}>{category}</option>)}</select></label><div className="schedule-modal-actions"><button type="button" className="button button-outline" onClick={() => setCustomOpen(false)}>Cancel</button><button className="button button-primary" type="submit">Add activity</button></div></form></div>}
  </div>;
}
