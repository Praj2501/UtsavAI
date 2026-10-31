import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In production, avoid logging PII
    console.error('ErrorBoundary caught error:', error.message, errorInfo.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">warning</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-stone-600 max-w-md mb-6 text-sm">
            We encountered an unexpected issue while rendering this section. Your data is safe.
          </p>
          <button
            onClick={this.handleReset}
            className="px-5 py-2.5 bg-festive-marigold text-white font-medium rounded-xl shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          >
            Refresh and Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
