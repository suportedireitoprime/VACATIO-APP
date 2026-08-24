import { Component, ErrorInfo, ReactNode } from 'react';
import { recordException } from '@/lib/nativeCrashlytics';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void recordException(error, {
      source: 'react.ErrorBoundary',
      componentStack: (info.componentStack || '').slice(0, 500),
    });
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background text-foreground p-6 gap-4">
        <h1 className="text-2xl font-semibold">Algo deu errado</h1>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          O app encontrou um erro inesperado. A ocorrência já foi registrada.
        </p>
        <pre className="text-xs bg-muted p-3 rounded max-w-full overflow-auto max-h-40">
          {error.message}
        </pre>
        <button
          onClick={this.reset}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
        >
          Tentar novamente
        </button>
      </div>
    );
  }
}
