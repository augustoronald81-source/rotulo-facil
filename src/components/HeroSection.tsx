import React from 'react';
import { BookOpen, Sparkles, CheckCircle2, Camera, Columns3 } from 'lucide-react';

interface HeroSectionProps {
  onGoToSearch: () => void;
  onGoToGuide: () => void;
  onGoToCompare: () => void;
  onOpenDemo: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onGoToSearch,
  onGoToGuide,
  onGoToCompare,
  onOpenDemo,
}) => {
  return (
    <section id="inicio" className="hero-section">
      <div className="container hero-container">
        <div className="hero-badge">
          <Sparkles size={16} className="icon-emerald" />
          <span>Leitura Nutricional por Foto da Tabela</span>
        </div>

        <h1 className="hero-title">
          Entenda o que você <span className="text-emerald">consome.</span>
        </h1>

        <p className="hero-description">
          Fotografe a <strong>tabela nutricional</strong> do produto física para decifrar a composição nutricional de forma simples ou <strong>comparar dois rótulos lado a lado</strong> no celular.
        </p>

        <div className="hero-actions">
          <button onClick={onGoToSearch} className="btn btn-primary btn-lg">
            <Camera size={22} />
            1. Entender um Rótulo
          </button>

          <button onClick={onGoToCompare} className="btn btn-emerald btn-lg">
            <Columns3 size={22} />
            2. Comparar dois Rótulos
          </button>
          
          <button onClick={onGoToGuide} className="btn btn-outline btn-lg">
            <BookOpen size={22} />
            Guia Educativo
          </button>

          <button onClick={onOpenDemo} className="btn btn-secondary btn-lg btn-demo">
            <Sparkles size={20} />
            Ver Exemplo
          </button>
        </div>

        <div className="hero-features">
          <div className="hero-feature-item">
            <CheckCircle2 size={18} className="text-emerald" />
            <span>Leitura por foto da Tabela Nutricional</span>
          </div>
          <div className="hero-feature-item">
            <CheckCircle2 size={18} className="text-emerald" />
            <span>Conferência rápida dos valores no celular</span>
          </div>
          <div className="hero-feature-item">
            <CheckCircle2 size={18} className="text-emerald" />
            <span>Comparação direta (100g / 100mL)</span>
          </div>
          <div className="hero-feature-item">
            <CheckCircle2 size={18} className="text-emerald" />
            <span>Alertas Anvisa RDC 429/2020</span>
          </div>
        </div>
      </div>
    </section>
  );
};
