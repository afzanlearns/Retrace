"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      const error = this.state.error;
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-lg">
            <p className="text-sm font-medium text-danger mb-2">Something went wrong</p>
            <p className="text-xs text-text-tertiary mb-4">
              Try selecting a different commit, or reload the page.
            </p>
            {error && (
              <details className="mb-4 text-left">
                <summary className="text-xs font-mono text-text-secondary cursor-pointer hover:text-text-primary">
                  Error details
                </summary>
                <pre className="mt-2 text-[11px] text-danger bg-surface-secondary p-3 rounded-md overflow-auto max-h-48 text-left">
                  {error.name}: {error.message}
                  {"\n\n"}
                  {error.stack?.split("\n").slice(1).join("\n")}
                </pre>
              </details>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
