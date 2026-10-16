import { SITE_NAME } from '../data/catalog';
import type { Registration, Visitor } from '../data/types';
import { formatDate } from '../lib/date';

/** Label layout from the design preview. Physical size depends on the printer, which is not chosen yet. */
export function LabelPreview({ registration, visitor }: { registration: Registration; visitor: Visitor }) {
  const isVendor = registration.type === 'vendor';
  return (
    <figure className="label-figure" aria-labelledby="label-caption">
      <figcaption id="label-caption" className="sr-only">
        {`Label preview for ${visitor.name}`}
      </figcaption>
      <div className="badge-label">
        <div className="badge-label__head">
          <span className="badge-label__type">{isVendor ? 'Vendor' : 'Guest'}</span>
          <span className="badge-label__site">{SITE_NAME}</span>
        </div>
        <div className="badge-label__body">
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
      </div>
    </figure>
  );
}
