import React, { Component, ErrorInfo, ReactNode } from "react";
import { TriangleAlert, RefreshCw } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 text-center font-sans">
                    <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl max-w-2xl w-full flex flex-col items-center gap-6">
                        <div className="bg-red-900/30 p-4 rounded-full border border-red-500/50">
                            <TriangleAlert className="w-12 h-12 text-red-500" />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-red-400 mb-2">Application Crashed</h1>
                            <p className="text-slate-400">Something went wrong while rendering the application.</p>
                        </div>

                        {this.state.error && (
                            <div className="w-full bg-slate-950 p-4 rounded border border-slate-800 text-left overflow-auto max-h-64">
                                <p className="font-mono text-red-300 text-sm break-words mb-2">
                                    {this.state.error.toString()}
                                </p>
                                {this.state.errorInfo && (
                                    <pre className="font-mono text-xs text-slate-500 whitespace-pre-wrap">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                        )}

                        <button
                            onClick={this.handleReload}
                            className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" /> Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
