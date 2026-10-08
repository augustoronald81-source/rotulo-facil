import type { ProductData } from '../types/nutrition';

const STORAGE_KEY = 'rotulo_facil_custom_products_v1';

export function getCustomProducts(): ProductData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Erro ao ler produtos do localStorage:', err);
    return [];
  }
}

export function getCustomProductByBarcode(barcode: string): ProductData | null {
  const cleanBarcode = barcode.trim().replace(/\D/g, '');
  if (!cleanBarcode) return null;
  const products = getCustomProducts();
  return products.find(p => p.code === cleanBarcode) || null;
}

export function saveCustomProductToStorage(product: ProductData): void {
  try {
    const products = getCustomProducts();
    const existingIndex = products.findIndex(p => p.code === product.code);
    
    if (existingIndex >= 0) {
      products[existingIndex] = product; // Update existing
    } else {
      products.push(product); // Add new
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch (err) {
    console.error('Erro ao salvar produto no localStorage:', err);
  }
}

export function deleteCustomProductFromStorage(barcode: string): void {
  try {
    const cleanBarcode = barcode.trim().replace(/\D/g, '');
    const products = getCustomProducts().filter(p => p.code !== cleanBarcode);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch (err) {
    console.error('Erro ao excluir produto do localStorage:', err);
  }
}
