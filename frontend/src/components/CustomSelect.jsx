import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ 
  value, 
  onChange, 
  options = [], 
  placeholder = 'Select option...', 
  disabled = false,
  icon = null,
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const portalRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target) &&
        (!portalRef.current || !portalRef.current.contains(event.target))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update viewport coordinates for the floating menu
  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  // Recalculate position on open, scroll, or resize
  useEffect(() => {
    if (isOpen) {
      updateCoords();
      // 'true' ensures we capture scroll events on any parent container scrollable divs
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
      return () => {
        window.removeEventListener('scroll', updateCoords, true);
        window.removeEventListener('resize', updateCoords);
      };
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  // Floating portal menu
  const dropdownMenu = (
    <ul
      ref={portalRef}
      style={{
        position: 'absolute',
        top: `${coords.top + 4}px`,
        left: `${coords.left}px`,
        width: `${coords.width}px`,
        backgroundColor: 'var(--color-card-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 99999, // Floating on top of all elements
        maxHeight: '220px',
        overflowY: 'auto',
        padding: '4px',
        margin: 0,
        listStyle: 'none',
        boxSizing: 'border-box'
      }}
    >
      {options.length === 0 ? (
        <li style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
          No options available
        </li>
      ) : (
        options.map((option) => {
          const isDisabled = option.disabled;
          return (
            <li
              key={option.value}
              onClick={() => {
                if (isDisabled) return;
                onChange(option.value);
                setIsOpen(false);
              }}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: 'var(--radius-sm)',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.5 : 1,
                backgroundColor: value === option.value ? 'var(--color-primary-light)' : 'transparent',
                color: value === option.value ? 'var(--color-primary)' : 'var(--color-text-main)',
                fontWeight: value === option.value ? '600' : 'normal',
                transition: 'background-color 0.15s ease',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: '1.4'
              }}
              onMouseEnter={(e) => {
                if (!isDisabled && value !== option.value) {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-base)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDisabled && value !== option.value) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {option.label}
            </li>
          );
        })
      )}
    </ul>
  );

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'relative', 
        width: '100%',
        fontFamily: 'var(--font-sans)',
        ...style 
      }}
    >
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '0 14px',
          backgroundColor: disabled ? '#f1f5f9' : 'var(--color-bg-base)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.7 : 1,
          transition: 'all 0.15s ease',
          fontSize: '13px',
          color: 'var(--color-text-main)',
          userSelect: 'none',
          boxShadow: isOpen ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none',
          borderColor: isOpen ? 'var(--color-primary)' : 'var(--color-border)',
          height: style.height || '38px',
          minHeight: style.minHeight,
          boxSizing: 'border-box'
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = 'var(--color-text-light)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          overflow: 'hidden', 
          flex: 1,
          marginRight: '8px'
        }}>
          {icon}
          <span style={{ 
            color: selectedOption ? 'var(--color-text-main)' : 'var(--color-text-light)',
            fontWeight: selectedOption ? '500' : 'normal',
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 'normal',
            flex: 1
          }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown 
          size={16} 
          style={{ 
            color: 'var(--color-text-muted)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0
          }} 
        />
      </div>

      {/* Render options menu using React Portal */}
      {isOpen && createPortal(dropdownMenu, document.body)}
    </div>
  );
}
