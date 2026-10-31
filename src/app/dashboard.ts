import { Component, inject, signal, computed, effect, viewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { Store, statuses } from './store';
import {
  metrics,
  ordersInPeriod,
  salesBuckets,
  percentages,
  relativeChange,
  statusColors,
} from './domain';
import { Icon } from './icon';
import { ProductImage } from './product-image';
Chart.register(...registerables);
@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [RouterLink, Icon, ProductImage],
  template: `
    <div class="page-heading">
      <div>
        <div class="eyebrow">{{ s.t('الصورة الكاملة لمتجرك', 'YOUR STORE AT A GLANCE') }}</div>
        <h1>{{ s.t('نظرة عامة', 'Overview') }} <span class="heading-dot"></span></h1>
        <p>
          {{
            s.t(
              'أهلًا بعودتك! إليك ما يحدث في متجرك اليوم.',
              'Welcome back! Here’s what’s happening in your store today.'
            )
          }}
        </p>
      </div>
      <div class="heading-actions">
        <span class="date-icon">▦</span
        ><select
          [attr.aria-label]="s.t('الفترة الزمنية', 'Date range')"
          [value]="days()"
          (change)="days.set(+$any($event.target).value)"
        >
          <option value="7">{{ s.t('آخر ٧ أيام', 'Last 7 days') }}</option>
          <option value="30">{{ s.t('آخر ٣٠ يومًا', 'Last 30 days') }}</option>
          <option value="90">{{ s.t('آخر ٩٠ يومًا', 'Last 90 days') }}</option>
        </select>
      </div>
    </div>
    <p class="range-scope">
      {{
        s.t(
          'المؤشرات والرسوم والأكثر مبيعًا: طلبات أُنشئت في الفترة المحددة. المبيعات للطلبات المسلّمة فقط.',
          'Metrics, charts and best sellers follow the selected order creation period. Sales include delivered orders only.'
        )
      }}
    </p>
    <div class="stats-grid">
      @for (k of metrics(); track k.label; let i = $index) {
        <section class="stat-card">
          <div class="stat-top">
            <span>{{ k.label }}</span
            ><span class="stat-icon" [class]="'stat-icon icon-' + i"
              ><raff-icon [name]="['sales', 'orders', 'average', 'clock'][i]"
            /></span>
          </div>
          <div class="stat-value">
            <bdi>{{ k.value }}</bdi>
          </div>
          <div class="stat-bottom">
            <span [class]="k.tone">{{ k.delta }}</span
            ><span>{{ k.comparison }}</span>
          </div>
        </section>
      }
    </div>
    <div class="charts-grid">
      <section class="panel sales-panel">
        <div class="panel-heading">
          <div>
            <h2>{{ s.t('أداء المبيعات', 'Sales performance') }}</h2>
            <p>
              {{
                s.t(
                  'قيمة الطلبات التي تم تسليمها خلال الفترة المحددة',
                  'Value of delivered orders created in the selected period'
                )
              }}
            </p>
          </div>
          <span class="chart-key"><i></i>{{ s.t('المبيعات', 'Sales') }}</span>
        </div>
        <div class="chart-big" dir="ltr">
          <canvas
            #salesChart
            role="img"
            [attr.aria-label]="s.t('المبيعات خلال الفترة', 'Sales over time')"
          ></canvas>
        </div>
        <p class="chart-direction">
          {{ s.t('التسلسل الزمني: من اليسار إلى اليمين', 'Time runs from left to right') }}
        </p>
        <details class="chart-summary">
          <summary>{{ s.t('عرض بيانات الرسم البياني', 'View chart data') }}</summary>
          <div class="table-wrap">
            <table class="chart-data">
              <caption>
                {{
                  s.t(
                    'مبيعات الطلبات المسلّمة حسب تاريخ إنشاء الطلب',
                    'Delivered sales by order creation date'
                  )
                }}
              </caption>
              <thead>
                <tr>
                  <th>{{ s.t('التاريخ / الفترة', 'Date / period') }}</th>
                  <th>{{ s.t('المبيعات', 'Sales') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (b of buckets(); track b.start) {
                  <tr>
                    <td>{{ b.fullLabel }}</td>
                    <td>
                      <bdi>{{ s.money(b.value) }}</bdi>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <section class="panel status-panel">
        <div class="panel-heading">
          <div>
            <h2>{{ s.t('حالة الطلبات', 'Orders by status') }}</h2>
            <p>
              {{ s.t('طلبات الفترة المحددة — جميع الحالات', 'Selected period — all statuses') }}
            </p>
          </div>
          <span class="muted">◌</span>
        </div>
        @if (!period().length) {
          <p class="chart-empty" role="status">
            {{ s.t('لا توجد طلبات في هذه الفترة', 'No orders in this period') }}
          </p>
        }
        <div class="donut-wrap">
          <canvas
            #statusChart
            role="img"
            [attr.aria-label]="s.t('توزيع حالة الطلبات', 'Orders by status')"
          ></canvas>
          <div class="donut-label">
            <strong>{{ s.number(period().length) }}</strong
            ><span>{{ s.t('إجمالي الطلبات', 'Total orders') }}</span>
          </div>
        </div>
        <div class="status-legend">
          @for (st of statuses; track st; let i = $index) {
            <div>
              <span class="legend-label"
                ><i [style.background]="colors[i]"></i>{{ s.status(st) }}</span
              ><strong>{{ s.number(count(st)) }}</strong
              ><span>{{ percent(st) }}</span>
            </div>
          }
        </div>
        <p class="rounding-note">
          {{
            s.t(
              'النسب مقربة ومجموعها ١٠٠٪ عند وجود طلبات.',
              'Percentages are rounded to a total of 100% when orders exist.'
            )
          }}
        </p>
      </section>
    </div>
    <div class="lower-grid">
      <section class="panel recent-panel">
        <div class="panel-heading">
          <div>
            <h2>{{ s.t('أحدث الطلبات', 'Recent orders') }}</h2>
            <p>
              {{
                s.t(
                  'آخر خمسة طلبات ضمن الفترة المحددة',
                  'Five latest orders in the selected period'
                )
              }}
            </p>
          </div>
          <a class="text-link" routerLink="/orders">{{ s.t('عرض الكل', 'View all') }} ←</a>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{{ s.t('الطلب', 'Order') }}</th>
                <th>{{ s.t('العميل', 'Customer') }}</th>
                <th>{{ s.t('التاريخ', 'Date') }}</th>
                <th>{{ s.t('المبلغ', 'Amount') }}</th>
                <th>{{ s.t('الحالة', 'Status') }}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (o of latest(); track o.id) {
                <tr>
                  <td>
                    <a class="order-link" [routerLink]="['/orders', o.id]"
                      ><bdi>#{{ o.orderNumber }}</bdi></a
                    >
                  </td>
                  <td>
                    <span class="customer-cell"
                      ><span class="customer-avatar">{{ o.customer.name[0] }}</span
                      >{{ o.customer.name }}</span
                    >
                  </td>
                  <td class="muted">{{ s.date(o.createdAt) }}</td>
                  <td class="amount">
                    <bdi>{{ s.money(o.total) }}</bdi>
                  </td>
                  <td>
                    <span [class]="'badge ' + o.status">{{ s.status(o.status) }}</span>
                  </td>
                  <td>
                    <a
                      class="row-arrow"
                      [routerLink]="['/orders', o.id]"
                      [attr.aria-label]="s.t('تفاصيل الطلب', 'Order details')"
                      >↗</a
                    >
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="empty">
                    {{ s.t('لا توجد طلبات في هذه الفترة', 'No orders in this period') }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
      <section class="panel best-panel">
        <div class="panel-heading">
          <div>
            <h2>{{ s.t('الأكثر مبيعًا', 'Best sellers') }}</h2>
            <p>
              {{
                s.t(
                  'حسب الكمية المسلّمة خلال الفترة المحددة',
                  'Ranked by delivered units in the selected period'
                )
              }}
            </p>
          </div>
          <span class="small-icon">↗</span>
        </div>
        <div class="best-list">
          @for (p of best(); track p.product.id; let i = $index) {
            <a [routerLink]="['/products', p.product.id, 'edit']" class="best-item"
              ><span class="rank">{{ s.number(i + 1) }}</span
              ><raff-product-image [product]="p.product" />
              <div>
                <strong>{{ p.product.name[s.lang()] }}</strong
                ><small>{{ s.number(p.qty) }} {{ s.t('قطعة مباعة', 'units sold') }}</small>
              </div>
              <span class="best-amount"
                ><bdi>{{ s.money(p.revenue) }}</bdi></span
              ></a
            >
          } @empty {
            <p class="empty">{{ s.t('لا توجد مبيعات بعد', 'No sales yet') }}</p>
          }
        </div>
      </section>
    </div>
    <a routerLink="/products" [queryParams]="{ stock: 'low' }" class="stock-banner"
      ><span class="stock-symbol">◈</span>
      <div>
        <strong>{{
          s.t(
            'المخزون الحالي — مستقل عن فترة المبيعات',
            'Current inventory — independent of the sales period'
          )
        }}</strong>
        <p>
          {{ s.number(low()) }}
          {{
            s.t(
              'منتجات بمخزون منخفض الآن. لا يغيّر فلتر المبيعات كميات المخزون.',
              'products are low in stock now. The sales filter does not change inventory quantities.'
            )
          }}
        </p>
      </div>
      <span class="stock-action">{{ s.t('مراجعة المخزون', 'Review inventory') }} ←</span></a
    >
  `,
})
export class Dashboard {
  s = inject(Store);
  days = signal(30);
  readonly now = Date.now();
  statuses = statuses;
  colors = statuses.map((st) => statusColors[st]);
  sales = viewChild<ElementRef<HTMLCanvasElement>>('salesChart');
  donut = viewChild<ElementRef<HTMLCanvasElement>>('statusChart');
  private charts: Chart[] = [];
  period = computed(() => ordersInPeriod(this.s.data().orders, this.days(), this.now));
  previous = computed(() => ordersInPeriod(this.s.data().orders, this.days(), this.now, 1));
  metrics = computed(() => {
    const current = metrics(this.period()),
      previous = metrics(this.previous());
    return [
      this.s.t('إجمالي المبيعات', 'Total sales'),
      this.s.t('إجمالي الطلبات', 'Total orders'),
      this.s.t('متوسط قيمة الطلب', 'Average order value'),
      this.s.t('طلبات قيد الانتظار', 'Pending orders'),
    ].map((label, i) => {
      const change = relativeChange(current[i], previous[i]);
      return {
        label,
        value: i === 0 || i === 2 ? this.s.money(current[i]) : this.s.number(current[i]),
        delta:
          change === null
            ? this.s.t('لا توجد بيانات سابقة', 'No previous data')
            : this.s.percent(change, true),
        tone: i === 3 && change !== null && change > 0 ? 'trend workload' : 'trend neutral',
        comparison:
          i === 3
            ? this.s.t('تغيّر عبء العمل عن الفترة السابقة', 'Workload change vs. previous period')
            : this.s.t('تغيّر عن الفترة السابقة', 'Change vs. previous period'),
      };
    });
  });
  count(st: string) {
    return this.period().filter((o) => o.status === st).length;
  }
  shares = computed(() => percentages(statuses.map((st) => this.count(st))));
  percent(st: string) {
    return this.s.percent(this.shares()[statuses.indexOf(st as any)] / 100);
  }
  latest = computed(() =>
    [...this.period()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
  );
  low = computed(
    () =>
      this.s.data().products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length,
  );
  best = computed(() =>
    this.s
      .data()
      .products.map((product) => {
        let qty = 0,
          revenue = 0;
        this.period()
          .filter((o) => o.status === 'delivered')
          .forEach((o) =>
            o.items
              .filter((x) => x.productId === product.id)
              .forEach((x) => {
                qty += x.quantity;
                revenue += x.unitPrice * x.quantity;
              }),
          );
        return { product, qty, revenue };
      })
      .filter((p) => p.qty)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5),
  );
  buckets = computed(() =>
    salesBuckets(this.s.data().orders, this.days(), this.now).map((b) => ({
      ...b,
      label: new Intl.DateTimeFormat(this.s.locale(), { day: 'numeric', month: 'short' }).format(
        b.start,
      ),
      fullLabel:
        this.days() === 90
          ? this.s.date(new Date(b.start).toISOString()) +
            ' – ' +
            this.s.date(new Date(b.end - 1).toISOString())
          : this.s.date(new Date(b.start).toISOString()),
    })),
  );
  constructor() {
    effect(() => {
      const line = this.sales()?.nativeElement,
        donut = this.donut()?.nativeElement,
        buckets = this.buckets(),
        labels = statuses.map((st) => this.s.status(st)),
        counts = statuses.map((st) => this.count(st)),
        rtl = this.s.lang() === 'ar';
      if (!line || !donut) return;
      this.charts.forEach((c) => c.destroy());
      const font = { family: rtl ? 'Cairo, sans-serif' : 'Inter, sans-serif', size: 14 };
      this.charts = [
        new Chart(line, {
          type: 'line',
          data: {
            labels: buckets.map((b) => b.label),
            datasets: [
              {
                label: this.s.t('المبيعات', 'Sales'),
                data: buckets.map((b) => b.value / 100),
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79,70,229,.045)',
                fill: true,
                tension: 0,
                pointRadius: 2,
                pointHoverRadius: 5,
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            animation: false,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                rtl,
                textDirection: rtl ? 'rtl' : 'ltr',
                titleFont: font,
                bodyFont: font,
                callbacks: {
                  title: (items) => buckets[items[0].dataIndex].fullLabel,
                  label: (c) => this.s.money(Math.round(Number(c.raw) * 100)),
                },
              },
            },
            scales: {
              x: {
                reverse: false,
                grid: { display: false },
                border: { display: false },
                ticks: { font, color: '#64748b', maxTicksLimit: 3, maxRotation: 0, autoSkip: true },
              },
              y: {
                beginAtZero: true,
                min: 0,
                border: { display: false },
                title: {
                  display: true,
                  text: this.s.t('المبيعات بالجنيه المصري', 'Sales in EGP'),
                  font,
                  color: '#64748b',
                },
                grid: { color: '#edf0f5' },
                ticks: {
                  font,
                  color: '#64748b',
                  maxTicksLimit: 5,
                  callback: (v) => this.s.chartMoney(Number(v) * 100),
                },
              },
            },
          },
        }),
        new Chart(donut, {
          type: 'doughnut',
          data: {
            labels,
            datasets: [
              {
                data: counts,
                backgroundColor: this.colors,
                borderWidth: 3,
                borderColor: '#fff',
                borderRadius: 2,
                hoverOffset: 2,
              },
            ],
          },
          options: {
            responsive: true,
            animation: false,
            maintainAspectRatio: false,
            cutout: '78%',
            plugins: {
              legend: { display: false },
              tooltip: {
                rtl,
                textDirection: rtl ? 'rtl' : 'ltr',
                titleFont: font,
                bodyFont: font,
                callbacks: {
                  label: (c) =>
                    this.s.number(Number(c.raw)) + ' · ' + this.percent(statuses[c.dataIndex]),
                },
              },
            },
          },
        }),
      ];
    });
  }
  ngOnDestroy() {
    this.charts.forEach((c) => c.destroy());
  }
}
