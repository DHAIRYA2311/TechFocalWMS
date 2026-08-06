import { createFileRoute } from "@tanstack/react-router";
import { Reveal } from "@/components/site/Reveal";
import { useState } from "react";
import { X } from "lucide-react";
import g1 from "@/assets/gallery-1.jpg";
import g2 from "@/assets/gallery-2.jpg";
import g3 from "@/assets/gallery-3.jpg";
import g4 from "@/assets/gallery-4.jpg";
import g5 from "@/assets/gallery-5.jpg";
import g6 from "@/assets/gallery-6.jpg";
import g7 from "@/assets/gallery-7.jpg";
import craft from "@/assets/about-craft.jpg";

type Item = { src: string; alt: string; cat: string; span?: string };

const items: Item[] = [
  { src: g5, alt: "Workshop floor", cat: "Workshop", span: "md:col-span-2 md:row-span-2" },
  { src: g1, alt: "Lathe close-up", cat: "Machines" },
  { src: g2, alt: "Boring machine", cat: "Machines" },
  { src: g7, alt: "Turning sparks", cat: "Manufacturing", span: "md:row-span-2" },
  { src: g3, alt: "Finished components", cat: "Finished Components", span: "md:col-span-2" },
  { src: g4, alt: "Quality inspection", cat: "Quality Inspection" },
  { src: g6, alt: "Operator at controls", cat: "Workshop" },
  { src: craft, alt: "Drawings and tools", cat: "Manufacturing", span: "md:col-span-2" },
];

const categories = ["All", "Workshop", "Machines", "Manufacturing", "Finished Components", "Quality Inspection"];

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — TechFocal Enterprises LLP" },
      { name: "description", content: "Inside the TechFocal workshop: machines, manufacturing, finished components, and quality inspection." },
      { property: "og:title", content: "Gallery — TechFocal Enterprises LLP" },
      { property: "og:description", content: "A look inside our precision engineering workshop." },
    ],
  }),
  component: Gallery,
});

function Gallery() {
  const [filter, setFilter] = useState("All");
  const [lightbox, setLightbox] = useState<Item | null>(null);

  const filtered = filter === "All" ? items : items.filter((i) => i.cat === filter);

  return (
    <>
      <section className="section bg-background">
        <div className="container-x">
          <Reveal><div className="eyebrow">Workshop & Gallery</div></Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-6 max-w-4xl text-5xl md:text-7xl">
              A look inside <span className="italic text-primary">the shop.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-10 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  className={`rounded-full px-4 py-2 text-xs font-medium border transition-colors ${
                    filter === c
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-cream"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pb-24 bg-background">
        <div className="container-x">
          <div className="grid gap-4 md:grid-cols-4 md:auto-rows-[220px]">
            {filtered.map((it, i) => (
              <Reveal key={it.src + filter} direction="scale" delay={(i % 6) * 0.04} className={it.span}>
                <button
                  onClick={() => setLightbox(it)}
                  className={`group relative w-full h-full min-h-[220px] overflow-hidden rounded-[1.25rem] shadow-[var(--shadow-soft)]`}
                >
                  <img src={it.src} alt={it.alt} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-background opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs uppercase tracking-widest">{it.cat}</span>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {lightbox && (
        <div
          className="fixed inset-0 z-[70] bg-foreground/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 grid h-11 w-11 place-items-center rounded-full bg-background/10 text-background hover:bg-background/20"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
