import { createFileRoute } from "@tanstack/react-router";
import { Reveal } from "@/components/site/Reveal";
import { Counter } from "@/components/site/Counter";
import aboutImg from "@/assets/about-craft.jpg";
import shop from "@/assets/gallery-5.jpg";
import { Target, Compass, Heart, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — TechFocal Enterprises LLP" },
      { name: "description", content: "Meet TechFocal Enterprises LLP — a precision engineering firm delivering machining and manufacturing solutions with reliability." },
      { property: "og:title", content: "About TechFocal Enterprises LLP" },
      { property: "og:description", content: "Sixteen years of precision engineering, in-house manufacturing, and dependable delivery." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <>
      <section className="section bg-background">
        <div className="container-x">
          <Reveal><div className="eyebrow">About us</div></Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-6 max-w-4xl text-5xl md:text-7xl">
              A precision workshop
              <span className="italic text-primary"> built on trust.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-8 max-w-2xl text-[17px] text-muted-foreground leading-relaxed">
              TechFocal Enterprises LLP is a precision engineering and manufacturing company serving
              automotive, hydraulics, agricultural machinery, and general industrial customers.
              Everything we ship is engineered, machined, and inspected in-house.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-6 bg-background">
        <div className="container-x">
          <Reveal direction="scale">
            <img src={shop} alt="Workshop" loading="lazy" className="w-full h-[380px] md:h-[520px] object-cover rounded-[1.75rem] shadow-[var(--shadow-soft)]" />
          </Reveal>
        </div>
      </section>

      <section className="section bg-cream">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal><div className="eyebrow">Our story</div></Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-5 text-4xl md:text-5xl">Started small. Built to last.</h2>
            </Reveal>
          </div>
          <div className="lg:col-span-7 space-y-5 text-[15.5px] text-muted-foreground leading-relaxed">
            <Reveal><p>Founded in 2008, TechFocal began as a single-lathe operation dedicated to one thing: getting the tolerance right, on time, every time. Sixteen years later, that principle still runs the shop floor.</p></Reveal>
            <Reveal delay={0.05}><p>We've grown into a full-service precision manufacturing partner — 24 machines, an experienced team of machinists and engineers, and an in-house quality process that catches issues before they leave our doors.</p></Reveal>
            <Reveal delay={0.1}><p>Our customers come from industries where downtime is expensive. They stay with us because we understand that a delivered part is only useful if it fits, works, and arrives on schedule.</p></Reveal>
          </div>
        </div>
      </section>

      <section className="section bg-background">
        <div className="container-x">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Target, t: "Mission", d: "Deliver precision components that keep our customers' machines running." },
              { icon: Compass, t: "Vision", d: "Be the most dependable job-work partner in Indian engineering." },
              { icon: Heart, t: "Values", d: "Precision. Integrity. On-time. Continuous improvement." },
              { icon: ShieldCheck, t: "Commitment", d: "Own the process — from RFQ to dispatch — end to end." },
            ].map((v, i) => (
              <Reveal key={v.t} delay={i * 0.05}>
                <div className="card-soft card-soft-hover p-7 h-full">
                  <v.icon className="h-5 w-5 text-primary" />
                  <div className="mt-5 text-lg font-semibold tracking-tight">{v.t}</div>
                  <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.d}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-cream">
        <div className="container-x grid gap-14 lg:grid-cols-12 items-center">
          <Reveal direction="left" className="lg:col-span-6">
            <img src={aboutImg} loading="lazy" alt="Craft" className="rounded-[1.5rem] w-full h-[440px] object-cover" />
          </Reveal>
          <div className="lg:col-span-6">
            <Reveal><div className="eyebrow">Why customers trust us</div></Reveal>
            <Reveal delay={0.05}><h2 className="mt-5 text-4xl md:text-5xl">Numbers we can stand behind.</h2></Reveal>
            <div className="mt-10 grid grid-cols-2 gap-4">
              {[
                { v: 16, s: "+", l: "Years in business" },
                { v: 99, s: "%", l: "On-time delivery" },
                { v: 500000, s: "+", l: "Parts shipped" },
                { v: 80, s: "+", l: "Repeat clients" },
              ].map((k) => (
                <div key={k.l} className="card-soft p-6">
                  <div className="text-3xl font-medium tracking-tight"><Counter to={k.v} suffix={k.s} /></div>
                  <div className="mt-1.5 text-xs text-muted-foreground">{k.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
