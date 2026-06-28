import React from 'react';
import { Link } from 'react-router-dom';

export default function WebFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-top">
          
          <div className="footer-brand">
            <div className="footer-logo" style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <img 
                src="/logo.png" 
                alt="TechFocal Enterprises LLP" 
                style={{ height: '36px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} 
              />
            </div>
            <p>Precision engineering and machining services for demanding industrial applications. Ahmedabad's trusted job work partner since 2009.</p>
            <div className="footer-socials">
              <a href="#" className="social-btn" title="LinkedIn">in</a>
              <a href="#" className="social-btn" title="WhatsApp">W</a>
              <a href="#" className="social-btn" title="Instagram">ig</a>
              <a href="#" className="social-btn" title="Facebook">f</a>
            </div>
          </div>

          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/services">Services</Link></li>
              <li><Link to="/gallery">Gallery</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/quote">Request Quote</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Services</h4>
            <ul>
              <li><Link to="/services">Lathe Machining</Link></li>
              <li><Link to="/services">Turning Job Work</Link></li>
              <li><Link to="/services">Machining Job Work</Link></li>
              <li><Link to="/services">Boring Machine Work</Link></li>
              <li><Link to="/services">CNC Operations</Link></li>
              <li><Link to="/services">Quality Inspection</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Contact</h4>
            <ul className="footer-contact">
              <li><span>📍</span> Plot 47, GIDC Naroda, Ahmedabad – 382330</li>
              <li><span>📞</span> +91 98765 43210</li>
              <li><span>✉️</span> info@techfocal.in</li>
              <li><span>🕐</span> Mon–Sat: 9AM–6:30PM</li>
            </ul>
          </div>

        </div>
        
        <div className="footer-bottom">
          <p>© {currentYear} TechFocal Enterprises LLP. All rights reserved.</p>
          <p>Precision Machining | Ahmedabad, Gujarat, India</p>
        </div>
      </div>
    </footer>
  );
}
