import React from 'react';
import { 
  Camera, 
  Columns3, 
  BookOpen, 
  Sparkles, 
  FileText, 
  ShieldCheck, 
  ArrowRight,
  ScanLine,
  Scale
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (path: string) => void;
  onOpenDemo: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenDemo,
}) => {
  return (
    <div className="home-page-wrapper">
      {/* 1. Hero Section */}
      <section className="hero-section">
        <div className="container hero-container hero-home-layout">
          
          {/* Left Text Column */}
          <div className="hero-text-col">
            <div className="hero-badge">
              <Sparkles size={16} className="icon-emerald" />
              <span>Plataforma Acadêmica de Educação Nutricional</span>
            </div>

            <h1 className="hero-title">
              Entenda o que você <span className="text-emerald">consome.</span>
            </h1>

            <p className="hero-description">
              Fotografe a tabela nutricional para entender o rótulo ou comparar dois alimentos.
            </p>

            {/* Primary Action Buttons */}
            <div className="hero-actions">
              <button 
                onClick={() => onNavigate('/entender-rotulo')} 
                className="btn btn-primary btn-lg"
              >
                <Camera size={22} />
                Entender um rótulo
              </button>

              <button 
                onClick={() => onNavigate('/comparar')} 
                className="btn btn-emerald btn-lg"
              >
                <Columns3 size={22} />
                Comparar dois rótulos
              </button>
            </div>

            <div className="hero-sub-actions">
              <button onClick={() => onNavigate('/guia')} className="btn btn-outline width-full">
                <BookOpen size={16} /> Guia Educativo
              </button>

              <button onClick={onOpenDemo} className="btn btn-soft btn-demo width-full">
                <Sparkles size={16} /> Ver Exemplo Prático
              </button>
            </div>
          </div>

          {/* Right Column: Clean Vector SVG Illustration */}
          <div className="hero-illustration-col">
            <div className="illustration-card card">
              
              <div className="illustration-tag">
                Exemplo Ilustrativo
              </div>

              {/* Vector SVG Package + Scanner Graphic */}
              <svg width="240" height="210" viewBox="0 0 230 205" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto', display: 'block', maxWidth: '100%', height: 'auto' }}>
                {/* Product Package Shape */}
                <rect x="25" y="30" width="80" height="140" rx="10" fill="#047857" opacity="0.1" stroke="#047857" strokeWidth="2.5" strokeDasharray="4 2" />
                <rect x="35" y="45" width="60" height="70" rx="6" fill="#ffffff" stroke="#047857" strokeWidth="2" />
                {/* Package Art lines */}
                <circle cx="65" cy="70" r="16" fill="#d1fae5" stroke="#059669" strokeWidth="2" />
                <path d="M60 70L63 73L70 66" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="45" y="98" width="40" height="6" rx="3" fill="#059669" opacity="0.4" />

                {/* Arrow connecting to Nutrition Table Card */}
                <path d="M110 100 H126" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />

                {/* Nutrition Table Overlay Card */}
                <g transform="translate(126, 20)">
                  <rect x="0" y="0" width="88" height="155" rx="8" fill="#ffffff" stroke="#047857" strokeWidth="2.5" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.08))" />
                  <rect x="7" y="10" width="74" height="16" rx="4" fill="#047857" />
                  <text x="44" y="21" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">TABELA (100g)</text>
                  
                  {/* Table Rows */}
                  <line x1="7" y1="36" x2="81" y2="36" stroke="#e2e8f0" strokeWidth="1.5" />
                  <rect x="10" y="42" width="30" height="5" rx="2" fill="#64748b" />
                  <rect x="54" y="42" width="22" height="5" rx="2" fill="#047857" />

                  <line x1="7" y1="56" x2="81" y2="56" stroke="#e2e8f0" strokeWidth="1.5" />
                  <rect x="10" y="62" width="34" height="5" rx="2" fill="#64748b" />
                  <rect x="54" y="62" width="20" height="5" rx="2" fill="#047857" />

                  <line x1="7" y1="76" x2="81" y2="76" stroke="#e2e8f0" strokeWidth="1.5" />
                  <rect x="10" y="82" width="28" height="5" rx="2" fill="#64748b" />
                  <rect x="54" y="82" width="24" height="5" rx="2" fill="#d97706" />

                  <line x1="7" y1="96" x2="81" y2="96" stroke="#e2e8f0" strokeWidth="1.5" />
                  <rect x="10" y="102" width="32" height="5" rx="2" fill="#64748b" />
                  <rect x="54" y="102" width="18" height="5" rx="2" fill="#047857" />

                  {/* Lupa Badge */}
                  <rect x="6" y="118" width="76" height="24" rx="4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
                  <text x="44" y="133.5" fill="#b45309" fontSize="7.5" fontWeight="bold" textAnchor="middle" letterSpacing="-0.2">🔍 ALTO EM AÇÚCAR</text>
                </g>

                {/* Laser Scanning Bar */}
                <line x1="120" y1="90" x2="202" y2="90" stroke="#10b981" strokeWidth="2.5" strokeDasharray="3 3" />
              </svg>

              <div className="illustration-caption">
                Extração e interpretação de valores de referência (100g/100mL)
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. Como Funciona em 3 Passos */}
      <section className="section bg-white section-divider-top section-divider-bottom">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">
              <ScanLine size={16} /> Simplicidade e Rapidez
            </div>
            <h2 className="section-title">Como Funciona</h2>
            <p className="section-subtitle">
              Três passos simples para entender a composição dos alimentos que você consome.
            </p>
          </div>

          <div className="steps-grid">
            {/* Step 1 */}
            <div className="card step-card">
              <div className="step-number">
                1
              </div>
              <h3>Fotografe</h3>
              <p>
                Tire uma foto nítida da <strong>tabela nutricional</strong> impressa na embalagem física do produto ou envie da sua galeria.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card step-card">
              <div className="step-number">
                2
              </div>
              <h3>Confira a leitura</h3>
              <p>
                O sistema realiza a extração automática dos nutrientes e aplica os parâmetros da Anvisa RDC 429/2020.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card step-card">
              <div className="step-number">
                3
              </div>
              <h3>Entenda ou compare</h3>
              <p>
                Veja a explicação detalhada do perfil individual ou adicione um segundo produto para comparar lado a lado.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Blocos Curtos sobre Rotulagem e Finalidade */}
      <section className="section bg-light">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">
              <FileText size={16} /> Educação e Saúde Pública
            </div>
            <h2 className="section-title">O que é e para que serve a Rotulagem</h2>
          </div>

          <div className="concepts-grid">
            {/* Concept 1 */}
            <div className="card about-card concept-card">
              <div className="card-icon-tile">
                <FileText size={20} className="icon-emerald" />
              </div>
              <h3>O que é a Rotulagem Nutricional?</h3>
              <p>
                É o conjunto de informações obrigatórias impresso nas embalagens de alimentos. Inclui a <strong>tabela nutricional por 100g/100mL</strong>, a lista de ingredientes e os <strong>alertas de rotulagem frontal (Lupa Anvisa)</strong>.
              </p>
            </div>

            {/* Concept 2 */}
            <div className="card about-card concept-card">
              <div className="card-icon-tile">
                <ShieldCheck size={20} className="icon-emerald" />
              </div>
              <h3>Para que serve no dia a dia?</h3>
              <p>
                Garante o direito do consumidor à informação transparente, orienta escolhas alimentares conscientes e identifica o excesso de ingredientes críticos como açúcares adicionados, sódio e gorduras saturadas.
              </p>
            </div>

            {/* Concept 3 */}
            <div className="card about-card concept-card">
              <div className="card-icon-tile">
                <Scale size={20} className="icon-emerald" />
              </div>
              <h3>Comparação justa em 100g / 100mL</h3>
              <p>
                Desde a RDC 429/2020 da Anvisa, todos os produtos declaram obrigatoriamente a tabela padronizada em 100g ou 100mL. Isso permite comparar marcas diferentes na mesma quantidade de referência.
              </p>
            </div>
          </div>

          {/* Quick Access Actions */}
          <div className="home-final-ctas">
            <button onClick={() => onNavigate('/entender-rotulo')} className="btn btn-primary btn-lg">
              <Camera size={18} /> Entender um Rótulo por Foto <ArrowRight size={16} />
            </button>
            <button onClick={() => onNavigate('/comparar')} className="btn btn-outline btn-lg">
              <Columns3 size={18} /> Comparar Dois Rótulos <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
