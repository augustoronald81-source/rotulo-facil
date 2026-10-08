import React, { useState, useRef, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  ChevronDown, 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  HeartPulse, 
  CheckCircle2, 
  Droplet, 
  Scale, 
  ExternalLink,
  Leaf,
  Apple,
  Eye
} from 'lucide-react';

export const EducationalGuide: React.FC = () => {
  // Single active accordion at a time: 'objetivo' | 'normas' | 'lupinha' | 'gerais' | 'nutricionista' | null
  const [openAccordion, setOpenAccordion] = useState<string | null>('objetivo');
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const toggleAccordion = (id: string) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }

    const isOpening = openAccordion !== id;
    setOpenAccordion(isOpening ? id : null);

    if (isOpening) {
      // Aguarda a animação do módulo anterior fechar e o layout estabilizar (350ms)
      // para posicionar a página exatamente no início do novo módulo aberto.
      scrollTimeoutRef.current = window.setTimeout(() => {
        requestAnimationFrame(() => {
          const element = itemRefs.current[id];
          if (element) {
            try {
              element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              });
            } catch {
              const headerOffset = window.innerWidth <= 768 ? 80 : 85;
              const elementRect = element.getBoundingClientRect();
              const targetTop = elementRect.top + window.scrollY - headerOffset;
              window.scrollTo({
                top: Math.max(0, targetTop),
                behavior: 'smooth'
              });
            }
          }
        });
      }, 350);
    }
  };

  return (
    <section id="guia-educativo" className="section bg-light guide-section">
      <div className="container guide-container">
        
        {/* ================================================================== */}
        {/* CABEÇALHO DA PÁGINA                                                */}
        {/* ================================================================== */}
        <div className="section-header guide-header">
          <div className="section-badge guide-badge">
            <BookOpen size={16} /> Guia Educativo
          </div>
          <h1 className="section-title guide-main-title">
            Rotulagem Nutricional e Escolhas Conscientes
          </h1>
          
          {/* Introdução curta e visualmente destacada */}
          <div className="guide-intro-card">
            <div className="guide-intro-icon-box">
              <Leaf size={22} className="text-emerald" />
            </div>
            <p className="guide-intro-text">
              Este guia educativo tem como objetivo apresentar de forma clara e acessível as principais regras de rotulagem alimentar no Brasil. O material foi pensado para ajudar o público a compreender melhor as informações presentes nas embalagens e realizar escolhas mais conscientes e informadas na hora das compras.
            </p>
          </div>
        </div>

        {/* ================================================================== */}
        {/* ACCORDION SYSTEM (TOP-TO-BOTTOM CSS GRID REVELATION)               */}
        {/* ================================================================== */}
        <div className="guide-accordion-wrapper" role="region" aria-label="Tópicos do Guia Educativo">

          {/* ---------------------------------------------------------------- */}
          {/* DROPDOWN 1 — OBJETIVO DO PROJETO                                 */}
          {/* ---------------------------------------------------------------- */}
          <div 
            ref={(el) => { itemRefs.current['objetivo'] = el; }}
            className={`guide-accordion-item ${openAccordion === 'objetivo' ? 'open' : ''}`}
          >
            <button
              type="button"
              className="guide-accordion-trigger"
              onClick={() => toggleAccordion('objetivo')}
              aria-expanded={openAccordion === 'objetivo'}
              aria-controls="accordion-panel-objetivo"
              id="accordion-trigger-objetivo"
            >
              <span className="accordion-number-badge">1</span>
              <div className="accordion-title-col">
                <span className="accordion-title">Objetivo do Projeto</span>
              </div>
              <ChevronDown className="accordion-chevron" size={22} aria-hidden="true" />
            </button>

            <div 
              id="accordion-panel-objetivo" 
              role="region" 
              aria-labelledby="accordion-trigger-objetivo"
              className={`guide-accordion-collapse ${openAccordion === 'objetivo' ? 'open' : ''}`}
            >
              <div className="guide-accordion-inner">
                <div className="guide-accordion-panel">
                  <div className="objective-highlight-banner">
                    <p className="objective-lead">
                      Oferecer ao público ferramentas práticas para entender o que está consumindo.
                    </p>
                  </div>

                  <p className="objective-subheading">
                    Compreender os rótulos ajuda a:
                  </p>

                  <div className="objective-cards-grid">
                    <div className="objective-mini-card">
                      <div className="mini-card-icon-box bg-emerald-light text-emerald">
                        <ShieldCheck size={20} />
                      </div>
                      <div className="mini-card-text">
                        <strong>Garantir o direito à informação</strong>
                        <span>Acesso transparente à composição real de cada alimento ingerido.</span>
                      </div>
                    </div>

                    <div className="objective-mini-card">
                      <div className="mini-card-icon-box bg-emerald-light text-emerald">
                        <Scale size={20} />
                      </div>
                      <div className="mini-card-text">
                        <strong>Comparar produtos na prateleira</strong>
                        <span>Avaliar opções semelhantes de forma justa e direta no supermercado.</span>
                      </div>
                    </div>

                    <div className="objective-mini-card">
                      <div className="mini-card-icon-box bg-emerald-light text-emerald">
                        <Eye size={20} />
                      </div>
                      <div className="mini-card-text">
                        <strong>Compreender melhor os alimentos consumidos</strong>
                        <span>Decifrar calorias, nutrientes, porções e ingredientes sem complexidade.</span>
                      </div>
                    </div>

                    <div className="objective-mini-card">
                      <div className="mini-card-icon-box bg-emerald-light text-emerald">
                        <CheckCircle2 size={20} />
                      </div>
                      <div className="mini-card-text">
                        <strong>Auxiliar no planejamento de uma alimentação mais equilibrada e segura</strong>
                        <span>Tomar decisões alimentares alinhadas às necessidades do dia a dia e da família.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* DROPDOWN 2 — PRINCIPAIS NORMAS DE ROTULAGEM NO BRASIL            */}
          {/* ---------------------------------------------------------------- */}
          <div 
            ref={(el) => { itemRefs.current['normas'] = el; }}
            className={`guide-accordion-item ${openAccordion === 'normas' ? 'open' : ''}`}
          >
            <button
              type="button"
              className="guide-accordion-trigger"
              onClick={() => toggleAccordion('normas')}
              aria-expanded={openAccordion === 'normas'}
              aria-controls="accordion-panel-normas"
              id="accordion-trigger-normas"
            >
              <span className="accordion-number-badge">2</span>
              <div className="accordion-title-col">
                <span className="accordion-title">Principais Normas de Rotulagem no Brasil</span>
              </div>
              <ChevronDown className="accordion-chevron" size={22} aria-hidden="true" />
            </button>

            <div 
              id="accordion-panel-normas" 
              role="region" 
              aria-labelledby="accordion-trigger-normas"
              className={`guide-accordion-collapse ${openAccordion === 'normas' ? 'open' : ''}`}
            >
              <div className="guide-accordion-inner">
                <div className="guide-accordion-panel">
                  <p className="norms-intro-text">
                    O Brasil adotou um marco regulatório moderno desenvolvido pela ANVISA para tornar os rótulos mais legíveis e padronizados:
                  </p>

                  <div className="norms-cards-grid">
                    {/* CARD 1 */}
                    <div className="norm-spec-card">
                      <div className="norm-card-header">
                        <div className="norm-badge">Resolução Central</div>
                        <h3 className="norm-title">RDC nº 429/2020 — ANVISA</h3>
                      </div>
                      <p className="norm-description">
                        Estabelece as regras centrais para a Tabela de Informação Nutricional, a Rotulagem Nutricional Frontal e as alegações nutricionais nos alimentos embalados.
                      </p>
                      <div className="norm-points">
                        <div className="norm-point-item">
                          <CheckCircle2 size={16} className="text-emerald" />
                          <span>Padronização do design e fundo branco obrigatório</span>
                        </div>
                        <div className="norm-point-item">
                          <CheckCircle2 size={16} className="text-emerald" />
                          <span>Inclusão dos Açúcares Adicionados na tabela</span>
                        </div>
                      </div>
                    </div>

                    {/* CARD 2 */}
                    <div className="norm-spec-card">
                      <div className="norm-card-header">
                        <div className="norm-badge">Instrução Técnica</div>
                        <h3 className="norm-title">IN nº 75/2020 — ANVISA</h3>
                      </div>
                      <p className="norm-description">
                        Define critérios técnicos detalhados, como:
                      </p>
                      <ul className="norm-bullets-list">
                        <li>
                          <span className="bullet-dot" />
                          <span>Valores diários de referência (VDR)</span>
                        </li>
                        <li>
                          <span className="bullet-dot" />
                          <span>Tamanho padronizado das porções</span>
                        </li>
                        <li>
                          <span className="bullet-dot" />
                          <span>Critérios técnicos da rotulagem</span>
                        </li>
                        <li>
                          <span className="bullet-dot" />
                          <span>Design gráfico dos modelos de rotulagem</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Links oficiais discretos de apoio */}
                  <div className="norms-official-sources">
                    <span className="sources-label">Fontes Oficiais da Anvisa:</span>
                    <div className="sources-links">
                      <a 
                        href="https://www.gov.br/anvisa/pt-br/assuntos/alimentos/rotulagem" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="source-link"
                      >
                        <ExternalLink size={14} />
                        <span>Portal da Rotulagem Anvisa</span>
                      </a>
                      <a 
                        href="https://www.in.gov.br/web/dou/-/resolucao-de-diretoria-colegiada-rdc-n-429-de-8-de-outubro-de-2020-282070599" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="source-link"
                      >
                        <ExternalLink size={14} />
                        <span>Texto da RDC nº 429/2020 (DOU)</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* DROPDOWN 3 — A LUPINHA FRONTAL (MAIOR DESTAQUE VISUAL)           */}
          {/* ---------------------------------------------------------------- */}
          <div 
            ref={(el) => { itemRefs.current['lupinha'] = el; }}
            className={`guide-accordion-item lupinha-accordion-item ${openAccordion === 'lupinha' ? 'open' : ''}`}
          >
            <button
              type="button"
              className="guide-accordion-trigger lupinha-trigger"
              onClick={() => toggleAccordion('lupinha')}
              aria-expanded={openAccordion === 'lupinha'}
              aria-controls="accordion-panel-lupinha"
              id="accordion-trigger-lupinha"
            >
              <span className="accordion-number-badge lupinha-number-badge">
                <Search size={16} />
              </span>
              <div className="accordion-title-col">
                <span className="accordion-title">A “Lupinha” Frontal — Atenção aos Excessos</span>
                <span className="lupinha-spotlight-pill">Destaque Anvisa</span>
              </div>
              <ChevronDown className="accordion-chevron" size={22} aria-hidden="true" />
            </button>

            <div 
              id="accordion-panel-lupinha" 
              role="region" 
              aria-labelledby="accordion-trigger-lupinha"
              className={`guide-accordion-collapse ${openAccordion === 'lupinha' ? 'open' : ''}`}
            >
              <div className="guide-accordion-inner">
                <div className="guide-accordion-panel lupinha-panel-content">
                  
                  {/* Bloco de Apresentação da Lupinha */}
                  <div className="lupinha-explanation-card">
                    <div className="lupinha-visual-stamp">
                      <div className="lupinha-stamp-header">
                        <Search size={22} strokeWidth={2.5} />
                        <span>ALTO EM</span>
                      </div>
                      <div className="lupinha-stamp-tags">
                        <div className="stamp-tag">AÇÚCAR ADICIONADO</div>
                        <div className="stamp-tag">GORDURA SATURADA</div>
                        <div className="stamp-tag">SÓDIO</div>
                      </div>
                    </div>

                    <div className="lupinha-text-side">
                      <h3 className="lupinha-lead-title">Rotulagem Nutricional Frontal</h3>
                      <p className="lupinha-desc-text">
                        A rotulagem nutricional frontal utiliza o símbolo de uma lupa para alertar o consumidor quando o alimento apresenta alto teor de:
                      </p>
                      <div className="lupinha-nutrients-pills">
                        <span className="nutrient-target-pill">
                          <Apple size={15} /> Açúcar adicionado
                        </span>
                        <span className="nutrient-target-pill">
                          <Droplet size={15} /> Gordura saturada
                        </span>
                        <span className="nutrient-target-pill">
                          <Scale size={15} /> Sódio
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Seção: Quando a Lupinha é Obrigatória? */}
                  <div className="lupinha-thresholds-wrapper">
                    <div className="thresholds-header-bar">
                      <div className="thresholds-title-group">
                        <Search size={18} className="text-emerald" />
                        <h4>Quando a Lupinha é Obrigatória?</h4>
                      </div>
                      <span className="thresholds-basis-badge">
                        Base de cálculo padronizada pela Anvisa
                      </span>
                    </div>

                    <p className="thresholds-caption">
                      Os limites são avaliados de acordo com a forma física do produto. Durante a apresentação, aponte os limites abaixo:
                    </p>

                    {/* Comparativo de Limites: Lado a Lado no Desktop / Um abaixo do outro no celular */}
                    <div className="thresholds-comparison-grid">
                      
                      {/* GRUPO 1: SÓLIDOS OU SEMISSÓLIDOS */}
                      <div className="threshold-card solid-card">
                        <div className="threshold-card-top">
                          <span className="threshold-type-pill solid-pill">Alimentos Sólidos ou Semissólidos</span>
                          <span className="threshold-measure">Por <strong>100 g</strong> de produto</span>
                        </div>

                        <div className="threshold-items-list">
                          <div className="threshold-item">
                            <div className="threshold-item-header">
                              <span className="threshold-nutrient-name">Açúcar adicionado</span>
                              <span className="threshold-limit-badge amber-badge">15 g ou mais</span>
                            </div>
                            <div className="threshold-bar-track">
                              <div className="threshold-bar-fill fill-amber" style={{ width: '85%' }} />
                            </div>
                          </div>

                          <div className="threshold-item">
                            <div className="threshold-item-header">
                              <span className="threshold-nutrient-name">Gorduras saturadas</span>
                              <span className="threshold-limit-badge amber-badge">6 g ou mais</span>
                            </div>
                            <div className="threshold-bar-track">
                              <div className="threshold-bar-fill fill-amber" style={{ width: '70%' }} />
                            </div>
                          </div>

                          <div className="threshold-item">
                            <div className="threshold-item-header">
                              <span className="threshold-nutrient-name">Sódio</span>
                              <span className="threshold-limit-badge red-badge">600 mg ou mais</span>
                            </div>
                            <div className="threshold-bar-track">
                              <div className="threshold-bar-fill fill-red" style={{ width: '90%' }} />
                            </div>
                          </div>
                        </div>

                        <div className="threshold-examples-footnote">
                          Exemplos: Biscoitos, chocolates, pães, salgadinhos, queijos.
                        </div>
                      </div>

                      {/* GRUPO 2: LÍQUIDOS */}
                      <div className="threshold-card liquid-card">
                        <div className="threshold-card-top">
                          <span className="threshold-type-pill liquid-pill">Alimentos Líquidos</span>
                          <span className="threshold-measure">Por <strong>100 mL</strong> de produto</span>
                        </div>

                        <div className="threshold-items-list">
                          <div className="threshold-item">
                            <div className="threshold-item-header">
                              <span className="threshold-nutrient-name">Açúcar adicionado</span>
                              <span className="threshold-limit-badge amber-badge">7,5 g ou mais</span>
                            </div>
                            <div className="threshold-bar-track">
                              <div className="threshold-bar-fill fill-amber" style={{ width: '85%' }} />
                            </div>
                          </div>

                          <div className="threshold-item">
                            <div className="threshold-item-header">
                              <span className="threshold-nutrient-name">Gorduras saturadas</span>
                              <span className="threshold-limit-badge amber-badge">3 g ou mais</span>
                            </div>
                            <div className="threshold-bar-track">
                              <div className="threshold-bar-fill fill-amber" style={{ width: '70%' }} />
                            </div>
                          </div>

                          <div className="threshold-item">
                            <div className="threshold-item-header">
                              <span className="threshold-nutrient-name">Sódio</span>
                              <span className="threshold-limit-badge red-badge">300 mg ou mais</span>
                            </div>
                            <div className="threshold-bar-track">
                              <div className="threshold-bar-fill fill-red" style={{ width: '90%' }} />
                            </div>
                          </div>
                        </div>

                        <div className="threshold-examples-footnote">
                          Exemplos: Refrigerantes, néctares, bebidas lácteas, sucos adoçados.
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* DROPDOWN 4 — INFORMAÇÕES GERAIS E ALERGÊNICOS                    */}
          {/* ---------------------------------------------------------------- */}
          <div 
            ref={(el) => { itemRefs.current['gerais'] = el; }}
            className={`guide-accordion-item ${openAccordion === 'gerais' ? 'open' : ''}`}
          >
            <button
              type="button"
              className="guide-accordion-trigger"
              onClick={() => toggleAccordion('gerais')}
              aria-expanded={openAccordion === 'gerais'}
              aria-controls="accordion-panel-gerais"
              id="accordion-trigger-gerais"
            >
              <span className="accordion-number-badge">4</span>
              <div className="accordion-title-col">
                <span className="accordion-title">Informações Gerais e Alergênicos</span>
              </div>
              <ChevronDown className="accordion-chevron" size={22} aria-hidden="true" />
            </button>

            <div 
              id="accordion-panel-gerais" 
              role="region" 
              aria-labelledby="accordion-trigger-gerais"
              className={`guide-accordion-collapse ${openAccordion === 'gerais' ? 'open' : ''}`}
            >
              <div className="guide-accordion-inner">
                <div className="guide-accordion-panel">
                  
                  {/* Apresentação da RDC 727/2022 */}
                  <div className="norm-spec-card rdc727-card">
                    <div className="norm-card-header">
                      <div className="norm-badge">Rotulagem Geral</div>
                      <h3 className="norm-title">RDC nº 727/2022 — ANVISA</h3>
                    </div>
                    <p className="norm-description">
                      Consolidou as normas sobre a rotulagem geral de alimentos embalados e ajuda a garantir a padronização de informações obrigatórias.
                    </p>
                  </div>

                  {/* Cards dos 4 itens obrigatórios */}
                  <p className="mandatory-items-lead">
                    Principais informações obrigatórias na embalagem:
                  </p>

                  <div className="mandatory-items-grid">
                    <div className="mandatory-mini-block">
                      <div className="mini-block-icon bg-emerald-light text-emerald">
                        <FileText size={18} />
                      </div>
                      <strong>Lista de ingredientes</strong>
                      <span>Apresentada em ordem decrescente de quantidade no produto.</span>
                    </div>

                    <div className="mandatory-mini-block">
                      <div className="mini-block-icon bg-emerald-light text-emerald">
                        <Scale size={18} />
                      </div>
                      <strong>Lote e prazo de validade</strong>
                      <span>Essenciais para o controle de qualidade, frescor e rastreabilidade.</span>
                    </div>

                    <div className="mandatory-mini-block">
                      <div className="mini-block-icon bg-emerald-light text-emerald">
                        <ShieldCheck size={18} />
                      </div>
                      <strong>Origem do produto</strong>
                      <span>Identificação clara do fabricante, país e dados de contato do SAC.</span>
                    </div>

                    <div className="mandatory-mini-block">
                      <div className="mini-block-icon bg-emerald-light text-emerald">
                        <AlertTriangle size={18} />
                      </div>
                      <strong>Declaração de alergênicos</strong>
                      <span>Alerta explícito para proteger pessoas com alergias e intolerâncias.</span>
                    </div>
                  </div>

                  {/* Destaque para Alergênicos */}
                  <div className="allergens-highlight-section">
                    <div className="allergens-text-info">
                      <div className="allergens-title-row">
                        <AlertTriangle size={20} className="text-emerald" />
                        <h4>Alergênicos Alimentares</h4>
                      </div>
                      <p>
                        A declaração de alergênicos deve receber destaque para facilitar a identificação pelo consumidor.
                      </p>
                    </div>

                    {/* Exemplo Visual em Destaque */}
                    <div className="allergens-visual-card">
                      <div className="allergens-card-header">
                        <AlertTriangle size={16} className="text-emerald" />
                        <span>Modelo Visual de Declaração na Embalagem:</span>
                      </div>
                      <div className="allergens-quote-box">
                        <span className="allergens-quote-text">
                          ALÉRGICOS: CONTÉM DERIVADOS DE TRIGO E LEITE.
                        </span>
                      </div>
                      <span className="allergens-card-note">
                        Caixa alta, fonte legível e contraste nítido garantidos por regulamentação.
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* DROPDOWN 5 — O PAPEL DO NUTRICIONISTA (VISUAL DIFERENCIADO)      */}
          {/* ---------------------------------------------------------------- */}
          <div 
            ref={(el) => { itemRefs.current['nutricionista'] = el; }}
            className={`guide-accordion-item nutritionist-accordion-item ${openAccordion === 'nutricionista' ? 'open' : ''}`}
          >
            <button
              type="button"
              className="guide-accordion-trigger nutritionist-trigger"
              onClick={() => toggleAccordion('nutricionista')}
              aria-expanded={openAccordion === 'nutricionista'}
              aria-controls="accordion-panel-nutricionista"
              id="accordion-trigger-nutricionista"
            >
              <span className="accordion-number-badge nutritionist-number-badge">
                <HeartPulse size={16} />
              </span>
              <div className="accordion-title-col">
                <span className="accordion-title">O Papel do Nutricionista</span>
                <span className="nutritionist-distinction-badge">Resolução CFN</span>
              </div>
              <ChevronDown className="accordion-chevron" size={22} aria-hidden="true" />
            </button>

            <div 
              id="accordion-panel-nutricionista" 
              role="region" 
              aria-labelledby="accordion-trigger-nutricionista"
              className={`guide-accordion-collapse ${openAccordion === 'nutricionista' ? 'open' : ''}`}
            >
              <div className="guide-accordion-inner">
                <div className="guide-accordion-panel nutritionist-panel-content">
                  
                  {/* Card com Estilo Diferenciado de Honra Profissional */}
                  <div className="nutritionist-feature-card">
                    <div className="nutritionist-icon-badge-box">
                      <HeartPulse size={32} className="nutritionist-heart-icon" />
                    </div>

                    <div className="nutritionist-content-side">
                      <div className="nutritionist-resolution-badge">
                        Resolução CFN nº 600/2018
                      </div>
                      
                      <h3 className="nutritionist-headline">
                        Profissional Técnico Habilitado
                      </h3>

                      <p className="nutritionist-main-text">
                        De acordo com o material do projeto, baseado na <strong>Resolução CFN nº 600/2018</strong>, o nutricionista é o profissional habilitado e responsável por elaborar, conferir e adequar tecnicamente tabelas nutricionais e rótulos de alimentos na indústria e na alimentação coletiva.
                      </p>

                      <div className="nutritionist-key-message-box">
                        <CheckCircle2 size={20} className="text-emerald" />
                        <p className="key-message-text">
                          A ideia principal é destacar que esse profissional contribui para que as informações apresentadas ao consumidor sejam precisas e adequadas.
                        </p>
                      </div>

                      <div className="nutritionist-pillars-row">
                        <div className="pillar-item">
                          <CheckCircle2 size={16} className="text-emerald" />
                          <span>Cálculos nutricionais precisos</span>
                        </div>
                        <div className="pillar-item">
                          <CheckCircle2 size={16} className="text-emerald" />
                          <span>Conformidade com a legislação Anvisa</span>
                        </div>
                        <div className="pillar-item">
                          <CheckCircle2 size={16} className="text-emerald" />
                          <span>Educação e proteção à saúde pública</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ================================================================== */}
        {/* FINAL DA PÁGINA (BLOCO DE ENCERRAMENTO)                            */}
        {/* ================================================================== */}
        <div className="guide-closing-block">
          <div className="closing-decor-icon-box">
            <Leaf size={28} className="text-emerald" />
          </div>

          <h3 className="closing-highlight-quote">
            “Informação que transforma escolhas.”
          </h3>

          <p className="closing-body-text">
            Aproveite este site para navegar pelos tópicos, consultar as informações de rotulagem sempre que tiver dúvidas e transformar sua rotina no mercado em uma experiência mais consciente e informada.
          </p>

          <div className="closing-sub-decor">
            <span className="closing-leaf-dot" />
            <span className="closing-leaf-dot active" />
            <span className="closing-leaf-dot" />
          </div>
        </div>

      </div>
    </section>
  );
};

export default EducationalGuide;
