import { createFileRoute, Link } from "@tanstack/react-router";
import { Reveal } from "@/components/site/Reveal";
import { Cog, Circle, Ruler, Settings2, Wrench, Lightbulb, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — TechFocal Enterprises LLP" },
      { name: "description", content: "Lathe machining, turning, precision machining, boring, custom manufacturing, and engineering solutions." },
      { property: "og:title", content: "Services — TechFocal Enterprises LLP" },
      { property: "og:description", content: "Full-service precision machining and manufacturing capabilities." },
    ],
  }),
  component: Services,
});

const services = [
  { icon: Cog, title: "Lathe Machining", desc: "Turning shafts, bushings, pins, and rotational components with tight tolerances across ferrous and non-ferrous stock.", bullets: ["Manual & CNC lathes", "Diameters up to 400 mm", "Batch or single-piece"] },
  { icon: Circle, title: "Turning Job Work", desc: "Contract turning at any volume — from prototype quantities to sustained monthly production runs.", bullets: ["Rapid changeover", "Repeatable tolerances", "Documented QC"] },
  { icon: Ruler, title: "Precision Machining", desc: "Micron-level accuracy for critical assemblies. Every part inspected against your drawing before it leaves the shop.", bullets: ["±0.01 mm tolerances", "In-process gauging", "Surface finish control"] },
  { icon: Settings2, title: "Boring Machine Job Work", desc: "Large-diameter boring for housings, cylinders, and heavy engineering parts requiring rigidity and accuracy.", bullets: ["Line & jig boring", "Heavy part handling", "Concentricity guaranteed"] },
  { icon: Wrench, title: "Custom Manufacturing", desc: "Made-to-order components engineered around your drawings, materials, and delivery windows.", bullets: ["Design consultation", "Material sourcing", "Full traceability"] },
  { icon: Lightbulb, title: "Engineering Solutions", desc: "Design-for-manufacturing support to reduce your part cost, cycle time, and downstream assembly complexity.", bullets: ["DFM reviews", "Prototype iteration", "Value engineering"] },
];

function Services() {
  return (
    <>
      <section className="section bg-background">
        <div className="container-x">
          <Reveal><div className="eyebrow">What we do</div></Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-6 max-w-4xl text-5xl md:text-7xl">
              Machining, manufacturing, <span className="italic text-primary">and everything in between.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-8 max-w-2xl text-[17px] text-muted-foreground leading-relaxed">
              Six core capabilities, one integrated shop floor. Send us a drawing and we'll handle
              material, machining, inspection, and dispatch.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-24 bg-background">
        <div className="container-x grid gap-5 md:grid-cols-2">
          {services.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.04}>
              <div className="card-soft card-soft-hover p-8 h-full">
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/8 text-primary">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-6 text-2xl font-semibold tracking-tight">{s.title}</div>
                <div className="mt-3 text-[15px] text-muted-foreground leading-relaxed">{s.desc}</div>
                <ul className="mt-6 space-y-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="text-sm text-foreground flex items-center gap-2.5">
                      <span className="h-1 w-1 rounded-full bg-secondary" /> {b}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section bg-cream">
        <div className="container-x text-center">
          <Reveal><div className="eyebrow justify-center">Need something specific?</div></Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 text-4xl md:text-5xl max-w-2xl mx-auto">
              If it can be machined, <span className="italic text-primary">we can quote it.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <Link to="/quote" className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3.5 text-sm font-medium hover:bg-primary transition-colors">
              Request a Quote <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
