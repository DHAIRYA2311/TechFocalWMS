import { createFileRoute } from "@tanstack/react-router";
import { Reveal } from "@/components/site/Reveal";
import { MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — TechFocal Enterprises LLP" },
      { name: "description", content: "Get in touch with TechFocal Enterprises LLP — address, phone, email, and business hours." },
      { property: "og:title", content: "Contact TechFocal Enterprises LLP" },
      { property: "og:description", content: "Contact our precision engineering team." },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <>
      <section className="section bg-background">
        <div className="container-x">
          <Reveal><div className="eyebrow">Get in touch</div></Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-6 max-w-4xl text-5xl md:text-7xl">
              Let's build <span className="italic text-primary">something precise.</span>
            </h1>
          </Reveal>
        </div>
      </section>

      <section className="pb-24 bg-background">
        <div className="container-x grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-4">
            {[
              { icon: MapPin, t: "Address", d: "Plot No 1 Survey No. 97/1, Canal Road, \n Lamdapura, Savali, Vadodara - 391775" },
              { icon: Phone, t: "Phone", d: "+91 98000 00000\n+91 20 2712 0000" },
              { icon: Mail, t: "Email", d: "hello@techfocal.in\nsales@techfocal.in" },
              { icon: Clock, t: "Hours", d: "Mon – Sat · 9:00 AM – 7:00 PM IST\nSunday closed" },
            ].map((c, i) => (
              <Reveal key={c.t} delay={i * 0.04}>
                <div className="card-soft card-soft-hover p-6 flex items-start gap-4">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/8 text-primary shrink-0">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{c.t}</div>
                    <div className="mt-1 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{c.d}</div>
                  </div>
                </div>
              </Reveal>
            ))}
            <Reveal delay={0.2}>
              <a
                href="https://wa.me/919800000000"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-secondary text-secondary-foreground px-6 py-4 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <MessageCircle className="h-4 w-4" /> Chat with us on WhatsApp
              </a>
            </Reveal>
          </div>

          <Reveal direction="right" delay={0.1} className="lg:col-span-7">
            <div className="rounded-[1.5rem] overflow-hidden border border-border shadow-[var(--shadow-soft)] h-full min-h-[480px]">
              <iframe
                title="TechFocal Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3687.099593000013!2d73.2089564743497!3d22.4628914369842!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395fcd249476b997%3A0xe25d9fbe75b058a!2sTechFocal%20Enterprises%20LLP!5e0!3m2!1sen!2sin!4v1785585594917!5m2!1sen!2sin"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full min-h-[480px] border-0"
              />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
