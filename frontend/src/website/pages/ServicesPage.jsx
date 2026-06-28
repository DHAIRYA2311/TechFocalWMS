import React from 'react';
import { Link } from 'react-router-dom';

export default function ServicesPage() {
  return (
    <div className="website-scope">
      {/* Services Page Hero */}
      <div style={{ paddingTop: '68px', background: 'var(--cream)' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '80px 24px 60px' }}>
          <div className="eyebrow revealed">Our Capabilities</div>
          <h1 className="revealed delay-1" style={{ fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 800, maxWidth: '600px', marginBottom: '20px' }}>
            Machining Services Built for Industry
          </h1>
          <p className="revealed delay-2" style={{ fontSize: '1.05rem', color: 'var(--slate)', maxWidth: '560px', lineHeight: 1.75 }}>
            Precision machining across four core capabilities — each backed by dedicated equipment, experienced operators, and stringent quality standards.
          </p>
        </div>
      </div>

      {/* Services Cards List */}
      <section style={{ background: 'var(--warm-white)' }}>
        <div className="section-inner">
          
          {/* Card 1: Lathe Machining */}
          <div className="service-detail-card revealed">
            <div className="service-detail-header">
              <div className="service-detail-header-icon">⚙️</div>
              <div>
                <h3>Lathe Machining</h3>
                <p>High-precision turning operations on CNC and conventional lathes — suitable for complex, multi-diameter components.</p>
              </div>
            </div>
            <div className="service-detail-body">
              <div className="service-detail-col">
                <h4>Overview</h4>
                <ul>
                  <li>CNC & conventional lathe operations</li>
                  <li>Tolerances to ±0.01mm</li>
                  <li>Components up to 1000mm diameter</li>
                  <li>Single piece to batch production</li>
                </ul>
              </div>
              <div className="service-detail-col">
                <h4>Benefits</h4>
                <ul>
                  <li>Consistent dimensional accuracy</li>
                  <li>Superior surface finish (Ra 0.8–3.2μm)</li>
                  <li>Fast turnaround on complex jobs</li>
                  <li>ISO-compliant quality documentation</li>
                </ul>
              </div>
              <div className="service-detail-col">
                <h4>Industries Served</h4>
                <ul>
                  <li>Oil & Gas</li>
                  <li>Power Generation</li>
                  <li>Pump & Valve</li>
                  <li>Heavy Engineering</li>
                  <li>Automotive & Defence</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Card 2: Turning Job Work */}
          <div className="service-detail-card revealed delay-1">
            <div className="service-detail-header" style={{ background: 'linear-gradient(135deg,#1A5C4A,#2D7A4F)' }}>
              <div className="service-detail-header-icon">🔩</div>
              <div>
                <h3>Turning Job Work</h3>
                <p>External and internal turning for shafts, pins, sleeves, and rotational components requiring exacting concentricity.</p>
              </div>
            </div>
            <div className="service-detail-body">
              <div className="service-detail-col">
                <h4>Overview</h4>
                <ul>
                  <li>External & internal diameter turning</li>
                  <li>Step turning & taper turning</li>
                  <li>Thread cutting (metric & imperial)</li>
                  <li>Knurling & groove machining</li>
                </ul>
              </div>
              <div className="service-detail-col">
                <h4>Benefits</h4>
                <ul>
                  <li>Tight roundness & cylindricity</li>
                  <li>Works with all engineering metals</li>
                  <li>Competitive pricing on job work</li>
                  <li>Quick quote & production start</li>
                </ul>
              </div>
              <div className="service-detail-col">
                <h4>Applications</h4>
                <ul>
                  <li>Transmission shafts</li>
                  <li>Hydraulic cylinder rods</li>
                  <li>Bearing seats & journals</li>
                  <li>Fasteners & studs</li>
                  <li>Precision spindles</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Card 3: Machining Job Work */}
          <div className="service-detail-card revealed delay-2">
            <div className="service-detail-header" style={{ background: 'linear-gradient(135deg,#2D2D5C,#4A3A7A)' }}>
              <div className="service-detail-header-icon">🏭</div>
              <div>
                <h3>Machining Job Work</h3>
                <p>Custom single-piece and batch machining covering milling, drilling, reaming, and surface operations to specification.</p>
              </div>
            </div>
            <div className="service-detail-body">
              <div className="service-detail-col">
                <h4>Overview</h4>
                <ul>
                  <li>Milling (face, end, profile)</li>
                  <li>Precision drilling & reaming</li>
                  <li>Surface grinding & lapping</li>
                  <li>Coordinate-based hole patterns</li>
                </ul>
              </div>
              <div className="service-detail-col">
                <h4>Benefits</h4>
                <ul>
                  <li>Complex geometry handling</li>
                  <li>Batch consistency via CNC programs</li>
                  <li>Full inspection report available</li>
                  <li>DXF/STEP drawing acceptance</li>
                </ul>
              </div>
              <div className="service-detail-col">
                <h4>Industries Served</h4>
                <ul>
                  <li>Chemical Process Equipment</li>
                  <li>Textile Machinery</li>
                  <li>Agricultural Equipment</li>
                  <li>Cement & Mining</li>
                  <li>General Engineering</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Card 4: Boring Machine Job Work */}
          <div className="service-detail-card revealed delay-3">
            <div className="service-detail-header" style={{ background: 'linear-gradient(135deg,#3D2B1A,#5C4530)' }}>
              <div className="service-detail-header-icon">🔧</div>
              <div>
                <h3>Boring Machine Job Work</h3>
                <p>Large-bore and deep-hole boring for housings, cylinders, and structural components requiring exceptional concentricity and surface finish.</p>
              </div>
            </div>
            <div className="service-detail-body">
              <div className="service-detail-col">
                <h4>Overview</h4>
                <ul>
                  <li>Horizontal & vertical boring</li>
                  <li>Bores up to 800mm diameter</li>
                  <li>Deep-hole boring operations</li>
                  <li>Line boring & align boring</li>
                </ul>
              </div>
              <div className="service-detail-col">
                <h4>Benefits</h4>
                <ul>
                  <li>H7/g6 fit tolerances achieved</li>
                  <li>Excellent bore geometry</li>
                  <li>Suitable for repair & remanufacture</li>
                  <li>On-site boring available</li>
                </ul>
              </div>
              <div className="service-detail-col">
                <h4>Applications</h4>
                <ul>
                  <li>Pump housings & casings</li>
                  <li>Gearbox housings</li>
                  <li>Engine cylinder blocks</li>
                  <li>Press & die plates</li>
                  <li>Structural weldments</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="section-inner">
          <h2 className="revealed">Have a Job in Mind?</h2>
          <p className="revealed delay-1">Upload your drawing and we'll get back to you with a competitive quote within 24 hours.</p>
          <div className="revealed delay-2">
            <Link to="/quote" className="btn-white">Request a Quote →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
