import React, { useState, useRef } from 'react';

export default function QuotePage() {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', service: '', message: '' });
  const [file, setFile] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.company || !form.email || !form.phone || !form.message) {
      alert('Please fill in all required fields.');
      return;
    }

    setToastMsg('✅ Quote request submitted! We\'ll respond within 24 hours.');
    setShowToast(true);
    setForm({ name: '', company: '', email: '', phone: '', service: '', message: '' });
    setFile(null);
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

      {/* Hero */}
      <div style={{ paddingTop: '68px', background: 'var(--cream)' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '80px 24px 60px' }}>
          <div className="eyebrow revealed">Start a Project</div>
          <h1 className="revealed delay-1" style={{ fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 800, maxWidth: '560px', marginBottom: '20px' }}>
            Request a Quote
          </h1>
          <p className="revealed delay-2" style={{ fontSize: '1.05rem', color: 'var(--slate)', maxWidth: '520px', lineHeight: 1.75 }}>
            Fill in your details and upload your drawing. We'll respond with a detailed quotation within 24 hours.
          </p>
        </div>
      </div>

      {/* Quote Section */}
      <section className="quote-section" style={{ paddingTop: '48px' }}>
        <div className="section-inner">
          <div className="quote-inner">
            
            {/* Info Column */}
            <div className="quote-info revealed">
              <h3>Why Request a Quote?</h3>
              <p>We provide fast, detailed, and transparent quotes — no hidden charges, no vague estimates. Just clear pricing based on your exact specifications.</p>
              
              <div className="quote-benefits">
                <div className="quote-benefit">
                  <div className="quote-benefit-icon blue">⚡</div>
                  <div>
                    <h4>24-Hour Turnaround</h4>
                    <p>Detailed quotes delivered within one business day of receiving your drawing.</p>
                  </div>
                </div>

                <div className="quote-benefit">
                  <div className="quote-benefit-icon green">📋</div>
                  <div>
                    <h4>Itemised Pricing</h4>
                    <p>Full breakdown of material, machining, and finishing costs — no surprises.</p>
                  </div>
                </div>

                <div className="quote-benefit">
                  <div className="quote-benefit-icon blue">🔒</div>
                  <div>
                    <h4>Drawing Confidentiality</h4>
                    <p>Your design files and specifications are treated with complete confidentiality.</p>
                  </div>
                </div>

                <div className="quote-benefit">
                  <div className="quote-benefit-icon green">🤝</div>
                  <div>
                    <h4>Technical Consultation</h4>
                    <p>Our engineers review your drawing and suggest the optimal machining approach.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Card */}
            <div className="quote-form-card revealed delay-2">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>Project Inquiry Form</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-mid)', marginBottom: '28px' }}>All fields marked with * are required.</p>
              
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
                    <label>Company Name *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Your company" 
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input 
                      type="email" 
                      required 
                      placeholder="email@company.com" 
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input 
                      type="tel" 
                      required 
                      placeholder="+91 98765 43210" 
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Service Required</label>
                  <select 
                    value={form.service}
                    onChange={(e) => setForm({ ...form, service: e.target.value })}
                  >
                    <option value="">Select a service...</option>
                    <option value="Lathe Machining">Lathe Machining</option>
                    <option value="Turning Job Work">Turning Job Work</option>
                    <option value="Machining Job Work">Machining Job Work</option>
                    <option value="Boring Machine Job Work">Boring Machine Job Work</option>
                    <option value="Multiple / Unsure">Multiple / Unsure</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Project Description *</label>
                  <textarea 
                    required 
                    placeholder="Describe your component, material, quantity, tolerances, and any special requirements..."
                    style={{ minHeight: '100px' }}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Upload Drawing (Optional)</label>
                  <div className="file-upload" onClick={() => fileInputRef.current.click()}>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept=".pdf,.dwg,.dxf,.step,.stp,.jpg,.png"
                      onChange={handleFileChange}
                    />
                    <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>📎</div>
                    <strong>{file ? file.name : 'Click to upload or drag & drop'}</strong>
                    <p>Supported: PDF, DWG, DXF, STEP, JPG, PNG (Max 20MB)</p>
                  </div>
                </div>

                <button type="submit" className="btn-primary form-submit" style={{ marginTop: '8px' }}>
                  Submit Inquiry
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: '4px' }}>
                    <path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                
                <p style={{ fontSize: '0.775rem', color: 'var(--slate-mid)', marginTop: '12px', textAlign: 'center' }}>
                  By submitting, you agree to our privacy policy. We'll respond within 24 business hours.
                </p>
              </form>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
