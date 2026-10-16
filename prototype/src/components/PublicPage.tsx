import { useEffect, type ReactNode } from 'react';

interface Props {
  theme: 'prereg' | 'adhoc' | 'vendor' | 'tea';
  eyebrow: ReactNode;
  title: ReactNode;
  subtitle: ReactNode;
  /** Plain-text page name for the browser tab. */
  documentTitle: string;
  headerLabel?: ReactNode;
  skipLinkLabel?: ReactNode;
  children: ReactNode;
  footnote?: ReactNode;
}

/** Shell for the public pages a visitor reaches by QR code. No staff navigation on purpose. */
export function PublicPage({
  theme, eyebrow, title, subtitle, documentTitle, headerLabel = 'Visitor registration',
  skipLinkLabel = 'Skip to main content', children, footnote,
}: Props) {
  useEffect(() => {
    document.title = `${documentTitle} - ASL Visitor Registration`;
  }, [documentTitle]);

  return (
    <div className={`public-page theme-${theme}`}>
      <a href="#main-content" className="skip-link">{skipLinkLabel}</a>
      <header className="public-header">
        <span className="brand">ASL</span>
        <span className="public-header__sub">{headerLabel}</span>
      </header>
      <main id="main-content" className="public-main" tabIndex={-1}>
        <section className="form-card" aria-labelledby="page-title" aria-describedby="page-subtitle">
          <div className="form-card__head">
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              {eyebrow}
            </p>
            <h1 id="page-title" className="form-card__title">{title}</h1>
            <p id="page-subtitle" className="form-card__subtitle">{subtitle}</p>
          </div>
          <div className="form-card__body">{children}</div>
        </section>
        {footnote && <div className="public-footnote">{footnote}</div>}
      </main>
    </div>
  );
}
