import { Component, inject } from '@angular/core';
import { Routes, RouterLink } from '@angular/router';
import { Dashboard } from './dashboard';
import { ListPage } from './lists';
import { OrderDetails } from './order-details';
import { ProductForm } from './product-form';
import { Store } from './store';
@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<section class="panel empty">
    <span class="empty-icon">404</span>
    <h1>{{ s.t('هذه الصفحة غير موجودة', 'This page could not be found') }}</h1>
    <p>{{ s.t('لنعد إلى مكان تعرفه.', 'Let’s get you back to familiar ground.') }}</p>
    <a routerLink="/dashboard" class="button primary">{{
      s.t('العودة للرئيسية', 'Back to overview')
    }}</a>
  </section>`,
})
class NotFound {
  s = inject(Store);
}
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', loadComponent: () => import('./dashboard').then((m) => m.Dashboard) },
  { path: 'orders', component: ListPage, data: { kind: 'orders' } },
  { path: 'orders/:id', component: OrderDetails },
  { path: 'products', component: ListPage, data: { kind: 'products' } },
  {
    path: 'products/new',
    component: ProductForm,
    canDeactivate: [(c: ProductForm) => c.canLeave()],
  },
  {
    path: 'products/:id/edit',
    component: ProductForm,
    canDeactivate: [(c: ProductForm) => c.canLeave()],
  },
  { path: '**', component: NotFound },
];
