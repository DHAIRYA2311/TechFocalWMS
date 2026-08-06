import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-cream">
      <div className="container-x py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2 max-w-sm">
            <img
              src="/logo.svg"
              alt="TechFocal Enterprises LLP"
              className="h-11 w-auto"
            />

            <p className="mt-5 text-sm text-muted-foreground leading-relaxed">
              Precision machining, manufacturing, and engineering solutions built on quality,
              reliability, and on-time delivery.
            </p>
            <div className="mt-6 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2.5"><MapPin className="h-4 w-4 mt-0.5 text-primary" />Plot No 1 Survey No. 97/1, Canal Road, Lamdapura, Savali, Vadodara - 391775</div>
              <div className="flex items-center gap-2.5"><Phone className="h-4 w-4 text-primary" /> +91 98000 00000</div>
              <div className="flex items-center gap-2.5"><Mail className="h-4 w-4 text-primary" /> support@techfocal.co.in </div>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Company</div>
            <ul className="mt-5 space-y-2.5 text-sm">
              <li><Link to="/about" className="hover:text-primary">About</Link></li>
              <li><Link to="/services" className="hover:text-primary">Services</Link></li>
              <li><Link to="/process" className="hover:text-primary">Process</Link></li>
              <li><Link to="/partners" className="hover:text-primary">Team</Link></li>
              <li><Link to="/gallery" className="hover:text-primary">Gallery</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Get in touch</div>
            <ul className="mt-5 space-y-2.5 text-sm">
              <li><Link to="/contact" className="hover:text-primary">Contact</Link></li>
              <li><Link to="/quote" className="hover:text-primary">Request a Quote</Link></li>
              <li><a href="https://wa.me/919800000000" className="hover:text-primary">WhatsApp</a></li>
              <li><a href="mailto:hello@techfocal.in" className="hover:text-primary">Email us</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} TechFocal Enterprises LLP. All rights reserved.</div>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-foreground">Privacy Policy</a>
            <span>Designed & Developed by TechFocal</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
