// Dynamically import all company logos from the assets folder
const companyImages = import.meta.glob('@/assets/companies/*.{png,jpg,jpeg,svg,webp}', { eager: true, import: 'default' }) as Record<string, string>;
const partners = Object.values(companyImages);

export function Marquee() {
  // Creating a circular chain of 8 images (4 original + 4 duplicated) as requested
  const multiplied = [...partners, ...partners];
  
  return (
    <div className="relative overflow-hidden py-4">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
      <div className="flex marquee-track w-max gap-16 md:gap-24 pr-16 md:pr-24 items-center">
        {multiplied.map((src, i) => {
          const isWhiteLogo = src.includes('JSWSTEEL');
          return (
            <img
              key={i}
              src={src}
              alt={`Partner Logo ${i}`}
              className={`h-6 md:h-8 lg:h-10 w-auto object-contain opacity-60 hover:opacity-100 transition-all duration-300 ${
                isWhiteLogo 
                  ? 'invert dark:invert-0' 
                  : 'mix-blend-multiply dark:mix-blend-normal grayscale hover:grayscale-0'
              }`}
              loading="lazy"
            />
          );
        })}
      </div>
    </div>
  );
}
