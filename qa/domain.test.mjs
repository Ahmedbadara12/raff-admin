import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  transitions,
  normalize,
  uniqueSku,
  metrics,
  filterRows,
  validData,
} from '../src/app/domain.ts';
const p = {
  id: 'p1',
  sku: 'RF-01',
  name: { ar: 'منتج', en: 'Product' },
  categoryId: 0,
  price: 12345,
  stock: 3,
  lowStockThreshold: 5,
  active: true,
  imageUrl: '',
  description: { ar: '', en: '' },
  createdAt: '2026-10-31T10:00:00Z',
  updatedAt: '2026-10-31T10:00:00Z',
};
const makeOrder = (id, status = 'delivered') => ({
  id,
  orderNumber: 'RF-' + id,
  customer: { name: 'Demo', email: 'demo@example.test' },
  address: 'Fictional address',
  items: [{ productId: 'p1', sku: p.sku, name: { ...p.name }, unitPrice: p.price, quantity: 2 }],
  subtotal: 24690,
  shipping: 5000,
  discount: 2000,
  total: 27690,
  status,
  paymentMethod: 'cash',
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
  statusHistory: [{ from: null, to: status, at: p.createdAt }],
});
test('only permitted transitions are available; terminal states cannot change', () => {
  assert.deepEqual(transitions.pending, ['processing', 'cancelled']);
  assert.deepEqual(transitions.processing, ['shipped', 'cancelled']);
  assert.deepEqual(transitions.shipped, ['delivered']);
  assert.deepEqual(transitions.delivered, []);
  assert.deepEqual(transitions.cancelled, []);
});
test('metrics count all orders and only delivered revenue / average', () => {
  assert.deepEqual(
    metrics([makeOrder('1'), makeOrder('2', 'pending'), makeOrder('3', 'cancelled')]),
    [27690, 3, 27690, 1],
  );
  assert.deepEqual(metrics([]), [0, 0, 0, 0]);
});
test('Arabic and Persian numerals normalize without floating point money arithmetic', () => {
  assert.equal(normalize(' ١٢٣٫٤٥ '), '123.45');
  assert.equal(normalize('۱۲۳'), '123');
  assert.equal(Math.round(Number(normalize('١٢٣٫٤٥')) * 100), 12345);
});
test('SKU matching is case insensitive and excludes the edited product', () => {
  assert.equal(uniqueSku([p], ' rf-01 '), false);
  assert.equal(uniqueSku([p], 'rf-01', 'p1'), true);
  assert.equal(uniqueSku([p], 'NEW'), true);
});
test('combined filtering precedes numeric sort and pagination; low excludes zero', () => {
  const list = [
    p,
    { ...p, id: 'p2', price: 500, stock: 0 },
    { ...p, id: 'p3', price: 1000, stock: 4 },
  ];
  assert.deepEqual(
    filterRows(
      list,
      { q: 'product', category: '0', stock: 'low', sort: 'price', dir: 'asc' },
      true,
      'en',
    ).map((x) => x.id),
    ['p3', 'p1'],
  );
  assert.deepEqual(
    filterRows(list, { stock: 'low', sort: 'price', dir: 'asc' }, true, 'en')
      .slice(0, 1)
      .map((x) => x.id),
    ['p3'],
  );
  assert.equal(
    filterRows(
      [makeOrder('1'), makeOrder('2', 'pending')],
      { status: 'pending', from: '2026-10-31', to: '2026-10-31' },
      false,
      'en',
    ).length,
    1,
  );
});
test('schema validation rejects malformed records, incompatible schemas and incorrect totals', () => {
  const d = { version: 1, seedDate: p.createdAt, products: [p], orders: [makeOrder('1')] };
  assert.equal(validData(d), true);
  assert.equal(validData({ ...d, version: 99 }), false);
  assert.equal(validData({ ...d, products: [null] }), false);
  assert.equal(validData({ ...d, orders: [{ ...d.orders[0], total: 1 }] }), false);
  assert.equal(validData({ ...d, orders: [{ ...d.orders[0], statusHistory: [] }] }), false);
  assert.equal(validData({ ...d, products: [p, { ...p, id: 'p2' }] }), false);
  assert.equal(
    validData({
      ...d,
      orders: [
        {
          ...d.orders[0],
          statusHistory: [
            { from: null, to: 'pending', at: p.createdAt },
            { from: 'pending', to: 'delivered', at: p.createdAt },
          ],
        },
      ],
    }),
    false,
  );
});

test('period boundaries, bucket reconciliation, percentage rounding and zero comparisons', async () => {
  const { periodBounds, ordersInPeriod, salesBuckets, percentages, relativeChange } =
    await import('../src/app/domain.ts');
  const now = Date.parse('2026-10-31T12:00:00Z');
  const { start, end } = periodBounds(30, now);
  const before = { ...makeOrder('before'), createdAt: new Date(start - 1).toISOString() };
  const first = { ...makeOrder('first'), createdAt: new Date(start).toISOString() };
  const last = { ...makeOrder('last'), createdAt: new Date(end - 1).toISOString() };
  const after = { ...makeOrder('after'), createdAt: new Date(end).toISOString() };
  const orders = [before, first, last, after, makeOrder('pending', 'pending')];
  const selected = ordersInPeriod(orders, 30, now);
  assert.deepEqual(
    selected.map((o) => o.id),
    ['first', 'last', 'pending'],
  );
  assert.equal(
    metrics(selected)[0],
    salesBuckets(orders, 30, now).reduce((a, b) => a + b.value, 0),
  );
  const buckets = salesBuckets(orders, 90, now);
  assert.equal(buckets.length, 13);
  assert.equal(buckets.at(-1).end, periodBounds(90, now).end);
  assert.equal(
    buckets.every((b, i) => i === 0 || b.start === buckets[i - 1].end),
    true,
  );
  assert.deepEqual(percentages([1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(percentages([0, 0, 0]), [0, 0, 0]);
  assert.equal(
    percentages([4, 4, 4, 13, 3]).reduce((a, b) => a + b, 0),
    100,
  );
  assert.equal(relativeChange(12, 0), null);
  assert.equal(relativeChange(12, 6), 1);
  assert.equal(relativeChange(0, 6), -1);
});
