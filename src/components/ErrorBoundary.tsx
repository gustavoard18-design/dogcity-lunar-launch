import { Component, ReactNode } from 'react';

interface Props {
  /** Tela mostrada quando algo abaixo quebra. */
  fallback: (error: Error) => ReactNode;
  children: ReactNode;
}

/** Segura erros de renderização (ex.: WebGL que falha no meio da missão) sem derrubar o jogo inteiro. */
export default class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[jogo] erro na cena', error);
  }

  render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}
