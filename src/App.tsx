import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { EducationalGuide } from './components/EducationalGuide';
import { SearchSection } from './components/SearchSection';
import { CompareSection } from './components/CompareSection';
import { AboutSection } from './components/AboutSection';
import { Footer } from './components/Footer';
import type { ProductData } from './types/nutrition';
import { DEMO_PRODUCTS } from './data/demoProducts';
import { Sparkles, X, ChevronRight } from 'lucide-react';

const getRouteFromPath = (path: string): string => {
  const normalized = path.toLowerCase();
  if (normalized === '/entender-rotulo' || normalized === '/consultar') return '/entender-rotulo';
  if (normalized === '/comparar') return '/comparar';
  if (normalized === '/guia' || normalized === '/entender') return '/guia';
  if (normalized === '/sobre') return '/sobre';
  return '/';
};

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => getRouteFromPath(window.location.pathname));
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  
  // Comparison state (preserved across page navigation during session)
  const [productA, setProductA] = useState<ProductData | null>(null);
  const [productB, setProductB] = useState<ProductData | null>(null);
  const [targetSlot, setTargetSlot] = useState<'A' | 'B' | null>(null);

  const [isDemoSelectorOpen, setIsDemoSelectorOpen] = useState(false);

  const cancelAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignora
      }
    }
  };

  // Listen to browser Back / Forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      cancelAudio();
      const route = getRouteFromPath(window.location.pathname);
      setCurrentPath(route);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    cancelAudio();
    const route = getRouteFromPath(path);
    if (window.location.pathname !== route) {
      window.history.pushState({}, '', route);
    }
    setCurrentPath(route);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleOpenDemo = (demoIndex: number = 0) => {
    cancelAudio();
    const demo = DEMO_PRODUCTS[demoIndex] || DEMO_PRODUCTS[0];
    setSelectedProduct(demo);
    navigate('/entender-rotulo');
    setIsDemoSelectorOpen(false);
  };

  const handleAddToCompare = (product: ProductData) => {
    cancelAudio();
    if (!productA) {
      setProductA(product);
    } else if (!productB && productA.code !== product.code) {
      setProductB(product);
    } else {
      setProductA(product);
    }
    navigate('/comparar');
  };

  const handleOpenSearchForSlot = (slot: 'A' | 'B') => {
    cancelAudio();
    setTargetSlot(slot);
    navigate('/entender-rotulo');
  };

  const handleSelectProductFromSearch = (product: ProductData | null) => {
    cancelAudio();
    setSelectedProduct(product);
    if (product && targetSlot) {
      if (targetSlot === 'A') setProductA(product);
      if (targetSlot === 'B') setProductB(product);
      setTargetSlot(null);
      navigate('/comparar');
    }
  };

  return (
    <div className="app-container">
      {/* Sticky Top Header */}
      <Header 
        currentPath={currentPath}
        onNavigate={navigate}
        onOpenDemo={() => setIsDemoSelectorOpen(true)}
      />

      {/* Main Content Rendered by Active Route */}
      <main>
        {currentPath === '/' && (
          <HomePage 
            onNavigate={navigate}
            onOpenDemo={() => setIsDemoSelectorOpen(true)}
          />
        )}

        {currentPath === '/entender-rotulo' && (
          <SearchSection 
            onOpenDemo={(index) => handleOpenDemo(index)}
            selectedProduct={selectedProduct}
            setSelectedProduct={handleSelectProductFromSearch}
            onAddToCompare={handleAddToCompare}
            productA={productA}
            productB={productB}
          />
        )}

        {currentPath === '/comparar' && (
          <CompareSection 
            productA={productA}
            productB={productB}
            onSetProductA={setProductA}
            onSetProductB={setProductB}
            onOpenSearchForSlot={handleOpenSearchForSlot}
          />
        )}

        {currentPath === '/guia' && (
          <EducationalGuide />
        )}

        {currentPath === '/sobre' && (
          <AboutSection />
        )}
      </main>

      {/* Site Footer */}
      <Footer />

      {/* Demo Selector Modal */}
      {isDemoSelectorOpen && (
        <div className="scanner-modal-backdrop" role="dialog" aria-modal="true">
          <div className="scanner-modal-card demo-modal-card">
            <div className="scanner-modal-header">
              <div className="scanner-header-title text-emerald">
                <Sparkles size={24} />
                <h3>Exemplos para Apresentação Acadêmica</h3>
              </div>
              <button 
                onClick={() => setIsDemoSelectorOpen(false)}
                className="scanner-close-btn"
                aria-label="Fechar modal de exemplo"
              >
                <X size={24} />
              </button>
            </div>

            <div className="scanner-modal-body demo-modal-body">
              <p className="demo-modal-desc">
                Selecione um dos produtos demonstrativos abaixo para apresentar as funcionalidades do site mesmo sem conexão com a internet ou sem câmera disponível:
              </p>

              <div className="demo-modal-list">
                {DEMO_PRODUCTS.map((product, idx) => (
                  <div
                    key={product.code}
                    onClick={() => handleOpenDemo(idx)}
                    className="card demo-item-card"
                  >
                    <div>
                      <div className="demo-item-badge">
                        Exemplo {idx + 1}
                      </div>
                      <strong className="demo-item-name">{product.productName}</strong>
                      <div className="demo-item-subtitle">{product.demoTitle}</div>
                    </div>
                    <ChevronRight size={20} className="text-emerald" />
                  </div>
                ))}
              </div>
            </div>

            <div className="scanner-modal-footer">
              <button onClick={() => setIsDemoSelectorOpen(false)} className="btn btn-secondary width-full">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
