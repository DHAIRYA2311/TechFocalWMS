import React from 'react';
import { Link } from 'react-router-dom';

export default function QuoteCTA() {
  return (
    <section className="cta-section">
      <div className="section-inner">
        <h2 className="revealed">Ready to Start Your Next Project?</h2>
        <p className="revealed delay-1">Send us your drawings and specifications. We'll respond with a detailed quote within 24 hours.</p>
        <div className="revealed delay-2">
          <Link to="/quote" className="btn-white">Request a Quote →</Link>
          <Link to="/contact" className="btn-outline-white">Contact Us</Link>
        </div>
      </div>
    </section>
  );
}
