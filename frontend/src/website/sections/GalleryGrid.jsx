import React from 'react';
import { Link } from 'react-router-dom';

const GALLERY_PREVIEWS = [
  { icon: '⚙️', title: 'CNC Lathe Workshop', category: 'Workshop', style: { background: 'linear-gradient(135deg,#1A3A5C,#2557A7)' } },
  { icon: '🔩', title: 'Precision Components', category: 'Completed Work', style: { background: 'linear-gradient(135deg,#14305A,#1A5C4A)' } },
  { icon: '🏭', title: 'Production Floor', category: 'Manufacturing', style: { background: 'linear-gradient(135deg,#2D2D5C,#1A3A5C)' } },
  { icon: '🔧', title: 'Boring Machine', category: 'Machines', style: { background: 'linear-gradient(135deg,#1A5C4A,#2D7A4F)' } },
  { icon: '📐', title: 'Quality Inspection', category: 'Process', style: { background: 'linear-gradient(135deg,#3A2D1A,#5C4A2D)' } },
  { icon: '🪛', title: 'Turned Parts Batch', category: 'Completed Work', style: { background: 'linear-gradient(135deg,#1A3A5C,#4A2D7A)' } },
];

export default function GalleryGrid() {
  return (
    <section className="gallery-section">
      <div className="section-inner">
        <div className="text-center" style={{ marginBottom: '40px' }}>
          <div className="eyebrow revealed">Our Work</div>
          <h2 className="section-title revealed delay-1">A Glimpse Into Our Workshop</h2>
          <p className="section-subtitle revealed delay-2">World-class machinery, skilled operators, and exacting standards — all under one roof.</p>
        </div>
        <div className="gallery-grid">
          {GALLERY_PREVIEWS.map((item, idx) => (
            <div key={item.title} className={`gallery-item revealed delay-${(idx % 5) + 1}`} style={item.style}>
              <div className="gallery-item-icon">{item.icon}</div>
              <div className="gallery-item-overlay">
                <h4>{item.title}</h4>
                <span>{item.category}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center" style={{ marginTop: '36px' }}>
          <Link to="/gallery" className="btn-primary">View Full Gallery</Link>
        </div>
      </div>
    </section>
  );
}
