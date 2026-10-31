import { Component, inject, effect, signal, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { Store } from './store';
import { Icon } from './icon';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  template: `
    <a class="skip" href="#main">{{ s.t('انتقل إلى المحتوى', 'Skip to content') }}</a>
    @if (drawer()) {
      <div class="scrim" (click)="close()"></div>
    }
    <aside
      [attr.inert]="mobile() && !drawer() ? '' : null"
      [class.open]="drawer()"
      [attr.role]="drawer() ? 'dialog' : null"
      [attr.aria-modal]="drawer() ? 'true' : null"
      [attr.aria-label]="s.t('التنقل الرئيسي', 'Main navigation')"
    >
      <button
        class="mobile-close icon-button"
        (click)="close()"
        [attr.aria-label]="s.t('إغلاق القائمة', 'Close menu')"
      >
        ×</button
      ><a routerLink="/dashboard" class="brand"
        ><svg viewBox="0 0 48 48" aria-hidden="true">
          <path
            d="M10 7H6v33h36V7h-4M6 24h36M14 24V13h10v11m4 0v-7h7v7M14 40V30h8v10m5 0V28h8v12"
          /></svg
        ><span>رَف <small>RAFF</small></span
        ><span class="brand-dot">.</span></a
      >
      <div class="store-label">
        <span class="store-icon">▧</span>
        <div>
          {{ s.t('متجر رَف', 'Raff Home') }}<small>{{ s.t('متجر تجريبي', 'Demo store') }}</small>
        </div>
        <span class="green-dot"></span>
      </div>
      <p class="nav-label">{{ s.t('مساحة العمل', 'WORKSPACE') }}</p>
      <nav>
        <a routerLink="/dashboard" routerLinkActive="active" (click)="close()"
          ><raff-icon name="overview" />{{ s.t('نظرة عامة', 'Overview') }}</a
        ><a routerLink="/orders" routerLinkActive="active" (click)="close()"
          ><raff-icon name="orders" />{{ s.t('الطلبات', 'Orders') }}</a
        ><a routerLink="/products" routerLinkActive="active" (click)="close()"
          ><raff-icon name="box" />{{ s.t('المنتجات', 'Products') }}</a
        >
      </nav>
      <div class="sidebar-bottom">
        <section class="inventory-summary">
          <h2>{{ s.t('المخزون الحالي', 'Current inventory') }}</h2>
          <a routerLink="/products" [queryParams]="{ stock: 'low' }" (click)="close()"
            ><span>{{ s.t('مخزون منخفض', 'Low stock') }}</span
            ><strong>{{ s.number(lowStock()) }}</strong
            ><raff-icon name="box" /></a
          ><a routerLink="/products" [queryParams]="{ stock: 'out' }" (click)="close()"
            ><span>{{ s.t('نفد المخزون', 'Out of stock') }}</span
            ><strong>{{ s.number(outOfStock()) }}</strong
            ><raff-icon name="box"
          /></a>
          <p>{{ s.t('جميع المنتجات · كل التواريخ', 'All products · all dates') }}</p>
        </section>
        <div class="sidebar-footer">
          <span class="avatar">ر</span>
          <div>
            {{ s.t('متجر المنزل والحياة', 'Home & living store')
            }}<small>{{ s.t('نسخة العرض التوضيحي', 'Portfolio demonstration') }}</small>
          </div>
        </div>
      </div>
    </aside>
    <div class="workspace" [attr.inert]="drawer() ? '' : null">
      <header class="topbar">
        <div class="topbar-start">
          <button
            class="mobile-menu icon-button"
            (click)="open($event)"
            [attr.aria-label]="s.t('فتح القائمة', 'Open menu')"
          >
            ☰</button
          ><span class="crumb"
            >{{ s.t('مساحة العمل', 'Workspace') }} <span>/</span>
            <strong>{{ pageTitle() }}</strong></span
          >
        </div>
        <div class="top-actions">
          <span class="local-label"
            ><i class="green-dot"></i
            >{{
              s.notice()
                ? s.t('في الذاكرة فقط', 'Memory only')
                : s.t('محفوظ محليًا', 'Saved locally')
            }}</span
          ><button class="lang-button" (click)="s.switchLang()">
            <raff-icon name="globe" />
            <span>{{ s.lang() === 'ar' ? 'English' : 'العربية' }}</span></button
          ><span class="divider"></span
          ><button
            class="reset-button"
            (click)="reset()"
            [attr.aria-label]="s.t('إعادة ضبط البيانات', 'Reset demo data')"
          >
            <raff-icon name="reset" />
            <span>{{ s.t('إعادة ضبط البيانات', 'Reset demo data') }}</span>
          </button>
        </div>
      </header>
      <main id="main" tabindex="-1">
        <div class="demo-banner">
          <span class="info-icon">i</span
          ><span>{{
            s.t(
              'نسخة تجريبية — تُحفظ التعديلات في هذا المتصفح فقط.',
              'Demo version — changes are saved only in this browser.'
            )
          }}</span
          ><span class="demo-pill">{{ s.t('بيئة تجريبية', 'DEMO MODE') }}</span>
        </div>
        @if (s.notice()) {
          <div class="error-notice" role="alert">
            {{
              s.t(
                'تعذر استخدام البيانات المحفوظة. تعمل التعديلات في الذاكرة ولن تستمر بعد التحديث. البيانات الأصلية لم تُستبدل. استخدم إعادة الضبط للاستعادة.',
                'Saved data is unavailable. Changes are in memory and will not survive a refresh. Original data has not been overwritten. Reset demo data to recover.'
              )
            }}
          </div>
        }
        <router-outlet />
        <footer class="page-footer">
          <span
            >© {{ year }}
            {{
              s.t('رَف. تفاصيل صغيرة، إدارة أفضل.', 'Raff. Small details, better management.')
            }}</span
          ><span
            >{{ s.t('صُنع بعناية للمتاجر الطموحة', 'Made with care for growing stores') }}
            <span class="indigo">✧</span></span
          >
        </footer>
      </main>
    </div>
    @if (s.toast()) {
      <div class="toast" role="status">✓ {{ s.toast() }}</div>
    }
  `,
})
export class App {
  s = inject(Store);
  router = inject(Router);
  drawer = signal(false);
  mobile = signal(window.innerWidth < 768);
  url = signal(this.router.url);
  year = new Date().getFullYear();
  private trigger: HTMLElement | null = null;
  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        this.url.set(e.urlAfterRedirects);
        this.close();
      }
    });
    effect(() => {
      document.documentElement.lang = this.s.lang();
      document.documentElement.dir = this.s.lang() === 'ar' ? 'rtl' : 'ltr';
      document.title = this.pageTitle() + ' | ' + this.s.t('رَف', 'Raff');
    });
  }
  pageTitle() {
    const u = this.url().split('?')[0];
    return u === '/products/new'
      ? this.s.t('إضافة منتج', 'Add product')
      : u.startsWith('/products/')
        ? this.s.t('تعديل المنتج', 'Edit product')
        : u === '/products'
          ? this.s.t('المنتجات', 'Products')
          : u.startsWith('/orders/')
            ? this.s.t('تفاصيل الطلب', 'Order details')
            : u === '/orders'
              ? this.s.t('الطلبات', 'Orders')
              : u === '/dashboard' || u === '/'
                ? this.s.t('نظرة عامة', 'Overview')
                : this.s.t('الصفحة غير موجودة', 'Page not found');
  }
  lowStock() {
    return this.s.data().products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold)
      .length;
  }
  outOfStock() {
    return this.s.data().products.filter((p) => p.stock === 0).length;
  }
  reset() {
    if (
      confirm(
        this.s.t(
          'استعادة جميع المنتجات والطلبات التجريبية؟ ستفقد تعديلاتك.',
          'Restore all demo products and orders? Your changes will be lost.',
        ),
      )
    )
      this.s.reset();
  }
  open(e: Event) {
    this.trigger = e.currentTarget as HTMLElement;
    this.drawer.set(true);
    setTimeout(() => document.querySelector<HTMLElement>('aside button')?.focus());
  }
  close() {
    if (this.drawer()) {
      this.drawer.set(false);
      setTimeout(() => this.trigger?.focus());
    }
  }
  @HostListener('window:resize') resize() {
    this.mobile.set(window.innerWidth < 768);
    if (!this.mobile()) this.close();
  }
  @HostListener('document:keydown', ['$event']) key(e: KeyboardEvent) {
    if (!this.drawer()) return;
    if (e.key === 'Escape') this.close();
    if (e.key === 'Tab') {
      const els = Array.from(document.querySelectorAll<HTMLElement>('aside a, aside button'));
      const i = els.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i === 0) {
        e.preventDefault();
        els.at(-1)?.focus();
      } else if (!e.shiftKey && i === els.length - 1) {
        e.preventDefault();
        els[0]?.focus();
      }
    }
  }
}
