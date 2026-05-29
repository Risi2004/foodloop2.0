export const SUPPLIER_BUNDLE_UPDATED = 'supplier-bundle-updated';

export function dispatchSupplierBundleUpdated() {
  window.dispatchEvent(new CustomEvent(SUPPLIER_BUNDLE_UPDATED));
}
