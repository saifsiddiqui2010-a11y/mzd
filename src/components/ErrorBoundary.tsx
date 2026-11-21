import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let readable = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string; path?: string };
      if (parsed.error) {
        readable = `Database access error (${parsed.operationType ?? 'operation'} on ${parsed.path ?? 'resource'}): ${parsed.error}`;
      }
    } catch {
      // Keep original message
    }
    return { hasError: true, message: readable };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('MZD Perfumes ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAFAF9] text-[#141413] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#E7E5E0] p-8 space-y-5">
            <p className="text-xs tracking-wide text-[#9A7B4F]">MZD Perfumes</p>
            <h1 className="font-serif text-3xl font-medium text-[#141413]">
              Unable to complete this request
            </h1>
            <p className="text-sm text-[#57534E] leading-relaxed">{this.state.message}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
              className="px-5 py-2.5 text-sm font-medium bg-[#141413] text-white hover:bg-[#292826] transition-colors cursor-pointer"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
