import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ToastProvider } from "./context/toast";
import "./styles.css";

// ── Error Boundary ─────────────────────────────────────────────────────────────
interface EBState { hasError: boolean; message: string }

class ErrorBoundary extends React.Component<React.PropsWithChildren, EBState> {
  state: EBState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): EBState {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[Wrex] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-2xl font-bold text-navy">Something went wrong</h1>
          <p className="max-w-md text-sm text-charcoal/60">
            An unexpected error occurred. Refresh the page to try again. If the issue persists, contact support.
          </p>
          {import.meta.env.DEV && (
            <pre className="max-w-lg overflow-auto rounded-lg bg-gray-100 p-4 text-left text-xs text-red-600">
              {this.state.message}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="rounded-soft bg-navy px-6 py-2.5 text-sm font-bold text-white transition hover:bg-navy/80"
          >
            Refresh page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Entry point ────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
