import { Component, input, signal, effect, inject } from '@angular/core';
import { Product, Store } from './store';
import { Icon } from './icon';
@Component({
  standalone: true,
  selector: 'raff-product-image',
  imports: [Icon],
  template: `<span
    class="catalog-image"
    [attr.role]="failed() ? 'img' : null"
    [attr.aria-label]="failed() ? s.t('الصورة غير متاحة: ', 'Image unavailable: ') + name() : null"
  >
    @if (!failed()) {
      <img [src]="source()" [alt]="name()" loading="lazy" (error)="failed.set(true)" />
    } @else {
      <raff-icon name="box" />
    }
  </span>`,
  styles: [
    `
      :host {
        display: inline-block;
        width: 52px;
        height: 56px;
        flex-shrink: 0;
        vertical-align: middle;
      }
      .catalog-image {
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
        background: #f4f1eb;
        color: #8f8373;
        border-radius: 8px;
        overflow: hidden;
      }
      .catalog-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    `,
  ],
})
export class ProductImage {
  s = inject(Store);
  product = input<Product>();
  label = input('');
  failed = signal(false);
  constructor() {
    effect(() => {
      this.source();
      this.failed.set(false);
    });
  }
  name() {
    return (
      this.label() ||
      this.product()?.name[this.s.lang()] ||
      this.s.t('صورة المنتج', 'Product image')
    );
  }
  source() {
    const p = this.product();
    return p ? this.s.image(p) : '/assets/category-0.svg';
  }
}
