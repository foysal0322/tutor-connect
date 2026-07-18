import React, { InputHTMLAttributes, useState } from 'react';
import styles from './FloatingInput.module.css';

interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export default function FloatingInput({
  label,
  error,
  icon,
  className = '',
  ...props
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);

  return (
    <div className={`${styles.group} ${className}`}>
      {icon && (
        <div className={styles.icon}>
          {icon}
        </div>
      )}
      <input
        {...props}
        className={`${styles.input} ${icon ? styles.inputWithIcon : ''} ${error ? styles.inputError : ''}`}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          setHasValue(!!e.target.value);
          props.onBlur?.(e);
        }}
        onChange={(e) => {
          setHasValue(!!e.target.value);
          props.onChange?.(e);
        }}
        placeholder=" "
      />
      <label
        className={`${styles.label} ${icon ? styles.labelWithIcon : ''} ${isFocused || hasValue ? styles.labelActive : ''}`}
      >
        {label}
      </label>
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
