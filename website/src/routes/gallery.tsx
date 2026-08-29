import { createFileRoute } from "@tanstack/react-router";
import { Reveal } from "@/components/site/Reveal";
import { useState, useRef, useEffect } from "react";
import { X, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Item = { src: string; alt: string; cat: string; span?: string };

// Dynamically import all workshop images
const workshopImages = import.meta.glob('@/assets/workshop/*.jpg', { eager: true, import: 'default' }) as Record<string, string>;
const items: Item[] = Object.values(workshopImages).map((src, i) => ({
  src,
  alt: `Workshop Machine ${i + 1}`,
  cat: "WORKSHOP MACHINES",
  span: i % 7 === 0 ? "md:col-span-2 md:row-span-2" : (i % 4 === 0 ? "md:col-span-2" : ""),
}));

const categories = ["All", "WORKSHOP MACHINES"];

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

function GalleryImage({ item, onClick }: { item: Item; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // If image is already cached and loaded by the browser, mark as loaded instantly
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, []);

  return (
    <button
      onClick={onClick}
      className={`group relative w-full h-full min-h-[250px] overflow-hidden rounded-[1.25rem] shadow-[var(--shadow-soft)] outline-none focus-visible:ring-2 focus-visible:ring-primary bg-muted/20`}
    >
      {/* CSS-only Skeleton Loader (Zero Javascript Overhead for smooth scrolling) */}
      <div 
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center transition-opacity duration-500 pointer-events-none ${loaded ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="absolute inset-0 w-full h-full animate-pulse bg-primary/10" />
        <ImageIcon className="w-8 h-8 text-primary/30 animate-pulse" />
      </div>
      
      <img
        ref={imgRef}
        src={item.src}
        alt={item.alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-105 ${
          loaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none" />
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-background opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
        <span className="text-xs uppercase tracking-widest font-semibold">{item.cat}</span>
      </div>
    </button>
  );
}

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
          <div className="grid gap-4 md:grid-cols-4 md:auto-rows-[250px]">
            {filtered.map((it, i) => (
              <Reveal key={it.src + filter} direction="up" delay={(i % 4) * 0.05} className={it.span}>
                <GalleryImage item={it} onClick={() => setLightbox(it)} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-foreground/95 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setLightbox(null)}
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-6 right-6 grid h-12 w-12 place-items-center rounded-full bg-background/10 text-background hover:bg-background/20 transition-colors"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <motion.img
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={lightbox.src}
              alt={lightbox.alt}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] max-w-[95vw] object-contain rounded-xl shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
