import { useEffect, useState } from 'react';
import type { ActivityProgressSummary, ProgressRange } from '@starter/shared';
import type { SharedPageProps } from './model';
import './progress.css';

const calendarDate = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options }).format(new Date(`${date}T12:00:00Z`));

export function ProgressPage({ data, selectedChildId, actions }: SharedPageProps) {
  const child = data.children.find((item) => item.id === selectedChildId) ?? data.children[0];
  const progress = child ? data.progress[child.id] : undefined;
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [range, setRange] = useState<ProgressRange>('7d');
  const [activityProgress, setActivityProgress] = useState<ActivityProgressSummary>();
  useEffect(() => setSelectedDate(null), [child?.id, progress?.today.date]);
  useEffect(() => {
    if (!child) {
      setActivityProgress(undefined);
      return;
    }
    let cancelled = false;
    setActivityProgress(undefined);
    void actions.activityProgress(child.id, range).then((result) => {
      if (!cancelled) setActivityProgress(result);
    });
    return () => { cancelled = true; };
  }, [child?.id, range]);

  if (!child) return <section className="staff-page progress-page"><h1>Progress</h1><div className="progress-empty staff-panel">
    <img src="/assets/staff-form-sun.svg" alt="" /><h2>A little progress starts here</h2>
    <p>Add a child profile and build their first routine to start seeing their progress.</p>
    <button className="staff-button primary" onClick={() => actions.navigate('profiles')}>Add a child profile</button>
  </div></section>;

  if (!progress) return <section className="staff-page progress-page"><h1>Progress</h1><p role="status">Progress is not available for {child.name} yet.</p></section>;

  const days = progress.last_7_days;
  const completed = days.reduce((sum, day) => sum + day.done, 0);
  const total = days.reduce((sum, day) => sum + day.total, 0);
  const percent = total ? Math.round(completed / total * 100) : 0;
  const activeDays = days.filter((day) => day.total > 0).length;
  const todayPercent = progress.today.total ? Math.round(progress.today.done / progress.today.total * 100) : 0;
  const selected = days.find((day) => day.date === selectedDate);
  const completions = progress.recent_completions.filter((task) => !selectedDate || task.schedule_date === selectedDate);
  const dateRangeLabel = days.length ? `${calendarDate(days[0]!.date, { day: 'numeric', month: 'short' })} – ${calendarDate(days[days.length - 1]!.date, { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Last 7 days';
  const rankedActivities = [...(activityProgress?.activities ?? [])].sort((a, b) => b.percentage - a.percentage || b.completed - a.completed || b.total - a.total || a.name.localeCompare(b.name));
  const mostCompleted = rankedActivities.filter((item) => item.completed > 0).slice(0, 3);
  const leastCompleted = [...rankedActivities].filter((item) => item.percentage < 100).sort((a, b) => a.percentage - b.percentage || a.completed - b.completed || b.total - a.total || a.name.localeCompare(b.name)).slice(0, 3);
  const activityRow = (item: ActivityProgressSummary['activities'][number], section: string) => <li key={`${section}-${item.name}`}>
    <span className="progress-activity-icon" aria-hidden="true">{item.icon.startsWith('/') ? <img src={item.icon} alt="" /> : item.icon}</span>
    <div className="progress-activity-body"><strong>{item.name}</strong><span>{item.completed} of {item.total} done</span><span className="progress-activity-track"><span style={{ width: `${item.percentage}%` }} /></span></div>
    <span className="progress-activity-percent">{item.percentage}%</span>
  </li>;

  return <div className="staff-page staff-progress-page progress-page">
    <header className="progress-heading"><div><div className="progress-title-row"><h1>Progress</h1>
      <label className="staff-picker">
        <span className="staff-picker-avatar" aria-hidden="true">{child.avatar === '🐱' ? <img src="/araw/avatars/avatar-cat-svg.svg" alt="" /> : child.avatar}</span>
        <span className="staff-picker-label">{child.name}</span>
        <svg className="staff-picker-chevron" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5 6 6.5l5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <select aria-label="Child" value={child.id} onChange={(event) => actions.selectChild(Number(event.target.value))}>{data.children.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      </label>
    </div><p>Small steps, one day at a time.</p></div>
    </header>

    <div className="progress-week-heading"><div className="progress-child-identity"><span className="progress-avatar" aria-hidden="true">{child.avatar === '🐱' ? <img src="/araw/avatars/avatar-cat-svg.svg" alt="" /> : child.avatar}</span><div><h2>{child.name}'s week</h2><p>{dateRangeLabel}</p></div></div><span className="progress-period">Last 7 days</span></div>

    <div className="progress-metrics" aria-label="Weekly summary">
      <article className="progress-metric"><span className="progress-metric-icon blue" aria-hidden="true">↗</span><div><p>Weekly completion</p><strong>{total ? `${percent}%` : '—'}</strong><span>{total ? 'Across all scheduled activities' : 'No activities scheduled yet'}</span></div></article>
      <article className="progress-metric"><span className="progress-metric-icon green" aria-hidden="true">✓</span><div><p>Activities completed</p><strong>{completed}<small> / {total}</small></strong><span>Every finished step counts</span></div></article>
      <article className="progress-metric"><span className="progress-metric-icon gold" aria-hidden="true"><img src="/assets/child-sun-nav-day.svg" alt="" /></span><div><p>Days with a routine</p><strong>{activeDays}<small> / {days.length}</small></strong><span>Days with scheduled activities</span></div></article>
    </div>

    <div className="progress-overview">
      <section className="progress-chart-panel staff-panel" aria-labelledby="progress-chart-title">
        <div className="progress-section-heading"><div><h2 id="progress-chart-title">A week at a glance</h2><p>Choose a day to see its completed activities.</p></div><span className="progress-legend"><i />Completed</span></div>
        <div className="progress-chart" role="group" aria-label="Daily completion">
          {days.map((day) => {
            const percentage = day.total ? Math.round(day.done / day.total * 100) : 0;
            const isToday = day.date === progress.today.date;
            return <button type="button" className={`progress-day ${selectedDate === day.date ? 'selected' : ''} ${isToday ? 'today' : ''}`} key={day.date} aria-pressed={selectedDate === day.date}
              aria-label={`${calendarDate(day.date, { weekday: 'long', day: 'numeric', month: 'long' })}: ${day.done} of ${day.total} activities completed${day.total ? `, ${percentage}%` : ', no activities scheduled'}`}
              onClick={() => setSelectedDate(selectedDate === day.date ? null : day.date)}>
              <span className="progress-bar-value">{day.total ? `${percentage}%` : '—'}</span>
              <span className={`progress-bar-track ${day.total ? '' : 'empty'}`} aria-hidden="true"><span style={{ height: `${percentage}%` }} /></span>
              <span className="progress-day-name">{isToday ? 'Today' : calendarDate(day.date, { weekday: 'short' })}</span>
              <span className="progress-day-date">{calendarDate(day.date, { day: 'numeric', month: 'short' })}</span>
            </button>;
          })}
        </div>
        <div className="progress-chart-caption" role="status">{selected ? <><strong>{calendarDate(selected.date, { weekday: 'long', day: 'numeric', month: 'short' })}</strong><span>{selected.total ? `${selected.done} of ${selected.total} activities completed` : 'No activities scheduled for this day'}</span><button className="progress-text-button" onClick={() => setSelectedDate(null)}>Show all days</button></> : <span>Bars show the share of each day's activities completed. A dash means no activities were scheduled.</span>}</div>
      </section>

      <aside className="progress-today staff-panel" aria-labelledby="progress-today-title"><div className="progress-today-heading"><h2 id="progress-today-title">Today</h2><span>{calendarDate(progress.today.date, { day: 'numeric', month: 'short' })}</span></div>
        <div className="progress-ring" style={{ background: `conic-gradient(var(--staff-blue) ${todayPercent}%, var(--selected) 0)` }} role="progressbar" aria-label="Today's completion" aria-valuenow={todayPercent} aria-valuemin={0} aria-valuemax={100} aria-valuetext={progress.today.total ? `${progress.today.done} of ${progress.today.total} activities completed` : 'No activities scheduled today'}><div><strong>{progress.today.total ? `${todayPercent}%` : '—'}</strong><span>completed</span></div></div>
        <p><strong>{progress.today.done} of {progress.today.total}</strong> activities done</p><p className="progress-today-note">{!progress.today.total ? 'A new day, ready for a routine.' : progress.today.done === progress.today.total ? 'All done. Time to celebrate the little wins!' : 'Each activity is another step forward.'}</p>
        <button className="staff-button secondary" onClick={() => actions.navigate('schedules')}>View schedule</button>
      </aside>
    </div>

    <section className="progress-activities staff-panel" aria-labelledby="progress-activities-title">
      <div className="progress-section-heading">
        <div><div className="progress-title-row"><h2 id="progress-activities-title">Activity patterns</h2>
          <label className="staff-picker progress-period-picker">
            <svg className="progress-period-picker-icon" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.75" y="3.25" width="12.5" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M1.75 6.75h12.5M5.25 1.75v3M10.75 1.75v3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            <span>{range === '7d' ? 'Last 7 days' : 'Last 30 days'}</span>
            <svg className="staff-picker-chevron" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5 6 6.5l5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <select aria-label="Period" value={range} onChange={(event) => setRange(event.target.value as ProgressRange)}><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select>
          </label>
        </div><p>Most and least completed over the selected period.</p></div>
      </div>
      {!activityProgress ? <p role="status">Loading activity patterns…</p> : rankedActivities.length === 0 ? <p className="progress-activities-empty">Complete a few scheduled activities to see patterns here.</p> : <div className="progress-activity-grid">
        <section aria-labelledby="most-completed-title"><h3 id="most-completed-title">Most completed</h3>{mostCompleted.length ? <ul className="progress-activity-list">{mostCompleted.map((item) => activityRow(item, 'most'))}</ul> : <p className="progress-activities-empty">No completed activities yet.</p>}</section>
        <section aria-labelledby="least-completed-title"><h3 id="least-completed-title">Least completed</h3>{leastCompleted.length ? <ul className="progress-activity-list">{leastCompleted.map((item) => activityRow(item, 'least'))}</ul> : <p className="progress-activities-empty">Every scheduled activity is complete.</p>}</section>
      </div>}
    </section>

    <section className="progress-history staff-panel" aria-labelledby="progress-history-title"><div className="progress-section-heading"><div><h2 id="progress-history-title">Recent completions</h2><p>{selectedDate ? `For ${calendarDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })}` : 'A closer look at the steps they finished.'}</p></div><span className="progress-history-count">{completions.length} {completions.length === 1 ? 'activity' : 'activities'}</span></div>
      {completions.length ? <ul className="progress-history-list">{completions.map((task) => <li key={task.task_id}><span className="progress-history-icon" aria-hidden="true">{task.icon.startsWith('/') ? <img src={task.icon} alt="" /> : task.icon}</span><div className="progress-history-description"><strong>{task.name}</strong><time dateTime={task.completed_at}>{new Date(task.completed_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</time></div><span className="progress-done"><span aria-hidden="true">✓ </span>Done</span></li>)}</ul>
        : <div className="progress-history-empty"><span aria-hidden="true">✓</span><div><h3>{selectedDate ? 'No completions for this day yet' : 'Their next little win belongs here'}</h3><p>Completed activities will appear here as they finish their routine.</p></div></div>}
    </section>
  </div>;
}
