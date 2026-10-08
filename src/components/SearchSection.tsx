import React, { useState } from 'react';
import { 
  Camera, 
  Sparkles, 
  CheckCircle2
} from 'lucide-react';
import { 
  saveCustomProductToStorage
} from '../services/customProductsStorage';
import type { ProductData } from '../types/nutrition';
import { ProductResult } from './ProductResult';
import { NutritionTablePhotoScanner } from './NutritionTablePhotoScanner';
import { DEMO_PRODUCTS } from '../data/demoProducts';

interface SearchSectionProps {
  onOpenDemo?: (demoIndex?: number) => void;
  selectedProduct: ProductData | null;
  setSelectedProduct: (p: ProductData | null) => void;
  onAddToCompare: (product: ProductData) => void;
  productA: ProductData | null;
  productB: ProductData | null;
}

export const SearchSection: React.FC<SearchSectionProps> = ({
  selectedProduct,
  setSelectedProduct,
  onAddToCompare,
  productA,
  productB
}) => {
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  const handleConfirmPhotoProduct = (customProduct: ProductData) => {
    saveCustomProductToStorage(customProduct);
    setSelectedProduct(customProduct);
    setIsScannerModalOpen(false);
    
    // Scroll smoothly to result
    setTimeout(() => {
      const el = document.getElementById('product-result-anchor');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const isCurrentInCompare = (prod: ProductData | null) => {
    if (!prod) return false;
    return productA?.code === prod.code || productB?.code === prod.code;
  };

  return (
    <section id="consultar" className="section">
      <div className="container">
        <div className="section-header">
          <div className="section-badge">
            <Camera size={16} /> Leitura por Fotografia
          </div>
          <h2 className="section-title">Entender um Rótulo</h2>
          <p className="section-subtitle">
            Tire uma foto ou envie a imagem da tabela nutricional impressa na embalagem para extrair os dados e gerar a interpretação detalhada.
          </p>
        </div>

        {/* Demo Selector / Presentation Bar */}
        <div className="search-offline-footer card">
          <div className="offline-footer-content" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <Sparkles size={16} className="icon-emerald" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ textAlign: 'left' }}>
              <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--ink)', lineHeight: 1.35 }}>Apresentando sem câmera ou imagem no momento?</strong>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.55 }}>Escolha um dos produtos de exemplo para simular a leitura e interpretação do rótulo instantaneamente.</p>
            </div>
          </div>
          <div className="demo-stacked-buttons">
            <button 
              type="button"
              onClick={() => {
                setSelectedProduct(DEMO_PRODUCTS[0]);
                setIsScannerModalOpen(false);
              }} 
              className="btn btn-soft width-full"
            >
              Exemplo 1 (Biscoito)
            </button>
            <button 
              type="button"
              onClick={() => {
                setSelectedProduct(DEMO_PRODUCTS[2]);
                setIsScannerModalOpen(false);
              }} 
              className="btn btn-soft width-full"
            >
              Exemplo 2 (Leite)
            </button>
          </div>
        </div>

        {/* Main Action Trigger Card or Button */}
        {!selectedProduct ? (
          <div className="search-card card scanner-main-card" style={{ textAlign: 'center', padding: '2rem 1.5rem', marginBottom: '1.5rem' }}>
            <div className="scanner-header-block" style={{ alignItems: 'center', marginBottom: '1.25rem' }}>
              <div className="method-header" style={{ justifyContent: 'center' }}>
                <Camera size={28} className="icon-emerald" />
                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Fotografar Tabela Nutricional</h3>
              </div>
              <p className="scanner-subtitle text-muted" style={{ maxWidth: '520px', margin: '0.4rem auto 0' }}>
                Tire foto da tabela na embalagem ou envie um arquivo de imagem da sua galeria para extrair os dados e analisar o perfil nutricional.
              </p>
            </div>

            <button 
              type="button"
              onClick={() => setIsScannerModalOpen(true)}
              className="btn btn-emerald btn-lg"
              style={{ minHeight: '52px', padding: '14px 24px', borderRadius: '13px', margin: '0 auto' }}
            >
              <Camera size={22} /> Fotografar Tabela Nutricional
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <button 
              type="button"
              onClick={() => setIsScannerModalOpen(true)}
              className="btn btn-emerald btn-lg"
            >
              <Camera size={20} /> Fotografar / Enviar Outro Rótulo
            </button>
          </div>
        )}

        {/* Reused Modal Photo Scanner (Same pattern as CompareSection) */}
        {isScannerModalOpen && (
          <div className="scanner-modal-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 1100 }}>
            <div className="scanner-modal-card" style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Camera className="icon-emerald" size={22} /> Capturar Rótulo
                </h3>
                <button 
                  type="button"
                  onClick={() => setIsScannerModalOpen(false)}
                  className="btn btn-xs btn-secondary"
                >
                  Fechar
                </button>
              </div>

              <NutritionTablePhotoScanner 
                title="Fotografar Tabela Nutricional"
                subtitle="Tire foto da tabela na embalagem ou envie um arquivo de imagem da sua galeria."
                onConfirmProduct={handleConfirmPhotoProduct}
                onCancel={() => setIsScannerModalOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Selected Product Nutrition Result Panel */}
        <div id="product-result-anchor">
          {selectedProduct && (
            <div className="search-result-wrapper" style={{ marginTop: '1.5rem' }}>
              <div className="card bg-emerald-50" style={{ marginBottom: '1rem', borderLeft: '4px solid #10b981', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={20} className="icon-emerald" />
                  <span style={{ fontWeight: 600, color: '#065f46', fontSize: '0.95rem' }}>
                    Interpretação e Explicação do Rótulo Geradas com Sucesso:
                  </span>
                </div>
              </div>

              <ProductResult 
                product={selectedProduct} 
                onAddToCompare={onAddToCompare}
                isAddedToCompare={isCurrentInCompare(selectedProduct)}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
