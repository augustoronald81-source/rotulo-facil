import React, { useState } from 'react';
import type { ProductData } from '../types/nutrition';
import { ImageModal } from './ImageModal';
import { interpretSingleProduct } from '../utils/singleProductInterpretation';
import { AccessibilityControls } from './AccessibilityControls';
import { buildSingleProductAudioText } from '../utils/accessibilityText';
import { 
  Package, 
  ExternalLink, 
  Info, 
  Search, 
  Sparkles,
  ShieldAlert,
  FileText,
  Columns3,
  Check,
  ZoomIn,
  Tag,
  Calendar,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Scale
} from 'lucide-react';

interface ProductResultProps {
  product: ProductData;
  onAddToCompare?: (product: ProductData) => void;
  isAddedToCompare?: boolean;
}

export const ProductResult: React.FC<ProductResultProps> = ({ 
  product, 
  onAddToCompare,
  isAddedToCompare
}) => {
  const [viewMode, setViewMode] = useState<'100g' | 'serving'>('100g');
  const [zoomImageState, setZoomImageState] = useState<{ url: string; title: string } | null>(null);

  const { nutriments, alerts } = product;
  const interpretation = interpretSingleProduct(product);
  const audioInterpretationText = buildSingleProductAudioText(product.productName, interpretation);

  // Helper to format values or return "Não informado"
  const renderNutrient = (
    val100: number | undefined, 
    valServ: number | undefined, 
    unit: string = 'g',
    precision: number = 1
  ) => {
    const activeVal = viewMode === '100g' ? val100 : valServ;

    if (activeVal === undefined || activeVal === null) {
      return <span className="text-muted text-italic">Não informado</span>;
    }

    const formatted = activeVal % 1 === 0 ? activeVal.toString() : activeVal.toFixed(precision);
    return <strong>{formatted} {unit}</strong>;
  };

  // Helper to render %VD if available
  const renderVD = (
    valServ: number | undefined, 
    refDaily: number
  ) => {
    if (valServ === undefined || valServ === null || !refDaily) {
      return <span className="text-muted">-</span>;
    }
    const vdPercent = Math.round((valServ / refDaily) * 100);
    return <span>{vdPercent}%</span>;
  };

  const hasAlerts = alerts.highAddedSugar || alerts.highSaturatedFat || alerts.highSodium;
  const isLiquid = product.isLiquid;
  const baseLabel = isLiquid ? '100 mL' : '100 g';

  return (
    <div className="product-result-card card">
      {/* Demo Warning Banner if offline demo */}
      {product.isDemo && (
        <div className="demo-notice-banner">
          <Sparkles size={20} className="icon-sparkle" />
          <div>
            <strong>MODO EXEMPLO PARA APRESENTAÇÃO ACADÊMICA</strong>
            <p>Este produto é um modelo demonstrativo pré-carregado para uso sem conexão.</p>
          </div>
        </div>
      )}

      {/* User Custom / Photo Extracted Banner */}
      {product.isUserCustom && (
        <div className="demo-notice-banner bg-amber-50" style={{ borderColor: '#fde68a', color: '#b45309' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Info size={20} className="text-amber" />
            <div>
              <strong>ORIGEM: {product.originLabel ? product.originLabel.toUpperCase() : 'EXTRAÍDO DE FOTO DA EMBALAGEM'}</strong>
              <p>Dados extraídos automaticamente a partir da foto da tabela nutricional da embalagem física.</p>
            </div>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="product-header-grid">
        <div className="product-image-container">
          {product.imageUrl ? (
            <div className="product-img-wrapper" onClick={() => setZoomImageState({ url: product.imageUrl!, title: `Foto da Embalagem - ${product.productName}` })}>
              <img 
                src={product.imageUrl} 
                alt={product.productName} 
                className="product-image"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  (e.target as HTMLElement).parentElement?.classList.add('fallback-img-container');
                }}
              />
              <div className="img-zoom-overlay">
                <ZoomIn size={20} /> Ampliar
              </div>
            </div>
          ) : (
            <div className="product-image-placeholder">
              <Package size={48} className="text-muted" />
              <span className="no-img-text">Imagem não disponível</span>
            </div>
          )}
        </div>

        <div className="product-main-details">
          <div className="product-brand-tag">{product.brand}</div>
          <h2 className="product-name-title">{product.productName}</h2>

          <div className="product-meta-pills">
            <span className="meta-pill">
              <strong>Código:</strong> {product.code}
            </span>
            {product.netWeight && (
              <span className="meta-pill">
                <strong>Peso/Volume:</strong> {product.netWeight}
              </span>
            )}
            {product.category && (
              <span className="meta-pill highlight-pill">
                <strong>Categoria:</strong> {product.category}
              </span>
            )}
          </div>

          {product.servingSize && (
            <div className="product-serving-badge">
              <span>Porção de referência:</span> <strong>{product.servingSize}</strong>
            </div>
          )}

          {/* Image Gallery Options (Embalagem, Tabela) */}
          <div className="product-gallery-options">
            {product.imageFrontUrl && (
              <button 
                onClick={() => setZoomImageState({ url: product.imageFrontUrl!, title: `Foto Frontal - ${product.productName}` })}
                className="btn btn-xs btn-outline"
              >
                <ZoomIn size={14} /> Embalagem
              </button>
            )}
            {product.imageNutritionUrl && (
              <button 
                onClick={() => setZoomImageState({ url: product.imageNutritionUrl!, title: `Foto da Tabela Nutricional - ${product.productName}` })}
                className="btn btn-xs btn-outline"
              >
                <ZoomIn size={14} /> Foto Tabela
              </button>
            )}
          </div>

          {/* Add to Comparison Action Button */}
          {onAddToCompare && (
            <div className="add-to-compare-bar">
              <button
                onClick={() => onAddToCompare(product)}
                className={`btn ${isAddedToCompare ? 'btn-amber' : 'btn-emerald'}`}
              >
                {isAddedToCompare ? (
                  <>
                    <Check size={18} /> Adicionado à Comparação
                  </>
                ) : (
                  <>
                    <Columns3 size={18} /> Adicionar à Comparação
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Front-of-Pack Lupa Alert Banner if Anvisa criteria triggered */}
      {hasAlerts && (
        <div className="anvisa-alert-box card">
          <div className="anvisa-alert-header">
            <div className="lupa-mini-symbol">
              <Search size={18} />
              <span>ALTO EM</span>
            </div>
            <h4>Rotulagem Nutricional Frontal (Interpretação Educativa Anvisa RDC 429/2020)</h4>
          </div>
          <div className="anvisa-alert-tags">
            {alerts.highAddedSugar && (
              <span className="anvisa-alert-pill">AÇÚCAR ADICIONADO</span>
            )}
            {alerts.highSaturatedFat && (
              <span className="anvisa-alert-pill">GORDURA SATURADA</span>
            )}
            {alerts.highSodium && (
              <span className="anvisa-alert-pill">SÓDIO</span>
            )}
          </div>
          <p className="anvisa-alert-disclaimer">
            Interpretação educativa do site calculada sobre a quantidade por {baseLabel} segundo os parâmetros da Anvisa.
          </p>
        </div>
      )}

      {/* Nutrition Table View Selector */}
      <div className="nutrition-table-section">
        <div className="nutrition-section-header">
          <h3>Tabela de Informações Nutricionais</h3>
          
          <div className="table-view-toggle">
            <button 
              className={`toggle-btn ${viewMode === '100g' ? 'active' : ''}`}
              onClick={() => setViewMode('100g')}
            >
              Por {baseLabel}
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'serving' ? 'active' : ''}`}
              onClick={() => setViewMode('serving')}
              disabled={!product.servingSize}
              title={!product.servingSize ? 'Porção não cadastrada no produto' : ''}
            >
              Por Porção {product.servingSize ? `(${product.servingSize})` : ''}
            </button>
          </div>
        </div>

        {/* Anvisa Compliant Table */}
        <div className="table-responsive">
          <table className="nutrition-table">
            <thead>
              <tr>
                <th>Item Nutricional</th>
                <th>Quantidade ({viewMode === '100g' ? baseLabel : 'Porção'})</th>
                {viewMode === 'serving' && <th>%VD* (Porção)</th>}
              </tr>
            </thead>
            <tbody>
              {/* Valor Energético */}
              <tr>
                <td>
                  <strong>Valor Energético</strong>
                </td>
                <td>
                  {renderNutrient(nutriments.energyKcal100g, nutriments.energyKcalServing, 'kcal', 0)}
                </td>
                {viewMode === 'serving' && (
                  <td>{renderVD(nutriments.energyKcalServing, 2000)}</td>
                )}
              </tr>

              {/* Carboidratos */}
              <tr>
                <td>
                  <strong>Carboidratos</strong>
                </td>
                <td>
                  {renderNutrient(nutriments.carbohydrates100g, nutriments.carbohydratesServing, 'g')}
                </td>
                {viewMode === 'serving' && (
                  <td>{renderVD(nutriments.carbohydratesServing, 300)}</td>
                )}
              </tr>

              {/* Açúcares Totais */}
              <tr className="sub-row">
                <td>&nbsp;&nbsp;&nbsp;Açúcares totais</td>
                <td>
                  {renderNutrient(nutriments.sugars100g, nutriments.sugarsServing, 'g')}
                </td>
                {viewMode === 'serving' && <td><span className="text-muted">-</span></td>}
              </tr>

              {/* Açúcares Adicionados */}
              <tr className="sub-row highlight-sub-row">
                <td>
                  &nbsp;&nbsp;&nbsp;Açúcares adicionados
                  <span className="info-tooltip-badge" title="RDC 429/2020: Açúcares acrescentados no processamento"> (Anvisa)</span>
                </td>
                <td>
                  {renderNutrient(nutriments.addedSugars100g, nutriments.addedSugarsServing, 'g')}
                </td>
                {viewMode === 'serving' && (
                  <td>{renderVD(nutriments.addedSugarsServing, 50)}</td>
                )}
              </tr>

              {/* Proteínas */}
              <tr>
                <td>
                  <strong>Proteínas</strong>
                </td>
                <td>
                  {renderNutrient(nutriments.proteins100g, nutriments.proteinsServing, 'g')}
                </td>
                {viewMode === 'serving' && (
                  <td>{renderVD(nutriments.proteinsServing, 50)}</td>
                )}
              </tr>

              {/* Gorduras Totais */}
              <tr>
                <td>
                  <strong>Gorduras Totais</strong>
                </td>
                <td>
                  {renderNutrient(nutriments.fat100g, nutriments.fatServing, 'g')}
                </td>
                {viewMode === 'serving' && (
                  <td>{renderVD(nutriments.fatServing, 55)}</td>
                )}
              </tr>

              {/* Gorduras Saturadas */}
              <tr className="sub-row">
                <td>&nbsp;&nbsp;&nbsp;Gorduras saturadas</td>
                <td>
                  {renderNutrient(nutriments.saturatedFat100g, nutriments.saturatedFatServing, 'g')}
                </td>
                {viewMode === 'serving' && (
                  <td>{renderVD(nutriments.saturatedFatServing, 20)}</td>
                )}
              </tr>

              {/* Gorduras Trans */}
              <tr className="sub-row">
                <td>&nbsp;&nbsp;&nbsp;Gorduras trans</td>
                <td>
                  {renderNutrient(nutriments.transFat100g, nutriments.transFatServing, 'g')}
                </td>
                {viewMode === 'serving' && <td><span className="text-muted">-</span></td>}
              </tr>

              {/* Fibras Alimentares */}
              <tr>
                <td>
                  <strong>Fibras Alimentares</strong>
                </td>
                <td>
                  {renderNutrient(nutriments.fiber100g, nutriments.fiberServing, 'g')}
                </td>
                {viewMode === 'serving' && (
                  <td>{renderVD(nutriments.fiberServing, 25)}</td>
                )}
              </tr>

              {/* Sódio */}
              <tr className="row-sodium">
                <td>
                  <strong>Sódio</strong>
                  <small className="d-block text-muted">Atenção: unidade em mg</small>
                </td>
                <td>
                  {renderNutrient(nutriments.sodium100gMg, nutriments.sodiumServingMg, 'mg', 0)}
                </td>
                {viewMode === 'serving' && (
                  <td>{renderVD(nutriments.sodiumServingMg, 2000)}</td>
                )}
              </tr>

              {/* Micronutrientes Adicionais se presentes */}
              {nutriments.calcium100gMg !== undefined && (
                <tr>
                  <td>Cálcio</td>
                  <td><strong>{nutriments.calcium100gMg} mg</strong></td>
                  {viewMode === 'serving' && <td>-</td>}
                </tr>
              )}
              {nutriments.iron100gMg !== undefined && (
                <tr>
                  <td>Ferro</td>
                  <td><strong>{nutriments.iron100gMg} mg</strong></td>
                  {viewMode === 'serving' && <td>-</td>}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="vd-footnote">
          *% Valores Diários de referência com base em uma dieta de 2.000 kcal ou 8.400 kJ. Seus valores diários podem ser maiores ou menores dependendo de suas necessidades energéticas.
        </p>
      </div>

      {/* Interpretação do Perfil Nutricional */}
      <div className="product-interpretation-section">
        <div className="interpretation-header">
          <div className="interpretation-badge">
            <Sparkles size={15} /> Interpretação Educativa
          </div>
          <h3 className="interpretation-title">
            Interpretação do Perfil Nutricional
          </h3>
          <p className="interpretation-subtitle">
            Entenda o que os dados declarados revelam sobre a composição deste alimento, com base nos parâmetros da Anvisa.
          </p>
        </div>

        {/* Bloco de Acessibilidade: Ouvir análise & VLibras */}
        <AccessibilityControls 
          key={product.code}
          text={audioInterpretationText}
          sectionTitle="Interpretação do Perfil Nutricional"
        />

        {!interpretation.hasSufficientData ? (
          <div className="card interpretation-fallback-card">
            <div className="interpretation-fallback-content">
              <Info size={22} className="text-amber" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ margin: 0 }}>{interpretation.insufficientDataMessage}</p>
            </div>
          </div>
        ) : (
          <div className="interpretation-body">
            {/* 1. Resumo do Perfil */}
            <div className="card interpretation-summary-card">
              <div className="summary-card-inner">
                <div className="summary-icon-tile">
                  <Sparkles size={20} className="icon-emerald" />
                </div>
                <div className="summary-text-box">
                  <h4 className="summary-heading">Resumo do Perfil</h4>
                  <p className="summary-paragraph">{interpretation.summaryText}</p>
                  {interpretation.evaluatedCriteria.length > 0 && (
                    <div className="summary-meta-criteria">
                      <strong>Critérios analisados:</strong> {interpretation.evaluatedCriteria.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2 & 3. Grid: O que se destaca & Pontos de atenção */}
            <div className="interpretation-grid">
              {/* Bloco 2: O que se destaca neste rótulo */}
              <div className="card interpretation-sub-card highlights-card">
                <h4 className="sub-card-title text-emerald">
                  <CheckCircle2 size={18} /> O que se destaca neste rótulo
                </h4>
                {interpretation.highlights.length > 0 ? (
                  <ul className="interpretation-list highlights-list">
                    {interpretation.highlights.map((item, idx) => (
                      <li key={idx}>
                        <span className="bullet-dot bg-emerald"></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted text-italic" style={{ fontSize: '0.85rem' }}>Valores em níveis intermediários sem destaque isolado nos dados identificados.</p>
                )}
              </div>

              {/* Bloco 3: Pontos de atenção */}
              <div className="card interpretation-sub-card attention-card">
                <h4 className="sub-card-title text-amber-dark">
                  <AlertTriangle size={18} /> Pontos de atenção
                </h4>
                <ul className="interpretation-list attention-list">
                  {interpretation.attentionPoints.map((item, idx) => (
                    <li key={idx}>
                      <span className="bullet-dot bg-amber"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bloco 4: Entendendo a porção */}
            <div className="card interpretation-sub-card portion-card">
              <h4 className="sub-card-title">
                <Scale size={18} className="text-emerald" /> Entendendo a porção
              </h4>
              <p className="portion-explanation-text">
                {interpretation.portionExplanation}
              </p>
            </div>

            {/* Bloco 5: Referência curta a ingredientes e alérgenos se disponível */}
            {interpretation.ingredientsAllergensNote && (
              <div className="interpretation-context-note">
                <Info size={15} className="text-emerald" style={{ flexShrink: 0 }} />
                <span>{interpretation.ingredientsAllergensNote}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ingredients, Allergens, Traces & Seals Section */}
      <div className="ingredients-allergens-section">
        <div className="card-sub-box">
          <h4>
            <FileText size={18} className="text-emerald" /> Lista de Ingredientes
          </h4>
          {product.ingredientsText ? (
            <p className="ingredients-text">{product.ingredientsText}</p>
          ) : (
            <p className="text-muted text-italic">Ingredientes não informados no cadastro.</p>
          )}
        </div>

        <div className="card-sub-box bg-amber-light">
          <h4>
            <ShieldAlert size={18} className="text-amber-dark" /> Declaração de Alergênicos
          </h4>
          {product.allergensFromIngredients ? (
            <p className="allergens-text">{product.allergensFromIngredients}</p>
          ) : product.allergensTags && product.allergensTags.length > 0 ? (
            <p className="allergens-text">
              Pode conter / Contém: <strong>{product.allergensTags.join(', ')}</strong>
            </p>
          ) : (
            <p className="text-muted text-italic">Declaração de alergênicos não informada no cadastro.</p>
          )}

          {/* Traces declaration separated */}
          {product.tracesTags && product.tracesTags.length > 0 && (
            <div className="traces-box-sub">
              <strong>
                <AlertCircle size={14} /> Traços eventuais declarados:
              </strong>
              <span> Pode conter traços de {product.tracesTags.join(', ')}.</span>
            </div>
          )}
        </div>
      </div>

      {/* Seals and Registered Claims */}
      {product.labelsTags && product.labelsTags.length > 0 && (
        <div className="product-labels-wrapper">
          <h4>
            <Tag size={16} className="text-emerald" /> Selos e Alegações Cadastradas (Fonte: {product.isUserCustom ? 'Usuário' : 'Open Food Facts'})
          </h4>
          <div className="labels-pill-list">
            {product.labelsTags.map((label, idx) => (
              <span key={idx} className="label-tag-pill">
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Source Notice & Packaging Check prompt */}
      <div className="product-footer-source">
        <div className="source-info">
          <Info size={18} className="icon-emerald" />
          <div>
            <span>
              <strong>Fonte dos dados:</strong> {product.originLabel ? product.originLabel : product.isUserCustom ? 'Extraído de foto da embalagem' : product.isDemo ? 'Exemplo Ilustrativo Acadêmico' : 'Banco Colaborativo Open Food Facts Brasil'}. 
            </span>
            {product.lastModified && (
              <span className="d-block text-muted" style={{ fontSize: '0.785rem' }}>
                <Calendar size={12} /> Última atualização no cadastro: {product.lastModified}
              </span>
            )}
            <em className="d-block text-muted">Confira sempre as informações na embalagem física do fabricante.</em>
          </div>
        </div>

        {product.rawSourceUrl && !product.isDemo && !product.isUserCustom && (
          <a 
            href={product.rawSourceUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-sm btn-outline"
          >
            <ExternalLink size={14} /> Ver no Open Food Facts
          </a>
        )}
      </div>

      {/* Image Zoom Modal */}
      {zoomImageState && (
        <ImageModal
          imageUrl={zoomImageState.url}
          title={zoomImageState.title}
          onClose={() => setZoomImageState(null)}
        />
      )}
    </div>
  );
};
