import { Component, inject, computed, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Store, Status, transitions } from './store';
import { ProductImage } from './product-image';
@Component({
  standalone: true,
  selector: 'app-order-details',
  imports: [RouterLink, ProductImage],
  template: `
    <a class="back-link" [routerLink]="router.parseUrl(back)">→ {{ s.t('الطلبات', 'Orders') }}</a>
    @if (order(); as o) {
      <div class="page-heading">
        <div>
          <div class="eyebrow">{{ s.t('تفاصيل الطلب', 'ORDER DETAILS') }}</div>
          <h1>
            <bdi>#{{ o.orderNumber }}</bdi>
            <span [class]="'badge ' + o.status">{{ s.status(o.status) }}</span>
          </h1>
          <p>{{ s.t('تم الإنشاء في', 'Placed on') }} {{ s.date(o.createdAt) }}</p>
        </div>
      </div>
      <div class="detail-grid">
        <div>
          <section class="panel">
            <div class="panel-heading">
              <h2>{{ s.t('المنتجات المطلوبة', 'Order items') }}</h2>
              <span>{{ s.number(o.items.length) }} {{ s.t('منتجات', 'products') }}</span>
            </div>
            <div class="order-items">
              @for (item of o.items; track item.sku) {
                <div class="order-item">
                  <raff-product-image
                    [product]="product(item.productId)"
                    [label]="item.name[s.lang()]"
                  />
                  <div>
                    <strong>{{ item.name[s.lang()] }}</strong
                    ><small
                      ><bdi>{{ item.sku }}</bdi></small
                    ><small
                      ><bdi>{{ s.money(item.unitPrice) }}</bdi> ×
                      {{ s.number(item.quantity) }}</small
                    >
                  </div>
                  <strong
                    ><bdi>{{ s.money(item.quantity * item.unitPrice) }}</bdi></strong
                  >
                </div>
              }
            </div>
            <div class="totals">
              <div>
                <span>{{ s.t('المجموع الفرعي', 'Subtotal') }}</span
                ><span
                  ><bdi>{{ s.money(o.subtotal) }}</bdi></span
                >
              </div>
              <div>
                <span>{{ s.t('الشحن', 'Shipping') }}</span
                ><span
                  ><bdi>{{ s.money(o.shipping) }}</bdi></span
                >
              </div>
              <div>
                <span>{{ s.t('الخصم', 'Discount') }}</span
                ><span
                  >− <bdi>{{ s.money(o.discount) }}</bdi></span
                >
              </div>
              <div class="grand-total">
                <strong>{{ s.t('الإجمالي', 'Total') }}</strong
                ><strong
                  ><bdi>{{ s.money(o.total) }}</bdi></strong
                >
              </div>
            </div>
          </section>
          <section class="panel history-panel">
            <div class="panel-heading">
              <h2>{{ s.t('سجل حالة الطلب', 'Order timeline') }}</h2>
            </div>
            <div class="timeline">
              @for (h of o.statusHistory; track $index) {
                <div>
                  <i></i
                  ><strong>{{ h.from ? s.status(h.from) + ' ← ' : '' }}{{ s.status(h.to) }}</strong
                  ><small>{{ s.date(h.at) }} · {{ time(h.at) }}</small>
                </div>
              }
            </div>
          </section>
        </div>
        <div>
          <section class="panel info-panel">
            <h2>{{ s.t('معلومات العميل', 'Customer information') }}</h2>
            <span class="customer-avatar">{{ o.customer.name[0] }}</span
            ><strong>{{ o.customer.name }}</strong>
            <p>
              <bdi>{{ o.customer.email }}</bdi>
            </p>
            <hr />
            <h3>{{ s.t('عنوان التوصيل', 'Delivery address') }}</h3>
            <p>{{ o.address }}</p>
            <hr />
            <h3>{{ s.t('طريقة الدفع', 'Payment method') }}</h3>
            <p>
              {{
                o.paymentMethod === 'cash'
                  ? s.t('الدفع عند الاستلام', 'Cash on delivery')
                  : s.t('بطاقة — تجريبي', 'Card — demo')
              }}
            </p>
          </section>
          <section class="panel info-panel">
            <h2>{{ s.t('تحديث حالة الطلب', 'Update order status') }}</h2>
            @if (next().length) {
              <label for="next-status">{{ s.t('الحالة الجديدة', 'New status') }}</label
              ><select
                id="next-status"
                [value]="selected()"
                (change)="selected.set($any($event.target).value)"
              >
                <option value="">{{ s.t('اختر الحالة', 'Select status') }}</option>
                @for (st of next(); track st) {
                  <option [value]="st">{{ s.status(st) }}</option>
                }</select
              ><button
                class="button primary full"
                [disabled]="!selected() || busy()"
                (click)="update()"
              >
                {{ s.t('حفظ التحديث', 'Save update') }}
              </button>
            } @else {
              <p class="terminal">
                ✓
                {{
                  s.t('وصل الطلب إلى حالته النهائية.', 'This order has reached its final status.')
                }}
              </p>
            }
            <p class="fine-print">
              {{
                s.t(
                  'تحديث تجريبي فقط؛ لا يُرسل إشعارات للعميل أو شركة الشحن ولا يغيّر المخزون. يُدار المخزون من تعديل المنتج.',
                  'Demo update only. No customer or delivery notifications are sent and inventory is unchanged. Manage stock through product editing.'
                )
              }}
            </p>
          </section>
        </div>
      </div>
    } @else {
      <section class="panel empty">
        <span class="empty-icon">◇</span>
        <h1>{{ s.t('الطلب غير موجود', 'Order not found') }}</h1>
        <p>
          {{
            s.t(
              'تحقق من الرابط أو عُد إلى قائمة الطلبات.',
              'Check the link or return to the orders list.'
            )
          }}
        </p>
        <a class="button" routerLink="/orders">{{ s.t('عرض الطلبات', 'View orders') }}</a>
      </section>
    }
  `,
})
export class OrderDetails {
  s = inject(Store);
  route = inject(ActivatedRoute);
  router = inject(Router);
  id = this.route.snapshot.paramMap.get('id');
  back = this.route.snapshot.queryParamMap.get('return')?.startsWith('/orders?')
    ? this.route.snapshot.queryParamMap.get('return')!
    : '/orders';
  order = computed(() => this.s.data().orders.find((o) => o.id === this.id));
  next = computed(() => transitions[this.order()?.status || 'delivered']);
  selected = signal('');
  busy = signal(false);
  product(id: string) {
    return this.s.data().products.find((p) => p.id === id);
  }
  image(id: string) {
    const p = this.s.data().products.find((p) => p.id === id);
    return p ? this.s.image(p) : '';
  }
  time(at: string) {
    return new Date(at).toLocaleTimeString(this.s.lang() === 'ar' ? 'ar-EG' : 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  update() {
    if (this.busy() || !this.selected()) return;
    if (
      this.selected() === 'cancelled' &&
      !confirm(
        this.s.t('إلغاء هذا الطلب؟ لا يمكن التراجع.', 'Cancel this order? This cannot be undone.'),
      )
    )
      return;
    this.busy.set(true);
    if (this.s.changeStatus(this.id!, this.selected() as Status)) {
      this.selected.set('');
      this.s.notify(this.s.t('تم تحديث حالة الطلب', 'Order status updated'));
    }
    this.busy.set(false);
  }
}
