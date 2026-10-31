import { Component, inject, signal, HostListener } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store, normalize, Product } from './store';
import { uniqueSku } from './domain';
const integer = (c: AbstractControl) =>
  /^\d+$/.test(normalize(c.value)) && Number.isSafeInteger(Number(normalize(c.value)))
    ? null
    : { integer: true };
const price = (c: AbstractControl) =>
  /^\d+(\.\d{1,2})?$/.test(normalize(c.value)) &&
  Number(normalize(c.value)) > 0 &&
  Number.isSafeInteger(Math.round(Number(normalize(c.value)) * 100))
    ? null
    : { price: true };
const https = (c: AbstractControl) => {
  if (!c.value?.trim()) return null;
  try {
    return new URL(c.value.trim()).protocol === 'https:' ? null : { https: true };
  } catch {
    return { https: true };
  }
};
@Component({
  standalone: true,
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <a class="back-link" [routerLink]="router.parseUrl(back)"
      >→ {{ s.t('المنتجات', 'Products') }}</a
    >
    @if (!missing) {
      <div class="page-heading">
        <div>
          <div class="eyebrow">{{ s.t('كتالوج المنتجات', 'PRODUCT CATALOG') }}</div>
          <h1>
            {{
              editing
                ? s.t('تعديل المنتج', 'Edit product')
                : s.t('إضافة منتج جديد', 'Add a new product')
            }}
          </h1>
          <p>{{ s.t('التفاصيل الصغيرة تصنع الفرق.', 'Small details make all the difference.') }}</p>
        </div>
      </div>
      <form [formGroup]="form" (ngSubmit)="save()" novalidate>
        <div class="form-layout">
          <div>
            <section class="panel form-panel">
              <h2>{{ s.t('معلومات المنتج', 'Product information') }}</h2>
              <p class="muted">
                {{
                  s.t(
                    'أضف اسمًا ووصفًا واضحًا بكلتا اللغتين.',
                    'Give your product a clear name and description in both languages.'
                  )
                }}
              </p>
              <div class="form-grid">
                @for (f of textFields; track f.key) {
                  <div class="field" [class.wide]="f.area">
                    <label [for]="f.key">{{ s.t(f.ar, f.en) }} {{ f.required ? '*' : '' }}</label>
                    @if (f.area) {
                      <textarea
                        [id]="f.key"
                        [formControlName]="f.key"
                        rows="4"
                        [attr.aria-describedby]="f.key + '-error'"
                        [attr.aria-invalid]="invalid(f.key)"
                        [dir]="f.key.startsWith('ar') ? 'rtl' : 'ltr'"
                      ></textarea>
                    } @else {
                      <input
                        [id]="f.key"
                        [formControlName]="f.key"
                        [attr.aria-describedby]="f.key + '-error'"
                        [attr.aria-invalid]="invalid(f.key)"
                        [dir]="f.key.startsWith('ar') ? 'rtl' : 'ltr'"
                      />
                    }
                    <span class="field-error" [id]="f.key + '-error'">{{
                      invalid(f.key) ? error(f.key) : ''
                    }}</span>
                  </div>
                }
              </div>
            </section>
            <section class="panel form-panel">
              <h2>{{ s.t('التسعير والمخزون', 'Pricing & inventory') }}</h2>
              <div class="form-grid">
                @for (f of numericFields; track f.key) {
                  <div class="field">
                    <label [for]="f.key">{{ s.t(f.ar, f.en) }} *</label
                    ><input
                      [id]="f.key"
                      [formControlName]="f.key"
                      inputmode="decimal"
                      [attr.aria-describedby]="f.key + '-error'"
                      [attr.aria-invalid]="invalid(f.key)"
                    /><span class="field-error" [id]="f.key + '-error'">{{
                      invalid(f.key) ? error(f.key) : ''
                    }}</span>
                  </div>
                }
              </div>
            </section>
          </div>
          <div>
            <section class="panel form-panel">
              <h2>{{ s.t('تنظيم المنتج', 'Product organization') }}</h2>
              <div class="field">
                <label for="sku">SKU *</label
                ><input
                  id="sku"
                  formControlName="sku"
                  dir="ltr"
                  aria-describedby="sku-error"
                  [attr.aria-invalid]="invalid('sku')"
                /><span id="sku-error" class="field-error">{{
                  invalid('sku') ? error('sku') : ''
                }}</span>
              </div>
              <div class="field">
                <label for="categoryId">{{ s.t('الفئة', 'Category') }} *</label
                ><select id="categoryId" formControlName="categoryId">
                  @for (i of categories; track i) {
                    <option [value]="i">{{ s.category(i) }}</option>
                  }
                </select>
              </div>
              <label class="toggle-row"
                ><span
                  ><strong>{{ s.t('منتج نشط', 'Active product') }}</strong
                  ><small>{{
                    s.t('متاح في كتالوج المتجر', 'Available in the store catalog')
                  }}</small></span
                ><input type="checkbox" formControlName="active"
              /></label>
            </section>
            <section class="panel form-panel">
              <h2>{{ s.t('صورة المنتج', 'Product image') }}</h2>
              <div class="preview">
                <span>◇</span>
                @if (form.controls.imageUrl.value && !imageFailed()) {
                  <img
                    [src]="form.controls.imageUrl.value"
                    [alt]="s.t('معاينة المنتج', 'Product preview')"
                    (error)="imageFailed.set(true)"
                  />
                }
              </div>
              <div class="field">
                <label for="imageUrl">{{
                  s.t('رابط الصورة (اختياري)', 'Image URL (optional)')
                }}</label
                ><input
                  id="imageUrl"
                  formControlName="imageUrl"
                  type="url"
                  dir="ltr"
                  placeholder="https://…"
                  (input)="imageFailed.set(false)"
                  aria-describedby="imageUrl-error"
                  [attr.aria-invalid]="invalid('imageUrl')"
                /><span id="imageUrl-error" class="field-error">{{
                  invalid('imageUrl') ? error('imageUrl') : ''
                }}</span
                ><small class="muted">{{
                  s.t(
                    'رابط HTTPS فقط. لا يدعم رفع الملفات.',
                    'HTTPS links only. File uploads are not supported.'
                  )
                }}</small>
              </div>
            </section>
          </div>
        </div>
        <div class="form-actions">
          <p>
            {{
              s.t('تُحفظ التعديلات في هذا المتصفح فقط.', 'Changes are saved only in this browser.')
            }}
          </p>
          <div>
            <a class="button" [routerLink]="router.parseUrl(back)">{{ s.t('إلغاء', 'Cancel') }}</a
            ><button class="button primary" type="submit" [disabled]="saving()">
              {{ saving() ? s.t('جارٍ الحفظ…', 'Saving…') : s.t('حفظ المنتج', 'Save product') }}
            </button>
          </div>
        </div>
      </form>
    } @else {
      <section class="panel empty">
        <h1>{{ s.t('المنتج غير موجود', 'Product not found') }}</h1>
        <a class="button" routerLink="/products">{{ s.t('عرض المنتجات', 'View products') }}</a>
      </section>
    }
  `,
})
export class ProductForm {
  s = inject(Store);
  fb = inject(FormBuilder);
  route = inject(ActivatedRoute);
  router = inject(Router);
  id = this.route.snapshot.paramMap.get('id');
  editing = !!this.id;
  product = this.s.data().products.find((p) => p.id === this.id);
  missing = this.editing && !this.product;
  back = this.route.snapshot.queryParamMap.get('return')?.startsWith('/products?')
    ? this.route.snapshot.queryParamMap.get('return')!
    : '/products';
  saving = signal(false);
  imageFailed = signal(false);
  submitted = false;
  saved = false;
  categories = [0, 1, 2, 3, 4];
  textFields = [
    {
      key: 'arName',
      ar: 'اسم المنتج بالعربية',
      en: 'Arabic product name',
      required: true,
      area: false,
    },
    {
      key: 'enName',
      ar: 'اسم المنتج بالإنجليزية',
      en: 'English product name',
      required: true,
      area: false,
    },
    {
      key: 'arDescription',
      ar: 'الوصف بالعربية',
      en: 'Arabic description',
      required: false,
      area: true,
    },
    {
      key: 'enDescription',
      ar: 'الوصف بالإنجليزية',
      en: 'English description',
      required: false,
      area: true,
    },
  ];
  numericFields = [
    { key: 'price', ar: 'السعر بالجنيه المصري', en: 'Price (EGP)' },
    { key: 'stock', ar: 'كمية المخزون', en: 'Stock quantity' },
    { key: 'lowStockThreshold', ar: 'حد تنبيه المخزون', en: 'Low-stock threshold' },
  ];
  form = this.fb.nonNullable.group({
    arName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    enName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    arDescription: ['', Validators.maxLength(1000)],
    enDescription: ['', Validators.maxLength(1000)],
    sku: [
      '',
      [
        Validators.required,
        (c: AbstractControl) =>
          !uniqueSku(this.s.data().products, String(c.value), this.id) ? { unique: true } : null,
      ],
    ],
    categoryId: ['0', Validators.required],
    price: ['', [Validators.required, price]],
    stock: ['0', [Validators.required, integer]],
    lowStockThreshold: ['5', [Validators.required, integer]],
    imageUrl: ['', https],
    active: [true],
  });
  constructor() {
    const p = this.product;
    if (p)
      this.form.patchValue({
        arName: p.name.ar,
        enName: p.name.en,
        arDescription: p.description.ar,
        enDescription: p.description.en,
        sku: p.sku,
        categoryId: String(p.categoryId),
        price: String(p.price / 100),
        stock: String(p.stock),
        lowStockThreshold: String(p.lowStockThreshold),
        imageUrl: p.imageUrl,
        active: p.active,
      });
  }
  invalid(key: string) {
    const c = this.form.get(key);
    return !!c?.invalid && (c.touched || this.submitted);
  }
  error(key: string) {
    const c = this.form.get(key);
    if (c?.hasError('required')) return this.s.t('هذا الحقل مطلوب.', 'This field is required.');
    if (c?.hasError('unique'))
      return this.s.t('رمز SKU مستخدم بالفعل.', 'This SKU is already in use.');
    if (c?.hasError('price'))
      return this.s.t(
        'أدخل سعرًا موجبًا بخانتين عشريتين كحد أقصى.',
        'Enter a positive price with at most 2 decimal places.',
      );
    if (c?.hasError('integer'))
      return this.s.t('أدخل عددًا صحيحًا لا يقل عن صفر.', 'Enter a whole number, zero or greater.');
    if (c?.hasError('https'))
      return this.s.t('استخدم رابط HTTPS صالحًا.', 'Use a valid HTTPS URL.');
    return this.s.t(
      key.includes('Description') ? 'الحد الأقصى ١٠٠٠ حرف.' : 'يجب أن يكون الاسم بين ٢ و١٠٠ حرف.',
      key.includes('Description')
        ? 'Maximum 1000 characters.'
        : 'Use between 2 and 100 characters.',
    );
  }
  save() {
    if (this.saving()) return;
    this.submitted = true;
    for (const key of Object.keys(this.form.controls)) {
      const c = this.form.get(key)!;
      if (typeof c.value === 'string') c.setValue(c.value.trim());
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue(),
      now = new Date().toISOString();
    const p: Product = {
      id: this.id || 'p-' + crypto.randomUUID(),
      sku: v.sku,
      name: { ar: v.arName, en: v.enName },
      description: { ar: v.arDescription, en: v.enDescription },
      categoryId: +v.categoryId,
      price: Math.round(Number(normalize(v.price)) * 100),
      stock: Number(normalize(v.stock)),
      lowStockThreshold: Number(normalize(v.lowStockThreshold)),
      imageUrl: v.imageUrl,
      active: v.active,
      createdAt: this.product?.createdAt || now,
      updatedAt: now,
    };
    if (this.s.save(p)) {
      this.saved = true;
      this.s.notify(
        this.s.t(
          'تم حفظ المنتج. إذا لم يظهر، امسح الفلاتر للعثور عليه.',
          'Product saved. If hidden by your filters, clear filters to find it.',
        ),
      );
      this.router.navigateByUrl(this.back);
    } else this.form.controls.sku.setErrors({ unique: true });
    this.saving.set(false);
  }
  canLeave() {
    return (
      this.saved ||
      !this.form.dirty ||
      confirm(
        this.s.t(
          'لديك تغييرات غير محفوظة. هل تريد تجاهلها؟',
          'You have unsaved changes. Discard them?',
        ),
      )
    );
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(e: BeforeUnloadEvent) {
    if (this.form.dirty && !this.saved) {
      e.preventDefault();
      e.returnValue = '';
    }
  }
}
