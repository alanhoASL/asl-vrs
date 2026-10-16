import type { HTMLAttributes, ReactNode } from 'react';

interface Props {
  id: string;
  label: ReactNode;
  value: string;
  onChange?: (value: string) => void;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  placeholder?: string;
  type?: 'text' | 'password' | 'datetime-local' | 'search';
  readOnly?: boolean;
  maxLength?: number;
  min?: string;
  autoComplete?: string;
  autoCapitalize?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  /** Small label style, used for repeated rows such as "Visitor 01". */
  compact?: boolean;
  /** Rendered on the right of the label row, e.g. an AUTO badge or a Remove button. */
  labelAside?: ReactNode;
}

export function TextField({
  id, label, value, onChange, required, hint, error, placeholder, type = 'text', readOnly, maxLength, min,
  autoComplete, autoCapitalize, inputMode, compact, labelAside,
}: Props) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const control = (
    <input
      id={id}
      name={id}
      className={type === 'datetime-local' ? 'input input--datetime' : 'input'}
      type={type}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      readOnly={readOnly}
      aria-readonly={readOnly || undefined}
      required={required}
      aria-required={required || undefined}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      maxLength={maxLength}
      min={min}
      autoComplete={autoComplete}
      autoCapitalize={autoCapitalize}
      inputMode={inputMode}
    />
  );

  return (
    <div className={`field${error ? ' field--invalid' : ''}`}>
      <div className="field__label-row">
        <label htmlFor={id} className={compact ? 'field__label field__label--compact' : 'field__label'}>
          {label}
          {required && (
            <>
              {!compact && <span className="req" aria-hidden="true">*</span>}
              <span className="sr-only"> (required)</span>
            </>
          )}
        </label>
        {labelAside}
      </div>
      {type === 'datetime-local' ? <div className="datetime-wrap">{control}</div> : control}
      {hint && <p id={hintId} className="field__hint">{hint}</p>}
      {error && (
        <p id={errorId} className="field__error">
          <span className="sr-only">Error: </span>
          {error}
        </p>
      )}
    </div>
  );
}
