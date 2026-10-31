import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store, statuses } from './store';
import { filterRows } from './domain';
import { ProductImage } from './product-image';
@Component({
  standalone: true,
  selector: 'app-list',
  imports: [RouterLink, ProductImage],
  template: `
    <div class="page-heading">
      <div>
        <div class="eyebrow">
          {{ s.t('مساحة العمل / إدارة المتجر', 'WORKSPACE / STORE MANAGEMENT') }}
        </div>
        <h1>{{ products ? s.t('المنتجات', 'Products') : s.t('الطلبات', 'Orders') }}</h1>
        <p>
          {{
            products
              ? s.t(
                  'قطع مميزة، وإدارة أبسط لمخزونك.',
                  'Thoughtful products. Effortless inventory management.'
                )
              : s.t(
                  'كل طلب، من أول خطوة حتى باب العميل.',
                  'Every order, from the first step to your customer’s door.'
                )
          }}
          <strong>{{ s.number(filtered().length) }}</strong> {{ s.t('نتيجة', 'results') }}
        </p>
      </div>
      @if (products) {
        <a class="button primary" routerLink="/products/new" [queryParams]="{ return: router.url }"
          >＋ {{ s.t('إضافة منتج', 'Add product') }}</a
        >
      }
    </div>
    <section class="panel list-panel" [class.orders-list]="!products">
      <div class="filter-bar">
        <label class="search-field"
          ><span>⌕</span
          ><input
            [value]="q()['q'] || ''"
            (input)="search($any($event.target).value)"
            [attr.aria-label]="s.t('بحث', 'Search')"
            [placeholder]="
              products
                ? s.t('ابحث بالاسم أو رمز المنتج…', 'Search name or SKU…')
                : s.t(
                    'ابحث برقم الطلب، اسم العميل أو البريد…',
                    'Search orders, customers or email…'
                  )
            "
        /></label>
        @if (products) {
          <select
            [attr.aria-label]="s.t('الفئة', 'Category')"
            [value]="q()['category'] || ''"
            (change)="set('category', $any($event.target).value)"
          >
            <option value="">{{ s.t('كل الفئات', 'All categories') }}</option>
            @for (i of categories; track i) {
              <option [value]="i">{{ s.category(i) }}</option>
            }</select
          ><select
            [attr.aria-label]="s.t('حالة النشاط', 'Active status')"
            [value]="q()['active'] || ''"
            (change)="set('active', $any($event.target).value)"
          >
            <option value="">{{ s.t('كل الحالات', 'All activity') }}</option>
            <option value="true">{{ s.t('نشط', 'Active') }}</option>
            <option value="false">{{ s.t('غير نشط', 'Inactive') }}</option></select
          ><select
            [attr.aria-label]="s.t('حالة المخزون', 'Stock filter')"
            [value]="q()['stock'] || ''"
            (change)="set('stock', $any($event.target).value)"
          >
            <option value="">{{ s.t('كل المخزون', 'All stock') }}</option>
            <option value="in">{{ s.t('متوفر', 'In stock') }}</option>
            <option value="low">{{ s.t('مخزون منخفض', 'Low stock') }}</option>
            <option value="out">{{ s.t('نفد المخزون', 'Out of stock') }}</option>
          </select>
        } @else {
          <select
            [attr.aria-label]="s.t('حالة الطلب', 'Order status')"
            [value]="q()['status'] || ''"
            (change)="set('status', $any($event.target).value)"
          >
            <option value="">{{ s.t('كل الحالات', 'All statuses') }}</option>
            @for (st of statuses; track st) {
              <option [value]="st">{{ s.status(st) }}</option>
            }</select
          ><label class="date-filter"
            >{{ s.t('من', 'From')
            }}<input
              type="date"
              [value]="q()['from'] || ''"
              (change)="set('from', $any($event.target).value)" /></label
          ><label class="date-filter"
            >{{ s.t('إلى', 'To')
            }}<input
              type="date"
              [value]="q()['to'] || ''"
              (change)="set('to', $any($event.target).value)"
          /></label>
        }
        <button class="text-button" (click)="clear()">
          {{ s.t('مسح الفلاتر', 'Clear filters') }}
        </button>
      </div>
      <div class="mobile-order-cards">
        @if (!products) {
          @for (o of pageRows(); track o.id) {
            <article>
              <div>
                <a
                  class="order-link"
                  [routerLink]="['/orders', o.id]"
                  [queryParams]="{ return: router.url }"
                  ><bdi>#{{ o.orderNumber }}</bdi></a
                ><span [class]="'badge ' + o.status">{{ s.status(o.status) }}</span>
              </div>
              <p>{{ o.customer.name }}</p>
              <div class="mobile-order-meta">
                <span
                  >{{ s.date(o.createdAt) }} · {{ s.number(itemCount(o)) }}
                  {{ s.t('قطع', 'items') }}</span
                ><strong
                  ><bdi>{{ s.money(o.total) }}</bdi></strong
                >
              </div>
              <a
                class="button"
                [routerLink]="['/orders', o.id]"
                [queryParams]="{ return: router.url }"
                >{{ s.t('عرض تفاصيل الطلب', 'View order details') }} ↗</a
              >
            </article>
          } @empty {
            <div class="empty">
              <h2>{{ s.t('لا توجد نتائج مطابقة', 'No matching results') }}</h2>
              <button class="button" (click)="clear()">
                {{ s.t('مسح الفلاتر', 'Clear filters') }}
              </button>
            </div>
          }
        }
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              @for (c of columns(); track c.key) {
                <th
                  [attr.aria-sort]="
                    q()['sort'] === c.key
                      ? q()['dir'] === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  "
                >
                  <button (click)="sort(c.key)">
                    {{ c.label }} <span class="sort-icon">↕</span>
                  </button>
                </th>
              }
              <th>{{ s.t('الحالة', 'Status') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (row of pageRows(); track row.id) {
              @if (products) {
                <tr>
                  <td>
                    <a
                      class="product-cell"
                      [routerLink]="['/products', row.id, 'edit']"
                      [queryParams]="{ return: router.url }"
                      ><raff-product-image [product]="row" /><span
                        ><strong>{{ row.name[s.lang()] }}</strong
                        ><small>{{ s.t('منزل وحياة', 'Home & living') }}</small></span
                      ></a
                    >
                  </td>
                  <td>
                    <bdi>{{ row.sku }}</bdi>
                  </td>
                  <td>{{ s.category(row.categoryId) }}</td>
                  <td class="amount">
                    <bdi>{{ s.money(row.price) }}</bdi>
                  </td>
                  <td>
                    <span
                      [class]="
                        'badge ' +
                        (row.stock === 0
                          ? 'cancelled'
                          : row.stock <= row.lowStockThreshold
                            ? 'pending'
                            : 'delivered')
                      "
                      >{{ s.number(row.stock) }} ·
                      {{
                        row.stock === 0
                          ? s.t('نفد', 'Out of stock')
                          : row.stock <= row.lowStockThreshold
                            ? s.t('منخفض', 'Low stock')
                            : s.t('متوفر', 'In stock')
                      }}</span
                    >
                  </td>
                  <td>
                    <span [class]="'badge ' + (row.active ? 'delivered' : 'cancelled')">{{
                      row.active ? s.t('نشط', 'Active') : s.t('غير نشط', 'Inactive')
                    }}</span>
                  </td>
                  <td>
                    <a
                      class="edit-link"
                      [routerLink]="['/products', row.id, 'edit']"
                      [queryParams]="{ return: router.url }"
                      >{{ s.t('تعديل', 'Edit') }} ↗</a
                    >
                  </td>
                </tr>
              } @else {
                <tr>
                  <td>
                    <a
                      class="order-link"
                      [routerLink]="['/orders', row.id]"
                      [queryParams]="{ return: router.url }"
                      ><bdi>#{{ row.orderNumber }}</bdi></a
                    >
                  </td>
                  <td>
                    <span class="customer-cell"
                      ><span class="customer-avatar">{{ row.customer.name[0] }}</span
                      ><span
                        >{{ row.customer.name }}<small>{{ row.customer.email }}</small></span
                      ></span
                    >
                  </td>
                  <td class="muted">{{ s.date(row.createdAt) }}</td>
                  <td>{{ s.number(itemCount(row)) }}</td>
                  <td class="amount">
                    <bdi>{{ s.money(row.total) }}</bdi>
                  </td>
                  <td>
                    <span [class]="'badge ' + row.status">{{ s.status(row.status) }}</span>
                  </td>
                  <td>
                    <a
                      class="edit-link"
                      [routerLink]="['/orders', row.id]"
                      [queryParams]="{ return: router.url }"
                      >{{ s.t('التفاصيل', 'Details') }} ↗</a
                    >
                  </td>
                </tr>
              }
            } @empty {
              <tr>
                <td colspan="7">
                  <div class="empty">
                    <span class="empty-icon">⌕</span>
                    <h2>
                      {{
                        rowsCount() === 0
                          ? products
                            ? s.t('لا توجد منتجات بعد', 'No products yet')
                            : s.t('لا توجد طلبات بعد', 'No orders yet')
                          : s.t('لا توجد نتائج مطابقة', 'No matching results')
                      }}
                    </h2>
                    <p>
                      {{
                        s.t(
                          'جرّب تعديل كلمات البحث أو مسح الفلاتر.',
                          'Try another search or clear your filters.'
                        )
                      }}
                    </p>
                    <button class="button" (click)="clear()">
                      {{ s.t('إعادة ضبط الفلاتر', 'Reset filters') }}
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <span
          >{{ s.t('عرض', 'Showing') }} {{ filtered().length ? (page() - 1) * size() + 1 : 0 }}–{{
            end()
          }}
          {{ s.t('من', 'of') }} {{ s.number(filtered().length) }}</span
        >
        <div>
          <label
            >{{ s.t('لكل صفحة', 'Per page') }}
            <select [value]="size()" (change)="set('size', $any($event.target).value)">
              @for (n of [10, 20, 50]; track n) {
                <option [value]="n">{{ n }}</option>
              }
            </select></label
          ><button
            class="page-button"
            [disabled]="page() === 1"
            (click)="set('page', '' + (page() - 1), false)"
            [attr.aria-label]="s.t('الصفحة السابقة', 'Previous page')"
          >
            ‹</button
          ><span>{{ s.number(page()) }} / {{ s.number(pages()) }}</span
          ><button
            class="page-button"
            [disabled]="page() >= pages()"
            (click)="set('page', '' + (page() + 1), false)"
            [attr.aria-label]="s.t('الصفحة التالية', 'Next page')"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  `,
})
export class ListPage {
  s = inject(Store);
  route = inject(ActivatedRoute);
  router = inject(Router);
  products = this.route.snapshot.data['kind'] === 'products';
  q = signal<Record<string, string>>({});
  statuses = statuses;
  categories = [0, 1, 2, 3, 4];
  timer: any;
  constructor() {
    this.route.queryParams.subscribe((p) => this.q.set(p));
  }
  columns() {
    return this.products
      ? [
          { key: 'name', label: this.s.t('المنتج', 'Product') },
          { key: 'sku', label: 'SKU' },
          { key: 'categoryId', label: this.s.t('الفئة', 'Category') },
          { key: 'price', label: this.s.t('السعر', 'Price') },
          { key: 'stock', label: this.s.t('المخزون', 'Stock') },
        ]
      : [
          { key: 'orderNumber', label: this.s.t('رقم الطلب', 'Order') },
          { key: 'customer', label: this.s.t('العميل', 'Customer') },
          { key: 'createdAt', label: this.s.t('التاريخ', 'Created') },
          { key: 'items', label: this.s.t('القطع', 'Items') },
          { key: 'total', label: this.s.t('الإجمالي', 'Total') },
        ];
  }
  filtered = computed(() =>
    filterRows(
      this.products ? this.s.data().products : this.s.data().orders,
      this.q(),
      this.products,
      this.s.lang(),
    ),
  );
  size = computed(() => ([10, 20, 50].includes(+this.q()['size']) ? +this.q()['size'] : 10));
  pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.size())));
  page = computed(() => Math.min(this.pages(), Math.max(1, +this.q()['page'] || 1)));
  end = computed(() => Math.min(this.page() * this.size(), this.filtered().length));
  pageRows = computed(() =>
    this.filtered().slice((this.page() - 1) * this.size(), this.page() * this.size()),
  );
  rowsCount() {
    return this.products ? this.s.data().products.length : this.s.data().orders.length;
  }
  itemCount(o: any) {
    return o.items.reduce((a: number, x: any) => a + x.quantity, 0);
  }
  set(key: string, value: string, reset = true) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...this.q(), [key]: value || null, ...(reset ? { page: null } : {}) },
    });
  }
  search(value: string) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.set('q', value), 250);
  }
  clear() {
    clearTimeout(this.timer);
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }
  sort(key: string) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...this.q(),
        sort: key,
        dir: this.q()['sort'] === key && this.q()['dir'] === 'asc' ? 'desc' : 'asc',
        page: null,
      },
    });
  }
  ngOnDestroy() {
    clearTimeout(this.timer);
  }
}
