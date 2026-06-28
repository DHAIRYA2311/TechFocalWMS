import React from 'react';

const TESTIMONIALS_DATA = [
  {
    stars: '★★★★★',
    quote: '"TechFocal has been our go-to machining partner for three years. Their dimensional accuracy is consistently excellent and they always meet our delivery schedules — even for rush orders."',
    initials: 'RK',
    author: 'Rajesh Kumar',
    role: 'Purchase Manager, Elecon Engineering',
    avatarClass: 'blue',
  },
  {
    stars: '★★★★★',
    quote: '"We were struggling to find a reliable boring job work partner. TechFocal handled our large-diameter housing perfectly — first time right, no rework needed."',
    initials: 'PM',
    author: 'Priya Mehta',
    role: 'Engineering Lead, Gujarat NRE',
    avatarClass: 'green',
  },
  {
    stars: '★★★★★',
    quote: '"Professional team, transparent communication, and quality components every time. TechFocal understands industrial requirements and delivers accordingly."',
    initials: 'AS',
    author: 'Amit Shah',
    role: 'Director, Torrent Industrial',
    avatarClass: 'slate',
  },
];

export default function Testimonials() {
  return (
    <section className="testimonials-section">
      <div className="section-inner">
        <div className="text-center" style={{ marginBottom: '48px' }}>
          <div className="eyebrow revealed">Client Reviews</div>
          <h2 className="section-title revealed delay-1">What Our Clients Say</h2>
        </div>
        <div className="testimonials-grid">
          {TESTIMONIALS_DATA.map((item, idx) => (
            <div key={item.author} className={`testimonial-card revealed delay-${idx + 1}`}>
              <div className="testimonial-stars">{item.stars}</div>
              <p className="testimonial-quote">{item.quote}</p>
              <div className="testimonial-author">
                <div className={`testimonial-avatar ${item.avatarClass}`}>{item.initials}</div>
                <div className="testimonial-info">
                  <strong>{item.author}</strong>
                  <span>{item.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
