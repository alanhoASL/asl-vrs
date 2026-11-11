import type { Registration, Visitor } from '../data/types';
import { useSiteLogo } from '../data/siteLogo';
import { formatDate } from '../lib/date';

/**
 * Combined badge: a pre-printed colour shell (90 mm × 63 mm) with the
 * printed label (34 mm × 65 mm) in place. The printer outputs only the label.
 */
export function LabelPreview({ registration, visitor }: { registration: Registration; visitor: Visitor }) {
  const isVendor = registration.type === 'vendor';
  const role = isVendor ? 'CONTRACTOR' : 'VISITOR';
  const logo = useSiteLogo();
  return (
    <figure className="label-figure" id="label-preview" aria-labelledby="label-caption">
      <div className={`badge-shell badge-shell--${isVendor ? 'contractor' : 'visitor'}`}>
        <div className="badge-shell__bar" aria-hidden="true">
          <span className="badge-shell__slot" />
        </div>
        <div className="badge-label">
          <p className="badge-label__name">{visitor.name}</p>
          <p className="badge-label__company">{registration.company}</p>
          <dl className="badge-label__rows">
            {isVendor && registration.purpose && (
              <div>
                <dt>Work</dt>
                <dd>{registration.purpose}</dd>
              </div>
            )}
            {isVendor && registration.floor && (
              <div>
                <dt>Floor</dt>
                <dd>{registration.floor}</dd>
              </div>
            )}
            <div>
              <dt>Visit date</dt>
              <dd>{formatDate(new Date(registration.visitAt))}</dd>
            </div>
            <div>
              <dt>Host</dt>
              <dd>{registration.hostStaff}</dd>
            </div>
          </dl>
        </div>
        <div className="badge-shell__brand">
          <img
            className="badge-shell__logo"
            src={logo}
            alt="ASL"
          />
          <p className="badge-shell__role">{role}</p>
        </div>
      </div>
      <figcaption id="label-caption" className="label-figure__caption">
        Combined badge. Only the inner label (34 mm × 65 mm) is printed. The coloured band, ASL logo and role are pre-printed.
      </figcaption>
    </figure>
  );
}
