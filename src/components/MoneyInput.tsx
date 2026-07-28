import React, { useState } from 'react';

interface MoneyInputProps {
  value: number | string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
  id?: string;
  required?: boolean;
}

/**
 * MoneyInput — Ô nhập số tiền VNĐ:
 * - Hiển thị dấu chấm phân cách ngàn: 1.000.000
 * - KHÔNG có mũi tên spinner (type="text")
 * - Khi focus: hiện số nguyên để chỉnh
 * - Khi blur: hiện định dạng có dấu chấm + đơn vị "₫"
 */
export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onChange,
  placeholder = '0',
  style,
  className,
  disabled,
  id,
  required,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  // Parse raw number from value
  const rawNum = typeof value === 'string'
    ? parseInt(value.replace(/[^0-9]/g, ''), 10) || 0
    : (value as number) || 0;

  // Display: formatted when blurred, raw when focused
  const displayValue = isFocused
    ? (rawNum === 0 && !value ? '' : rawNum.toString())
    : (rawNum === 0 && !value ? '' : rawNum.toLocaleString('vi-VN') + ' ₫');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip all non-digit characters  
    const digits = e.target.value.replace(/[^0-9]/g, '');
    onChange(digits);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Select all on focus for easy replacement
    setTimeout(() => e.target.select(), 0);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const baseStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--border-strong)',
    fontSize: '15px',
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    color: 'var(--text-primary)',
    background: disabled ? 'var(--bg-hover)' : 'var(--bg-surface)',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    letterSpacing: '-0.01em',
    textAlign: 'right' as const,
    // No spinner
    MozAppearance: 'textfield',
    ...style,
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder ? new Intl.NumberFormat('vi-VN').format(parseInt(placeholder) || 0) + ' ₫' : '0 ₫'}
      disabled={disabled}
      required={required}
      className={className}
      style={baseStyle}
    />
  );
};

/**
 * MoneyInputLeft — Giống MoneyInput nhưng text align left
 */
export const MoneyInputLeft: React.FC<MoneyInputProps> = (props) => {
  return <MoneyInput {...props} style={{ ...props.style, textAlign: 'left' as const }} />;
};
