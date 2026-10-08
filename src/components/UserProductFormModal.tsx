import React, { useState } from 'react';
import type { ProductData, FrontOfPackAlerts } from '../types/nutrition';
import { Edit3, X, Save, Info } from 'lucide-react';

interface UserProductFormModalProps {
  initialBarcode: string;
  editingProduct?: ProductData | null;
  onSave: (product: ProductData) => void;
  onClose: () => void;
}

export const UserProductFormModal: React.FC<UserProductFormModalProps> = ({
  initialBarcode,
  editingProduct,
  onSave,
  onClose
}) => {
  const [barcode, setBarcode] = useState(editingProduct?.code || initialBarcode || '');
  const [productName, setProductName] = useState(editingProduct?.productName || '');
  const [brand, setBrand] = useState(editingProduct?.brand || '');
  const [category, setCategory] = useState(editingProduct?.category || '');
  const [netWeight, setNetWeight] = useState(editingProduct?.netWeight || '');
  const [isLiquid, setIsLiquid] = useState(editingProduct?.isLiquid || false);
  const [servingSize, setServingSize] = useState(editingProduct?.servingSize || '30 g');

  // Nutrition inputs (per 100g / 100mL)
  const nut = editingProduct?.nutriments || {};
  const [energyKcal, setEnergyKcal] = useState(nut.energyKcal100g?.toString() || '');
  const [carbs, setCarbs] = useState(nut.carbohydrates100g?.toString() || '');
  const [sugars, setSugars] = useState(nut.sugars100g?.toString() || '');
  const [addedSugars, setAddedSugars] = useState(nut.addedSugars100g?.toString() || '');
  const [proteins, setProteins] = useState(nut.proteins100g?.toString() || '');
  const [fat, setFat] = useState(nut.fat100g?.toString() || '');
  const [saturatedFat, setSaturatedFat] = useState(nut.saturatedFat100g?.toString() || '');
  const [transFat, setTransFat] = useState(nut.transFat100g?.toString() || '');
  const [fiber, setFiber] = useState(nut.fiber100g?.toString() || '');
  const [sodiumMg, setSodiumMg] = useState(nut.sodium100gMg?.toString() || '');

  // Ingredients & Allergens
  const [ingredientsText, setIngredientsText] = useState(editingProduct?.ingredientsText || '');
  const [allergensText, setAllergensText] = useState(editingProduct?.allergensFromIngredients || '');
  const [tracesText, setTracesText] = useState(editingProduct?.tracesTags?.join(', ') || '');

  const parseNum = (val: string): number | undefined => {
    if (val === undefined || val === null || val.trim() === '') return undefined;
    const n = parseFloat(val.replace(',', '.'));
    return isNaN(n) ? undefined : n;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      alert('Por favor, informe o nome do produto.');
      return;
    }

    const nEnergy = parseNum(energyKcal);
    const nCarbs = parseNum(carbs);
    const nSugars = parseNum(sugars);
    const nAddedSugars = parseNum(addedSugars);
    const nProteins = parseNum(proteins);
    const nFat = parseNum(fat);
    const nSatFat = parseNum(saturatedFat);
    const nTransFat = parseNum(transFat);
    const nFiber = parseNum(fiber);
    const nSodium = parseNum(sodiumMg);

    // Calculate Anvisa RDC 429/2020 alerts ONLY when nutrient data exists
    const alerts: FrontOfPackAlerts = {};
    if (isLiquid) {
      if (nAddedSugars !== undefined && nAddedSugars >= 7.5) alerts.highAddedSugar = true;
      if (nSatFat !== undefined && nSatFat >= 3.0) alerts.highSaturatedFat = true;
      if (nSodium !== undefined && nSodium >= 300) alerts.highSodium = true;
    } else {
      if (nAddedSugars !== undefined && nAddedSugars >= 15.0) alerts.highAddedSugar = true;
      if (nSatFat !== undefined && nSatFat >= 6.0) alerts.highSaturatedFat = true;
      if (nSodium !== undefined && nSodium >= 600) alerts.highSodium = true;
    }

    const customProduct: ProductData = {
      code: barcode.trim().replace(/\D/g, '') || 'SEM-CODIGO',
      productName: productName.trim(),
      brand: brand.trim() || 'Marca Informada pelo Usuário',
      category: category.trim() || undefined,
      netWeight: netWeight.trim() || undefined,
      isLiquid,
      servingSize: servingSize.trim() || undefined,
      ingredientsText: ingredientsText.trim() || undefined,
      allergensFromIngredients: allergensText.trim() || undefined,
      tracesTags: tracesText.trim() ? tracesText.split(',').map(t => t.trim()) : undefined,
      labelsTags: ['Cadastro Manual no Navegador (localStorage)'],
      lastModified: new Date().toLocaleDateString('pt-BR'),
      isUserCustom: true,
      alerts,
      nutriments: {
        energyKcal100g: nEnergy,
        carbohydrates100g: nCarbs,
        sugars100g: nSugars,
        addedSugars100g: nAddedSugars,
        proteins100g: nProteins,
        fat100g: nFat,
        saturatedFat100g: nSatFat,
        transFat100g: nTransFat,
        fiber100g: nFiber,
        sodium100gMg: nSodium
      }
    };

    onSave(customProduct);
  };

  return (
    <div className="scanner-modal-backdrop" role="dialog" aria-modal="true">
      <div className="scanner-modal-card" style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="scanner-modal-header">
          <div className="scanner-header-title text-emerald">
            <Edit3 size={22} />
            <h3>{editingProduct ? 'Editar Cadastro Manual' : 'Cadastrar Alimento Manualmente'}</h3>
          </div>
          <button onClick={onClose} className="scanner-close-btn" aria-label="Fechar formulário">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="user-form-body card" style={{ border: 'none', borderRadius: 0 }}>
          <div className="status-banner loading-banner" style={{ marginBottom: '1.25rem', padding: '0.85rem' }}>
            <Info size={20} className="icon-emerald" />
            <div>
              <strong>Informações Salvas no Navegador (localStorage):</strong>
              <p style={{ fontSize: '0.85rem' }}>
                Os dados cadastrados ficarão salvos neste navegador para pesquisas futuras e comparações. Campos deixados em branco serão mantidos como "Não informado".
              </p>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Código de Barras *</label>
              <input 
                type="text" 
                value={barcode} 
                onChange={(e) => setBarcode(e.target.value)}
                className="form-input" 
                disabled={Boolean(editingProduct)}
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nome do Produto *</label>
              <input 
                type="text" 
                placeholder="Ex: Chocolate em Pó 50%" 
                value={productName} 
                onChange={(e) => setProductName(e.target.value)}
                className="form-input" 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Marca</label>
              <input 
                type="text" 
                placeholder="Ex: Marca Exemplo" 
                value={brand} 
                onChange={(e) => setBrand(e.target.value)}
                className="form-input" 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Categoria</label>
              <input 
                type="text" 
                placeholder="Ex: Achocolatados" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="form-input" 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Quantidade / Peso Líquido</label>
              <input 
                type="text" 
                placeholder="Ex: 200 g ou 1 L" 
                value={netWeight} 
                onChange={(e) => setNetWeight(e.target.value)}
                className="form-input" 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Porção de Referência</label>
              <input 
                type="text" 
                placeholder="Ex: 30 g ou 200 mL" 
                value={servingSize} 
                onChange={(e) => setServingSize(e.target.value)}
                className="form-input" 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Estado Físico do Alimento</label>
              <select 
                value={isLiquid ? 'liquid' : 'solid'}
                onChange={(e) => setIsLiquid(e.target.value === 'liquid')}
                className="form-input"
              >
                <option value="solid">Sólido (base por 100 g)</option>
                <option value="liquid">Líquido (base por 100 mL)</option>
              </select>
            </div>
          </div>

          <h4 style={{ margin: '1.25rem 0 0.75rem 0', color: '#059669', fontSize: '1rem' }}>
            Tabela Nutricional (Valores por {isLiquid ? '100 mL' : '100 g'})
          </h4>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Valor Energético (kcal)</label>
              <input type="text" placeholder="Deixe em branco se ausente" value={energyKcal} onChange={(e) => setEnergyKcal(e.target.value)} className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">Carboidratos (g)</label>
              <input type="text" placeholder="Deixe em branco se ausente" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">Açúcares Totais (g)</label>
              <input type="text" placeholder="Deixe em branco se ausente" value={sugars} onChange={(e) => setSugars(e.target.value)} className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">Açúcares Adicionados (g)</label>
              <input type="text" placeholder="Deixe em branco se ausente" value={addedSugars} onChange={(e) => setAddedSugars(e.target.value)} className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">Proteínas (g)</label>
              <input type="text" placeholder="Deixe em branco se ausente" value={proteins} onChange={(e) => setProteins(e.target.value)} className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">Gorduras Totais (g)</label>
              <input type="text" placeholder="Deixe em branco se ausente" value={fat} onChange={(e) => setFat(e.target.value)} className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">Gorduras Saturadas (g)</label>
              <input type="text" placeholder="Deixe em branco se ausente" value={saturatedFat} onChange={(e) => setSaturatedFat(e.target.value)} className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">Gorduras Trans (g)</label>
              <input type="text" placeholder="Deixe em branco se ausente" value={transFat} onChange={(e) => setTransFat(e.target.value)} className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">Fibras Alimentares (g)</label>
              <input type="text" placeholder="Deixe em branco se ausente" value={fiber} onChange={(e) => setFiber(e.target.value)} className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">Sódio (em mg)</label>
              <input type="text" placeholder="Deixe em branco se ausente" value={sodiumMg} onChange={(e) => setSodiumMg(e.target.value)} className="form-input" />
            </div>
          </div>

          <h4 style={{ margin: '1.25rem 0 0.75rem 0', color: '#059669', fontSize: '1rem' }}>
            Ingredientes e Alergênicos
          </h4>

          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
            <label className="form-label">Lista de Ingredientes</label>
            <textarea 
              rows={3}
              placeholder="Digite a lista completa de ingredientes..."
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              className="form-input"
              style={{ fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
            <label className="form-label">Declaração de Alergênicos</label>
            <input 
              type="text" 
              placeholder="Ex: CONTÉM LEITE E DERIVADOS DE SOJA. CONTÉM GLÚTEN." 
              value={allergensText} 
              onChange={(e) => setAllergensText(e.target.value)}
              className="form-input" 
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Eventuais Traços Declarados</label>
            <input 
              type="text" 
              placeholder="Ex: amendoim, castanhas, gergelim" 
              value={tracesText} 
              onChange={(e) => setTracesText(e.target.value)}
              className="form-input" 
            />
          </div>

          <div className="scanner-modal-footer" style={{ padding: 0 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ marginLeft: 'auto' }}>
              <Save size={18} /> Salvar Cadastro no Navegador
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
