import React, { useState } from 'react';

const ITEMS = [
  { cat: 'workshop', icon: '⚙️', title: 'Main Workshop Floor', subtitle: 'Workshop', style: { background: 'linear-gradient(135deg,#1A3A5C,#2557A7)' } },
  { cat: 'machines', icon: '🔧', title: 'CNC Lathe Centre', subtitle: 'Machines', style: { background: 'linear-gradient(135deg,#1A5C4A,#2D7A4F)' } },
  { cat: 'projects', icon: '🔩', title: 'Precision Shaft Batch', subtitle: 'Projects', style: { background: 'linear-gradient(135deg,#2D2D5C,#4A3A7A)' } },
  { cat: 'manufacturing', icon: '🏭', title: 'Production Process', subtitle: 'Manufacturing', style: { background: 'linear-gradient(135deg,#3D2B1A,#5C4530)' } },
  { cat: 'workshop', icon: '📐', title: 'Tool Storage & Setup', subtitle: 'Workshop', style: { background: 'linear-gradient(135deg,#1A3A5C,#1A5C4A)' } },
  { cat: 'machines', icon: '⛏️', title: 'Boring Machine Station', subtitle: 'Machines', style: { background: 'linear-gradient(135deg,#5C1A1A,#7A3A2D)' } },
  { cat: 'projects', icon: '🪛', title: 'Pump Housing Project', subtitle: 'Projects', style: { background: 'linear-gradient(135deg,#1A4A5C,#2D6A7A)' } },
  { cat: 'manufacturing', icon: '🔬', title: 'Quality Inspection', subtitle: 'Manufacturing', style: { background: 'linear-gradient(135deg,#3A1A5C,#5C2D7A)' } },
  { cat: 'workshop', icon: '🏗️', title: 'Workshop Overhead View', subtitle: 'Workshop', style: { background: 'linear-gradient(135deg,#1A5C3A,#2D7A5C)' } },
];

export default function GalleryPage() {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredItems = activeCategory === 'all' 
    ? ITEMS 
    : ITEMS.filter(item => item.cat === activeCategory);

  return (
    <div className="website-scope">
      {/* Gallery Page Hero */}
      <div style={{ paddingTop: '68px', background: 'var(--cream)' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '80px 24px 60px' }}>
          <div className="eyebrow revealed">Visual Portfolio</div>
          <h1 className="revealed delay-1" style={{ fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 800, maxWidth: '560px', marginBottom: '20px' }}>
            Our Workshop & Work
          </h1>
          <p className="revealed delay-2" style={{ fontSize: '1.05rem', color: 'var(--slate)', maxWidth: '520px', lineHeight: 1.75 }}>
            A window into TechFocal's manufacturing environment, precision components, and team at work.
          </p>
        </div>
      </div>

      {/* Gallery Body */}
      <section style={{ background: 'var(--warm-white)' }}>
        <div className="section-inner">
          <div className="gallery-filters revealed">
            <button className={`filter-btn ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => setActiveCategory('all')}>All</button>
            <button className={`filter-btn ${activeCategory === 'workshop' ? 'active' : ''}`} onClick={() => setActiveCategory('workshop')}>Workshop</button>
            <button className={`filter-btn ${activeCategory === 'machines' ? 'active' : ''}`} onClick={() => setActiveCategory('machines')}>Machines</button>
            <button className={`filter-btn ${activeCategory === 'projects' ? 'active' : ''}`} onClick={() => setActiveCategory('projects')}>Projects</button>
            <button className={`filter-btn ${activeCategory === 'manufacturing' ? 'active' : ''}`} onClick={() => setActiveCategory('manufacturing')}>Manufacturing</button>
          </div>

          <div className="gallery-page-grid" id="galleryPageGrid">
            {filteredItems.map((item, idx) => (
              <div key={idx} className="gallery-page-item">
                <div 
                  className="gallery-page-item-inner" 
                  style={{ 
                    ...item.style, 
                    borderRadius: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '3rem' 
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ padding: '12px 4px 0' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--charcoal)', margin: 0 }}>{item.title}</p>
                  <p style={{ fontSize: '0.775rem', color: 'var(--slate-mid)', margin: '2px 0 0' }}>{item.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
