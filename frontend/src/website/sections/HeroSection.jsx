import React from 'react';
import { Link } from 'react-router-dom';

export default function HeroSection() {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-content">
          <div className="hero-tag fade-in">
            <div className="hero-tag-dot"></div>ISO Precision Engineering
          </div>
          <h1 className="fade-up delay-1">Engineering <em>Precision</em> for a Demanding World</h1>
          <p className="hero-desc fade-up delay-2">TechFocal Enterprises LLP delivers high-precision lathe machining, turning, and boring job work with unmatched accuracy and on-time delivery — trusted by leading manufacturers across industries.</p>
          <div className="hero-actions fade-up delay-3">
            <Link to="/quote" className="btn-primary">
              Request a Quote
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </Link>
            <Link to="/services" className="btn-secondary">View Our Services</Link>
          </div>
          <div className="hero-stats fade-up delay-4">
            <div className="hero-stat"><strong>15+</strong><span>Years Experience</span></div>
            <div className="hero-stat"><strong>500+</strong><span>Projects Delivered</span></div>
            <div className="hero-stat"><strong>50+</strong><span>Trusted Clients</span></div>
            <div className="hero-stat"><strong>0.01mm</strong><span>Tolerance Accuracy</span></div>
          </div>
        </div>
        <div className="hero-visual slide-right delay-2">
          <div className="hero-image-frame">
            <div className="hero-machine-graphic">
              <div className="crosshair-line-h"></div>
              <div className="crosshair-line-v"></div>
              <div className="crosshair-outer">
                <div className="crosshair-inner">
                  <div className="crosshair-center"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="hero-badge slide-left delay-5">
            <div className="hero-badge-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L12.4 7.3L18 8L14 12L15 18L10 15.3L5 18L6 12L2 8L7.6 7.3L10 2Z" fill="#2D7A4F" />
              </svg>
            </div>
            <div className="hero-badge-text">
              <strong>ISO Certified</strong>
              <span>Quality Assured</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
