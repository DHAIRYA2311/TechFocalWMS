import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Hexagon } from "lucide-react";
import loginBg from "@/assets/workshop/LOGIN.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const setDemo = (role: string) => {
    setEmail(`${role.toLowerCase()}@techfocal.com`);
    setPassword("demo1234");
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-8">
      {/* Full-screen Background with subtle navy translucent overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={loginBg} 
          alt="TechFocal Workshop Background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#0f172a]/70 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors drop-shadow-md"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to website
        </Link>

        {/* Clean premium login card */}
        <div className="rounded-2xl border border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20 shadow-sm">
              <Hexagon className="h-6 w-6 text-primary fill-primary/20" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome Back</h1>
            <p className="mt-1.5 text-sm text-muted-foreground font-medium">
              TechFocal WMS Authentication
            </p>
          </div>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@techfocal.com"
                  className="w-full rounded-xl border border-border bg-background/50 pl-10 pr-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-foreground">
                  Password
                </label>
                <a href="#" className="text-xs font-semibold text-primary hover:underline">
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-background/50 pl-10 pr-10 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 w-full rounded-xl bg-foreground text-background px-4 py-3 text-sm font-bold hover:bg-primary hover:text-primary-foreground transition-colors shadow-md"
            >
              Sign In
            </button>
          </form>

          <div className="mt-8">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-slate-900 px-3 font-medium text-muted-foreground uppercase tracking-widest">
                  Quick Demo
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2.5">
              {['Partner', 'Admin', 'Manager', 'Worker'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setDemo(role)}
                  className="rounded-lg border border-border bg-background/50 px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors shadow-sm"
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
