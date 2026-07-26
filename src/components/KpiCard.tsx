import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  changePercent?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  isMono?: boolean;
  statusBorderColor?: string;
  onClick?: () => void;
  subtext?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  changePercent,
  changeLabel = 'vs hôm qua',
  icon,
  iconBg = 'var(--primary-light)',
  isMono = false,
  statusBorderColor,
  onClick,
  subtext,
}) => {
  const isPositive = changePercent !== undefined && changePercent >= 0;

  return (
    <div
      className="kpi-card"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        borderLeft: statusBorderColor ? `3px solid ${statusBorderColor}` : undefined,
      }}
    >
      {/* Top row: label + icon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.3 }}>
          {label}
        </span>
        {icon && (
          <div className="kpi-card-icon" style={{ background: iconBg, flexShrink: 0 }}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div
        className={isMono ? 'font-mono' : ''}
        style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: isMono ? '-0.03em' : 'normal' }}
      >
        {value}
      </div>

      {/* Bottom row: change + subtext */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
        {changePercent !== undefined ? (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '12px',
            fontWeight: 600,
            color: isPositive ? 'var(--status-available-text)' : 'var(--status-overdue-text)',
            background: isPositive ? 'var(--status-available-bg)' : 'var(--status-overdue-bg)',
            padding: '2px 7px',
            borderRadius: '99px',
          }}>
            {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            <span>{isPositive ? `+${changePercent}%` : `${changePercent}%`}</span>
          </div>
        ) : <span />}
        {changePercent !== undefined && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{changeLabel}</span>
        )}
      </div>

      {subtext && (
        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '-4px' }}>{subtext}</div>
      )}
    </div>
  );
};
