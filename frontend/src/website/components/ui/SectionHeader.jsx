import React from 'react';
import { motion } from 'framer-motion';

export default function SectionHeader({ label, title, subtitle, centered = true }) {
  return (
    <div className={`mb-16 ${centered ? 'text-center' : 'text-left'}`}>
      {label && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="section-label inline-flex items-center gap-2"
        >
          <span className="w-1 h-1 rounded-full bg-accent" />
          {label}
        </motion.div>
      )}
      
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="section-title text-slate-900"
      >
        {title}
      </motion.h2>

      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className={`section-subtitle ${centered ? 'mx-auto' : ''} text-slate-500`}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
