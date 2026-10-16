import { OFFICE_HOURS } from '../../data/catalog';
import type { Registration } from '../../data/types';

/** Office hours as hour rows, stretched to include any registration outside them. */
export function hourRange(registrations: Registration[]): number[] {
  let min = Math.floor(OFFICE_HOURS.start / 60);
  let max = Math.floor((OFFICE_HOURS.end - 1) / 60);
  for (const r of registrations) {
    const h = new Date(r.visitAt).getHours();
    if (h < min) min = h;
    if (h > max) max = h;
  }
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

export const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;
