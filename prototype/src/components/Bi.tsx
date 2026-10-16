interface Props {
  en: string;
  zh: string;
  /** Put the Chinese text on its own line, for headings and longer sentences. */
  stack?: boolean;
}

/** English followed by Traditional Chinese, with lang set so screen readers switch voice. */
export function Bi({ en, zh, stack }: Props) {
  return (
    <span className={stack ? 'bi bi--stack' : 'bi'}>
      <span>{en}</span>
      {stack ? null : ' '}
      <span lang="zh-Hant-HK" className="bi__zh">{zh}</span>
    </span>
  );
}
