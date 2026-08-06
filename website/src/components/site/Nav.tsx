import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, ArrowUpRight, User } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/process", label: "Process" },
  { to: "/partners", label: "Team" },

  { to: "/gallery", label: "Gallery" },
  { to: "/contact", label: "Contact" },
] as const;

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/85 backdrop-blur-md border-b border-border"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container-x flex h-18 items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/logo.svg"
            alt="TechFocal Enterprises LLP"
            className="h-10 w-auto"
          />
        </Link>


        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{ className: "text-foreground bg-accent" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground hover:bg-accent/60" }}
              className="px-3.5 py-2 rounded-full text-[13.5px] font-medium transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="http://localhost:5173/login"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-accent transition-colors"
          >
            <User className="h-3.5 w-3.5" />
            Login
          </a>
          <Link
            to="/quote"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-4 py-2.5 text-[13px] font-medium hover:bg-primary transition-colors"
          >
            Request Quote
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <button
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden grid place-items-center h-10 w-10 rounded-full border border-border bg-background"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <div className="container-x py-4 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent"
              >
                {l.label}
              </Link>
            ))}
            <a
              href="http://localhost:5173/login"
              className="mt-2 inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-3 text-sm font-medium"
            >
              <User className="h-4 w-4 mr-1.5" />
              Login
            </a>
            <Link
              to="/quote"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-foreground text-background px-4 py-3 text-sm font-medium"
            >
              Request Quote
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
