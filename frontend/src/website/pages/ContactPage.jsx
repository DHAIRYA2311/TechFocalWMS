import React, { useState } from 'react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      alert('Please fill in all required fields.');
      return;
    }
    // Success Toast trigger
    setToastMsg('✅ Message sent! We\'ll get back to you shortly.');
    setShowToast(true);
    setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  return (
    <div className="website-scope">
      {/* Toast Notification */}
      <div className={`toast ${showToast ? 'show' : ''}`}>
        {toastMsg}
      </div>

      {/* Header */}
      <div style={{ paddingTop: '68px', background: 'var(--cream)' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '80px 24px 60px' }}>
          <div className="eyebrow revealed">Get in Touch</div>
          <h1 className="revealed delay-1" style={{ fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 800, maxWidth: '560px', marginBottom: '20px' }}>
            We're Here to Help
          </h1>
          <p className="revealed delay-2" style={{ fontSize: '1.05rem', color: 'var(--slate)', maxWidth: '520px', lineHeight: 1.75 }}>
            Reach us by phone, email, or visit our workshop in Ahmedabad. We're available Monday through Saturday.
          </p>
        </div>
      </div>

      {/* Contact Section */}
      <section className="contact-section" style={{ paddingTop: '48px' }}>
        <div className="section-inner">
          <div className="contact-grid">
            
            {/* Info Cards */}
            <div className="contact-info revealed">
              <div className="contact-card">
                <div className="contact-card-icon blue">📍</div>
                <div>
                  <h4>Address</h4>
                  <p>Plot No. 47, Phase II, GIDC Naroda,<br />Ahmedabad – 382330, Gujarat, India</p>
                </div>
              </div>
              
              <div className="contact-card">
                <div className="contact-card-icon green">📞</div>
                <div>
                  <h4>Phone</h4>
                  <p>+91 98765 43210<br />+91 79 2283 4567</p>
                </div>
              </div>

              <div className="contact-card">
                <div className="contact-card-icon blue">✉️</div>
                <div>
                  <h4>Email</h4>
                  <p>info@techfocal.in<br />quotes@techfocal.in</p>
                </div>
              </div>

              <div className="contact-card">
                <div className="contact-card-icon green">🕐</div>
                <div>
                  <h4>Business Hours</h4>
                  <p>Monday – Saturday: 9:00 AM – 6:30 PM<br />Sunday: Closed</p>
                </div>
              </div>

              <div className="map-placeholder">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="16" r="8" stroke="#6B7A8D" strokeWidth="1.5" />
                  <circle cx="18" cy="16" r="3" fill="#6B7A8D" />
                  <path d="M18 28s8-7.5 8-14A8 8 0 0010 14c0 6.5 8 14 8 14z" stroke="#6B7A8D" strokeWidth="1.5" fill="none" />
                </svg>
                <span>GIDC Naroda, Ahmedabad</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Google Map loads here in production</span>
              </div>
            </div>

            {/* Message Form */}
            <div className="contact-form-card revealed delay-2">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>Send Us a Message</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-mid)', marginBottom: '24px' }}>
                For general inquiries, partnerships, or directions to our facility.
              </p>
              
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Your name" 
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input 
                      type="email" 
                      required 
                      placeholder="email@company.com" 
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input 
                    type="tel" 
                    placeholder="+91 98765 43210" 
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Subject</label>
                  <input 
                    type="text" 
                    placeholder="How can we help?" 
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Message *</label>
                  <textarea 
                    required 
                    placeholder="Write your message here..." 
                    style={{ minHeight: '140px' }}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn-primary form-submit">
                  Send Message
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: '4px' }}>
                    <path d="M2 8l12-6-5 12-3-4.5L2 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
