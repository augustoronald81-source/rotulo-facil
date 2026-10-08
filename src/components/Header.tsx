import React, { useState, useEffect } from 'react';
import { Sparkles, Menu, X, Camera, BookOpen, Info, Home, Columns3 } from 'lucide-react';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, onNavigate, onOpenDemo }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavClick = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => {
    if (path === '/' && (currentPath === '/' || currentPath === '')) return true;
    if (path === '/entender-rotulo' && (currentPath === '/entender-rotulo' || currentPath === '/consultar')) return true;
    if (path === '/comparar' && currentPath === '/comparar') return true;
    if (path === '/guia' && (currentPath === '/guia' || currentPath === '/entender')) return true;
    if (path === '/sobre' && currentPath === '/sobre') return true;
    return false;
  };

  return (
    <>
      <header className={`site-header ${isScrolled ? 'header-scrolled' : ''}`}>
        <div className="container header-container">
          {/* Logo */}
          <div 
            className="logo-box" 
            onClick={() => handleNavClick('/')} 
            role="button" 
            tabIndex={0}
            aria-label="Ir para a página inicial"
          >
            <div className="logo-badge-container">
              <img 
                src="/images/logo-rotulo-consciente.jpeg" 
                alt="Logo Rótulo Consciente" 
                className="site-logo-img"
              />
            </div>
            <div className="logo-text">
              <span className="brand-name">Rótulo <span className="text-emerald">Fácil</span></span>
              <span className="brand-sub">Rótulo Consciente</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="desktop-nav" aria-label="Navegação principal">
            <button 
              type="button"
              onClick={() => handleNavClick('/')}
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
            >
              Início
            </button>

            <button 
              type="button"
              onClick={() => handleNavClick('/entender-rotulo')}
              className={`nav-link ${isActive('/entender-rotulo') ? 'active' : ''}`}
            >
              1. Entender um Rótulo
            </button>

            <button 
              type="button"
              onClick={() => handleNavClick('/comparar')}
              className={`nav-link ${isActive('/comparar') ? 'active' : ''}`}
            >
              2. Comparar dois Rótulos
            </button>

            <button 
              type="button"
              onClick={() => handleNavClick('/guia')}
              className={`nav-link ${isActive('/guia') ? 'active' : ''}`}
            >
              Guia Educativo
            </button>

            <button 
              type="button"
              onClick={() => handleNavClick('/sobre')}
              className={`nav-link ${isActive('/sobre') ? 'active' : ''}`}
            >
              Sobre o Projeto
            </button>
          </nav>

          {/* Action Button & Menu Toggle */}
          <div className="header-actions">
            <button 
              type="button"
              onClick={() => {
                onOpenDemo();
                setMobileMenuOpen(false);
              }} 
              className="btn btn-sm btn-secondary btn-demo"
            >
              <Sparkles size={16} /> Ver Exemplo
            </button>

            {/* Menu Toggle Button (☰) Always accessible on mobile & desktop */}
            <button 
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-menu-toggle"
              aria-label={mobileMenuOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>

        {/* Lateral Drawer Menu */}
        {mobileMenuOpen && (
          <>
            <div 
              className="mobile-nav-backdrop" 
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="mobile-nav-drawer" role="dialog" aria-label="Menu lateral de navegação">
              {/* Brand Identity Container inside lateral menu */}
              <div className="drawer-brand-card">
                <div className="drawer-logo-container">
                  <img 
                    src="/images/logo-rotulo-consciente.jpeg" 
                    alt="Identidade Visual Rótulo Consciente" 
                    className="drawer-logo-img" 
                  />
                </div>
                <div className="drawer-brand-text">
                  <span className="drawer-brand-title">Rótulo Consciente</span>
                  <span className="drawer-brand-phrase">Informação que transforma escolhas.</span>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => handleNavClick('/')}
                className={`mobile-nav-item ${isActive('/') ? 'active' : ''}`}
              >
                <Home size={20} /> Início
              </button>

              <button 
                type="button"
                onClick={() => handleNavClick('/entender-rotulo')}
                className={`mobile-nav-item ${isActive('/entender-rotulo') ? 'active' : ''}`}
              >
                <Camera size={20} /> 1. Entender um Rótulo
              </button>

              <button 
                type="button"
                onClick={() => handleNavClick('/comparar')}
                className={`mobile-nav-item ${isActive('/comparar') ? 'active' : ''}`}
              >
                <Columns3 size={20} /> 2. Comparar dois Rótulos
              </button>

              <button 
                type="button"
                onClick={() => handleNavClick('/guia')}
                className={`mobile-nav-item ${isActive('/guia') ? 'active' : ''}`}
              >
                <BookOpen size={20} /> Guia Educativo
              </button>

              <button 
                type="button"
                onClick={() => handleNavClick('/sobre')}
                className={`mobile-nav-item ${isActive('/sobre') ? 'active' : ''}`}
              >
                <Info size={20} /> Sobre o Projeto
              </button>

              <div className="mobile-drawer-footer">
                <button 
                  type="button"
                  onClick={() => {
                    onOpenDemo();
                    setMobileMenuOpen(false);
                  }} 
                  className="btn btn-primary width-full"
                >
                  <Sparkles size={18} /> Ver Exemplo de Produto
                </button>
              </div>
            </div>
          </>
        )}
      </header>
    </>
  );
};
