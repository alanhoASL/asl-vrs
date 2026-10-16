import type { ReactNode } from 'react';

export interface FieldError {
  id: string;
  message: ReactNode;
}

export function ErrorSummary({ errors, title }: { errors: FieldError[]; title?: ReactNode }) {
  if (errors.length === 0) return null;
  return (
    <div className="error-summary" role="alert" aria-labelledby="error-summary-title" id="error-summary">
      <h2 id="error-summary-title" className="error-summary__title">
        {title ?? (errors.length === 1 ? 'Please fix 1 problem' : `Please fix ${errors.length} problems`)}
      </h2>
      <ul className="error-summary__list">
        {errors.map((e) => (
          <li key={e.id}>
            <a
              href={`#${e.id}`}
              onClick={(ev) => {
                ev.preventDefault();
                document.getElementById(e.id)?.focus();
              }}
            >
              {e.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
