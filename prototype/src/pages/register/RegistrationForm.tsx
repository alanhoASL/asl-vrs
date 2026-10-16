import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PublicPage } from '../../components/PublicPage';
import { TextField } from '../../components/TextField';
import { ErrorSummary, type FieldError } from '../../components/ErrorSummary';
import { Bi } from '../../components/Bi';
import { MAX_VISITORS, OFFICE_HOURS } from '../../data/catalog';
import { submitRegistration } from '../../data/store';
import type { RegistrationType } from '../../data/types';
import { formatDateTime, minutesOfDay, minutesToTime, toDateTimeLocalValue } from '../../lib/date';
import { useNow } from '../../lib/hooks';

interface Text {
  en: string;
  zh: string;
}

const VARIANTS: Record<RegistrationType, {
  theme: 'prereg' | 'adhoc' | 'vendor';
  eyebrow: Text;
  title: Text;
  subtitle: Text;
  successText: Text;
}> = {
  'guest-prereg': {
    theme: 'prereg',
    eyebrow: { en: 'Guest', zh: '訪客' },
    title: { en: 'Pre-registration', zh: '預先登記' },
    subtitle: { en: 'Plan your visit before arriving.', zh: '請於到訪前預先登記。' },
    successText: {
      en: 'Your visit has been registered.',
      zh: '您的到訪已登記。',
    },
  },
  'guest-adhoc': {
    theme: 'adhoc',
    eyebrow: { en: 'Guest', zh: '訪客' },
    title: { en: 'Ad hoc registration', zh: '即場登記' },
    subtitle: { en: 'Register when you arrive at reception.', zh: '抵達接待處時登記。' },
    successText: {
      en: 'Your registration has been sent. Please show your identification to reception staff.',
      zh: '您的登記已提交。請向接待處職員出示身份證明文件。',
    },
  },
  vendor: {
    theme: 'vendor',
    eyebrow: { en: 'Vendor / Contractor', zh: '供應商 / 承辦商' },
    title: { en: 'On site registration', zh: '現場登記' },
    subtitle: { en: 'Reception will complete the visit details.', zh: '接待處職員將補充到訪資料。' },
    successText: {
      en: 'Your registration has been sent. Please show your identification to reception staff.',
      zh: '您的登記已提交。請向接待處職員出示身份證明文件。',
    },
  },
};

interface VisitorRow {
  key: string;
  name: string;
  idFirst4: string;
}

let rowCounter = 0;
const newRow = (): VisitorRow => {
  rowCounter += 1;
  return { key: `v${rowCounter}`, name: '', idFirst4: '' };
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const officeStart = minutesToTime(OFFICE_HOURS.start);
const officeEnd = minutesToTime(OFFICE_HOURS.end);

export function RegistrationForm({ variant }: { variant: RegistrationType }) {
  const config = VARIANTS[variant];
  const isPrereg = variant === 'guest-prereg';
  const isVendor = variant === 'vendor';
  const now = useNow(15000);

  const [company, setCompany] = useState('');
  const [plannedAt, setPlannedAt] = useState('');
  const [hostStaff, setHostStaff] = useState('');
  const [purpose, setPurpose] = useState('');
  const [floor, setFloor] = useState('');
  const [visitors, setVisitors] = useState<VisitorRow[]>(() => [newRow()]);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!focusId) return;
    document.getElementById(focusId)?.focus();
    setFocusId(null);
  }, [focusId]);

  useEffect(() => {
    if (submitted) successHeadingRef.current?.focus();
  }, [submitted]);

  const errorFor = (id: string) => errors.find((e) => e.id === id)?.message;
  const clearError = (id: string) => setErrors((prev) => (prev.some((e) => e.id === id) ? prev.filter((e) => e.id !== id) : prev));

  const nameId = (row: VisitorRow) => `visitor-${row.key}-name`;
  const idFirst4Id = (row: VisitorRow) => `visitor-${row.key}-id`;

  const updateVisitor = (key: string, patch: Partial<VisitorRow>) => {
    setVisitors((prev) => prev.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  };

  const addVisitor = () => {
    const row = newRow();
    setVisitors((prev) => [...prev, row]);
    setFocusId(nameId(row));
  };

  const removeVisitor = (index: number) => {
    const removed = visitors[index];
    setVisitors((prev) => prev.filter((v) => v.key !== removed.key));
    setErrors((prev) => prev.filter((e) => e.id !== nameId(removed) && e.id !== idFirst4Id(removed)));
    setFocusId(nameId(visitors[index - 1]));
  };

  const validate = (): FieldError[] => {
    const list: FieldError[] = [];
    if (!company.trim()) {
      list.push({ id: 'company', message: <Bi en="Enter the company name." zh="請輸入公司名稱。" /> });
    }
    if (isPrereg) {
      const planned = new Date(plannedAt);
      if (!plannedAt || Number.isNaN(planned.getTime())) {
        list.push({ id: 'planned-at', message: <Bi en="Enter the planned date and time of your visit." zh="請輸入預計到訪日期及時間。" /> });
      } else if (planned.getTime() < Date.now() - 60000) {
        list.push({ id: 'planned-at', message: <Bi en="The planned date and time cannot be in the past." zh="預計到訪日期及時間不可早於現在。" /> });
      } else if (minutesOfDay(planned) < OFFICE_HOURS.start || minutesOfDay(planned) > OFFICE_HOURS.end) {
        list.push({ id: 'planned-at', message: <Bi en={`Choose a time between ${officeStart} and ${officeEnd}.`} zh={`請選擇 ${officeStart} 至 ${officeEnd} 之間的時間。`} /> });
      }
    }
    if (!hostStaff.trim()) {
      list.push({ id: 'host-staff', message: <Bi en="Enter the name of the staff member you are visiting." zh="請輸入受訪職員姓名。" /> });
    }
    if (isVendor && !purpose.trim()) {
      list.push({ id: 'purpose', message: <Bi en="Enter a brief description of the work." zh="請簡述工作內容。" /> });
    }
    visitors.forEach((v, i) => {
      const n = pad2(i + 1);
      if (!v.name.trim()) {
        list.push({ id: nameId(v), message: <Bi en={`Visitor ${n}: enter the full name.`} zh={`訪客 ${n}：請輸入姓名。`} /> });
      }
      if (isVendor) {
        if (!v.idFirst4.trim()) {
          list.push({
            id: idFirst4Id(v),
            message: <Bi en={`Visitor ${n}: enter the first 4 characters of the HKID or staff card.`} zh={`訪客 ${n}：請輸入香港身份證或職員證頭4位。`} />,
          });
        } else if (!/^[A-Za-z0-9]{4}$/.test(v.idFirst4.trim())) {
          list.push({
            id: idFirst4Id(v),
            message: <Bi en={`Visitor ${n}: use exactly 4 letters or digits, for example A123.`} zh={`訪客 ${n}：請輸入4個英文字母或數字，例如 A123。`} />,
          });
        }
      }
    });
    return list;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (found.length > 0) {
      setFocusId(found[0].id);
      return;
    }
    submitRegistration({
      type: variant,
      company: company.trim(),
      hostStaff: hostStaff.trim(),
      plannedAt: isPrereg ? new Date(plannedAt) : undefined,
      purpose: isVendor ? purpose.trim() : undefined,
      floor: isVendor ? floor.trim() || undefined : undefined,
      visitors: visitors.map((v) => ({
        name: v.name.trim(),
        idFirst4: isVendor ? v.idFirst4.trim().toUpperCase() : undefined,
      })),
    });
    setSubmitted(true);
  };

  const removeButton = (index: number) => (
    <button
      type="button"
      className="link-button link-button--muted"
      onClick={() => removeVisitor(index)}
      aria-label={`Remove visitor ${pad2(index + 1)} 移除訪客 ${pad2(index + 1)}`}
    >
      <span aria-hidden="true">&times;</span> <Bi en="Remove" zh="移除" />
    </button>
  );

  const addVisitorButton = visitors.length < MAX_VISITORS && (
    <button type="button" className="btn btn-soft btn-block" onClick={addVisitor} id="add-visitor">
      <span aria-hidden="true">+</span> <Bi en="Add visitor" zh="新增訪客" />
    </button>
  );

  const errorTitle = errors.length === 1
    ? <Bi en="Please fix 1 problem" zh="請修正 1 項問題" />
    : <Bi en={`Please fix ${errors.length} problems`} zh={`請修正 ${errors.length} 項問題`} />;

  return (
    <PublicPage
      theme={config.theme}
      eyebrow={<Bi en={config.eyebrow.en} zh={config.eyebrow.zh} />}
      title={<Bi en={config.title.en} zh={config.title.zh} stack />}
      subtitle={<Bi en={config.subtitle.en} zh={config.subtitle.zh} stack />}
      documentTitle={`${config.title.en} ${config.title.zh}`}
      headerLabel={<Bi en="Visitor registration" zh="訪客登記" />}
      skipLinkLabel={<Bi en="Skip to main content" zh="跳至主要內容" />}
      footnote={!submitted && (
        <p>
          <span className="req" aria-hidden="true">*</span> <Bi en="Mandatory field." zh="必填欄位。" />
        </p>
      )}
    >
      {submitted ? (
        <div className="success-view">
          <div className="success-view__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <h2 ref={successHeadingRef} tabIndex={-1} className="success-view__title">
            <Bi en="Registration submitted" zh="登記已提交" stack />
          </h2>
          <p className="success-view__text">
            <Bi en={config.successText.en} zh={config.successText.zh} stack />
          </p>
        </div>
      ) : (
        <form noValidate onSubmit={handleSubmit} aria-labelledby="page-title" id={`form-${variant}`}>
          <ErrorSummary errors={errors} title={errorTitle} />

          <TextField
            id="company"
            label={<Bi en="Company" zh="公司" />}
            required
            value={company}
            onChange={(v) => { setCompany(v); clearError('company'); }}
            placeholder="Company name 公司名稱"
            autoComplete="organization"
            maxLength={100}
            error={errorFor('company')}
          />

          {isPrereg ? (
            <TextField
              id="planned-at"
              label={<Bi en="Planned date / time" zh="預計到訪日期 / 時間" />}
              type="datetime-local"
              required
              value={plannedAt}
              min={toDateTimeLocalValue(now)}
              onChange={(v) => { setPlannedAt(v); clearError('planned-at'); }}
              hint={<Bi en={`Office hours ${officeStart} - ${officeEnd}`} zh={`辦公時間 ${officeStart} 至 ${officeEnd}`} />}
              error={errorFor('planned-at')}
            />
          ) : (
            <TextField
              id="auto-datetime"
              label={<Bi en="Date / time" zh="日期 / 時間" />}
              value={formatDateTime(now)}
              readOnly
              hint={<Bi en="Generated on registration; read-only." zh="登記時自動產生，不可更改。" />}
              labelAside={<span className="auto-badge" aria-hidden="true">Auto 自動</span>}
            />
          )}

          <TextField
            id="host-staff"
            label={<Bi en="Host staff" zh="受訪職員" />}
            required
            value={hostStaff}
            onChange={(v) => { setHostStaff(v); clearError('host-staff'); }}
            placeholder="Staff name 職員姓名"
            maxLength={80}
            error={errorFor('host-staff')}
          />

          {isVendor && (
            <>
              <TextField
                id="purpose"
                label={<Bi en="Purpose / work" zh="到訪目的 / 工作內容" />}
                required
                value={purpose}
                onChange={(v) => { setPurpose(v); clearError('purpose'); }}
                placeholder="Brief work description 簡述工作內容"
                maxLength={120}
                error={errorFor('purpose')}
              />
              <TextField
                id="floor"
                label={<Bi en="Destination floor" zh="前往樓層" />}
                value={floor}
                onChange={setFloor}
                placeholder="e.g. 12/F 例如 12/F"
                maxLength={20}
                hint={<Bi en="Optional; reception may update if needed." zh="選填；接待處可按需要更新。" />}
              />
            </>
          )}

          {isVendor ? (
            <fieldset className="field-group" aria-describedby="visitor-details-hint">
              <legend className="field__label">
                <Bi en="Visitor details" zh="訪客資料" />
                <span className="req" aria-hidden="true">*</span>
                <span className="sr-only"> (at least one visitor required)</span>
              </legend>
              <p id="visitor-details-hint" className="sr-only">Enter each person who is visiting. 請輸入每位到訪人士的資料。</p>
              {visitors.map((v, i) => (
                <fieldset key={v.key} className="visitor-box">
                  <legend className="visitor-box__legend">
                    <Bi en={`Visitor ${pad2(i + 1)}`} zh={`訪客 ${pad2(i + 1)}`} />
                  </legend>
                  <TextField
                    id={nameId(v)}
                    label={<Bi en="Name" zh="姓名" />}
                    required
                    value={v.name}
                    onChange={(val) => { updateVisitor(v.key, { name: val }); clearError(nameId(v)); }}
                    placeholder="Full name 姓名"
                    autoComplete={i === 0 ? 'name' : 'off'}
                    maxLength={80}
                    error={errorFor(nameId(v))}
                    labelAside={i > 0 ? removeButton(i) : undefined}
                  />
                  <TextField
                    id={idFirst4Id(v)}
                    label={<Bi en="HKID / Staff card (first 4 digits)" zh="香港身份證 / 職員證（頭4位）" />}
                    required
                    value={v.idFirst4}
                    onChange={(val) => { updateVisitor(v.key, { idFirst4: val }); clearError(idFirst4Id(v)); }}
                    placeholder="First 4 digits 頭4位"
                    maxLength={4}
                    autoComplete="off"
                    autoCapitalize="characters"
                    error={errorFor(idFirst4Id(v))}
                  />
                </fieldset>
              ))}
              {addVisitorButton}
            </fieldset>
          ) : (
            <fieldset className="field-group">
              <legend className="field__label">
                <Bi en="Visitor names" zh="訪客姓名" />
                <span className="req" aria-hidden="true">*</span>
                <span className="sr-only"> (at least one visitor required)</span>
              </legend>
              {visitors.map((v, i) => (
                <TextField
                  key={v.key}
                  id={nameId(v)}
                  label={<Bi en={`Visitor ${pad2(i + 1)}`} zh={`訪客 ${pad2(i + 1)}`} />}
                  compact
                  required
                  value={v.name}
                  onChange={(val) => { updateVisitor(v.key, { name: val }); clearError(nameId(v)); }}
                  placeholder="Full name 姓名"
                  autoComplete={i === 0 ? 'name' : 'off'}
                  maxLength={80}
                  error={errorFor(nameId(v))}
                  labelAside={i > 0 ? removeButton(i) : undefined}
                />
              ))}
              {addVisitorButton}
            </fieldset>
          )}

          <button type="submit" className="btn btn-primary btn-block btn-submit" id="submit-registration">
            <Bi en="Submit registration" zh="提交登記" />
          </button>
        </form>
      )}
    </PublicPage>
  );
}
