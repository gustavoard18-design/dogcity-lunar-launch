import { useEffect, useState } from 'react';

/**
 * Instalação como app (PWA). O navegador avisa com `beforeinstallprompt`
 * (Chrome, Edge, Android) e guardamos o evento para abrir o pedido depois,
 * no botão do cabeçalho. No iPhone/iPad não existe esse evento: mostramos
 * como adicionar à Tela de Início pelo Safari.
 */

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

if (typeof window !== 'undefined') {
  // Registrado já no carregamento do módulo: o evento pode chegar antes do React montar.
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function usePwaInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force(n => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  const standalone = isStandalone();
  return {
    /** Chrome/Edge/Android: dá para abrir o pedido de instalação. */
    canPrompt: !standalone && deferred !== null,
    /** iPhone/iPad no navegador: mostrar o passo a passo do Safari. */
    showIosHelp: !standalone && isIos(),
    async install(): Promise<boolean> {
      if (!deferred) return false;
      const e = deferred;
      deferred = null;
      notify();
      await e.prompt();
      return (await e.userChoice).outcome === 'accepted';
    },
  };
}
