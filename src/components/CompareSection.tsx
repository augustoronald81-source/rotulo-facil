import React, { useState } from 'react';
import type { ProductData, ProductNutriments } from '../types/nutrition';
import { DEMO_PRODUCTS } from '../data/demoProducts';
import { ImageModal } from './ImageModal';
import { NutritionTablePhotoScanner } from './NutritionTablePhotoScanner';
import { analyzeProductComparison } from '../utils/comparisonEngine';
import { AccessibilityControls } from './AccessibilityControls';
import { buildComparisonAudioText } from '../utils/accessibilityText';
import { 
  Columns3, 
  Sparkles, 
  Trash2, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Package,
  Camera,
  Layers,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Scale,
  Zap,
  ArrowRight
} from 'lucide-react';

interface CompareSectionProps {
  productA: ProductData | null;
  productB: ProductData | null;
  onSetProductA: (p: ProductData | null) => void;
  onSetProductB: (p: ProductData | null) => void;
  onOpenSearchForSlot?: (slot: 'A' | 'B') => void;
}

export const CompareSection: React.FC<CompareSectionProps> = ({
  productA,
  productB,
  onSetProductA,
  onSetProductB
}) => {
  // Resumo is the FIRST and DEFAULT tab
  const [activeTab, setActiveTab] = useState<'resumo' | 'tabela'>('resumo');
  const [showDetailedDeltas, setShowDetailedDeltas] = useState(false);
  const [zoomImageState, setZoomImageState] = useState<{ url: string; title: string } | null>(null);
  const [activeScannerSlot, setActiveScannerSlot] = useState<'A' | 'B' | null>(null);

  const handleLoadDemoPair = (pairType: 'biscoitos' | 'leites') => {
    if (pairType === 'biscoitos') {
      onSetProductA(DEMO_PRODUCTS[0]); // Biscoito Recheado
      onSetProductB(DEMO_PRODUCTS[1]); // Biscoito Integral
    } else {
      onSetProductA(DEMO_PRODUCTS[2]); // Leite Integral
      onSetProductB(DEMO_PRODUCTS[3]); // Bebida Láctea Achocolatada
    }
  };

  const isBothPresent = productA !== null && productB !== null;
  const analysis = isBothPresent && productA && productB ? analyzeProductComparison(productA, productB) : null;
  const baseLabel = isBothPresent && productA ? (productA.isLiquid ? '100 mL' : '100 g') : '100 g / 100 mL';
  const comparisonAudioText = isBothPresent && productA && productB && analysis
    ? buildComparisonAudioText(productA, productB, analysis)
    : '';

  // Helper for side-by-side table rows
  const renderCompareRow = (
    label: string,
    key100: keyof ProductNutriments,
    unit: string,
    lowerIsBetter?: boolean,
    precision: number = 1
  ) => {
    if (!isBothPresent || !productA || !productB) return null;

    const valA = productA.nutriments[key100] as number | undefined;
    const valB = productB.nutriments[key100] as number | undefined;

    const hasA = valA !== undefined && valA !== null;
    const hasB = valB !== undefined && valB !== null;

    let deltaTextA: string | null = null;
    let deltaTextB: string | null = null;

    if (hasA && hasB && analysis?.isSamePhysicalState) {
      if (valA !== valB) {
        const diff = Math.abs(valA - valB);
        const formattedDiff = diff % 1 === 0 ? diff.toString() : diff.toFixed(precision);

        if (valA < valB) {
          if (lowerIsBetter) {
            deltaTextA = `-${formattedDiff} ${unit}`;
          } else {
            deltaTextB = `+${formattedDiff} ${unit}`;
          }
        } else {
          if (lowerIsBetter) {
            deltaTextB = `-${formattedDiff} ${unit}`;
          } else {
            deltaTextA = `+${formattedDiff} ${unit}`;
          }
        }
      }
    }

    return (
      <tr className={key100.toString().includes('addedSugars') ? 'highlight-sub-row' : ''}>
        <td className="nutrient-col-title">
          <strong>{label}</strong>
          <small className="d-block text-muted">por {baseLabel}</small>
        </td>

        {/* Product A */}
        <td className="compare-val-cell">
          {hasA ? (
            <div>
              <span className="compare-number">{valA % 1 === 0 ? valA : valA.toFixed(precision)} {unit}</span>
              {deltaTextA && (
                <span className="badge" style={{ display: 'inline-block', marginLeft: '0.4rem', fontSize: '0.725rem', background: '#dcfce7', color: '#15803d' }}>
                  {deltaTextA}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted text-italic">Não informado</span>
          )}
        </td>

        {/* Product B */}
        <td className="compare-val-cell">
          {hasB ? (
            <div>
              <span className="compare-number">{valB % 1 === 0 ? valB : valB.toFixed(precision)} {unit}</span>
              {deltaTextB && (
                <span className="badge" style={{ display: 'inline-block', marginLeft: '0.4rem', fontSize: '0.725rem', background: '#dcfce7', color: '#15803d' }}>
                  {deltaTextB}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted text-italic">Não informado</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <section id="comparar" className="section bg-light">
      <div className="container">
        <div className="section-header">
          <div className="section-badge">
            <Columns3 size={16} /> Comparação Nutricional Detalhada
          </div>
          <h2 className="section-title">Comparar dois Rótulos</h2>
          <p className="section-subtitle">
            Fotografe a tabela nutricional de dois produtos (da mesma categoria ou categorias diferentes) para analisar o perfil nutricional na mesma quantidade de referência.
          </p>
        </div>

        {/* Offline Demo Selector */}
        <div className="compare-demo-bar card" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
          <div className="demo-bar-info" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <Sparkles size={16} className="icon-emerald" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ textAlign: 'left' }}>
              <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--ink)' }}>Exemplos Prontos de Comparação:</strong>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.6 }}>Carregue um par pré-configurado para testar o resumo de comparação rápida.</p>
            </div>
          </div>
          <div className="demo-bar-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <button 
              type="button"
              onClick={() => handleLoadDemoPair('biscoitos')}
              className="btn btn-soft width-full"
              style={{ minHeight: '44px' }}
            >
              Exemplo 1: Biscoito Recheado vs. Integral
            </button>
            <button 
              type="button"
              onClick={() => handleLoadDemoPair('leites')}
              className="btn btn-soft width-full"
              style={{ minHeight: '44px' }}
            >
              Exemplo 2: Leite Integral vs. Achocolatado
            </button>
          </div>
        </div>

        {/* Product Slots Header */}
        <div className="compare-slots-grid">
          {/* Slot A */}
          <div className={`compare-slot-card card ${productA ? 'slot-filled' : 'slot-empty'}`}>
            <div className="slot-header-badge">Rótulo A</div>
            {productA ? (
              <div className="slot-product-info">
                <div 
                  className="slot-img-box clickable-img-box"
                  onClick={() => productA.imageUrl && setZoomImageState({ url: productA.imageUrl, title: `Rótulo A: ${productA.productName}` })}
                >
                  {productA.imageUrl ? (
                    <img src={productA.imageUrl} alt={productA.productName} />
                  ) : (
                    <div className="no-img-box-sm">
                      <Package size={24} className="text-muted" />
                      <small>Sem imagem</small>
                    </div>
                  )}
                </div>
                <div className="slot-details">
                  <span className="slot-brand">{productA.brand}</span>
                  <h4 className="slot-title">{productA.productName}</h4>
                  <small className="slot-code">Base: {productA.isLiquid ? '100 mL' : '100 g'}</small>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <button 
                    type="button"
                    onClick={() => setActiveScannerSlot('A')}
                    className="btn btn-xs btn-outline"
                    title="Trocar foto do Rótulo A"
                  >
                    <RefreshCw size={14} /> Foto Tabela
                  </button>
                  <button 
                    type="button"
                    onClick={() => onSetProductA(null)} 
                    className="slot-remove-btn"
                    title="Remover Rótulo A"
                  >
                    <Trash2 size={16} /> Remover
                  </button>
                </div>
              </div>
            ) : (
              <div className="slot-placeholder">
                <p style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>Rótulo A não selecionado</p>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
                  Fotografe a tabela do primeiro produto.
                </p>
                <button 
                  type="button"
                  onClick={() => setActiveScannerSlot('A')} 
                  className="btn btn-emerald btn-md width-full"
                  style={{ minHeight: '48px' }}
                >
                  <Camera size={18} /> Fotografar Rótulo A
                </button>
              </div>
            )}
          </div>

          {/* Slot B */}
          <div className={`compare-slot-card card ${productB ? 'slot-filled' : 'slot-empty'}`}>
            <div className="slot-header-badge">Rótulo B</div>
            {productB ? (
              <div className="slot-product-info">
                <div 
                  className="slot-img-box clickable-img-box"
                  onClick={() => productB.imageUrl && setZoomImageState({ url: productB.imageUrl, title: `Rótulo B: ${productB.productName}` })}
                >
                  {productB.imageUrl ? (
                    <img src={productB.imageUrl} alt={productB.productName} />
                  ) : (
                    <div className="no-img-box-sm">
                      <Package size={24} className="text-muted" />
                      <small>Sem imagem</small>
                    </div>
                  )}
                </div>
                <div className="slot-details">
                  <span className="slot-brand">{productB.brand}</span>
                  <h4 className="slot-title">{productB.productName}</h4>
                  <small className="slot-code">Base: {productB.isLiquid ? '100 mL' : '100 g'}</small>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <button 
                    type="button"
                    onClick={() => setActiveScannerSlot('B')}
                    className="btn btn-xs btn-outline"
                    title="Trocar foto do Rótulo B"
                  >
                    <RefreshCw size={14} /> Foto Tabela
                  </button>
                  <button 
                    type="button"
                    onClick={() => onSetProductB(null)} 
                    className="slot-remove-btn"
                    title="Remover Rótulo B"
                  >
                    <Trash2 size={16} /> Remover
                  </button>
                </div>
              </div>
            ) : (
              <div className="slot-placeholder">
                <p style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>Rótulo B não selecionado</p>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
                  Fotografe a tabela do segundo produto.
                </p>
                <button 
                  type="button"
                  onClick={() => setActiveScannerSlot('B')} 
                  className="btn btn-emerald btn-md width-full"
                  style={{ minHeight: '48px' }}
                >
                  <Camera size={18} /> Fotografar Rótulo B
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Photo Scanner */}
        {activeScannerSlot && (
          <div className="scanner-modal-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 1100 }}>
            <div className="scanner-modal-card" style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Camera className="icon-emerald" size={22} /> Capturar Rótulo {activeScannerSlot}
                </h3>
                <button 
                  type="button"
                  onClick={() => setActiveScannerSlot(null)}
                  className="btn btn-xs btn-secondary"
                >
                  Fechar
                </button>
              </div>

              <NutritionTablePhotoScanner 
                title={`Fotografar Tabela Nutricional - Rótulo ${activeScannerSlot}`}
                subtitle="Capture ou envie a foto da tabela impressa na embalagem."
                slotName={`Rótulo ${activeScannerSlot}`}
                onConfirmProduct={(product) => {
                  if (activeScannerSlot === 'A') onSetProductA(product);
                  if (activeScannerSlot === 'B') onSetProductB(product);
                  setActiveScannerSlot(null);
                }}
                onCancel={() => setActiveScannerSlot(null)}
              />
            </div>
          </div>
        )}

        {/* Warnings Banner for Category & State Differences */}
        {isBothPresent && analysis && (
          <>
            {analysis.stateWarning && (
              <div className="status-banner error-banner card" style={{ marginTop: '1.25rem', padding: '1rem' }}>
                <AlertTriangle size={24} className="text-red" style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: '0.95rem', color: '#991b1b' }}>Aviso de Incompatibilidade de Base ou Preparo:</strong>
                  <p style={{ fontSize: '0.875rem', margin: '0.2rem 0 0 0', color: '#7f1d1d' }}>
                    {analysis.stateWarning}
                  </p>
                </div>
              </div>
            )}

            {analysis.categoryNote && (
              <div className="card bg-amber-50" style={{ marginTop: '1rem', borderLeft: '4px solid #f59e0b', padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <Info size={22} className="text-amber" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: '#b45309' }}>Produtos de Categorias Diferentes:</strong>
                    <p style={{ fontSize: '0.875rem', color: '#92400e', margin: '0.2rem 0 0 0' }}>
                      {analysis.categoryNote}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Main Comparison Content - RESUMO FIRST */}
        {isBothPresent && productA && productB && analysis && (
          <div className="compare-main-tabs-wrapper card" style={{ marginTop: '1.5rem' }}>
            
            {/* Tab Navigation */}
            <div className="compare-tab-buttons">
              <button 
                type="button"
                className={`compare-tab-btn ${activeTab === 'resumo' ? 'active' : ''}`}
                onClick={() => setActiveTab('resumo')}
              >
                <Sparkles size={18} /> 1. Resumo da Comparação
              </button>

              <button 
                type="button"
                className={`compare-tab-btn ${activeTab === 'tabela' ? 'active' : ''}`}
                onClick={() => setActiveTab('tabela')}
              >
                <Layers size={18} /> 2. Tabela Nutricional Lado a Lado
              </button>
            </div>

            {/* TAB 1: RESUMO DA COMPARAÇÃO (FIRST & DEFAULT) */}
            {activeTab === 'resumo' && (
              <div className="compare-tab-content">
                
                {/* Conclusion Banner */}
                <div className="card bg-emerald-50" style={{ borderLeft: '4px solid #10b981', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <Scale size={24} className="icon-emerald" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: '1rem', color: '#065f46' }}>Conclusão do Perfil Nutricional:</strong>
                      <p style={{ fontSize: '0.925rem', color: '#047857', margin: '0.35rem 0 0 0', lineHeight: 1.5 }}>
                        {analysis.conclusion}
                      </p>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.785rem', color: '#065f46' }}>
                        <strong>Critérios Avaliados:</strong> {analysis.criteriaUsed.join(', ') || 'Composição Nutricional Geral'}
                      </div>

                      {/* Bloco de Acessibilidade: Ouvir análise & VLibras */}
                      <AccessibilityControls 
                        key={`${productA.code}-${productB.code}`}
                        text={comparisonAudioText}
                        sectionTitle="Conclusão do Perfil Nutricional"
                      />
                    </div>
                  </div>
                </div>

                {/* Key Differences Grid */}
                {analysis.deltas.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '1rem', color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Zap size={18} className="icon-emerald" /> Principais Diferenças Nutricionais (por {baseLabel}):
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                      {analysis.deltas.slice(0, showDetailedDeltas ? undefined : 4).map((d, i) => (
                        <div key={i} className="card bg-white" style={{ border: '1px solid #e2e8f0', padding: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                            <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{d.label}</strong>
                            <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.75rem' }}>Δ {d.formattedDelta}</span>
                          </div>
                          <div style={{ fontSize: '0.825rem', color: '#475569', display: 'flex', gap: '0.75rem', marginBottom: '0.35rem' }}>
                            <span><strong>Rótulo A:</strong> {d.valA !== null ? `${d.valA} ${d.unit}` : '-'}</span>
                            <span><strong>Rótulo B:</strong> {d.valB !== null ? `${d.valB} ${d.unit}` : '-'}</span>
                          </div>
                          <p style={{ fontSize: '0.785rem', color: '#64748b', margin: 0, borderTop: '1px dashed #f1f5f9', paddingTop: '0.35rem' }}>
                            {d.meaning}
                          </p>
                        </div>
                      ))}
                    </div>

                    {analysis.deltas.length > 4 && (
                      <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                        <button 
                          type="button"
                          onClick={() => setShowDetailedDeltas(!showDetailedDeltas)}
                          className="btn btn-xs btn-outline"
                          style={{ fontSize: '0.8rem' }}
                        >
                          {showDetailedDeltas ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {showDetailedDeltas ? 'Ocultar Detalhes Secundários' : `Ver +${analysis.deltas.length - 4} Diferenças`}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Highlights & Attention Side-by-Side Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  
                  {/* Rótulo A Box */}
                  <div className="card bg-white" style={{ border: '1px solid #cbd5e1', padding: '1rem' }}>
                    <div className="slot-header-badge" style={{ marginBottom: '0.75rem' }}>Rótulo A: {productA.productName}</div>
                    
                    {analysis.highlightsA.length > 0 && (
                      <div style={{ marginBottom: '0.85rem' }}>
                        <strong style={{ fontSize: '0.85rem', color: '#047857', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle2 size={16} /> Pontos Favoráveis:
                        </strong>
                        <ul style={{ margin: '0.35rem 0 0 1.1rem', fontSize: '0.825rem', color: '#065f46' }}>
                          {analysis.highlightsA.map((h, i) => <li key={i}>{h}</li>)}
                        </ul>
                      </div>
                    )}

                    {analysis.attentionA.length > 0 && (
                      <div>
                        <strong style={{ fontSize: '0.85rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <AlertTriangle size={16} /> Pontos de Atenção:
                        </strong>
                        <ul style={{ margin: '0.35rem 0 0 1.1rem', fontSize: '0.825rem', color: '#92400e' }}>
                          {analysis.attentionA.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Rótulo B Box */}
                  <div className="card bg-white" style={{ border: '1px solid #cbd5e1', padding: '1rem' }}>
                    <div className="slot-header-badge" style={{ marginBottom: '0.75rem' }}>Rótulo B: {productB.productName}</div>
                    
                    {analysis.highlightsB.length > 0 && (
                      <div style={{ marginBottom: '0.85rem' }}>
                        <strong style={{ fontSize: '0.85rem', color: '#047857', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle2 size={16} /> Pontos Favoráveis:
                        </strong>
                        <ul style={{ margin: '0.35rem 0 0 1.1rem', fontSize: '0.825rem', color: '#065f46' }}>
                          {analysis.highlightsB.map((h, i) => <li key={i}>{h}</li>)}
                        </ul>
                      </div>
                    )}

                    {analysis.attentionB.length > 0 && (
                      <div>
                        <strong style={{ fontSize: '0.85rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <AlertTriangle size={16} /> Pontos de Atenção:
                        </strong>
                        <ul style={{ margin: '0.35rem 0 0 1.1rem', fontSize: '0.825rem', color: '#92400e' }}>
                          {analysis.attentionB.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>

                </div>

                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <button type="button" onClick={() => setActiveTab('tabela')} className="btn btn-emerald btn-md">
                    Ver Tabela Nutricional Completa Lado a Lado <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: TABELA NUTRICIONAL LADO A LADO */}
            {activeTab === 'tabela' && (
              <div className="compare-tab-content">
                <div className="table-responsive">
                  <table className="nutrition-table compare-table">
                    <thead>
                      <tr>
                        <th style={{ width: '28%' }}>Item Nutricional</th>
                        <th style={{ width: '36%' }}>Rótulo A: {productA.productName}</th>
                        <th style={{ width: '36%' }}>Rótulo B: {productB.productName}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderCompareRow('Valor Energético', 'energyKcal100g', 'kcal', true, 0)}
                      {renderCompareRow('Carboidratos', 'carbohydrates100g', 'g', true)}
                      {renderCompareRow('Açúcares Totais', 'sugars100g', 'g', true)}
                      {renderCompareRow('Açúcares Adicionados', 'addedSugars100g', 'g', true)}
                      {renderCompareRow('Proteínas', 'proteins100g', 'g', false)}
                      {renderCompareRow('Gorduras Totais', 'fat100g', 'g', true)}
                      {renderCompareRow('Gorduras Saturadas', 'saturatedFat100g', 'g', true)}
                      {renderCompareRow('Gorduras Trans', 'transFat100g', 'g', true)}
                      {renderCompareRow('Fibras Alimentares', 'fiber100g', 'g', false)}
                      {renderCompareRow('Sódio', 'sodium100gMg', 'mg', true, 0)}
                    </tbody>
                  </table>
                </div>

                <div className="compare-servings-footer card" style={{ marginTop: '1.25rem' }}>
                  <h4>Valores por Porção de Referência Declarada</h4>
                  <div className="servings-grid">
                    <div>
                      <strong>Rótulo A ({productA.productName}):</strong> {productA.servingSize ? productA.servingSize : 'Porção não cadastrada'}
                    </div>
                    <div>
                      <strong>Rótulo B ({productB.productName}):</strong> {productB.servingSize ? productB.servingSize : 'Porção não cadastrada'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="compare-footer-disclaimer">
              <Info size={16} />
              <span>
                <strong>Nota Nutricional:</strong> A comparação utiliza como base quantitativa padronizada a fração de {baseLabel}.
              </span>
            </div>
          </div>
        )}

        {!isBothPresent && (
          <div className="compare-empty-prompt card" style={{ marginTop: '1.5rem', padding: '2rem 1.25rem', textAlign: 'center' }}>
            <div className="card-icon-tile" style={{ margin: '0 auto 12px auto' }}>
              <Columns3 size={20} className="icon-emerald" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '0.5rem' }}>Fotografe dois Rótulos para Comparação</h3>
            <p className="text-muted" style={{ maxWidth: '540px', margin: '0 auto 1.25rem auto', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Tire a foto da tabela nutricional do primeiro e do segundo produto para visualizar a comparação estruturada.
            </p>
            <div className="empty-prompt-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '360px', margin: '0 auto' }}>
              <button type="button" onClick={() => setActiveScannerSlot('A')} className="btn btn-primary width-full" style={{ minHeight: '48px' }}>
                <Camera size={18} /> Fotografar Rótulo A
              </button>
              <button type="button" onClick={() => handleLoadDemoPair('biscoitos')} className="btn btn-outline width-full" style={{ minHeight: '48px' }}>
                <Sparkles size={18} /> Carregar Exemplo de Comparação
              </button>
            </div>
          </div>
        )}
      </div>

      {/* High Resolution Image Modal */}
      {zoomImageState && (
        <ImageModal
          imageUrl={zoomImageState.url}
          title={zoomImageState.title}
          onClose={() => setZoomImageState(null)}
        />
      )}
    </section>
  );
};
