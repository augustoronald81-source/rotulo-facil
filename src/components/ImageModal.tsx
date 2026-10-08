import React from 'react';
import { X, ZoomIn } from 'lucide-react';

interface ImageModalProps {
  imageUrl: string;
  title: string;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, title, onClose }) => {
  return (
    <div className="scanner-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="image-zoom-card" onClick={(e) => e.stopPropagation()}>
        <div className="image-zoom-header">
          <div className="zoom-header-title">
            <ZoomIn size={20} className="icon-emerald" />
            <h3>{title}</h3>
          </div>
          <button 
            onClick={onClose} 
            className="scanner-close-btn"
            aria-label="Fechar ampliação de imagem"
          >
            <X size={24} />
          </button>
        </div>

        <div className="image-zoom-body">
          <img 
            src={imageUrl} 
            alt={title} 
            className="zoomed-image"
          />
        </div>

        <div className="image-zoom-footer">
          <p>Imagem original em alta resolução extraída do produto cadastrado.</p>
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Fechar Ampliação
          </button>
        </div>
      </div>
    </div>
  );
};
