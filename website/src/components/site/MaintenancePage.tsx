import React, { useState, useEffect } from "react";
import { Lock, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import logoImage from "../../assets/logo.png";

interface MaintenanceData {
  enabled: boolean;
  title: string;
  description: string;
  bg_image?: string;
  show_socials: boolean;
  show_contact: boolean;
  show_timer: boolean;
  estimated_launch?: string;
}

interface MaintenancePageProps {
  data: MaintenanceData;
  onVerified: () => void;
}

export function MaintenancePage({ data, onVerified }: MaintenancePageProps) {
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex, nofollow');

    return () => {
      if (meta) meta.setAttribute('content', 'index, follow');
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/api/maintenance/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ access_code: accessCode }),
      });

      const result = await response.json();

      if (response.ok && result.preview_token) {
        localStorage.setItem("techfocal_preview_token", result.preview_token);
        onVerified();
      } else {
        setError(result.message || "Invalid access code.");
      }
    } catch (err) {
      setError("Failed to verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background">

      {/* Background Decorators */}
      {data.bg_image ? (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-15"
          style={{ backgroundImage: `url(${data.bg_image})` }}
        />
      ) : (
        <div className="absolute inset-0 z-0 opacity-40">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-secondary/10 blur-[140px]" />
        </div>
      )}

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-lg mx-4 flex flex-col">

        {/* Logo Header */}
        <div className="flex justify-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-lift border border-border flex items-center justify-center p-3 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <img src={logoImage} alt="TechFocal Logo" className="w-full h-full object-contain relative z-10" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-border/60 shadow-soft rounded-[2rem] p-8 sm:p-12 animate-in fade-in zoom-in-95 duration-500 delay-150 relative overflow-hidden">

          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/50 to-secondary" />

          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-medium text-foreground tracking-tight mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              {data.title || "Under Maintenance"}
            </h1>
            <p className="text-muted-foreground text-[15px] leading-relaxed max-w-sm mx-auto">
              {data.description || "We are currently applying updates to our system to serve you better. Please check back shortly."}
            </p>
          </div>

          {data.show_timer && data.estimated_launch && (
            <div className="mb-8 w-full p-4 rounded-xl bg-muted/50 border border-border/50 text-center">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Expected Completion</p>
              <p className="font-mono text-foreground">{new Date(data.estimated_launch).toLocaleString()}</p>
            </div>
          )}

          {/* Access Code Form */}
          <form onSubmit={handleSubmit} className="w-full relative mt-6">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                Admin Preview Access
              </label>

              <div className="relative group">
                <input
                  type="password"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  placeholder="Enter access code"
                  className="w-full px-5 py-4 bg-white border border-border rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed pr-14"
                />

                <button
                  type="submit"
                  disabled={loading || !accessCode.trim()}
                  className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-foreground text-background hover:bg-primary rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-foreground shadow-sm"
                  aria-label="Verify Code"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin text-background" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 mt-2 text-destructive text-[13px] font-medium px-2 animate-in fade-in slide-in-from-top-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </form>

        </div>

        {/* Footer info */}
        {data.show_contact && (
          <div className="mt-8 text-center text-[13px] text-muted-foreground animate-in fade-in duration-700 delay-300">
            Need urgent assistance? Reach us at <br />
            <a href="mailto:contact@techfocal.in" className="text-foreground hover:text-primary transition-colors font-medium">contact@techfocal.in</a>
          </div>
        )}
      </div>
    </div>
  );
}
