// src/components/ActionButtonGroup.jsx
import React from 'react';
import { Pencil, Check, Printer, Download, CreditCard } from 'lucide-react';

export default function ActionButtonGroup({
  invoice,
  onEdit,
  onPrint,
  onDownload,
  onFinalize,
  onRecordPayment,
}) {
  const isDraft = invoice?.status === 'draft' && !invoice?.cancelled_at;
  const isUnpaid = invoice?.status === 'unpaid' && !invoice?.cancelled_at;

  return (
    <div className="action-button-group" style={{ display: 'flex', gap: '10px' }}>
      {isDraft && (
        <button
          id={`invoice-edit-${invoice.id}`}
          onClick={onEdit}
          className="logout-btn"
          style={buttonStyle}
        >
          <Pencil size={14} /> Edit Draft
        </button>
      )}
      {isDraft && (
        <button
          id={`invoice-finalize-${invoice.id}`}
          onClick={onFinalize}
          className="logout-btn"
          style={buttonStyle}
        >
          <Check size={14} /> Finalize
        </button>
      )}
      {isUnpaid && (
        <button
          id={`invoice-record-payment-${invoice.id}`}
          onClick={onRecordPayment}
          className="logout-btn"
          style={{ ...buttonStyle, backgroundColor: 'var(--color-primary)', color: '#fff' }}
        >
          <CreditCard size={14} /> Record Payment
        </button>
      )}
      <button
        id={`invoice-print-${invoice.id}`}
        onClick={onPrint}
        className="logout-btn"
        style={buttonStyle}
      >
        <Printer size={14} /> Print
      </button>
      <button
        id={`invoice-download-${invoice.id}`}
        onClick={onDownload}
        className="form-button"
        style={{ ...buttonStyle, backgroundColor: 'var(--color-primary)', color: '#fff' }}
      >
        <Download size={14} /> Download PDF
      </button>
    </div>
  );
}

const buttonStyle = {
  height: '38px',
  padding: '0 16px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  background: 'linear-gradient(135deg, #4f46e5, #3b82f6)',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'transform 0.2s, box-shadow 0.2s',
};
