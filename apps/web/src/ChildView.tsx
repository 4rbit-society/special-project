import { useEffect, useRef, useState } from 'react';
import type { DailySchedule, ScheduleTask, SharedPageProps } from './model';
import { countdownLabel, countdownPercent, speechRateFor } from './lib/timer';
import './child.css';

type Category = 'Food' | 'Emotions' | 'Activities' | 'Needs';
type PictureCard = { id: string; label: string; icon: string; category: Category };
const asset = (name: string) => `/assets/child-${name}.svg`;

const illustrations: Record<string, string> = {
  clock: 'clock',
  brush: 'brush',
  rice: 'rice',
  shirt: 'shirt',
  book: 'book',
  play: 'play',
  water: 'water',
  milk: 'milk',
  bread: 'bread',
  happy: 'happy',
  sad: 'sad',
  tired: 'tired',
  toilet: 'toilet',
  help: 'help',
  school: 'school',
};

const categoryIcons: Record<Category, string> = {
  Food: 'rice-nav',
  Emotions: 'happy-nav',
  Activities: 'play-nav',
  Needs: 'help-nav',
};

function taskIllustration(task: ScheduleTask): string {
  const title = task.name.toLowerCase();
  if (title.includes('wake')) return 'clock';
  if (title.includes('brush')) return 'brush';
  if (title.includes('breakfast') || title.includes('rice') || title.includes('eat')) return 'rice';
  if (title.includes('dress') || title.includes('shirt')) return 'shirt';
  if (title.includes('learn') || title.includes('read') || title.includes('book')) return 'book';
  if (title.includes('play')) return 'play';
  if (title.includes('school')) return 'school';
  if (title.includes('toilet')) return 'toilet';
  if (title.includes('water')) return 'water';
  return task.icon;
}

function Illustration({ icon, variant = 'tile' }: { icon: string; variant?: 'tile' | 'large' | 'next' | 'nav' }) {
  const named = illustrations[icon];
  const specific = variant === 'large' && ['book', 'play'].includes(icon)
    ? `${icon}-large`
    : variant === 'next' && icon === 'play'
      ? 'play-next'
      : variant === 'next' && icon === 'brush'
        ? 'brush-next'
      : named;

  return (
    <span className={`child-illustration child-illustration--${variant} ${icon === 'book' ? 'child-illustration--school' : ''}`} aria-hidden="true">
      {specific ? <img src={asset(specific)} alt="" /> : icon.startsWith('/assets/') ? <img src={icon} alt="" /> : <span className="child-emoji">{icon || '⭐'}</span>}
    </span>
  );
}

function speak(text: string, onUnavailable: () => void, rate: number): boolean {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    onUnavailable();
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.onerror = (event) => { if (event.error !== 'canceled' && event.error !== 'interrupted') onUnavailable(); };
    window.speechSynthesis.speak(utterance);
  } catch { onUnavailable(); return false; }
  return true;
}

function playTimerCue(): void {
  try {
    const AudioCtor = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const context = new AudioCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.45);
    oscillator.onended = () => { void context.close(); };
  } catch {
    // The visual cue still works when audio is unavailable.
  }
}

export function ChildView({ data, selectedChildId, today, actions, preview }: SharedPageProps & { preview?: DailySchedule }) {
  const [section, setSection] = useState<'day' | 'talk'>('day');
  const [category, setCategory] = useState<Category>('Food');
  const [words, setWords] = useState<string[]>([]);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [completedName, setCompletedName] = useState('');
  const [confirmExit, setConfirmExit] = useState(false);
  const [timer, setTimer] = useState<{ taskId: string; remaining: number; total: number; running: boolean; ended: boolean } | null>(null);
  const timerCuePlayed = useRef(false);
  const speechRate = speechRateFor(data.preferences.voiceSpeed);

  useEffect(() => {
    setSection('day');
    setCategory('Food');
    setWords([]);
    setVoiceStatus('');
    setCompletedName('');
  }, [selectedChildId]);

  const child = data.children.find((item) => item.id === selectedChildId);
  const schedule = preview ?? data.schedules.find((item) => item.childId === selectedChildId && item.date === today);
  const tasks = schedule?.tasks ?? [];
  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const currentIndex = tasks.findIndex((task) => task.status !== 'done');
  const currentTask = currentIndex >= 0 ? tasks[currentIndex] : undefined;
  const nextTask = currentIndex >= 0 ? tasks.slice(currentIndex + 1).find((task) => task.status === 'pending') : undefined;
  const allDone = tasks.length > 0 && !currentTask;
  const visibleCards = (data.cards[selectedChildId] ?? []).filter((card) => !card.is_hidden && card.category === category).map((card) => ({ ...card, id: String(card.id) }));
  const phrase = words.length ? `I want ${words.map((word) => word.toLowerCase()).join(' ')}` : 'I want ...';

  useEffect(() => {
    if (preview || !currentTask || !currentTask.duration) {
      setTimer(null);
      return;
    }
    const total = currentTask.duration * 60;
    timerCuePlayed.current = false;
    setTimer({ taskId: currentTask.id, remaining: total, total, running: false, ended: false });
  }, [currentTask?.id, currentTask?.duration, preview]);

  useEffect(() => {
    if (!timer?.running) return;
    const interval = window.setInterval(() => {
      setTimer((current) => {
        if (!current?.running) return current;
        if (current.remaining <= 1) return { ...current, remaining: 0, running: false, ended: true };
        return { ...current, remaining: current.remaining - 1 };
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timer?.running, timer?.taskId]);

  useEffect(() => {
    if (!timer?.ended || timerCuePlayed.current) return;
    timerCuePlayed.current = true;
    if (data.preferences.soundOn) playTimerCue();
  }, [timer?.ended, data.preferences.soundOn]);

  function selectCard(card: PictureCard) {
    setWords((previous) => [...previous, card.label]);
    setVoiceStatus('');
    if (speak(card.label, () => setVoiceStatus('Voice isn’t available. Your words are shown here.'), speechRate)) {
      setVoiceStatus(`Speaking: ${card.label}`);
    }
  }

  async function completeCurrentTask() {
    if (!currentTask || preview) return;
    if (await actions.markTask(selectedChildId, currentTask.id, true, today)) setCompletedName(currentTask.name);
  }

  function renderProgress() {
    const exactAsset = tasks.length === 6 && [4, 5, 6].includes(doneCount)
      ? `sun-progress-${doneCount}of6`
      : tasks.length === 4 && doneCount === 0
        ? 'sun-progress-0of4'
        : undefined;
    return (
      <span className="child-progress-icon" aria-hidden="true">
        {exactAsset ? <img src={asset(exactAsset)} alt="" /> : <span className="child-progress-generic"><img src={asset('sun-nav-day')} alt="" /></span>}
      </span>
    );
  }

  if (!child) return null;

  if (confirmExit) {
    return (
      <main className={`child-view child-exit-view ${data.preferences.contrast === 'high' ? 'child-view--high-contrast' : ''} child-view--text-${data.preferences.fontSize}`}>
        <div className="child-exit-panel">
          <h1>Return to staff workspace?</h1>
          <p>An adult can continue here. Your completed activities are saved.</p>
          <button className="child-button child-button--primary" onClick={() => setConfirmExit(false)}>Stay in Child view</button>
          <button className="child-button child-button--secondary" onClick={() => actions.navigate(preview ? 'schedules' : 'dashboard')}>Return to staff workspace</button>
        </div>
      </main>
    );
  }

  return (
    <main className={`child-view ${data.preferences.contrast === 'high' ? 'child-view--high-contrast' : ''} child-view--text-${data.preferences.fontSize}`}>
      <div className="child-content">{preview && <p role="status">Preview · {today} · Changes are not saved</p>}
        <header className="child-header">
          <span className="child-mascot" aria-hidden="true"><img src={asset(section === 'talk' ? 'mascot-listen' : 'mascot-wave')} alt="" /></span>
          <h1>{child.name}’s day</h1>
          <button className="child-exit-button" aria-label="Return to staff workspace" title="Return to staff workspace" onClick={() => setConfirmExit(true)}>
            <img src={asset('logout')} alt="" />
          </button>
        </header>

        <nav className="child-nav" aria-label="Child view">
          <button className={`child-button child-nav-button ${section === 'day' ? 'child-button--primary' : 'child-button--secondary'}`} aria-current={section === 'day' ? 'page' : undefined} onClick={() => setSection('day')}>
            <img src={asset(section === 'day' ? 'sun-nav-day' : 'sun-nav-board')} alt="" />My day
          </button>
          <button className={`child-button child-nav-button ${section === 'talk' ? 'child-button--primary' : 'child-button--secondary'}`} aria-current={section === 'talk' ? 'page' : undefined} onClick={() => setSection('talk')}>
            <img src={asset(section === 'talk' ? 'talk-nav-board' : 'talk-nav-day')} alt="" />Talk
          </button>
        </nav>

        {section === 'day' ? (
          <div className="child-day">
            {tasks.length === 0 ? (
              <section className="child-empty">
                <span className="child-empty-mascot" aria-hidden="true"><img src={asset('mascot-guide')} alt="" /></span>
                <h2>No activities today</h2>
                <p>Ask your adult to add a schedule. You can still use picture cards.</p>
              </section>
            ) : (
              <>
                <div className="child-progress" role="status" aria-live="polite">
                  {renderProgress()}<span>{doneCount} of {tasks.length} done</span>
                </div>
                {completedName && !allDone && <div className="child-completion" role="status">✓ {completedName} is done</div>}
                {allDone ? (
                  <section className="child-all-done">
                    <span className="child-finish-mascot" aria-hidden="true"><img src={asset('mascot-wave')} alt="" /></span>
                    <h2>✓ All done!</h2>
                    <p>You finished today’s activities.</p>
                  </section>
                ) : currentTask && (
                  <div className="child-now-next">
                    <section className="child-current">
                      <h2>Now</h2>
                      <Illustration icon={taskIllustration(currentTask)} variant="large" />
                      <strong>{currentTask.name}</strong>
                      {timer && timer.taskId === currentTask.id && (
                        <div className={`child-timer ${timer.ended ? 'is-ended' : ''} ${timer.remaining > 0 && timer.remaining <= 10 ? 'is-near-end' : ''}`} role="timer" aria-label={`Task timer: ${timer.ended ? 'time is up' : `${countdownLabel(timer.remaining)} remaining`}`}>
                          <div className="child-timer-ring" style={{ background: `conic-gradient(var(--child-blue) ${countdownPercent(timer.remaining, timer.total)}%, var(--child-selected) 0)` }}>
                            <span>{timer.ended ? 'Time up' : countdownLabel(timer.remaining)}</span>
                          </div>
                          <div className="child-timer-actions">
                            {!timer.ended && <button className="child-button child-button--secondary" onClick={() => setTimer({ ...timer, running: !timer.running })}>{timer.running ? 'Pause timer' : timer.remaining === timer.total ? 'Start timer' : 'Resume timer'}</button>}
                            <button className="child-button child-button--secondary" onClick={() => { timerCuePlayed.current = false; setTimer({ ...timer, remaining: timer.total, running: false, ended: false }); }}>Reset timer</button>
                          </div>
                          {timer.ended && <p className="child-timer-message" role="status">Time is up — nice effort!</p>}
                        </div>
                      )}
                      <button className="child-done-button" disabled={!!preview} onClick={completeCurrentTask}>✓ Done</button>
                    </section>
                    <section className="child-next">
                      <h2>Next</h2>
                      {nextTask ? <><Illustration icon={taskIllustration(nextTask)} variant="next" /><strong>{nextTask.name}</strong></> : <p>Then you’re all done.</p>}
                    </section>
                  </div>
                )}
                <section className="child-activities" aria-labelledby="child-activities-heading">
                  <h2 id="child-activities-heading">Today’s activities</h2>
                  <ol className="child-activity-grid">
                    {tasks.map((task, index) => {
                      const state = task.status === 'done' ? 'done' : index === currentIndex ? 'now' : 'later';
                      return <li className={`child-activity child-activity--${state}`} key={task.id}>
                        <Illustration icon={taskIllustration(task)} />
                        <strong>{task.name}</strong>
                        <span className="child-activity-state">{state === 'done' ? '✓ Done' : state === 'now' ? '→ Now' : 'Later'}</span>
                      </li>;
                    })}
                  </ol>
                </section>
              </>
            )}
          </div>
        ) : (
          <section className="child-board" aria-labelledby="child-board-heading">
            <h2 id="child-board-heading">Picture cards</h2>
            <div className="child-categories" role="group" aria-label="Picture card categories">
              {(['Food', 'Emotions', 'Activities', 'Needs'] as Category[]).map((item) => (
                <button className={`child-button child-category ${category === item ? 'child-button--primary' : 'child-button--secondary'}`} aria-pressed={category === item} key={item} onClick={() => setCategory(item)}>
                  <img src={asset(categoryIcons[item])} alt="" />{item}
                </button>
              ))}
            </div>
            <div className="child-picture-grid">
              {visibleCards.map((card) => {
                const selected = words.includes(card.label);
                return <button className={`child-picture-card ${selected ? 'is-selected' : ''}`} key={`${card.category}-${card.id}`} aria-pressed={selected} onClick={() => selectCard(card)}>
                  <Illustration icon={card.icon} />
                  <strong>{card.label}</strong>
                  {selected && <img className="child-selected-check" src={asset('selected-check')} alt="" />}
                </button>;
              })}
            </div>
            <section className="child-sentence" aria-label="My words">
              <h3>My words</h3>
              <p>{phrase}</p>
              <div className="child-sentence-actions">
                <button className="child-button child-button--primary" onClick={() => {
                  if (words.length === 0) return;
                  if (speak(phrase, () => setVoiceStatus('Voice isn’t available. Your words are shown here.'), speechRate)) setVoiceStatus(`Speaking: ${phrase}`);
                }}><img src={asset('speech')} alt="" />Speak</button>
                <button className="child-button child-button--secondary" onClick={() => { setWords([]); setVoiceStatus(''); }}><img src={asset('clear')} alt="" />Clear</button>
              </div>
              {voiceStatus && <span className="child-voice-status" role="status">{voiceStatus}</span>}
            </section>
          </section>
        )}
      </div>
    </main>
  );
}
