import { useId, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'quiet' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  leadingIcon?: string;
  trailingIcon?: string;
};

export function ArawIcon({ name, className = '' }: { name: string; className?: string }) {
  return <img className={`araw-icon ${className}`.trim()} src={`/araw/icons/icon-${name}.svg`} alt="" aria-hidden="true" />;
}

export function Button({ variant = 'secondary', leadingIcon, trailingIcon, className = '', children, ...props }: ButtonProps) {
  return <button type="button" className={`ui-button ui-button--${variant} ${className}`.trim()} {...props}>
    {leadingIcon && <ArawIcon name={leadingIcon} />}
    <span>{children}</span>
    {trailingIcon && <ArawIcon name={trailingIcon} />}
  </button>;
}

export function Brand({ reversed = false }: { reversed?: boolean }) {
  return <div className={`araw-brand ${reversed ? 'reversed' : ''}`}>
    <img src="/araw/brand/araw-sun-logo.svg" alt="" aria-hidden="true" />
    <span>Araw</span>
  </div>;
}

type SurfaceProps = HTMLAttributes<HTMLElement> & { as?: 'article' | 'section' | 'div'; padded?: boolean };
export function Surface({ as: Element = 'section', padded = true, className = '', ...props }: SurfaceProps) {
  return <Element className={`ui-surface ${padded ? 'ui-surface--padded' : ''} ${className}`.trim()} {...props} />;
}

export function PageHeading({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <header className="ui-page-heading">
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {actions && <div className="ui-page-heading__actions">{actions}</div>}
  </header>;
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; fieldClassName?: string };
export function TextField({ label, hint, fieldClassName = '', id, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? props.name ?? generatedId;
  return <label className={`ui-field ${fieldClassName}`.trim()} htmlFor={inputId}>
    <span>{label}</span><input id={inputId} {...props} />{hint && <small>{hint}</small>}
  </label>;
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string; fieldClassName?: string };
export function SelectField({ label, hint, fieldClassName = '', id, children, ...props }: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? props.name ?? generatedId;
  return <label className={`ui-field ${fieldClassName}`.trim()} htmlFor={selectId}>
    <span>{label}</span><select id={selectId} {...props}>{children}</select>{hint && <small>{hint}</small>}
  </label>;
}

export function StatusBadge({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'; className?: string }) {
  return <span className={`ui-badge ui-badge--${tone} ${className}`.trim()}>{children}</span>;
}

export function ProgressIndicator({ value, label, className = '' }: { value: number; label: string; className?: string }) {
  const boundedValue = Math.max(0, Math.min(100, value));
  return <div className={`ui-progress ${className}`.trim()} role="progressbar" aria-label={label} aria-valuenow={boundedValue} aria-valuemin={0} aria-valuemax={100}>
    <span style={{ width: `${boundedValue}%` }} />
  </div>;
}

export function ActivityCard({ icon, title, description, state = 'default', children, className = '' }: {
  icon: string;
  title: string;
  description?: string;
  state?: 'default' | 'current' | 'upcoming' | 'completed';
  children?: ReactNode;
  className?: string;
}) {
  return <article className={`ui-activity-card ui-activity-card--${state} ${className}`.trim()}>
    <img src={icon} alt="" aria-hidden="true" />
    <div className="ui-activity-card__copy"><h3>{title}</h3>{description && <p>{description}</p>}</div>
    {children && <div className="ui-activity-card__actions">{children}</div>}
  </article>;
}

export function Notification({ children, tone = 'info', className = '' }: {
  children: ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  className?: string;
}) {
  return <div className={`ui-notice ui-notice--${tone} ${className}`.trim()} role={tone === 'danger' ? 'alert' : 'status'}>{children}</div>;
}

export function EmptyState({ title, children, illustration, action, className = '' }: { title: string; children?: ReactNode; illustration?: string; action?: ReactNode; className?: string }) {
  return <section className={`ui-empty-state ${className}`.trim()}>
    {illustration && <img src={illustration} alt="" aria-hidden="true" />}
    <h2>{title}</h2>{children && <p>{children}</p>}{action && <div>{action}</div>}
  </section>;
}
