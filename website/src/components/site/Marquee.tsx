const partners = [
  "AeroLine Systems",
  "Kavach Auto",
  "MahaSteel Works",
  "Precision Dynamics",
  "Nortek Hydraulics",
  "Orbit Bearings",
  "Vayu Engineering",
  "Trident Motors",
  "Sahyadri Castings",
  "Nimbus Power",
];

export function Marquee() {
  const doubled = [...partners, ...partners];
  return (
    <div className="relative overflow-hidden py-2">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
      <div className="flex marquee-track w-max gap-16 pr-16">
        {doubled.map((name, i) => (
          <div
            key={i}
            className="flex items-center gap-3 whitespace-nowrap text-muted-foreground/80 hover:text-foreground transition-colors"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-cream text-[11px] font-semibold text-primary">
              {name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)}
            </span>
            <span className="text-sm font-medium tracking-tight">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
