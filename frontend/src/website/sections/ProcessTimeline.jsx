import React from 'react';

const STEPS = [
  { num: 1, title: 'Inquiry', desc: 'Submit your requirements or drawing' },
  { num: 2, title: 'Quotation', desc: 'Receive detailed quote within 24 hours' },
  { num: 3, title: 'Purchase Order', desc: 'Confirm the order with signed PO' },
  { num: 4, title: 'Production', desc: 'Precision machining begins' },
  { num: 5, title: 'Inspection', desc: 'Rigorous quality checks on all parts' },
  { num: 6, title: 'Delivery', desc: 'Safe packaging and on-time dispatch' },
];

export default function ProcessTimeline() {
  return (
    <section className="process-section">
      <div className="section-inner">
        <div className="text-center" style={{ marginBottom: '56px' }}>
          <div className="eyebrow revealed">How We Work</div>
          <h2 className="section-title revealed delay-1">Our Streamlined Process</h2>
          <p className="section-subtitle revealed delay-2">A clear, transparent workflow from first inquiry to final delivery — no surprises, just results.</p>
        </div>
        <div className="process-timeline">
          {STEPS.map((step, idx) => (
            <div key={step.num} className={`process-step revealed delay-${idx + 1}`}>
              <div className="process-step-num">{step.num}</div>
              <h4>{step.title}</h4>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
