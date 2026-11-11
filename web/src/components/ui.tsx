import React from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Circle, Loader2, Sparkles } from 'lucide-react';

export function Card({ children, className = '', as: Tag = 'div', ...rest }: { children: React.ReactNode; className?: string; as?: React.ElementType } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`card ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function Badge({ children, tone = 'neutral', className = '' }: { children: React.ReactNode; tone?: 'neutral' | 'indigo' | 'mint' | 'saffron' | 'rose' | 'ink'; className?: string }) {
  return <span className={`badge badge-${tone} ${className}`}>{children}</span>;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  className = '',
  ...rest
}: { children: React.ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'dark' | 'on-dark' | 'danger'; size?: 'sm' | 'md' | 'lg'; icon?: React.ReactNode; loading?: boolean; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading ? <Loader2 size={16} className="spin" /> : icon}
      <span>{children}</span>
    </button>
  );
}

export function IconButton({ label, children, className = '', ...rest }: { label: string; children: React.ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`icon-btn ${className}`} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}

export function ProgressRing({ value, size = 56, stroke = 5, color = 'var(--indigo)', label }: { value: number; size?: number; stroke?: number; color?: string; label?: string }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="ring-wrap" style={{ width: size, height: size }} aria-label={label || `${Math.round(clamped)} percent`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (clamped / 100) * circumference}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="ring-label">{Math.round(clamped)}%</span>
    </div>
  );
}

export function ProgressBar({ value, tone = 'indigo', height = 8 }: { value: number; tone?: 'indigo' | 'mint' | 'saffron' | 'rose'; height?: number }) {
  return (
    <div className="progress-track" style={{ height }} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <span className={`progress-fill fill-${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function SectionHeader({ eyebrow, title, action, description }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="section-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Tabs<T extends string>({ items, value, onChange, className = '' }: { items: { id: T; label: string; count?: number }[]; value: T; onChange: (id: T) => void; className?: string }) {
  return (
    <div className={`tabs ${className}`} role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          role="tab"
          aria-selected={value === item.id}
          className={`tab ${value === item.id ? 'active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {item.count !== undefined && <span className="tab-count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({ items, value, onChange, ariaLabel }: { items: { id: T; label: string }[]; value: T; onChange: (id: T) => void; ariaLabel: string }) {
  return (
    <div className="segmented" role="group" aria-label={ariaLabel}>
      {items.map((item) => (
        <button key={item.id} type="button" className={value === item.id ? 'active' : ''} aria-pressed={value === item.id} onClick={() => onChange(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <Card className="empty-state">
      <div className="empty-icon">{icon || <BookOpen size={24} />}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </Card>
  );
}

export function Skeleton({ className = '', height = 16 }: { className?: string; height?: number }) {
  return <div className={`skeleton ${className}`} style={{ height }} />;
}

export function Stat({ label, value, hint, icon, tone = 'indigo' }: { label: string; value: React.ReactNode; hint?: string; icon?: React.ReactNode; tone?: 'indigo' | 'mint' | 'saffron' | 'rose' }) {
  return (
    <Card className="stat-card">
      <div className={`stat-icon tone-${tone}`}>{icon || <Sparkles size={18} />}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </Card>
  );
}

export function CheckLine({ checked, label, hint, onChange }: { checked: boolean; label: string; hint?: string; onChange: () => void }) {
  return (
    <button type="button" className={`check-line ${checked ? 'checked' : ''}`} onClick={onChange} aria-pressed={checked}>
      {checked ? <CheckCircle2 size={19} /> : <Circle size={19} />}
      <span>
        <span className="check-label">{label}</span>
        {hint && <span className="check-hint">{hint}</span>}
      </span>
    </button>
  );
}

export function Callout({ children, tone = 'indigo', title }: { children: React.ReactNode; tone?: 'indigo' | 'mint' | 'saffron' | 'rose'; title?: string }) {
  return (
    <div className={`callout callout-${tone}`}>
      {title && <div className="callout-title">{title}</div>}
      {children}
    </div>
  );
}

export function LinkArrow({ children, ...rest }: { children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="link-arrow" {...rest}>
      {children} <ArrowRight size={14} />
    </button>
  );
}
