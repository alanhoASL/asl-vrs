import { useEffect, useRef, useState } from 'react';
import { Bi } from '../../components/Bi';
import { DEFAULT_FORM_SUBTITLES, DEFAULT_PURPOSES, resetFormSubtitle, resetPurposeOptions, saveFormSubtitle, savePurposeOptions, useFormSubtitles, usePurposeOptions, type BilingualText, type PurposeOption } from '../../data/formCopy';
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
    name: 'Guest ad hoc registration',
    eyebrow: { en: 'Guest', zh: '訪客' },
    title: { en: 'Ad hoc registration', zh: '即場登記' },
  },
  {
    id: 'vendor',
    theme: 'vendor',
    name: 'Vendor / contractor',
    eyebrow: { en: 'Vendor / Contractor', zh: '供應商 / 承辦商' },
    title: { en: 'On site registration', zh: '現場登記' },
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
  const [selected, setSelected] = useState<RegistrationType>('guest-prereg');
  const [drafts, setDrafts] = useState(stored);
  const [purposeDraft, setPurposeDraft] = useState(storedPurposes);
  const [errors, setErrors] = useState<Partial<Record<RegistrationType, string>>>({});
  const [purposeError, setPurposeError] = useState('');
  const [notice, setNotice] = useState('');
  const enRef = useRef<HTMLTextAreaElement>(null);
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
          This is the registration form. Click the sentence under the title and edit it here. Save to update the public form.
        </p>
      </div>

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
    </div>
  );
}

function samePurposes(a: PurposeOption[], b: PurposeOption[]) {
  return a.length === b.length && a.every((item, index) => item.id === b[index].id && item.en === b[index].en && item.zh === b[index].zh);
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
        <Bi en="Purpose / work" zh="到訪目的 / 工作內容" />
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
    ? { en: 'Planned date / time', zh: '預計到訪日期 / 時間' }
    : { en: 'Date / time', zh: '日期 / 時間' };
  const dateValue = type === 'guest-prereg' ? '' : '03 Nov 2026, 09:00';
  if (part === 'before') {
    return (
      <>
        <FakeField label={{ en: 'Company', zh: '公司' }} placeholder="Company name 公司名稱" required />
        <FakeField label={dateLabel} placeholder={type === 'guest-prereg' ? '' : undefined} value={dateValue} required={type === 'guest-prereg'} readOnly={type !== 'guest-prereg'} />
        <FakeField label={{ en: 'Host staff', zh: '受訪職員' }} placeholder="Staff name 職員姓名" required />
        <FakeField label={{ en: 'Host staff contact number', zh: '受訪職員聯絡電話' }} placeholder="e.g. 9123 4567 例如 9123 4567" required />
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
