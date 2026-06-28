import React from 'react';

const PARTNERS = [
  'Larsen & Toubro',
  'GSFC Engineering',
  'Gujarat NRE',
  'Adani Enterprises',
  'Torrent Power',
  'Elecon Engineering',
  'ONGC Contractors',
  'AIA Engineering',
];

export default function PartnersSlider() {
  // Duplicate list to achieve continuous marquee scrolling effect
  const doublePartners = [...PARTNERS, ...PARTNERS];

  return (
    <section className="partners-section">
      <div className="section-inner">
        <div className="text-center" style={{ marginBottom: '48px' }}>
          <div className="eyebrow revealed">Trusted By</div>
          <h2 className="section-title revealed delay-1">Partners Who Rely on Us</h2>
        </div>
        <div className="partners-track-wrap">
          <div className="partners-track" id="partnersTrack">
            {doublePartners.map((partner, idx) => (
              <div key={idx} className="partner-logo">
                <span className="dot"></span>
                {partner}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
