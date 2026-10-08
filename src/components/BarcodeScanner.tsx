import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, AlertTriangle, RefreshCw, Zap } from 'lucide-react';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onClose }) => {
  const scannerContainerId = 'reader-barcode-viewport';
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  const [errorState, setErrorState] = useState<{
    title: string;
    message: string;
    isPermissionDenied: boolean;
  } | null>(null);

  const [isInitializing, setIsInitializing] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const stopScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        await html5QrcodeRef.current.clear();
      } catch (err) {
        console.warn('Erro ao encerrar a câmera:', err);
      } finally {
        html5QrcodeRef.current = null;
      }
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  const startScanner = async () => {
    setIsInitializing(true);
    setErrorState(null);

    await stopScanner();

    try {
      // Create instance supporting common 1D food barcodes (EAN-13, EAN-8, UPC-A, UPC-E, Code 128, etc.)
      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.QR_CODE
      ];

      const html5Qrcode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport,
        verbose: false
      });
      html5QrcodeRef.current = html5Qrcode;

      const qrCodeSuccessCallback = async (decodedText: string) => {
        // Stop scanner immediately on first successful read to turn off camera led
        await stopScanner();
        onScanSuccess(decodedText);
      };

      const qrCodeErrorCallback = () => {
        // Frame scan fail (expected during normal searching, silent)
      };

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 160 }, // Horizontal box optimal for 1D barcodes
        aspectRatio: 1.0
      };

      // Prefer back camera ("environment") for phone scanning, fallback to default camera
      try {
        await html5Qrcode.start(
          { facingMode: 'environment' },
          config,
          qrCodeSuccessCallback,
          qrCodeErrorCallback
        );
      } catch (firstErr) {
        // Fallback to any available camera (webcam, laptop camera)
        await html5Qrcode.start(
          { facingMode: 'user' },
          config,
          qrCodeSuccessCallback,
          qrCodeErrorCallback
        );
      }

      // Check if torch/flashlight is supported
      try {
        const capabilities = html5Qrcode.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setHasTorch(true);
        }
      } catch (e) {
        // Torch capability check not supported on all browsers
      }

      setIsInitializing(false);
    } catch (err: any) {
      console.error('Falha ao iniciar a câmera:', err);
      setIsInitializing(false);

      const errStr = String(err).toLowerCase();
      if (errStr.includes('notallowederror') || errStr.includes('permission') || errStr.includes('denied')) {
        setErrorState({
          title: 'Permissão da Câmera Negada',
          message: 'O navegador impediu o acesso à câmera. Permita o uso da câmera nas configurações do navegador ou utilize a busca manual digitando o código.',
          isPermissionDenied: true
        });
      } else if (errStr.includes('notfounderror') || errStr.includes('devices not found')) {
        setErrorState({
          title: 'Nenhuma Câmera Encontrada',
          message: 'Não identificamos nenhuma câmera conectada a este dispositivo. Utilize a opção de digitação manual.',
          isPermissionDenied: false
        });
      } else {
        setErrorState({
          title: 'Erro ao Abrir a Câmera',
          message: 'Não foi possível acessar a câmera do aparelho no momento. Tente recarregar ou use a busca manual.',
          isPermissionDenied: false
        });
      }
    }
  };

  const toggleTorch = async () => {
    if (html5QrcodeRef.current && hasTorch) {
      try {
        const nextState = !torchOn;
        await html5QrcodeRef.current.applyVideoConstraints({
          advanced: [{ torch: nextState }] as any
        });
        setTorchOn(nextState);
      } catch (e) {
        console.warn('Não foi possível alterar o flash', e);
      }
    }
  };

  useEffect(() => {
    // Start scanner when component mounts
    const timer = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, []);

  return (
    <div className="scanner-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="scanner-title">
      <div className="scanner-modal-card">
        {/* Header */}
        <div className="scanner-modal-header">
          <div className="scanner-header-title">
            <Camera className="icon-emerald" size={24} />
            <h3 id="scanner-title">Leitor de Código de Barras</h3>
          </div>
          <button 
            onClick={handleClose}
            className="scanner-close-btn"
            aria-label="Fechar leitor e desligar câmera"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content View */}
        <div className="scanner-modal-body">
          {errorState ? (
            <div className="scanner-error-container">
              <AlertTriangle className="scanner-error-icon" size={48} />
              <h4>{errorState.title}</h4>
              <p>{errorState.message}</p>
              
              <div className="scanner-error-actions">
                <button 
                  onClick={startScanner} 
                  className="btn btn-outline"
                >
                  <RefreshCw size={18} /> Tentar Novamente
                </button>
                <button 
                  onClick={handleClose} 
                  className="btn btn-primary"
                >
                  Usar Digitação Manual
                </button>
              </div>
            </div>
          ) : (
            <div className="scanner-viewport-wrapper">
              {isInitializing && (
                <div className="scanner-loading-overlay">
                  <div className="spinner"></div>
                  <p>Solicitando acesso à câmera...</p>
                </div>
              )}

              {/* The element where html5-qrcode attaches video feed */}
              <div id={scannerContainerId} className="scanner-viewport"></div>

              {/* Scanning visual guide overlay */}
              {!isInitializing && (
                <div className="scanner-guide-overlay">
                  <div className="scanner-target-box">
                    <div className="scanner-laser-line"></div>
                  </div>
                  <p className="scanner-hint">
                    Centralize o código de barras do alimento no retângulo acima
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="scanner-modal-footer">
          {hasTorch && !errorState && (
            <button 
              onClick={toggleTorch} 
              className={`btn btn-sm ${torchOn ? 'btn-amber' : 'btn-outline'}`}
            >
              <Zap size={16} /> {torchOn ? 'Desligar Lanterna' : 'Ligar Lanterna'}
            </button>
          )}
          <button onClick={handleClose} className="btn btn-secondary width-full">
            Cancelar e Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
