import React from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  School
} from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="sobre" className="section bg-light">
      <div className="container">
        <div className="section-header">
          <div className="section-badge">
            <GraduationCap size={16} /> Projeto de Extensão / Acadêmico
          </div>
          <h2 className="section-title">Sobre o Projeto</h2>
          <p className="section-subtitle">
            Desenvolvido como trabalho acadêmico no curso de Nutrição para promover a educação nutricional, o consumo consciente e o entendimento da legislação brasileira de alimentos.
          </p>
        </div>

        <div className="about-grid">
          {/* Card 1: Finalidade Educativa */}
          <div className="card about-card">
            <div className="card-icon-tile">
              <BookOpen size={20} className="icon-emerald" />
            </div>
            <h3 className="about-card-title">Finalidade Educativa</h3>
            <p className="about-card-desc">
              O <strong>Rótulo Fácil</strong> foi planejado para simplificar a leitura de rótulos de alimentos embalados, permitindo que a população e estudantes de saúde compreendam as tabelas de informação nutricional, unidades de medida e os alertas de saúde da Anvisa.
            </p>
            <ul className="about-bullet-list">
              <li>
                <CheckCircle2 size={16} className="text-emerald check-bullet-icon" /> <span>Promover escolhas alimentares informadas.</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-emerald check-bullet-icon" /> <span>Esclarecer diferenças entre açúcares naturais e adicionados.</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-emerald check-bullet-icon" /> <span>Desmistificar a tabela nutricional e os alertas da embalagem.</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Dados Acadêmicos & Integrantes */}
          <div className="card about-card highlight-academic-card">
            <div className="card-icon-tile">
              <School size={20} className="icon-emerald" />
            </div>
            <h3 className="about-card-title">Identificação do Trabalho</h3>
            
            <div className="academic-info-fields">
              <div className="info-field">
                <span className="field-label">Curso:</span>
                <span className="field-value">Bacharelado em Nutrição</span>
              </div>

              <div className="info-field">
                <span className="field-label">Instituição:</span>
                <span className="field-value">UNIVERSO – Universidade Salgado de Oliveira</span>
              </div>

              <div className="info-field">
                <span className="field-label">Disciplina / Turma:</span>
                <span className="field-value">Nutrição, Marketing e Ética Profissional</span>
              </div>

              <div className="info-field">
                <span className="field-label">Integrantes do Grupo:</span>
                <ul className="members-list">
                  <li>• Ysadora Victória Ferreira de Lima</li>
                  <li>• Darlla Maria Ferreira</li>
                  <li>• Júlia Caroline da Silva</li>
                  <li>• Júlia Beatriz de Oliveira Lima</li>
                  <li>• Adrianny Kelly Lima de Araújo</li>
                  <li>• Elysia Mel Barreto da Silva</li>
                  <li>• Bárbara Vitorio da Silva Gadelha</li>
                  <li>• Laysa Maria Alves De Araújo</li>
                </ul>
              </div>

              <div className="info-field info-field-last">
                <span className="field-label">Docente / Orientador(a):</span>
                <span className="field-value">Prof.ª Carla Mendonça</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fontes e Nota Obrigatória */}
        <div className="card mandatory-disclaimer-card bg-amber-light border-amber">
          <div className="disclaimer-header text-amber-dark">
            <AlertCircle size={24} />
            <h4>Fontes e Nota Legal de Responsabilidade</h4>
          </div>

          <p className="disclaimer-text">
            <strong>Fontes de Referência:</strong> Agência Nacional de Vigilância Sanitária – Anvisa (Resolução RDC nº 429/2020 e Instrução Normativa IN nº 75/2020) e Banco de Dados Aberto Open Food Facts Brasil.
          </p>

          <div className="mandatory-quote-box">
            <strong>Nota importante:</strong> “Conteúdo educativo. Confira sempre as informações da embalagem física do fabricante.”
          </div>
        </div>
      </div>
    </section>
  );
};
