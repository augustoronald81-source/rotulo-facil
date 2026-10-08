import React from 'react';

const CURRENT_YEAR = 2026;

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="container footer-container">
        <div className="footer-brand">
          <div className="logo-box">
            <div className="logo-badge-container footer-logo-badge">
              <img 
                src="/images/logo-rotulo-consciente.jpeg" 
                alt="Logo Rótulo Consciente" 
                className="site-logo-img"
              />
            </div>
            <span className="brand-name">Rótulo <span className="text-emerald">Fácil</span></span>
          </div>
          <p>
            Plataforma educativa para interpretação de rotulagem nutricional e consulta de produtos em concordância com as normas brasileiras da Anvisa.
          </p>
        </div>

        <div className="footer-info-box">
          <h4>Nota de Isenção</h4>
          <p className="footer-disclaimer">
            “Conteúdo educativo. Confira sempre as informações da embalagem.”
          </p>
          <span className="footer-subtext">
            Trabalho Acadêmico do Curso de Nutrição &bull; Referência Anvisa RDC nº 429/2020 & IN nº 75/2020.
          </span>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container bottom-content">
          <span>&copy; {CURRENT_YEAR} Rótulo Fácil — Projeto Educativo de Nutrição</span>
          <span className="built-with">
            Desenvolvido para ensino e aprendizado em Nutrição
          </span>
        </div>
      </div>
    </footer>
  );
};
