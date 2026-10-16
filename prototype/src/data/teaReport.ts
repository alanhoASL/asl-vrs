import { DRINKS, ROOMS } from './catalog';
import type { TeaOrder } from './types';
import { addDays, formatTime, startOfDay, toDayKey } from '../lib/date';

export interface RoomRow {
  roomName: string;
  orders: number;
  items: number;
}

export interface DrinkRow {
  drinkName: string;
  optionName: string;
  quantity: number;
  orders: number;
}

export interface DayRow {
  date: string;
  orders: number;
  items: number;
}

export interface TeaSummary {
  totalOrders: number;
  totalItems: number;
  byRoom: RoomRow[];
  byDrink: DrinkRow[];
  byDay: DayRow[];
}

/** Orders placed from the start of `from` to the end of `to`, both local dates. */
export function ordersInRange(orders: TeaOrder[], from: Date, to: Date): TeaOrder[] {
  const start = startOfDay(from).getTime();
  const end = addDays(startOfDay(to), 1).getTime();
  return orders
    .filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= start && t < end;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

const itemCount = (o: TeaOrder) => o.lines.reduce((sum, l) => sum + l.quantity, 0);

export function summarize(orders: TeaOrder[]): TeaSummary {
  // Start from the full room list and menu so unused rooms and drinks show as zero.
  const rooms = new Map<string, RoomRow>(ROOMS.map((r) => [r.name, { roomName: r.name, orders: 0, items: 0 }]));
  const drinks = new Map<string, DrinkRow>();
  for (const d of DRINKS) {
    for (const o of d.options ?? [undefined]) {
      drinks.set(`${d.name}|${o?.name ?? ''}`, { drinkName: d.name, optionName: o?.name ?? '', quantity: 0, orders: 0 });
    }
  }
  const days = new Map<string, DayRow>();

  for (const order of orders) {
    const room = rooms.get(order.roomName) ?? { roomName: order.roomName, orders: 0, items: 0 };
    room.orders += 1;
    room.items += itemCount(order);
    rooms.set(order.roomName, room);

    for (const line of order.lines) {
      const key = `${line.drinkName}|${line.optionName ?? ''}`;
      const row = drinks.get(key) ?? { drinkName: line.drinkName, optionName: line.optionName ?? '', quantity: 0, orders: 0 };
      row.quantity += line.quantity;
      row.orders += 1;
      drinks.set(key, row);
    }

    const dayKey = toDayKey(new Date(order.createdAt));
    const day = days.get(dayKey) ?? { date: dayKey, orders: 0, items: 0 };
    day.orders += 1;
    day.items += itemCount(order);
    days.set(dayKey, day);
  }

  return {
    totalOrders: orders.length,
    totalItems: orders.reduce((sum, o) => sum + itemCount(o), 0),
    byRoom: [...rooms.values()].sort((a, b) => b.orders - a.orders || b.items - a.items || a.roomName.localeCompare(b.roomName)),
    byDrink: [...drinks.values()].sort((a, b) => b.quantity - a.quantity || a.drinkName.localeCompare(b.drinkName)),
    byDay: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/** Builds and downloads an .xlsx file; the library is only loaded when this runs. */
export async function downloadTeaReport(orders: TeaOrder[], from: Date, to: Date): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const summary = summarize(orders);
  const header = (labels: string[]) => labels.map((value) => ({ value, fontWeight: 'bold' as const }));

  const rawRows = orders.flatMap((o) => o.lines.map((l) => {
    const created = new Date(o.createdAt);
    return [o.id, toDayKey(created), formatTime(created), o.roomName, l.drinkName, l.optionName ?? '', l.quantity, o.note ?? ''];
  }));

  await writeXlsxFile([
    {
      sheet: 'Order lines',
      data: [header(['Order ID', 'Date', 'Time', 'Room', 'Drink', 'Option', 'Quantity', 'Note']), ...rawRows],
      columns: [{ width: 22 }, { width: 12 }, { width: 8 }, { width: 22 }, { width: 24 }, { width: 12 }, { width: 10 }, { width: 40 }],
      stickyRowsCount: 1,
    },
    {
      sheet: 'By room',
      data: [header(['Room', 'Orders', 'Items']), ...summary.byRoom.map((r) => [r.roomName, r.orders, r.items])],
      columns: [{ width: 24 }, { width: 10 }, { width: 10 }],
      stickyRowsCount: 1,
    },
    {
      sheet: 'By drink',
      data: [header(['Drink', 'Option', 'Quantity', 'Orders']), ...summary.byDrink.map((d) => [d.drinkName, d.optionName, d.quantity, d.orders])],
      columns: [{ width: 24 }, { width: 12 }, { width: 10 }, { width: 10 }],
      stickyRowsCount: 1,
    },
    {
      sheet: 'By day',
      data: [header(['Date', 'Orders', 'Items']), ...summary.byDay.map((d) => [d.date, d.orders, d.items])],
      columns: [{ width: 12 }, { width: 10 }, { width: 10 }],
      stickyRowsCount: 1,
    },
  ]).toFile(`tea-service_${toDayKey(from)}_to_${toDayKey(to)}.xlsx`);
}
