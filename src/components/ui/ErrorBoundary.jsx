import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { translate } from "../../i18n.jsx";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-ink p-6 text-white">
          <div className="glass max-w-md rounded-2xl p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <AlertCircle className="h-7 w-7" />
            </div>
            {/* Энэ хайрцаг I18nProvider-ийн ГАДНА байрладаг (provider өөрөө
                унасан ч алдааны дэлгэц гарах ёстой) тул hook биш, хадгалсан
                сонголтыг шууд уншдаг translate()-ыг ашиглана. */}
            <h2 className="mt-4 font-display text-xl font-bold">{translate("eb.title")}</h2>
            <p className="mt-2 text-[13px] text-white/60">
              {translate("eb.desc")}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-[13px] font-bold text-fg-1 glow-brand transition-all hover:scale-105"
            >
              <RefreshCw className="h-4 w-4" />
              {translate("eb.reload")}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
