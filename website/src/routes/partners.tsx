import { createFileRoute } from "@tanstack/react-router";
import { Reveal } from "@/components/site/Reveal";
import { ShieldCheck, Ruler, RefreshCw, Sparkles, Linkedin, Mail } from "lucide-react";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "Leadership & Team — TechFocal Enterprises LLP" },
      { name: "description", content: "Meet the founders and management team leading TechFocal Enterprises LLP." },
      { property: "og:title", content: "Leadership & Team — TechFocal" },
      { property: "og:description", content: "The people behind TechFocal's engineering and manufacturing excellence." },
    ],
  }),
  component: Team,
});

// TODO: Replace placeholder names, roles and bios with real details.
const team = [
  { name: "Founder Name 1", role: "Founder & Managing Partner", bio: "Leads overall strategy, operations, and long-term customer relationships." },
  { name: "Founder Name 2", role: "Founder & Partner — Engineering", bio: "Heads engineering, design and process planning across the shop floor." },
  { name: "Founder Name 3", role: "Founder & Partner — Manufacturing", bio: "Owns production, capacity planning, and on-time delivery commitments." },
  { name: "Management Name 4", role: "Head of Quality", bio: "Ensures every part shipped meets drawing, inspection and traceability standards." },
  { name: "Management Name 5", role: "Head of Operations", bio: "Runs procurement, scheduling, and day-to-day plant operations." },
  { name: "Management Name 6", role: "Head of Business Development", bio: "Manages customer engagement, quotations, and new partnerships." },
];

const commitments = [
  { icon: Ruler, t: "Precision", d: "Every part machined to the drawing, verified with calibrated instruments." },
  { icon: ShieldCheck, t: "Inspection", d: "Documented in-process and final QC on every batch we ship." },
  { icon: RefreshCw, t: "Reliability", d: "Schedules we commit to are schedules we hit." },
  { icon: Sparkles, t: "Continuous Improvement", d: "We measure, review, and refine our processes constantly." },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Team() {
  return (
    <>
      <section className="section bg-background">
        <div className="container-x">
          <Reveal><div className="eyebrow">Leadership & team</div></Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-6 max-w-4xl text-5xl md:text-7xl">
              The people behind <span className="italic text-primary">TechFocal.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-8 max-w-2xl text-[17px] text-muted-foreground leading-relaxed">
              Our founders and management team bring decades of combined experience across
              engineering, manufacturing, and quality — working together to build a company
              our customers trust.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-24 bg-background">
        <div className="container-x grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.04}>
              <div className="card-soft card-soft-hover p-7 h-full flex flex-col">
                <div className="flex items-center gap-4">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-cream border border-border text-primary text-base font-semibold">
                    {initials(p.name)}
                  </span>
                  <div>
                    <div className="text-[15px] font-semibold">{p.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.role}</div>
                  </div>
                </div>
                <p className="mt-5 text-sm text-muted-foreground leading-relaxed flex-1">
                  {p.bio}
                </p>
                <div className="mt-6 pt-5 border-t border-border flex items-center gap-3 text-muted-foreground">
                  <a href="#" aria-label={`${p.name} on LinkedIn`} className="hover:text-primary transition-colors">
                    <Linkedin className="h-4 w-4" />
                  </a>
                  <a href="mailto:hello@techfocal.in" aria-label={`Email ${p.name}`} className="hover:text-primary transition-colors">
                    <Mail className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section bg-cream">
        <div className="container-x">
          <div className="max-w-2xl">
            <Reveal><div className="eyebrow">Our commitments</div></Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-5 text-4xl md:text-5xl">
                What our customers <span className="italic text-primary">count on us for.</span>
              </h2>
            </Reveal>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {commitments.map((c, i) => (
              <Reveal key={c.t} delay={i * 0.05}>
                <div className="card-soft card-soft-hover p-7 h-full">
                  <c.icon className="h-5 w-5 text-secondary" />
                  <div className="mt-5 text-lg font-semibold">{c.t}</div>
                  <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.d}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
