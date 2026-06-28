import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function WebNavbar({ user, onLoginClick, onDashboardClick }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`} id="mainNav">
      <div className="nav-inner">
        <Link to="/" className="nav-logo" style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src="/logo.png" 
            alt="TechFocal Enterprises LLP" 
            style={{ height: '36px', width: 'auto', objectFit: 'contain' }} 
          />
        </Link>
        
        <ul className="nav-links">
          <li><Link to="/" className={isActive('/') ? 'active' : ''}>Home</Link></li>
          <li><Link to="/about" className={isActive('/about') ? 'active' : ''}>About Us</Link></li>
          <li><Link to="/services" className={isActive('/services') ? 'active' : ''}>Services</Link></li>
          <li><Link to="/gallery" className={isActive('/gallery') ? 'active' : ''}>Gallery</Link></li>
          <li><Link to="/contact" className={isActive('/contact') ? 'active' : ''}>Contact</Link></li>
          
          {user ? (
            <li>
              <button 
                onClick={onDashboardClick} 
                style={{ padding: '6px 14px', fontSize: '0.875rem', color: 'var(--slate)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter', fontWeight: 500 }}
              >
                Dashboard
              </button>
            </li>
          ) : (
            <li>
              <button 
                onClick={onLoginClick} 
                style={{ padding: '6px 14px', fontSize: '0.875rem', color: 'var(--slate)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter', fontWeight: 500 }}
              >
                Staff Login
              </button>
            </li>
          )}
          
          <li>
            <Link to="/quote" className="nav-cta nav-cta-desktop">Request Quote</Link>
          </li>
        </ul>
        
        <button className="nav-hamburger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
          <span style={{ transform: mobileOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }}></span>
          <span style={{ opacity: mobileOpen ? 0 : 1 }}></span>
          <span style={{ transform: mobileOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }}></span>
        </button>
      </div>
      
      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileOpen ? 'open' : ''}`} id="mobileMenu">
        <Link to="/">Home</Link>
        <Link to="/about">About Us</Link>
        <Link to="/services">Services</Link>
        <Link to="/gallery">Gallery</Link>
        <Link to="/contact">Contact</Link>
        
        {user ? (
          <button 
            onClick={onDashboardClick} 
            className="mobile-cta" 
            style={{ width: '100%', background: 'var(--blue)', color: '#fff', border: 'none', cursor: 'pointer', display: 'block', padding: '12px', borderRadius: '10px', fontWeight: 600 }}
          >
            Dashboard
          </button>
        ) : (
          <button 
            onClick={onLoginClick} 
            style={{ width: '100%', border: 'none', background: 'none', padding: '12px 0', borderBottom: '1px solid var(--border)', display: 'block', textAlign: 'left', fontWeight: 500, color: 'var(--slate)', fontSize: '1rem', cursor: 'pointer' }}
          >
            Staff Login
          </button>
        )}
        
        <Link to="/quote" className="mobile-cta">Request a Quote</Link>
      </div>
    </nav>
  );
}
