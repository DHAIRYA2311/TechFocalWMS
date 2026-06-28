import React from 'react';
import { Link } from 'react-router-dom';

export default function ServicesGrid() {
  return (
    <section className="services-section">
      <div className="section-inner">
        <div className="text-center">
          <div className="eyebrow revealed">What We Do</div>
          <h2 className="section-title revealed delay-1">Precision Services Built for Industry</h2>
          <p className="section-subtitle revealed delay-2">From complex lathe operations to large-diameter boring — every job is handled with engineering precision and professional care.</p>
        </div>
        <div className="services-grid">
          
          <div className="service-card revealed delay-1">
            <div className="service-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
                <line x1="12" y1="3" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <line x1="3" y1="12" x2="7" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <line x1="17" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </div>
            <h3>Lathe Machining</h3>
            <p>High-precision turning, facing, threading, and grooving operations on CNC and conventional lathes for complex component geometries.</p>
            <Link to="/services" className="learn-more">Learn More →</Link>
          </div>

          <div className="service-card revealed delay-2">
            <div className="service-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="8" width="18" height="8" rx="4" stroke="currentColor" stroke-width="1.5" />
                <line x1="12" y1="8" x2="12" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <line x1="12" y1="16" x2="12" y2="21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </div>
            <h3>Turning Job Work</h3>
            <p>Precision external and internal turning for shafts, pins, bushings, and custom rotational components with micron-level tolerances.</p>
            <Link to="/services" className="learn-more">Learn More →</Link>
          </div>

          <div className="service-card revealed delay-3">
            <div className="service-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" stroke-width="1.5" />
                <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <h3>Machining Job Work</h3>
            <p>Custom job work for single-piece and batch production including milling, drilling, reaming, and surface finishing to exact specifications.</p>
            <Link to="/services" className="learn-more">Learn More →</Link>
          </div>

          <div className="service-card revealed delay-4">
            <div className="service-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 3a9 9 0 100 18A9 9 0 0012 3z" stroke="currentColor" stroke-width="1.5" />
                <path d="M12 8v4l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <h3>Boring Machine Job Work</h3>
            <p>Large-bore and deep-hole boring for cylinders, housings, and structural components requiring superior concentricity and surface finish.</p>
            <Link to="/services" className="learn-more">Learn More →</Link>
          </div>

        </div>
      </div>
    </section>
  );
}
