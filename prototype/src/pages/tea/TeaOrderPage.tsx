import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { PublicPage } from '../../components/PublicPage';
import { ErrorSummary, type FieldError } from '../../components/ErrorSummary';
import { Bi } from '../../components/Bi';
import { DRINKS, ROOMS, TEA_SERVICE_HOURS, type Drink, type DrinkOption } from '../../data/catalog';
import { submitTeaOrder } from '../../data/store';
import { useDemoSettings } from '../../data/demoSettings';
import { minutesOfDay, minutesToTime } from '../../lib/date';
import { useNow } from '../../lib/hooks';

const MAX_QTY = 20;
const serviceStart = minutesToTime(TEA_SERVICE_HOURS.start);
const serviceEnd = minutesToTime(TEA_SERVICE_HOURS.end);

/** Prototype only: "?time=17:00" previews the page at another time of day. */
function parsePreviewTime(value: string | null): number | null {
  const m = value ? /^(\d{1,2}):(\d{2})$/.exec(value) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** One orderable line per drink, or per option when the drink has options. */
const LINES: { key: string; drink: Drink; option?: DrinkOption }[] = DRINKS.flatMap((d) => (d.options
  ? d.options.map((o) => ({ key: `${d.id}:${o.id}`, drink: d, option: o }))
  : [{ key: d.id, drink: d }]));

const inputIdFor = (key: string) => `qty-${key.replace(':', '-')}`;
const emptyQuantities = () => Object.fromEntries(LINES.map((l) => [l.key, 0])) as Record<string, number>;

const headerLabel = <Bi en="Visitor registration" zh="訪客登記" />;
const skipLinkLabel = <Bi en="Skip to main content" zh="跳至主要內容" />;
const eyebrow = <Bi en="Tea service" zh="茶水服務" />;

interface StepperProps {
  inputId: string;
  value: number;
  onChange: (value: number) => void;
  /** Used in the button names, e.g. "Increase Coffee, With milk". */
  name: { en: string; zh: string };
  labelledBy?: string;
  describedBy?: string;
  invalid: boolean;
  small?: boolean;
}

function Stepper({ inputId, value, onChange, name, labelledBy, describedBy, invalid, small }: StepperProps) {
  return (
    <div className={small ? 'stepper stepper--small' : 'stepper'} role="group" aria-label={`${name.en} ${name.zh} quantity 數量`}>
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
  const previewMinutes = parsePreviewTime(params.get('time'));
  const currentMinutes = previewMinutes ?? minutesOfDay(now);
  // A ?time= preview always applies the hours, so the closed page can be shown whatever the demo switch says.
  const applyHours = previewMinutes !== null || enforceTeaHours;
  const serviceOpen = !applyHours || (currentMinutes >= TEA_SERVICE_HOURS.start && currentMinutes < TEA_SERVICE_HOURS.end);

  const [quantities, setQuantities] = useState<Record<string, number>>(emptyQuantities);
  const [note, setNote] = useState('');
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
        headerLabel={headerLabel}
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
  const describedBy = (descId: string, hasDesc: boolean) => {
    const ids = [hasDesc ? descId : '', errors.length ? 'drinks-error' : ''].filter(Boolean);
    return ids.join(' ') || undefined;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (totalItems === 0) {
      const first = inputIdFor(LINES[0].key);
      setErrors([{ id: first, message: <Bi en="Choose at least one drink." zh="請最少選擇一款飲品。" /> }]);
      document.getElementById(first)?.focus();
      return;
    }
    submitTeaOrder({
      roomId: room.id,
      roomName: room.name,
      lines: LINES.filter((l) => quantities[l.key] > 0).map((l) => ({
        drinkId: l.drink.id,
        drinkName: l.drink.name,
        optionId: l.option?.id,
        optionName: l.option?.name,
        quantity: quantities[l.key],
      })),
      note: note.trim() || undefined,
    });
    setSent(true);
  };

  const reset = () => {
    setQuantities(emptyQuantities());
    setNote('');
    setErrors([]);
    setSent(false);
  };

  return (
    <PublicPage
      theme="tea"
      eyebrow={eyebrow}
      title={<Bi en={room.name} zh={room.nameZh} stack />}
      subtitle={serviceOpen || sent ? (
        <Bi
          en="Choose drinks for this room. Reception will arrange them with the pantry."
          zh="請為本會議室選擇飲品，接待處會安排茶水間準備。"
          stack
        />
      ) : (
        <Bi en={`Tea service hours ${serviceStart} - ${serviceEnd}`} zh={`茶水服務時間 ${serviceStart} 至 ${serviceEnd}`} stack />
      )}
      documentTitle={`${room.name} ${room.nameZh}`}
      headerLabel={headerLabel}
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
            <Bi en="Tea service is closed" zh="茶水服務現已暫停" stack />
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
            <ul className="drink-grid">
              {DRINKS.map((d) => {
                const drinkTotal = LINES.filter((l) => l.drink.id === d.id).reduce((sum, l) => sum + quantities[l.key], 0);
                const nameId = `drink-name-${d.id}`;
                const descId = `drink-desc-${d.id}`;
                const hasDesc = Boolean(d.description || d.descriptionZh);
                const singleInputId = inputIdFor(d.id);
                return (
                  <li key={d.id} className={`drink-card${drinkTotal > 0 ? ' drink-card--selected' : ''}`}>
                    <div className="drink-card__media">
                      <img src={d.image} alt="" width={480} height={360} loading="lazy" />
                      {drinkTotal > 0 && <span className="drink-card__badge" aria-hidden="true">{drinkTotal}</span>}
                    </div>
                    <div className="drink-card__body">
                      {d.options ? (
                        <p className="drink-card__name" id={nameId}><Bi en={d.name} zh={d.nameZh} stack /></p>
                      ) : (
                        <label htmlFor={singleInputId} className="drink-card__name" id={nameId}>
                          <Bi en={d.name} zh={d.nameZh} stack />
                        </label>
                      )}
                      {hasDesc && (
                        <span className="drink-card__desc" id={descId}>
                          <Bi en={d.description} zh={d.descriptionZh} stack />
                        </span>
                      )}
                      {d.options ? (
                        <ul className="drink-options" aria-labelledby={nameId}>
                          {d.options.map((o) => {
                            const key = `${d.id}:${o.id}`;
                            const inputId = inputIdFor(key);
                            const optionLabelId = `${inputId}-label`;
                            return (
                              <li key={o.id} className={`drink-option${quantities[key] > 0 ? ' drink-option--selected' : ''}`}>
                                <label htmlFor={inputId} id={optionLabelId} className="drink-option__label">
                                  <Bi en={o.name} zh={o.nameZh} />
                                </label>
                                <Stepper
                                  small
                                  inputId={inputId}
                                  value={quantities[key]}
                                  onChange={(v) => setQty(key, v)}
                                  name={{ en: `${d.name}, ${o.name}`, zh: `${d.nameZh}，${o.nameZh}` }}
                                  labelledBy={`${nameId} ${optionLabelId}`}
                                  describedBy={describedBy(descId, hasDesc)}
                                  invalid={errors.length > 0}
                                />
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <Stepper
                          inputId={singleInputId}
                          value={quantities[d.id]}
                          onChange={(v) => setQty(d.id, v)}
                          name={{ en: d.name, zh: d.nameZh }}
                          describedBy={describedBy(descId, hasDesc)}
                          invalid={errors.length > 0}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {errors.length > 0 && (
              <p id="drinks-error" className="field__error">
                <span className="sr-only">Error: </span>
                {errors[0].message}
              </p>
            )}
          </fieldset>

          <div className="field">
            <div className="field__label-row">
              <label htmlFor="tea-note" className="field__label">
                <Bi en="Note (optional)" zh="備註（選填）" />
              </label>
            </div>
            <textarea
              id="tea-note"
              className="input textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. less sugar 例如：少甜"
              maxLength={200}
              rows={3}
              aria-describedby="tea-note-hint"
            />
            <p id="tea-note-hint" className="field__hint">
              <Bi en="Up to 200 characters." zh="最多200字。" />
            </p>
          </div>

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
