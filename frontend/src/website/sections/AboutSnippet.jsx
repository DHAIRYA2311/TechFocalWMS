import React from 'react';
import { Link } from 'react-router-dom';

export default function AboutSnippet() {
  return (
    <section className="about-home">
      <div className="section-inner">
        <div className="about-home-inner">
          <div className="about-visual-stack slide-left">
            <div className="about-img-main">
              <div className="machine-icon">
                <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="20" y="60" width="120" height="60" rx="8" fill="white" />
                  <rect x="40" y="40" width="80" height="30" rx="4" fill="white" />
                  <circle cx="80" cy="130" r="16" fill="white" />
                  <circle cx="80" cy="130" r="8" fill="none" stroke="#1A3A5C" strokeWidth="2" />
                  <rect x="60" y="70" width="40" height="8" rx="4" fill="#1A3A5C" opacity="0.5" />
                </svg>
              </div>
            </div>
            <div className="about-card-float fade-up delay-3">
              <div className="metric">98%</div>
              <div className="metric-label">On-Time Delivery Rate</div>
            </div>
          </div>
          <div className="about-text">
            <div className="eyebrow fade-in">Who We Are</div>
            <h2 className="section-title fade-up delay-1">A Legacy of Precision Manufacturing</h2>
            <p className="fade-up delay-2">TechFocal Enterprises LLP is a Ahmedabad-based precision engineering company with over 15 years of manufacturing excellence. We specialize in high-accuracy machining, turning, and boring operations for diverse industrial applications.</p>
            <p className="fade-up delay-2">Our state-of-the-art workshop is equipped with advanced CNC and conventional machinery, operated by skilled engineers committed to delivering components that meet the tightest tolerances.</p>
            <div className="about-values">
              <div className="about-value fade-up delay-3">
                <div className="about-value-icon blue">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1L10 6H15L11 9.5L12.5 14.5L8 11.5L3.5 14.5L5 9.5L1 6H6L8 1Z" fill="currentColor" />
                  </svg>
                </div>
                <div>
                  <h4>Our Mission</h4>
                  <p>Deliver precision-engineered components that exceed client expectations in quality, accuracy, and delivery timelines.</p>
                </div>
              </div>
              <div className="about-value fade-up delay-4">
                <div className="about-value-icon green">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h4>Our Vision</h4>
                  <p>Become the most trusted precision machining partner for manufacturers across Gujarat and beyond.</p>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '28px' }} className="fade-up delay-5">
              <Link to="/about" className="btn-primary">Learn More About Us</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
