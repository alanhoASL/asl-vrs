import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { PublicPage } from '../../components/PublicPage';
import { ErrorSummary, type FieldError } from '../../components/ErrorSummary';
import { Bi } from '../../components/Bi';
import { DRINK_CATEGORIES, DRINKS, ROOMS, TEA_SERVICE_HOURS_EN, TEA_SERVICE_HOURS_ZH, isTeaServiceOpen } from '../../data/catalog';
import { useTeaPrompt } from '../../data/formCopy';
import { submitTeaOrder } from '../../data/store';
import { useDemoSettings } from '../../data/demoSettings';
import { minutesOfDay } from '../../lib/date';
import { useNow } from '../../lib/hooks';

const MAX_QTY = 20;

/** Prototype only: "?time=17:00" previews the page at another time of day. */
function parsePreviewTime(value: string | null): number | null {
  const m = value ? /^(\d{1,2}):(\d{2})$/.exec(value) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

const inputIdFor = (id: string) => `qty-${id}`;
const emptyQuantities = () => Object.fromEntries(DRINKS.map((d) => [d.id, 0])) as Record<string, number>;

const skipLinkLabel = <Bi en="Skip to main content" zh="跳至主要內容" />;
const eyebrow = <Bi en="Tea Service" zh="茶水服務" />;

interface StepperProps {
  inputId: string;
  value: number;
  onChange: (value: number) => void;
  /** Used in the button names, e.g. "Increase Coffee, With milk". */
  name: { en: string; zh: string };
  labelledBy?: string;
  describedBy?: string;
  invalid: boolean;
}

function Stepper({ inputId, value, onChange, name, labelledBy, describedBy, invalid }: StepperProps) {
  return (
    <div className="stepper" role="group" aria-label={`${name.en} ${name.zh} quantity 數量`}>
      <button
        type="button"
        className="stepper__btn"
        onClick={() => onChange(value - 1)}
        disabled={value === 0}
        aria-label={`Decrease ${name.en} 減少${name.zh}`}
      >
        <span aria-hidden="true">&minus;</span>
      </button>
      <input
        id={inputId}
        className="stepper__input"
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_QTY}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
      />
      <button
        type="button"
        className="stepper__btn"
        onClick={() => onChange(value + 1)}
        disabled={value >= MAX_QTY}
        aria-label={`Increase ${name.en} 增加${name.zh}`}
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}

export function TeaOrderPage() {
  const { roomId } = useParams();
  const room = ROOMS.find((r) => r.id === roomId);
  const [params] = useSearchParams();
  const now = useNow(15000);
  const { enforceTeaHours } = useDemoSettings();
  const teaPrompt = useTeaPrompt();
  const previewMinutes = parsePreviewTime(params.get('time'));
  const currentMinutes = previewMinutes ?? minutesOfDay(now);
  // A ?time= preview always applies the hours, so the closed page can be shown whatever the demo switch says.
  const applyHours = previewMinutes !== null || enforceTeaHours;
  const serviceOpen = !applyHours || isTeaServiceOpen(currentMinutes, now);

  const [quantities, setQuantities] = useState<Record<string, number>>(emptyQuantities);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [sent, setSent] = useState(false);
  const sentHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (sent) sentHeadingRef.current?.focus();
  }, [sent]);

  if (!room) {
    return (
      <PublicPage
        theme="tea"
        eyebrow={eyebrow}
        title={<Bi en="Room not found" zh="找不到會議室" stack />}
        subtitle={<Bi en="This tea order link is not valid." zh="此訂購連結無效。" stack />}
        documentTitle="Room not found 找不到會議室"
        skipLinkLabel={skipLinkLabel}
      >
        <p><Bi en="Please ask reception for help." zh="請向接待處查詢。" stack /></p>
      </PublicPage>
    );
  }

  const setQty = (key: string, value: number) => {
    const clamped = Math.max(0, Math.min(MAX_QTY, Number.isFinite(value) ? Math.floor(value) : 0));
    setQuantities((prev) => ({ ...prev, [key]: clamped }));
    setErrors([]);
  };

  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);
  const describedBy = (descId: string) => [descId, errors.length ? 'drinks-error' : ''].filter(Boolean).join(' ');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (totalItems === 0) {
      const first = inputIdFor(DRINKS[0].id);
      setErrors([{ id: first, message: <Bi en="Choose at least one drink." zh="請最少選擇一款飲品。" /> }]);
      document.getElementById(first)?.focus();
      return;
    }
    submitTeaOrder({
      roomId: room.id,
      roomName: room.name,
      lines: DRINKS.filter((d) => quantities[d.id] > 0).map((d) => ({
        drinkId: d.id,
        drinkName: d.name,
        unit: d.unit,
        menuNote: d.note || undefined,
        quantity: quantities[d.id],
      })),
    });
    setSent(true);
  };

  const reset = () => {
    setQuantities(emptyQuantities());
    setErrors([]);
    setSent(false);
  };

  return (
    <PublicPage
      theme="tea"
      eyebrow={eyebrow}
      title={<Bi en={room.name} zh={room.nameZh} stack />}
      subtitle={serviceOpen || sent ? (
        <Bi en={teaPrompt.en} zh={teaPrompt.zh} stack />
      ) : (
        <Bi en={`Tea service hours ${TEA_SERVICE_HOURS_EN}`} zh={`茶水服務時間 ${TEA_SERVICE_HOURS_ZH}`} stack />
      )}
      documentTitle={`${room.name} ${room.nameZh}`}
      skipLinkLabel={skipLinkLabel}
    >
      {sent ? (
        <div className="success-view">
          <div className="success-view__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <h2 ref={sentHeadingRef} tabIndex={-1} className="success-view__title">
            <Bi en="Request sent" zh="要求已送出" stack />
          </h2>
          <p className="success-view__text">
            <Bi en={`Reception has received your order for ${room.name}.`} zh={`接待處已收到${room.nameZh}的訂單。`} stack />
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={reset} id="order-again">
            <Bi en="Place another order" zh="再次訂購" />
          </button>
        </div>
      ) : !serviceOpen ? (
        <div className="success-view success-view--closed" id="tea-closed">
          <div className="success-view__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <h2 className="success-view__title">
            <Bi en="Tea service is currently unavailable" zh="茶水服務供應時間已結束" stack />
          </h2>
          <p className="success-view__text">
            <Bi en="Please contact reception if you need help." zh="如需協助，請聯絡接待處。" stack />
          </p>
        </div>
      ) : (
        <form noValidate onSubmit={handleSubmit} id="tea-order-form" aria-labelledby="page-title">
          <ErrorSummary
            errors={errors}
            title={<Bi en="Please fix 1 problem" zh="請修正 1 項問題" />}
          />
          <fieldset className="field-group" aria-describedby="drinks-hint">
            <legend className="field__label">
              <Bi en="Drinks" zh="飲品" />
              <span className="req" aria-hidden="true">*</span>
              <span className="sr-only"> (choose at least one)</span>
            </legend>
            <p id="drinks-hint" className="field__hint">
              <Bi en="Set a quantity for each drink you want." zh="請為所需飲品設定數量。" />
            </p>
            {DRINK_CATEGORIES.map((cat) => {
              const headingId = `drink-category-${cat.id}`;
              const drinks = DRINKS.filter((d) => d.categoryId === cat.id);
              return (
                <section key={cat.id} className="drink-category" aria-labelledby={headingId}>
                  <h2 id={headingId} className="drink-category__title">
                    <Bi en={`${cat.code}) ${cat.name}`} zh={cat.nameZh} />
                  </h2>
                  <ul className="drink-grid">
                    {drinks.map((d) => {
                      const qty = quantities[d.id] ?? 0;
                      const nameId = `drink-name-${d.id}`;
                      const descId = `drink-desc-${d.id}`;
                      const inputId = inputIdFor(d.id);
                      const stepperName = {
                        en: d.note ? `${d.name}, ${d.unit}, ${d.note}` : `${d.name}, ${d.unit}`,
                        zh: d.note ? `${d.nameZh}，${d.unitZh}，${d.noteZh}` : `${d.nameZh}，${d.unitZh}`,
                      };
                      return (
                        <li key={d.id} className={`drink-card${qty > 0 ? ' drink-card--selected' : ''}`}>
                          <div className="drink-card__media">
                            <img src={d.image} alt="" width={480} height={360} loading="lazy" />
                            {d.id === 'warm-water' && (
                              <span className="drink-card__mark drink-card__mark--warm" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                  <path d="M7 20c1.6-1.4 1.6-2.6 0-4s-1.6-2.6 0-4 1.6-2.6 0-4 1.6-2.6 0-4" />
                                  <path d="M12 20c1.6-1.4 1.6-2.6 0-4s-1.6-2.6 0-4 1.6-2.6 0-4 1.6-2.6 0-4" />
                                  <path d="M17 20c1.6-1.4 1.6-2.6 0-4s-1.6-2.6 0-4 1.6-2.6 0-4 1.6-2.6 0-4" />
                                </svg>
                              </span>
                            )}
                            {qty > 0 && <span className="drink-card__badge" aria-hidden="true">{qty}</span>}
                          </div>
                          <div className="drink-card__body">
                            <label htmlFor={inputId} className="drink-card__name" id={nameId}>
                              <Bi en={d.name} zh={d.nameZh} stack />
                            </label>
                            <span className="drink-card__desc" id={descId}>
                              <span className="drink-card__unit"><Bi en={d.unit} zh={d.unitZh} /></span>
                              {d.note ? <span className="drink-card__note"><Bi en={d.note} zh={d.noteZh} /></span> : null}
                            </span>
                            <Stepper
                              inputId={inputId}
                              value={qty}
                              onChange={(v) => setQty(d.id, v)}
                              name={stepperName}
                              describedBy={describedBy(descId)}
                              invalid={errors.length > 0}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
            {errors.length > 0 && (
              <p id="drinks-error" className="field__error">
                <span className="sr-only">Error: </span>
                {errors[0].message}
              </p>
            )}
          </fieldset>

          <button type="submit" className="btn btn-primary btn-block btn-submit" id="send-tea-order">
            {totalItems > 0
              ? <Bi en={`Send request (${totalItems} ${totalItems === 1 ? 'item' : 'items'})`} zh={`送出要求（${totalItems} 項）`} />
              : <Bi en="Send request" zh="送出要求" />}
          </button>
        </form>
      )}
    </PublicPage>
  );
}
