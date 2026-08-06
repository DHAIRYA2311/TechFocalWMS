import { createFileRoute } from "@tanstack/react-router";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/process")({
  head: () => ({
    meta: [
      { title: "Manufacturing Process — TechFocal Enterprises LLP" },
      { name: "description", content: "How TechFocal turns a drawing into a finished, inspected, on-time component." },
      { property: "og:title", content: "Manufacturing Process — TechFocal" },
      { property: "og:description", content: "A transparent seven-step process from RFQ to dispatch." },
    ],
  }),
  component: Process,
});

const steps = [
  { n: "01", t: "Requirement & RFQ", d: "You share drawings, quantities, and required delivery. We review feasibility." },
  { n: "02", t: "Quotation", d: "Transparent pricing with material, machining, inspection, and delivery costs itemised." },
  { n: "03", t: "Material Procurement", d: "Certified raw material sourced from our vetted supplier network." },
  { n: "04", t: "Machining", d: "The right process on the right machine — turning, boring, milling — set up by experienced hands." },
  { n: "05", t: "In-Process Inspection", d: "Critical dimensions checked during production, not only at the end." },
  { n: "06", t: "Final Quality Control", d: "Every batch measured against the drawing with calibrated instruments." },
  { n: "07", t: "Dispatch & Delivery", d: "Packed, documented, and shipped on the date we committed to." },
];

function Process() {
  return (
    <>
      <section className="section bg-background">
        <div className="container-x">
          <Reveal><div className="eyebrow">How we work</div></Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-6 max-w-4xl text-5xl md:text-7xl">
              From drawing to dispatch, <span className="italic text-primary">in seven steps.</span>
            </h1>
          </Reveal>
        </div>
      </section>

      <section className="pb-24 bg-background">
        <div className="container-x">
          <div className="relative">
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-1/2" aria-hidden />
            <ol className="space-y-6">
              {steps.map((s, i) => (
                <Reveal key={s.n} delay={i * 0.05} direction={i % 2 === 0 ? "left" : "right"}>
                  <li className={`relative pl-20 md:pl-0 md:grid md:grid-cols-2 md:gap-10 ${i % 2 === 0 ? "" : "md:direction-rtl"}`}>
                    <div className={`absolute left-0 top-4 md:relative md:top-auto ${i % 2 === 0 ? "md:pr-12 md:text-right md:col-start-1" : "md:pl-12 md:col-start-2"}`}>
                      <div className="flex md:inline-flex items-center gap-3">
                        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-cream border border-border font-display text-2xl text-primary shadow-[var(--shadow-soft)]">
                          {s.n}
                        </span>
                      </div>
                    </div>
                    <div className={`card-soft p-7 ${i % 2 === 0 ? "md:col-start-2" : "md:col-start-1 md:row-start-1"}`}>
                      <div className="text-xl font-semibold tracking-tight">{s.t}</div>
                      <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.d}</div>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
