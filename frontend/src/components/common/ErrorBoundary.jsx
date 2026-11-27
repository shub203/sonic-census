import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/app';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-paper antialiased">
          <div className="max-w-lg w-full p-6 border border-sand bg-paper-light shadow-none space-y-4 font-mono text-xs">
            <div className="flex items-center gap-2.5 border-b border-sand pb-3">
              <div className="w-7 h-7 border border-loud bg-loud/10 text-loud flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div>
                <span className="text-[10px] uppercase text-graphite block">
                  Field Diagnostic Notice
                </span>
                <h3 className="font-serif font-bold text-base text-ink">
                  Instrument Rendering Glitch
                </h3>
              </div>
            </div>

            <p className="text-graphite font-sans leading-relaxed text-xs">
              A temporary display glitch interrupted this view. Your session data and monitoring settings remain secure.
            </p>

            {this.state.error && (
              <div className="p-2.5 bg-paper border border-sand text-[11px] text-graphite break-all font-mono">
                <strong className="text-loud font-bold">Error:</strong> {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2 border-t border-sand">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-sand bg-paper text-ink text-xs font-mono hover:border-ink transition-colors"
              >
                <Home className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Back to Portal</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
