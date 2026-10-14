import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Volume2, Pause, Play, Square, Info } from 'lucide-react';

export interface AccessibilityControlsProps {
  /** Texto completo a ser lido em voz alta */
  text: string;
  /** Nome ou identificador da seção para rótulos de acessibilidade */
  sectionTitle?: string;
  /** Classes CSS adicionais */
  className?: string;
}

type AudioState = 'idle' | 'playing' | 'paused';

export const AccessibilityControls: React.FC<AccessibilityControlsProps> = ({
  text,
  sectionTitle = 'conclusão',
  className = ''
}) => {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showLibrasHint, setShowLibrasHint] = useState<boolean>(false);

  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentChunkIndexRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);

  // Limpa o áudio se o texto mudar ou o componente for desmontado
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Fallback silencioso
        }
      }
      isPlayingRef.current = false;
      isPausedRef.current = false;
      currentChunkIndexRef.current = 0;
      activeUtteranceRef.current = null;
    };
  }, [text]);

  // Divide o texto em blocos semânticos (parágrafos) para evitar o bug de corte
  // de áudio de 15 segundos nativo do Chromium e garantir ritmo natural na fala
  const chunks = useMemo(() => {
    if (!text) return [];
    return text
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }, [text]);

  // Carrega e gerencia vozes disponíveis no navegador
  useEffect(() => {
    if (!isSupported) {
      return;
    }

    const loadVoices = () => {
      try {
        const available = window.speechSynthesis.getVoices();
        if (available && available.length > 0) {
          setVoices(available);
        }
      } catch {
        // Fallback silencioso
      }
    };

    loadVoices();

    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      // Limpeza de áudio ao desmontar o componente
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // Ignora
      }
    };
  }, [isSupported]);

  // Encontra a melhor voz em português disponível
  const selectPortugueseVoice = (): SpeechSynthesisVoice | null => {
    const list = voices.length > 0 ? voices : (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : []);
    if (!list || list.length === 0) return null;

    // 1. Preferência absoluta: pt-BR
    const ptBr = list.find(v => {
      const code = (v.lang || '').replace('_', '-').toLowerCase();
      return code === 'pt-br';
    });
    if (ptBr) return ptBr;

    // 2. Outra variante em português (ex: pt-PT)
    const anyPt = list.find(v => (v.lang || '').toLowerCase().startsWith('pt'));
    if (anyPt) return anyPt;

    // 3. Voz padrão do navegador
    return list.find(v => v.default) || null;
  };

  // Executa a leitura de um parágrafo/bloco específico
  const speakChunk = (index: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (index >= chunks.length) {
      // Concluiu todos os blocos com sucesso
      isPlayingRef.current = false;
      isPausedRef.current = false;
      currentChunkIndexRef.current = 0;
      activeUtteranceRef.current = null;
      setAudioState('idle');
      return;
    }

    currentChunkIndexRef.current = index;
    const chunkText = chunks[index];
    const utterance = new SpeechSynthesisUtterance(chunkText);
    
    utterance.lang = 'pt-BR';
    const chosenVoice = selectPortugueseVoice();
    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      if (isPlayingRef.current) {
        setAudioState(isPausedRef.current ? 'paused' : 'playing');
      }
    };

    utterance.onend = () => {
      // Se ainda estiver reproduzindo e não foi cancelado ou pausado, passa para o próximo bloco
      if (isPlayingRef.current && !isPausedRef.current && currentChunkIndexRef.current === index) {
        speakChunk(index + 1);
      }
    };

    utterance.onerror = (e) => {
      // Erros de cancelamento ou interrupção são intencionais (quando o usuário para ou reinicia)
      if (e.error === 'canceled' || e.error === 'interrupted') {
        return;
      }
      console.warn('Erro ao reproduzir áudio com Web Speech API:', e);
      isPlayingRef.current = false;
      isPausedRef.current = false;
      setAudioState('idle');
      activeUtteranceRef.current = null;
    };

    activeUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Inicia ou reinicia a leitura do início
  const handlePlayOrRestart = () => {
    if (!isSupported || chunks.length === 0) return;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    isPlayingRef.current = true;
    isPausedRef.current = false;
    currentChunkIndexRef.current = 0;
    setAudioState('playing');

    // Pequeno timeout para garantir que o cancel anterior limpou o pipeline de áudio
    setTimeout(() => {
      speakChunk(0);
    }, 50);
  };

  // Pausa a leitura
  const handlePause = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      isPausedRef.current = true;
      setAudioState('paused');
    }
  };

  // Continua a leitura pausada
  const handleResume = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      isPausedRef.current = false;
      setAudioState('playing');
    }
  };

  // Para a leitura e retorna ao início
  const handleStop = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isPlayingRef.current = false;
    isPausedRef.current = false;
    currentChunkIndexRef.current = 0;
    activeUtteranceRef.current = null;
    setAudioState('idle');
  };

  // Aciona o widget oficial VLibras
  const handleTriggerVLibras = () => {
    setShowLibrasHint(prev => !prev);
    try {
      const accessBtn = document.querySelector('[vw-access-button]') as HTMLElement | null;
      if (accessBtn) {
        accessBtn.click();
      }
    } catch (err) {
      console.warn('Não foi possível acionar o botão do VLibras via evento de clique:', err);
    }
  };

  return (
    <div 
      className={`accessibility-controls-container ${className}`}
      role="region"
      aria-label={`Acessibilidade: ${sectionTitle}`}
    >
      <div className="accessibility-header">
        <span className="accessibility-label">
          Acessibilidade
        </span>
      </div>

      <div className="accessibility-buttons-group">
        {/* Controle de Áudio */}
        {!isSupported ? (
          <button 
            type="button" 
            className="accessibility-btn accessibility-btn-disabled"
            disabled
            aria-label="Leitura em áudio indisponível neste navegador"
          >
            <Volume2 size={18} aria-hidden="true" />
            <span>Ouvir análise</span>
          </button>
        ) : audioState === 'idle' ? (
          <button
            type="button"
            onClick={handlePlayOrRestart}
            className="accessibility-btn accessibility-btn-primary"
            aria-label={`Ouvir análise em voz alta da seção ${sectionTitle}`}
          >
            <span role="img" aria-hidden="true">🔊</span>
            <span>Ouvir análise</span>
          </button>
        ) : audioState === 'playing' ? (
          <>
            <button
              type="button"
              onClick={handlePlayOrRestart}
              className="accessibility-btn accessibility-btn-active"
              title="Clique para reiniciar a leitura do começo"
              aria-label="Áudio ativo: Lendo análise. Clique para reiniciar do início."
            >
              <span role="img" aria-hidden="true">🔊</span>
              <span>Lendo análise...</span>
            </button>

            <button
              type="button"
              onClick={handlePause}
              className="accessibility-btn accessibility-btn-secondary"
              aria-label="Pausar leitura em áudio"
            >
              <Pause size={17} aria-hidden="true" />
              <span>Pausar</span>
            </button>

            <button
              type="button"
              onClick={handleStop}
              className="accessibility-btn accessibility-btn-stop"
              aria-label="Parar leitura em áudio"
            >
              <Square size={16} aria-hidden="true" />
              <span>Parar</span>
            </button>
          </>
        ) : (
          /* audioState === 'paused' */
          <>
            <button
              type="button"
              onClick={handlePlayOrRestart}
              className="accessibility-btn accessibility-btn-paused"
              title="Clique para reiniciar a leitura do começo"
              aria-label="Áudio pausado. Clique para reiniciar do início."
            >
              <span role="img" aria-hidden="true">⏸</span>
              <span>Leitura pausada</span>
            </button>

            <button
              type="button"
              onClick={handleResume}
              className="accessibility-btn accessibility-btn-secondary"
              aria-label="Continuar leitura em áudio"
            >
              <Play size={17} aria-hidden="true" />
              <span>Continuar</span>
            </button>

            <button
              type="button"
              onClick={handleStop}
              className="accessibility-btn accessibility-btn-stop"
              aria-label="Parar leitura em áudio"
            >
              <Square size={16} aria-hidden="true" />
              <span>Parar</span>
            </button>
          </>
        )}

        {/* Botão de Libras */}
        <button
          type="button"
          onClick={handleTriggerVLibras}
          className="accessibility-btn accessibility-btn-libras"
          aria-label="Abrir recursos de Libras com o widget VLibras"
        >
          <span role="img" aria-hidden="true">🤟</span>
          <span>Libras</span>
        </button>
      </div>

      {/* Fallback de áudio se não houver suporte */}
      {!isSupported && (
        <div className="accessibility-fallback" role="alert">
          <Info size={16} aria-hidden="true" />
          <span>Leitura em áudio não disponível neste navegador.</span>
        </div>
      )}

      {/* Orientação ao abrir Libras */}
      {showLibrasHint && (
        <div className="accessibility-guidance-box" role="status">
          <p>
            🤟 <strong>VLibras:</strong> Abra o VLibras na lateral da tela e selecione o texto da análise para traduzir em Libras.
          </p>
        </div>
      )}

      {/* Nota curta obrigatória sobre a tradução automática */}
      <p className="accessibility-note">
        Tradução automática em Libras disponibilizada pelo VLibras.
      </p>
    </div>
  );
};
