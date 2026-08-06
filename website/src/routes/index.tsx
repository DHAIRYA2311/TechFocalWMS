import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ArrowRight,
  Cog,
  Wrench,
  Ruler,
  Circle,
  Settings2,
  Lightbulb,
  ShieldCheck,
  Truck,
  BadgeCheck,
  Users,
  Sparkles,
} from "lucide-react";
import heroImg from "@/assets/hero-workshop.jpg";
import aboutImg from "@/assets/about-craft.jpg";
import g1 from "@/assets/gallery-1.jpg";
import g5 from "@/assets/gallery-5.jpg";
import g3 from "@/assets/gallery-3.jpg";
import g7 from "@/assets/gallery-7.jpg";
import { Reveal } from "@/components/site/Reveal";
import { Counter } from "@/components/site/Counter";
import { Marquee } from "@/components/site/Marquee";

export const Route = createFileRoute("/")({
  component: Home,
});

const services = [
  { icon: Cog, title: "Lathe Machining", desc: "High-precision lathe operations for shafts, bushings, and rotational components." },
  { icon: Circle, title: "Turning Job Work", desc: "Contract turning across ferrous and non-ferrous materials with tight tolerances." },
  { icon: Ruler, title: "Precision Machining", desc: "Micron-level accuracy for critical assemblies and OEM specifications." },
  { icon: Settings2, title: "Boring Machine Job Work", desc: "Large-diameter boring for housings, cylinders, and heavy engineering parts." },
  { icon: Wrench, title: "Custom Manufacturing", desc: "Made-to-order components engineered around your drawings and volumes." },
  { icon: Lightbulb, title: "Engineering Solutions", desc: "Design-for-manufacturing support to reduce cost and lead time." },
];

const whyUs = [
  { icon: BadgeCheck, title: "Precision Engineering", desc: "Consistent tolerances validated at every stage." },
  { icon: Cog, title: "Modern Machinery", desc: "A well-maintained fleet of lathes, boring, and CNC equipment." },
  { icon: Users, title: "Experienced Workforce", desc: "Machinists and engineers with decades on the shop floor." },
  { icon: ShieldCheck, title: "Strict Quality Control", desc: "In-process inspection and final QA on every batch." },
  { icon: Truck, title: "On-Time Delivery", desc: "Schedules we commit to, and hit — reliably." },
  { icon: Sparkles, title: "Customer-Centric", desc: "Transparent communication from RFQ through dispatch." },
];

function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-background">
        <div className="container-x pt-16 md:pt-24 pb-20 md:pb-28">
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-10 items-center">
            <div className="lg:col-span-6">
              <Reveal>
                <div className="eyebrow">
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                  Precision Manufacturing since 2008
                </div>
              </Reveal>
              <Reveal delay={0.05}>
                <h1 className="mt-6 text-[46px] leading-[1.02] md:text-[68px] lg:text-[76px]">
                  Precision engineering
                  <br />
                  built for
                  <span className="italic text-primary"> modern industries.</span>
                </h1>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-7 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
                  TechFocal Enterprises LLP delivers precision machining, manufacturing, and engineering
                  solutions with quality, reliability, and timely delivery — for the industries that
                  keep the world moving.
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Link
                    to="/quote"
                    className="group inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3.5 text-sm font-medium hover:bg-primary transition-colors"
                  >
                    Request a Quote
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    to="/services"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3.5 text-sm font-medium hover:bg-accent"
                  >
                    Explore Services
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Reveal>
              <Reveal delay={0.25}>
                <div className="mt-12 flex items-center gap-6 text-xs text-muted-foreground">
                  <div className="flex -space-x-2">
                    {["A", "K", "M", "P"].map((c) => (
                      <div key={c} className="grid h-8 w-8 place-items-center rounded-full border border-border bg-cream text-[11px] font-semibold text-primary">
                        {c}
                      </div>
                    ))}
                  </div>
                  <div>
                    Trusted by <span className="text-foreground font-semibold">80+ industrial clients</span> across India.
                  </div>
                </div>
              </Reveal>
            </div>

            <Reveal direction="right" delay={0.1} className="lg:col-span-6">
              <div className="relative">
                <div className="absolute -inset-4 rounded-[2rem] bg-cream -z-10" />
                <img
                  src={heroImg}
                  alt="TechFocal precision engineering workshop"
                  width={1600}
                  height={1200}
                  className="w-full h-[440px] md:h-[560px] object-cover rounded-[1.75rem] shadow-[var(--shadow-lift)]"
                />
                <div className="absolute -bottom-6 -left-6 hidden md:block card-soft p-5 max-w-[220px]">
                  <div className="text-3xl font-medium tracking-tight">
                    <Counter to={99} suffix="%" />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">On-time delivery rate across all orders.</div>
                </div>
                <div className="absolute -top-6 -right-6 hidden md:flex card-soft px-4 py-3 items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-secondary" />
                  <span className="text-xs font-medium">ISO-aligned QC process</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* TRUSTED BY */}
      <section className="border-y border-border bg-background">
        <div className="container-x py-10">
          <div className="mb-6">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Trusted by leading manufacturers
            </div>
          </div>

          <Marquee />
        </div>
      </section>

      {/* ABOUT PREVIEW */}
      <section className="section bg-cream">
        <div className="container-x grid gap-14 lg:grid-cols-12 items-center">
          <Reveal direction="left" className="lg:col-span-6">
            <img
              src={aboutImg}
              alt="Engineering drawings and precision tools"
              loading="lazy"
              width={1200}
              height={900}
              className="rounded-[1.5rem] w-full h-[440px] object-cover shadow-[var(--shadow-soft)]"
            />
          </Reveal>
          <div className="lg:col-span-6">
            <Reveal><div className="eyebrow">About TechFocal</div></Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-5 text-4xl md:text-5xl">
                A workshop where <span className="italic text-primary">tolerance is a promise.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 text-[15.5px] leading-relaxed text-muted-foreground">
                We are a precision engineering firm building components and assemblies for automotive,
                hydraulic, and general industrial customers. Every job is engineered, machined and
                inspected in-house — because reliability starts with owning the process.
              </p>
            </Reveal>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {[
                { t: "Mission", d: "Deliver precision components that keep our customers' machines running." },
                { t: "Vision", d: "Be the most dependable job-work partner in Indian engineering." },
                { t: "Values", d: "Precision. Integrity. On-time. Continuous improvement." },
                { t: "Why us", d: "Consistent quality, transparent pricing, and schedules we honour." },
              ].map((v) => (
                <Reveal key={v.t} delay={0.1}>
                  <div className="card-soft card-soft-hover p-5">
                    <div className="text-sm font-semibold">{v.t}</div>
                    <div className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{v.d}</div>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={0.2}>
              <Link
                to="/about"
                className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all"
              >
                Read our story <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="section bg-background">
        <div className="container-x">
          <Reveal>
            <div className="max-w-2xl">
              <div className="eyebrow">By the numbers</div>
              <h2 className="mt-5 text-4xl md:text-5xl">
                Sixteen years of measurable, <span className="italic text-primary">repeatable output.</span>
              </h2>
            </div>
          </Reveal>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { v: 16, s: "+", l: "Years of experience" },
              { v: 1200, s: "+", l: "Projects completed" },
              { v: 80, s: "+", l: "Industrial clients" },
              { v: 24, s: "", l: "Machines installed" },
              { v: 500000, s: "+", l: "Components manufactured" },
              { v: 99, s: "%", l: "On-time delivery" },
            ].map((k, i) => (
              <Reveal key={i} delay={i * 0.04} direction="scale">
                <div className="card-soft p-6">
                  <div className="text-3xl md:text-[34px] font-medium tracking-tight text-foreground">
                    <Counter to={k.v} suffix={k.s} />
                  </div>
                  <div className="mt-2 text-[12.5px] text-muted-foreground leading-snug">{k.l}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="section bg-cream">
        <div className="container-x">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <Reveal><div className="eyebrow">Our services</div></Reveal>
              <Reveal delay={0.05}>
                <h2 className="mt-5 text-4xl md:text-5xl">
                  From single components to <span className="italic text-primary">production-scale runs.</span>
                </h2>
              </Reveal>
            </div>
            <Reveal delay={0.1}>
              <Link to="/services" className="text-sm text-primary inline-flex items-center gap-1.5 hover:gap-2.5 transition-all">
                See all services <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.05}>
                <Link to="/services" className="group card-soft card-soft-hover p-7 h-full block">
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/8 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <s.icon className="h-5 w-5" />
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                  <div className="mt-6 text-[17px] font-semibold tracking-tight">{s.title}</div>
                  <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</div>
                  <div className="mt-6 text-xs text-primary font-medium">Learn more →</div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE */}
      <section className="section bg-background">
        <div className="container-x">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Reveal><div className="eyebrow">Why choose TechFocal</div></Reveal>
              <Reveal delay={0.05}>
                <h2 className="mt-5 text-4xl md:text-5xl">
                  The parts you'd stake <span className="italic text-primary">your product on.</span>
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-6 text-[15.5px] text-muted-foreground leading-relaxed">
                  Precision, process, and people — the three things engineering customers actually
                  need from a job-work partner. We've built the business around all three.
                </p>
              </Reveal>
            </div>
            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
              {whyUs.map((w, i) => (
                <Reveal key={w.title} delay={i * 0.04}>
                  <div className="card-soft card-soft-hover p-6 h-full">
                    <w.icon className="h-5 w-5 text-secondary" />
                    <div className="mt-4 text-[15px] font-semibold">{w.title}</div>
                    <div className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{w.desc}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY PREVIEW */}
      <section className="section bg-cream">
        <div className="container-x">
          <div className="flex items-end justify-between gap-6">
            <div>
              <Reveal><div className="eyebrow">Workshop & Gallery</div></Reveal>
              <Reveal delay={0.05}>
                <h2 className="mt-5 text-4xl md:text-5xl">Inside the shop floor.</h2>
              </Reveal>
            </div>
            <Reveal delay={0.1}>
              <Link to="/gallery" className="text-sm text-primary inline-flex items-center gap-1.5 hover:gap-2.5 transition-all">
                View gallery <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-4 md:grid-rows-2 md:h-[560px]">
            <Reveal direction="scale" className="md:col-span-2 md:row-span-2">
              <img src={g5} alt="Workshop" loading="lazy" className="w-full h-full min-h-[280px] object-cover rounded-[1.25rem]" />
            </Reveal>
            <Reveal direction="scale" delay={0.05}>
              <img src={g1} alt="Precision lathe" loading="lazy" className="w-full h-full min-h-[180px] object-cover rounded-[1.25rem]" />
            </Reveal>
            <Reveal direction="scale" delay={0.1}>
              <img src={g7} alt="Turning sparks" loading="lazy" className="w-full h-full min-h-[180px] object-cover rounded-[1.25rem]" />
            </Reveal>
            <Reveal direction="scale" delay={0.15}>
              <img src={g3} alt="Finished components" loading="lazy" className="w-full h-full min-h-[180px] object-cover rounded-[1.25rem] md:col-span-2" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-background">
        <div className="container-x">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] bg-foreground text-background p-10 md:p-16">
              <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/40 blur-3xl" />
              <div className="absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-secondary/30 blur-3xl" />
              <div className="relative grid gap-10 md:grid-cols-2 items-end">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-background/60">Ready when you are</div>
                  <h2 className="mt-4 text-4xl md:text-5xl text-background">
                    Send us your drawing —<br />
                    <span className="italic text-primary-foreground/90">we'll send back a quote.</span>
                  </h2>
                </div>
                <div className="flex flex-wrap gap-3 md:justify-end">
                  <Link
                    to="/quote"
                    className="inline-flex items-center gap-2 rounded-full bg-background text-foreground px-6 py-3.5 text-sm font-medium hover:bg-cream transition-colors"
                  >
                    Request a Quote <ArrowUpRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 rounded-full border border-background/25 px-6 py-3.5 text-sm font-medium hover:bg-background/10"
                  >
                    Talk to our team
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
