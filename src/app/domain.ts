import type { Order, Product, Status } from './store';
export const statuses: Status[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
export const transitions: Record<Status, Status[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};
export const normalize = (s: unknown) =>
  String(s ?? '')
    .replace(/[٠-٩۰-۹]/g, (c) => String(c.charCodeAt(0) - (c <= '٩' ? 1632 : 1776)))
    .replace('٫', '.')
    .trim();
export const uniqueSku = (products: Product[], sku: string, id?: string | null) =>
  !products.some((p) => p.id !== id && p.sku.trim().toLowerCase() === sku.trim().toLowerCase());
export function metrics(orders: Order[]) {
  const delivered = orders.filter((o) => o.status === 'delivered');
  const sales = delivered.reduce((a, o) => a + o.total, 0);
  return [
    sales,
    orders.length,
    delivered.length ? Math.round(sales / delivered.length) : 0,
    orders.filter((o) => o.status === 'pending').length,
  ];
}
export const statusColors: Record<Status, string> = {
  pending: '#b45309',
  processing: '#6d4ac1',
  shipped: '#2563b8',
  delivered: '#15803d',
  cancelled: '#b91c1c',
};
export function periodBounds(days: number, now: number, offset = 0) {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  end.setDate(end.getDate() - days * offset);
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { start: start.getTime(), end: end.getTime() };
}
export function ordersInPeriod(orders: Order[], days: number, now: number, offset = 0) {
  const { start, end } = periodBounds(days, now, offset);
  return orders.filter((o) => Date.parse(o.createdAt) >= start && Date.parse(o.createdAt) < end);
}
export function salesBuckets(orders: Order[], days: number, now: number) {
  const bounds = periodBounds(days, now),
    step = days === 90 ? 7 : 1;
  const buckets: { start: number; end: number; value: number }[] = [];
  for (let start = bounds.start; start < bounds.end;) {
    const next = new Date(start);
    next.setDate(next.getDate() + step);
    const end = Math.min(next.getTime(), bounds.end);
    buckets.push({
      start,
      end,
      value: orders
        .filter(
          (o) =>
            o.status === 'delivered' &&
            Date.parse(o.createdAt) >= start &&
            Date.parse(o.createdAt) < end,
        )
        .reduce((sum, o) => sum + o.total, 0),
    });
    start = end;
  }
  return buckets;
}
export function percentages(counts: number[]) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return counts.map(() => 0);
  const exact = counts.map((n) => (n / total) * 100),
    rounded = exact.map(Math.floor);
  const remaining = 100 - rounded.reduce((a, b) => a + b, 0);
  exact
    .map((n, i) => ({ i, remainder: n - rounded[i] }))
    .sort((a, b) => b.remainder - a.remainder || a.i - b.i)
    .slice(0, remaining)
    .forEach((x) => rounded[x.i]++);
  return rounded;
}
export function relativeChange(current: number, previous: number) {
  return previous === 0 ? null : (current - previous) / previous;
}
const dateKey = (s: string) => {
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export function filterRows(
  rows: any[],
  q: Record<string, string>,
  products: boolean,
  lang: 'ar' | 'en',
) {
  const search = (q['q'] || '').toLowerCase().trim();
  const result = rows.filter((r) =>
    products
      ? (!search || [r.name.ar, r.name.en, r.sku].some((x) => x.toLowerCase().includes(search))) &&
        (!q['category'] || String(r.categoryId) === q['category']) &&
        (!q['active'] || String(r.active) === q['active']) &&
        (!q['stock'] ||
          (q['stock'] === 'out'
            ? r.stock === 0
            : q['stock'] === 'low'
              ? r.stock > 0 && r.stock <= r.lowStockThreshold
              : r.stock > 0))
      : (!search ||
          [r.orderNumber, r.customer.name, r.customer.email].some((x) =>
            x.toLowerCase().includes(search),
          )) &&
        (!q['status'] || r.status === q['status']) &&
        (!q['from'] || dateKey(r.createdAt) >= q['from']) &&
        (!q['to'] || dateKey(r.createdAt) <= q['to']),
  );
  const key = q['sort'] || (products ? 'name' : 'createdAt'),
    dir = q['dir'] === 'asc' ? 1 : -1;
  const val = (x: any) =>
    key === 'name'
      ? x.name[lang]
      : key === 'customer'
        ? x.customer.name
        : key === 'items'
          ? x.items.reduce((a: number, i: any) => a + i.quantity, 0)
          : x[key];
  return result.sort((a, b) =>
    typeof val(a) === 'number'
      ? (val(a) - val(b)) * dir
      : String(val(a)).localeCompare(String(val(b))) * dir,
  );
}
export function validData(d: any): boolean {
  const text = (s: any) => typeof s === 'string';
  const date = (s: any) => text(s) && Number.isFinite(Date.parse(s));
  const amount = (n: any) => Number.isSafeInteger(n) && n >= 0;
  const bilingual = (n: any) => n && text(n.ar) && text(n.en);
  const distinct = (a: any[], key: string) => new Set(a.map((x) => x[key])).size === a.length;
  if (
    !d ||
    d.version !== 1 ||
    !date(d.seedDate) ||
    !Array.isArray(d.products) ||
    !Array.isArray(d.orders)
  )
    return false;
  if (
    !d.products.every(
      (p: any) =>
        p &&
        text(p.id) &&
        p.id &&
        text(p.sku) &&
        p.sku.trim() &&
        bilingual(p.name) &&
        p.name.ar.trim().length >= 2 &&
        p.name.en.trim().length >= 2 &&
        p.name.ar.length <= 100 &&
        p.name.en.length <= 100 &&
        bilingual(p.description) &&
        p.description.ar.length <= 1000 &&
        p.description.en.length <= 1000 &&
        amount(p.price) &&
        p.price > 0 &&
        amount(p.stock) &&
        amount(p.lowStockThreshold) &&
        typeof p.active === 'boolean' &&
        Number.isInteger(p.categoryId) &&
        p.categoryId >= 0 &&
        p.categoryId < 5 &&
        text(p.imageUrl) &&
        date(p.createdAt) &&
        date(p.updatedAt),
    )
  )
    return false;
  if (
    !distinct(d.products, 'id') ||
    new Set(d.products.map((p: any) => p.sku.toLowerCase())).size !== d.products.length
  )
    return false;
  if (
    !d.orders.every(
      (o: any) =>
        o &&
        text(o.id) &&
        text(o.orderNumber) &&
        o.customer &&
        text(o.customer.name) &&
        text(o.customer.email) &&
        text(o.address) &&
        ['card', 'cash'].includes(o.paymentMethod) &&
        statuses.includes(o.status) &&
        date(o.createdAt) &&
        date(o.updatedAt) &&
        Array.isArray(o.statusHistory) &&
        o.statusHistory.length > 0 &&
        o.statusHistory.every(
          (h: any, i: number) =>
            h &&
            date(h.at) &&
            statuses.includes(h.to) &&
            (i === 0
              ? h.from === null
              : h.from === o.statusHistory[i - 1].to &&
                transitions[h.from as Status]?.includes(h.to)),
        ) &&
        o.statusHistory.at(-1).to === o.status &&
        Array.isArray(o.items) &&
        o.items.length > 0 &&
        o.items.every(
          (x: any) =>
            x &&
            text(x.productId) &&
            text(x.sku) &&
            bilingual(x.name) &&
            amount(x.unitPrice) &&
            x.unitPrice > 0 &&
            amount(x.quantity) &&
            x.quantity > 0,
        ) &&
        amount(o.subtotal) &&
        amount(o.shipping) &&
        amount(o.discount) &&
        amount(o.total) &&
        o.subtotal === o.items.reduce((a: number, x: any) => a + x.unitPrice * x.quantity, 0) &&
        o.total === o.subtotal + o.shipping - o.discount,
    )
  )
    return false;
  return distinct(d.orders, 'id') && distinct(d.orders, 'orderNumber');
}
