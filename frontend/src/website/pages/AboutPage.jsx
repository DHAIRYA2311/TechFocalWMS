import React from 'react';
import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <div className="website-scope">
      {/* About Page Hero */}
      <div style={{ paddingTop: '68px', background: 'var(--cream)' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '80px 24px 60px' }}>
          <div className="eyebrow revealed">Our Story</div>
          <h1 className="revealed delay-1" style={{ fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 800, maxWidth: '640px', marginBottom: '20px' }}>
            Precision Engineered from the Ground Up
          </h1>
          <p className="revealed delay-2" style={{ fontSize: '1.05rem', color: 'var(--slate)', maxWidth: '580px', lineHeight: 1.75 }}>
            A story of technical excellence, persistent improvement, and lasting relationships built one precision component at a time.
          </p>
        </div>
      </div>

      {/* Company Story Section */}
      <section style={{ background: 'var(--warm-white)' }}>
        <div className="section-inner">
          <div className="story-grid">
            <div className="story-text">
              <div className="eyebrow revealed">Company Story</div>
              <h2 className="section-title revealed delay-1">From a Single Lathe to a Full Workshop</h2>
              <div className="revealed delay-2">
                <p>TechFocal Enterprises LLP was founded with a singular vision: to bring precision and reliability to industrial machining in Gujarat. Starting with a single CNC lathe in Ahmedabad, our founder built the company on the principle that quality is never an accident — it is the result of disciplined processes and skilled people.</p>
                <p>Over 15 years, we've grown into a full-capability machining facility with multiple CNC lathes, conventional lathes, boring machines, and milling centres. Today, we serve clients ranging from local engineering firms to large industrial manufacturers across Gujarat and Maharashtra.</p>
                <p>Our growth has always been client-driven — repeat orders and referrals are our strongest endorsement. Each project is treated as an opportunity to demonstrate the TechFocal standard: precise, reliable, and on time.</p>
              </div>
            </div>
            <div className="revealed delay-2">
              <div style={{ background: 'linear-gradient(135deg,var(--blue),#2557A7)', borderRadius: '20px', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none" opacity="0.15">
                  <circle cx="60" cy="60" r="50" stroke="white" strokeWidth="3" />
                  <circle cx="60" cy="60" r="30" stroke="white" strokeWidth="2" />
                  <circle cx="60" cy="60" r="10" fill="white" />
                  <line x1="60" y1="10" x2="60" y2="30" stroke="white" strokeWidth="2" />
                  <line x1="60" y1="90" x2="60" y2="110" stroke="white" strokeWidth="2" />
                  <line x1="10" y1="60" x2="30" y2="60" stroke="white" strokeWidth="2" />
                  <line x1="90" y1="60" x2="110" y2="60" stroke="white" strokeWidth="2" />
                </svg>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '2rem', fontWeight: 700, color: 'var(--blue)' }}>15+</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-mid)', marginTop: '4px' }}>Years in Business</div>
                </div>
                <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '2rem', fontWeight: 700, color: 'var(--green)' }}>500+</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-mid)', marginTop: '4px' }}>Projects Completed</div>
                </div>
                <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '2rem', fontWeight: 700, color: 'var(--blue)' }}>50+</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-mid)', marginTop: '4px' }}>Active Clients</div>
                </div>
                <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '2rem', fontWeight: 700, color: 'var(--green)' }}>98%</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-mid)', marginTop: '4px' }}>On-Time Delivery</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section style={{ background: 'var(--cream)' }}>
        <div className="section-inner">
          <div className="text-center" style={{ marginBottom: 0 }}>
            <div className="eyebrow revealed">Our Foundation</div>
            <h2 className="section-title revealed delay-1">Mission, Vision & Values</h2>
            <p className="section-subtitle revealed delay-2">The principles that guide every project, every shift, and every interaction at TechFocal.</p>
          </div>
          <div className="values-grid">
            <div className="value-card revealed delay-1">
              <span className="v-icon">🎯</span>
              <h3>Mission</h3>
              <p>Deliver precision-engineered machined components that enable our clients to manufacture better products — consistently, reliably, and on time.</p>
            </div>
            <div className="value-card revealed delay-2">
              <span className="v-icon">🔭</span>
              <h3>Vision</h3>
              <p>To be Gujarat's most trusted precision machining partner, recognized for technical excellence, quality, and unwavering client focus.</p>
            </div>
            <div className="value-card revealed delay-3">
              <span className="v-icon">⚖️</span>
              <h3>Integrity</h3>
              <p>Transparent pricing, honest timelines, and clear communication — we say what we do and do what we say.</p>
            </div>
            <div className="value-card revealed delay-4">
              <span className="v-icon">🔬</span>
              <h3>Precision</h3>
              <p>Micron-level accuracy isn't a claim — it's the standard we hold ourselves to on every single job, regardless of batch size.</p>
            </div>
            <div className="value-card revealed delay-5">
              <span className="v-icon">📈</span>
              <h3>Continuous Improvement</h3>
              <p>We invest in new machinery, training, and processes — always improving to stay ahead of client needs and industry standards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section style={{ background: 'var(--warm-white)' }}>
        <div className="section-inner">
          <div className="eyebrow revealed">Our People</div>
          <h2 className="section-title revealed delay-1">The Team Behind the Precision</h2>
          <p className="section-subtitle revealed delay-2">Experienced engineers and skilled machinists who take personal ownership of every component they produce.</p>
          <div className="team-grid">
            <div className="team-card revealed delay-1">
              <div className="team-avatar" style={{ background: 'var(--blue)' }}>MK</div>
              <h4>Mehul Kapadia</h4>
              <span>Founder & Managing Director</span>
            </div>
            <div className="team-card revealed delay-2">
              <div className="team-avatar" style={{ background: 'var(--green)' }}>RP</div>
              <h4>Ramesh Patel</h4>
              <span>Head of Production</span>
            </div>
            <div className="team-card revealed delay-3">
              <div className="team-avatar" style={{ background: 'var(--slate)' }}>NJ</div>
              <h4>Nilesh Joshi</h4>
              <span>Quality Assurance Lead</span>
            </div>
            <div className="team-card revealed delay-4">
              <div className="team-avatar" style={{ background: '#5C3D1A' }}>SA</div>
              <h4>Sanjay Agarwal</h4>
              <span>CNC Operations Manager</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="section-inner">
          <h2 className="revealed">See Our Work in Action</h2>
          <p className="revealed delay-1">Browse our gallery or get in touch to discuss your machining requirements.</p>
          <div className="revealed delay-2">
            <Link to="/gallery" className="btn-white">View Gallery →</Link>
            <Link to="/quote" className="btn-outline-white">Get a Quote</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
