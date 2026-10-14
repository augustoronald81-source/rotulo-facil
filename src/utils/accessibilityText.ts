import type { ProductData } from '../types/nutrition';
import type { SingleProductInterpretation } from './singleProductInterpretation';
import type { ComparisonAnalysis } from './comparisonEngine';

/**
 * Constrói o texto falado para a seção "Interpretação do Perfil Nutricional"
 * da página "Entender um Rótulo", respeitando estritamente a ordem especificada:
 * 1. "Interpretação do Perfil Nutricional"
 * 2. Resumo do Perfil
 * 3. O que se destaca neste rótulo
 * 4. Pontos de atenção
 * 5. Entendendo a porção
 *
 * Seções inexistentes para o produto são omitidas. Não inclui elementos
 * visuais, botões, ícones ou metadados de interface.
 */
export function buildSingleProductAudioText(
  productName: string,
  interpretation: SingleProductInterpretation
): string {
  const parts: string[] = [];

  // Título da seção
  const title = productName ? `Interpretação do Perfil Nutricional de ${productName}.` : 'Interpretação do Perfil Nutricional.';
  parts.push(title);

  // Fallback caso não haja dados suficientes
  if (!interpretation.hasSufficientData) {
    if (interpretation.insufficientDataMessage) {
      parts.push(interpretation.insufficientDataMessage);
    }
    return parts.join('\n\n');
  }

  // 1. Resumo do Perfil
  if (interpretation.summaryText && interpretation.summaryText.trim()) {
    parts.push(`Resumo do Perfil: ${interpretation.summaryText.trim()}`);
  }

  // 2. O que se destaca neste rótulo
  if (interpretation.highlights && interpretation.highlights.length > 0) {
    const highlightsText = interpretation.highlights
      .map(item => item.trim().replace(/\.$/, ''))
      .join('. ');
    parts.push(`O que se destaca neste rótulo: ${highlightsText}.`);
  }

  // 3. Pontos de atenção
  if (interpretation.attentionPoints && interpretation.attentionPoints.length > 0) {
    const attentionText = interpretation.attentionPoints
      .map(item => item.trim().replace(/\.$/, ''))
      .join('. ');
    parts.push(`Pontos de atenção: ${attentionText}.`);
  }

  // 4. Entendendo a porção
  if (interpretation.portionExplanation && interpretation.portionExplanation.trim()) {
    parts.push(`Entendendo a porção: ${interpretation.portionExplanation.trim()}`);
  }

  return parts.join('\n\n');
}

/**
 * Constrói o texto falado para a seção "Conclusão do Perfil Nutricional"
 * da página "Comparar Dois Rótulos", incluindo exclusivamente o conteúdo visível:
 * - Resumo da comparação / Conclusão
 * - Principais diferenças
 * - Pontos positivos
 * - Pontos de atenção
 * - Conclusão final
 */
export function buildComparisonAudioText(
  productA: ProductData,
  productB: ProductData,
  analysis: ComparisonAnalysis
): string {
  const parts: string[] = [];

  parts.push(`Conclusão do Perfil Nutricional da comparação entre ${productA.productName} e ${productB.productName}.`);

  // Resumo da comparação / Conclusão
  if (analysis.conclusion && analysis.conclusion.trim()) {
    parts.push(`Resumo da comparação: ${analysis.conclusion.trim()}`);
  }

  // Principais diferenças
  if (analysis.deltas && analysis.deltas.length > 0) {
    const deltasText = analysis.deltas.map(d => {
      const valA = d.valA !== null ? `${d.valA} ${d.unit}` : 'não informado';
      const valB = d.valB !== null ? `${d.valB} ${d.unit}` : 'não informado';
      const meaning = d.meaning ? ` ${d.meaning.trim().replace(/\.$/, '')}.` : '';
      return `${d.label}: Rótulo A tem ${valA}, Rótulo B tem ${valB}.${meaning}`;
    }).join(' ');

    parts.push(`Principais diferenças: ${deltasText}`);
  }

  // Pontos positivos / favoráveis
  const highlightsList: string[] = [];
  if (analysis.highlightsA && analysis.highlightsA.length > 0) {
    highlightsList.push(`Rótulo A, ${productA.productName}: ${analysis.highlightsA.map(h => h.trim().replace(/\.$/, '')).join('. ')}.`);
  }
  if (analysis.highlightsB && analysis.highlightsB.length > 0) {
    highlightsList.push(`Rótulo B, ${productB.productName}: ${analysis.highlightsB.map(h => h.trim().replace(/\.$/, '')).join('. ')}.`);
  }
  if (highlightsList.length > 0) {
    parts.push(`Pontos positivos: ${highlightsList.join(' ')}`);
  }

  // Pontos de atenção
  const attentionList: string[] = [];
  if (analysis.attentionA && analysis.attentionA.length > 0) {
    attentionList.push(`Rótulo A, ${productA.productName}: ${analysis.attentionA.map(a => a.trim().replace(/\.$/, '')).join('. ')}.`);
  }
  if (analysis.attentionB && analysis.attentionB.length > 0) {
    attentionList.push(`Rótulo B, ${productB.productName}: ${analysis.attentionB.map(a => a.trim().replace(/\.$/, '')).join('. ')}.`);
  }
  if (attentionList.length > 0) {
    parts.push(`Pontos de atenção: ${attentionList.join(' ')}`);
  }

  return parts.join('\n\n');
}
