import { useEffect, useRef, useState } from 'react';
import { Bi } from '../../components/Bi';
import { DEFAULT_FORM_SUBTITLES, DEFAULT_PURPOSES, DEFAULT_TEA_PROMPT, resetFormSubtitle, resetPurposeOptions, resetTeaPrompt, saveFormSubtitle, savePurposeOptions, saveTeaPrompt, useFormSubtitles, usePurposeOptions, useTeaPrompt, type BilingualText, type PurposeOption } from '../../data/formCopy';
import { resetSiteLogo, saveSiteLogo, useSiteLogo } from '../../data/siteLogo';
import type { RegistrationType } from '../../data/types';

const FORMS: {
  id: RegistrationType;
  theme: 'prereg' | 'adhoc' | 'vendor';
  name: string;
  eyebrow: BilingualText;
  title: BilingualText;
}[] = [
  {
    id: 'guest-prereg',
    theme: 'prereg',
    name: 'Guest pre-registration',
    eyebrow: { en: 'Guest', zh: '訪客' },
    title: { en: 'Pre-registration', zh: '預先登記' },
  },
  {
    id: 'guest-adhoc',
    theme: 'adhoc',
    name: 'Guest on-site registration',
    eyebrow: { en: 'Guest', zh: '訪客' },
    title: { en: 'On-Site Registration', zh: '即場登記' },
  },
  {
    id: 'vendor',
    theme: 'vendor',
    name: 'Vendor / contractor',
    eyebrow: { en: 'Vendor / Contractor', zh: '供應商 / 承辦商' },
    title: { en: 'On-Site Registration', zh: '現場登記' },
  },
];

function fitHeight(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

export function FormWordingPage() {
  const stored = useFormSubtitles();
  const storedPurposes = usePurposeOptions();
  const storedTea = useTeaPrompt();
  const logo = useSiteLogo();
  const [selected, setSelected] = useState<RegistrationType>('guest-prereg');
  const [drafts, setDrafts] = useState(stored);
  const [purposeDraft, setPurposeDraft] = useState(storedPurposes);
  const [errors, setErrors] = useState<Partial<Record<RegistrationType, string>>>({});
  const [purposeError, setPurposeError] = useState('');
  const [notice, setNotice] = useState('');
  const [teaDraft, setTeaDraft] = useState(storedTea);
  const [teaError, setTeaError] = useState('');
  const [teaNotice, setTeaNotice] = useState('');
  const [logoError, setLogoError] = useState('');
  const [logoNotice, setLogoNotice] = useState('');
  const enRef = useRef<HTMLTextAreaElement>(null);
  const teaEnRef = useRef<HTMLTextAreaElement>(null);
  const teaZhRef = useRef<HTMLTextAreaElement>(null);
  const zhRef = useRef<HTMLTextAreaElement>(null);

  const form = FORMS.find((item) => item.id === selected) ?? FORMS[0];
  const draft = drafts[form.id];
  const errorId = `subtitle-${form.id}-error`;
  const subtitleChanged = draft.en !== stored[form.id].en || draft.zh !== stored[form.id].zh;
  const purposesChanged = form.id === 'vendor' && !samePurposes(purposeDraft, storedPurposes);
  const changed = subtitleChanged || purposesChanged;
  const notDefault = stored[form.id].en !== DEFAULT_FORM_SUBTITLES[form.id].en
    || stored[form.id].zh !== DEFAULT_FORM_SUBTITLES[form.id].zh
    || (form.id === 'vendor' && !samePurposes(storedPurposes, DEFAULT_PURPOSES))
    || changed;

  useEffect(() => {
    document.title = 'Form wording - ASL Visitor Registration';
  }, []);

  useEffect(() => {
    fitHeight(enRef.current);
    fitHeight(zhRef.current);
  }, [draft.en, draft.zh, form.id]);

  useEffect(() => {
    fitHeight(teaEnRef.current);
    fitHeight(teaZhRef.current);
  }, [teaDraft.en, teaDraft.zh]);

  const update = (field: 'en' | 'zh', value: string) => {
    setDrafts((prev) => ({ ...prev, [form.id]: { ...prev[form.id], [field]: value } }));
    setErrors((prev) => ({ ...prev, [form.id]: undefined }));
    setPurposeError('');
    setNotice('');
  };

  const save = () => {
    const en = draft.en.trim();
    const zh = draft.zh.trim();
    if (!en || !zh) {
      setErrors((prev) => ({ ...prev, [form.id]: 'Enter both the English sentence and the Chinese sentence.' }));
      (en ? zhRef : enRef).current?.focus();
      return;
    }
    const cleanedPurposes = purposeDraft.map((item) => ({ ...item, en: item.en.trim(), zh: item.zh.trim() }));
    if (form.id === 'vendor') {
      const invalid = cleanedPurposes.find((item) => !item.en || !item.zh);
      if (cleanedPurposes.length === 0 || invalid) {
        setPurposeError(cleanedPurposes.length === 0
          ? 'Add at least one work type.'
          : 'Enter both the English name and the Chinese name for every work type.');
        if (invalid) document.getElementById(`purpose-item-${invalid.id}-${invalid.en ? 'zh' : 'en'}`)?.focus();
        return;
      }
      if (!savePurposeOptions(cleanedPurposes)) {
        setPurposeError('Enter both the English name and the Chinese name for every work type.');
        return;
      }
      setPurposeDraft(cleanedPurposes);
    }
    saveFormSubtitle(form.id, { en, zh });
    setDrafts((prev) => ({ ...prev, [form.id]: { en, zh } }));
    setPurposeError('');
    setNotice(form.id === 'vendor'
      ? 'Saved the vendor form wording and work list.'
      : `Saved the line under the title for ${form.name}.`);
  };

  const reset = () => {
    resetFormSubtitle(form.id);
    setDrafts((prev) => ({ ...prev, [form.id]: { ...DEFAULT_FORM_SUBTITLES[form.id] } }));
    if (form.id === 'vendor') {
      resetPurposeOptions();
      setPurposeDraft(DEFAULT_PURPOSES.map((item) => ({ ...item })));
    }
    setErrors((prev) => ({ ...prev, [form.id]: undefined }));
    setPurposeError('');
    setNotice(form.id === 'vendor'
      ? 'Restored the original vendor wording and work list.'
      : `Restored the original line under the title for ${form.name}.`);
  };

  return (
    <div className="wording-page">
      <div className="page-head">
        <h1 className="page-title">Form wording</h1>
        <p className="page-subtitle">
          Click the sentence under a form title and edit it here. Super admin can also replace the official logo and the tea order sentence.
        </p>
      </div>

      <LogoEditor
        logo={logo}
        error={logoError}
        notice={logoNotice}
        onError={setLogoError}
        onNotice={setLogoNotice}
      />

      <div className="segmented wording-switch" role="group" aria-label="Registration form">
        {FORMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="segmented__btn"
            aria-pressed={selected === item.id}
            id={`wording-tab-${item.id}`}
            onClick={() => setSelected(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className={`wording-stage theme-${form.theme}`}>
        <section className="form-card" aria-labelledby="wording-form-title">
          <div className="form-card__head">
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              <Bi en={form.eyebrow.en} zh={form.eyebrow.zh} />
            </p>
            <h2 id="wording-form-title" className="form-card__title">
              <Bi en={form.title.en} zh={form.title.zh} stack />
            </h2>
            <div className="form-card__subtitle wording-subtitle">
              <label className="sr-only" htmlFor={`subtitle-${form.id}-en`}>English sentence under the title</label>
              <textarea
                ref={enRef}
                id={`subtitle-${form.id}-en`}
                className="wording-line"
                rows={1}
                maxLength={240}
                value={draft.en}
                aria-invalid={errors[form.id] && !draft.en.trim() ? true : undefined}
                aria-describedby={errors[form.id] ? errorId : undefined}
                onChange={(event) => {
                  update('en', event.target.value);
                  fitHeight(event.currentTarget);
                }}
              />
              <label className="sr-only" htmlFor={`subtitle-${form.id}-zh`}>Chinese sentence under the title</label>
              <textarea
                ref={zhRef}
                id={`subtitle-${form.id}-zh`}
                className="wording-line"
                lang="zh-Hant-HK"
                rows={1}
                maxLength={240}
                value={draft.zh}
                aria-invalid={errors[form.id] && !draft.zh.trim() ? true : undefined}
                aria-describedby={errors[form.id] ? errorId : undefined}
                onChange={(event) => {
                  update('zh', event.target.value);
                  fitHeight(event.currentTarget);
                }}
              />
            </div>
            {errors[form.id] && <p id={errorId} className="field__error">{errors[form.id]}</p>}
          </div>
          <div className="form-card__body">
            <div inert aria-hidden="true">
              <PreviewFields type={form.id} part="before" />
            </div>
            {form.id === 'vendor' && (
              <PurposeEditor
                items={purposeDraft}
                error={purposeError}
                onChange={(items) => {
                  setPurposeDraft(items);
                  setPurposeError('');
                  setNotice('');
                }}
              />
            )}
            <div inert aria-hidden="true">
              <PreviewFields type={form.id} part="after" />
            </div>
          </div>
        </section>
        <div className="wording-actions">
          <button type="button" className="btn btn-primary btn-small" id="save-subtitle" onClick={save} disabled={!changed}>
            Save
          </button>
          <button type="button" className="btn btn-outline btn-small" id="reset-subtitle" onClick={reset} disabled={!notDefault}>
            Restore original
          </button>
        </div>
        <p className="wording-status" role="status" aria-live="polite">{notice}</p>
      </div>

      <section className="wording-extra" aria-labelledby="tea-wording-heading">
        <h2 id="tea-wording-heading" className="wording-extra__title">Tea order page</h2>
        <p className="wording-extra__lead">Sentence under the room name. Both languages are required.</p>
        <div className="wording-subtitle">
          <label className="field__label field__label--compact" htmlFor="tea-prompt-en">English</label>
          <textarea
            ref={teaEnRef}
            id="tea-prompt-en"
            className="wording-line"
            rows={1}
            maxLength={240}
            value={teaDraft.en}
            aria-invalid={teaError && !teaDraft.en.trim() ? true : undefined}
            aria-describedby={teaError ? 'tea-prompt-error' : undefined}
            onChange={(event) => {
              setTeaDraft((prev) => ({ ...prev, en: event.target.value }));
              setTeaError('');
              setTeaNotice('');
              fitHeight(event.currentTarget);
            }}
          />
          <label className="field__label field__label--compact" htmlFor="tea-prompt-zh" lang="zh-Hant-HK">中文</label>
          <textarea
            ref={teaZhRef}
            id="tea-prompt-zh"
            className="wording-line"
            lang="zh-Hant-HK"
            rows={1}
            maxLength={240}
            value={teaDraft.zh}
            aria-invalid={teaError && !teaDraft.zh.trim() ? true : undefined}
            aria-describedby={teaError ? 'tea-prompt-error' : undefined}
            onChange={(event) => {
              setTeaDraft((prev) => ({ ...prev, zh: event.target.value }));
              setTeaError('');
              setTeaNotice('');
              fitHeight(event.currentTarget);
            }}
          />
        </div>
        {teaError && <p id="tea-prompt-error" className="field__error">{teaError}</p>}
        <div className="wording-extra__actions">
          <button
            type="button"
            className="btn btn-primary btn-small"
            id="save-tea-prompt"
            disabled={teaDraft.en === storedTea.en && teaDraft.zh === storedTea.zh}
            onClick={() => {
              const en = teaDraft.en.trim();
              const zh = teaDraft.zh.trim();
              if (!en || !zh) {
                setTeaError('Enter both the English sentence and the Chinese sentence.');
                (en ? teaZhRef : teaEnRef).current?.focus();
                return;
              }
              saveTeaPrompt({ en, zh });
              setTeaDraft({ en, zh });
              setTeaNotice('Saved the sentence on the tea order page.');
            }}
          >
            Save
          </button>
          <button
            type="button"
            className="btn btn-outline btn-small"
            id="reset-tea-prompt"
            disabled={storedTea.en === DEFAULT_TEA_PROMPT.en && storedTea.zh === DEFAULT_TEA_PROMPT.zh && teaDraft.en === DEFAULT_TEA_PROMPT.en && teaDraft.zh === DEFAULT_TEA_PROMPT.zh}
            onClick={() => {
              resetTeaPrompt();
              setTeaDraft({ ...DEFAULT_TEA_PROMPT });
              setTeaError('');
              setTeaNotice('Restored the original tea order sentence.');
            }}
          >
            Restore original
          </button>
        </div>
        <p className="wording-status" role="status" aria-live="polite">{teaNotice}</p>
      </section>
    </div>
  );
}

function LogoEditor({
  logo, error, notice, onError, onNotice,
}: {
  logo: string;
  error: string;
  notice: string;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onError('Choose an image file.');
      onNotice('');
      return;
    }
    if (file.size > 400_000) {
      onError('Choose an image under 400 KB.');
      onNotice('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!saveSiteLogo(result)) {
        onError('Could not read that image.');
        onNotice('');
        return;
      }
      onError('');
      onNotice('Saved the logo. It is shown on the public pages, sign-in page and staff portal.');
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="wording-extra" aria-labelledby="logo-heading">
      <h2 id="logo-heading" className="wording-extra__title">Official logo</h2>
      <p className="wording-extra__lead">Shown larger on the public pages, the sign-in page and the staff portal. Super admin can replace it.</p>
      <img className="brand-logo" src={logo} alt="Current ASL logo" id="site-logo-preview" />
      <div className="wording-extra__actions">
        <label className="btn btn-outline btn-small" htmlFor="site-logo-file">Replace logo</label>
        <input
          ref={inputRef}
          id="site-logo-file"
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'site-logo-error' : undefined}
          onChange={(event) => {
            onFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          className="btn btn-outline btn-small"
          id="reset-site-logo"
          onClick={() => {
            resetSiteLogo();
            onError('');
            onNotice('Restored the original ASL logo.');
          }}
        >
          Restore original logo
        </button>
      </div>
      {error && <p id="site-logo-error" className="field__error" role="alert">{error}</p>}
      <p className="wording-status" role="status" aria-live="polite">{notice}</p>
    </section>
  );
}

function samePurposes(a: PurposeOption[], b: PurposeOption[]) {
  return a.length === b.length && a.every((item, index) => (
    item.id === b[index].id && item.en === b[index].en && item.zh === b[index].zh && !!item.specify === !!b[index].specify
  ));
}

function PurposeEditor({
  items, error, onChange,
}: {
  items: PurposeOption[];
  error: string;
  onChange: (items: PurposeOption[]) => void;
}) {
  const add = () => {
    const id = `work-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    onChange([...items, { id, en: '', zh: '' }]);
    window.setTimeout(() => document.getElementById(`purpose-item-${id}-en`)?.focus(), 0);
  };

  return (
    <fieldset className="purpose-editor" aria-describedby={error ? 'purpose-list-error' : undefined}>
      <legend className="field__label">
        <Bi en="Purpose of work" zh="到訪目的" />
        <span className="req" aria-hidden="true">*</span>
      </legend>
      <select className="input" id="purpose-preview" aria-label="Preview of the work list" defaultValue="">
        <option value="">Select the work 請選擇工作</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>{[item.en, item.zh].filter(Boolean).join(' ') || 'New work type'}</option>
        ))}
      </select>
      <div className="purpose-list">
        {items.map((item, index) => (
          <div key={item.id} className="purpose-item">
            <div className="field">
              <label className="field__label field__label--compact" htmlFor={`purpose-item-${item.id}-en`}>{`Work type ${index + 1} English`}</label>
              <input
                id={`purpose-item-${item.id}-en`}
                className="input"
                maxLength={80}
                value={item.en}
                onChange={(event) => onChange(items.map((row) => (row.id === item.id ? { ...row, en: event.target.value } : row)))}
              />
            </div>
            <div className="field">
              <label className="field__label field__label--compact" htmlFor={`purpose-item-${item.id}-zh`} lang="zh-Hant-HK">{`工作類型 ${index + 1} 中文`}</label>
              <input
                id={`purpose-item-${item.id}-zh`}
                className="input"
                lang="zh-Hant-HK"
                maxLength={80}
                value={item.zh}
                onChange={(event) => onChange(items.map((row) => (row.id === item.id ? { ...row, zh: event.target.value } : row)))}
              />
            </div>
            <button
              type="button"
              className="btn btn-outline btn-small purpose-item__remove"
              onClick={() => onChange(items.filter((row) => row.id !== item.id))}
              disabled={items.length === 1}
              aria-label={`Remove work type ${index + 1}`}
            >
              Remove
            </button>
            <label className="purpose-item__specify" htmlFor={`purpose-item-${item.id}-specify`}>
              <input
                id={`purpose-item-${item.id}-specify`}
                className="check"
                type="checkbox"
                checked={item.specify === true}
                onChange={(event) => onChange(items.map((row) => (
                  row.id === item.id ? { ...row, specify: event.target.checked || undefined } : row
                )))}
              />
              Ask the visitor to specify
            </label>
          </div>
        ))}
      </div>
      {error && <p id="purpose-list-error" className="field__error">{error}</p>}
      <button type="button" className="btn btn-soft btn-small purpose-editor__add" id="add-purpose" onClick={add}>
        Add work type
      </button>
    </fieldset>
  );
}

function PreviewFields({ type, part }: { type: RegistrationType; part: 'before' | 'after' }) {
  const dateLabel = type === 'guest-prereg'
    ? { en: 'Planned visit date / time', zh: '預計到訪日期 / 時間' }
    : { en: 'Date / time', zh: '日期 / 時間' };
  const dateValue = type === 'guest-prereg' ? '' : '03 Nov 2026, 09:00';
  if (part === 'before') {
    return (
      <>
        <FakeField label={{ en: 'Company', zh: '公司' }} placeholder="Company name 公司名稱" required />
        <FakeField label={dateLabel} placeholder={type === 'guest-prereg' ? '' : undefined} value={dateValue} required={type === 'guest-prereg'} readOnly={type !== 'guest-prereg'} />
        <FakeField label={{ en: 'Host staff', zh: '受訪職員' }} placeholder="Staff name 職員姓名" required />
        {type !== 'guest-adhoc' && <FakeField label={{ en: 'Host staff contact number', zh: '受訪職員聯絡電話' }} placeholder="e.g. 9123 4567 例如 9123 4567" required />}
      </>
    );
  }
  return (
    <>
      {type === 'vendor' && <FakeField label={{ en: 'Destination floor', zh: '前往樓層' }} placeholder="e.g. 12/F 例如 12/F" />}
      <p className="field__label">
        <Bi en={type === 'vendor' ? 'Visitor details' : 'Visitor names'} zh={type === 'vendor' ? '訪客資料' : '訪客姓名'} />
        <span className="req" aria-hidden="true">*</span>
      </p>
      <FakeField label={{ en: 'Visitor 01', zh: '訪客 01' }} placeholder="Full name 姓名" required compact />
      <button type="button" className="btn btn-soft btn-block" disabled>+ Add visitor 新增訪客</button>
      <button type="button" className="btn btn-primary btn-block btn-submit" disabled>Submit registration 提交登記</button>
    </>
  );
}

function FakeField({
  label, placeholder, value = '', required, readOnly, compact,
}: {
  label: BilingualText;
  placeholder?: string;
  value?: string;
  required?: boolean;
  readOnly?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="field">
      <div className="field__label-row">
        <span className={compact ? 'field__label field__label--compact' : 'field__label'}>
          <Bi en={label.en} zh={label.zh} />
          {required && <span className="req" aria-hidden="true">*</span>}
        </span>
      </div>
      <input className={readOnly ? 'input input--locked' : 'input'} value={value} placeholder={placeholder} readOnly tabIndex={-1} />
    </div>
  );
}
