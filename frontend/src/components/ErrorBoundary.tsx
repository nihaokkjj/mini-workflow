import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 backdrop-blur-2xl">
            <h1 className="text-lg font-semibold text-white">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-white/50">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
