import React from 'react';
import { Card, Statistic } from 'antd';
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
  statusBorderColor,
  onClick,
  subtext,
}) => {
  const isPositive = changePercent !== undefined && changePercent >= 0;

  return (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      style={{
        borderLeft: statusBorderColor ? `4px solid ${statusBorderColor}` : undefined,
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
      styles={{ body: { padding: '16px' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {label}
          </div>
          <Statistic
            value={value}
            valueStyle={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}
          />
        </div>
        {icon && (
          <div style={{ background: iconBg, padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {icon}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
        {changePercent !== undefined && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            fontWeight: 600,
            color: isPositive ? 'var(--status-available-text)' : 'var(--status-overdue-text)',
            background: isPositive ? 'var(--status-available-bg)' : 'var(--status-overdue-bg)',
            padding: '2px 8px',
            borderRadius: '12px',
          }}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{isPositive ? `+${changePercent}%` : `${changePercent}%`}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px' }}>{changeLabel}</span>
          </div>
        )}
      </div>
      {subtext && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{subtext}</div>}
    </Card>
  );
};
