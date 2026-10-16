import type { ReactNode } from 'react';

/** Decorative only: every icon sits next to a visible text label. */
function Icon({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const CalendarIcon = () => (
  <Icon>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Icon>
);

export const ReportIcon = () => (
  <Icon>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Icon>
);

export const AuditIcon = () => (
  <Icon>
    <path d="M9 5h11M9 12h11M9 19h11" />
    <path d="M4 5h.01M4 12h.01M4 19h.01" strokeWidth="2.6" />
  </Icon>
);

export const SearchIcon = () => (
  <Icon size={16}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4-4" />
  </Icon>
);

export const ChevronLeftIcon = () => (
  <Icon size={16}>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);

export const ChevronRightIcon = () => (
  <Icon size={16}>
    <path d="M9 5l7 7-7 7" />
  </Icon>
);

export const SignOutIcon = () => (
  <Icon size={16}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />
  </Icon>
);
