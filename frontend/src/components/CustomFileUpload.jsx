import React, { useState, useRef } from 'react';
import { UploadCloud, File, FileText, Image, X, CheckCircle } from 'lucide-react';

export default function CustomFileUpload({
  file,
  onChange,
  accept = '.pdf,image/png,image/jpeg,image/jpg',
  maxSizeMB = 5,
  placeholder = 'Click to upload or drag & drop your receipt',
  subplaceholder = 'Accepts PDF, PNG, JPG (Max 5MB)'
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndProcessFile(droppedFile);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      validateAndProcessFile(selectedFile);
    }
  };

  const validateAndProcessFile = (selectedFile) => {
    const sizeInMB = selectedFile.size / (1024 * 1024);
    if (sizeInMB > maxSizeMB) {
      alert(`File size exceeds the ${maxSizeMB}MB limit. Please select a smaller file.`);
      return;
    }
    onChange(selectedFile);
  };

  const removeFile = (e) => {
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onChange(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const triggerSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getFileIcon = (fileObj) => {
    if (typeof fileObj === 'string') {
      return fileObj.endsWith('.pdf') ? <FileText size={24} /> : <Image size={24} />;
    }
    if (fileObj.type.includes('image')) return <Image size={24} />;
    if (fileObj.type.includes('pdf')) return <FileText size={24} />;
    return <File size={24} />;
  };

  const getFileName = (fileObj) => {
    if (typeof fileObj === 'string') {
      return fileObj.split('/').pop();
    }
    return fileObj.name;
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerSelect}
      style={{
        border: isDragging 
          ? '2px dashed var(--color-primary)' 
          : '1px dashed var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        backgroundColor: isDragging 
          ? 'var(--color-primary-light)' 
          : file 
            ? '#f8fafc' 
            : 'var(--color-bg-base)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '8px',
        minHeight: '120px',
        boxSizing: 'border-box',
        outline: 'none',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        if (!file && !isDragging) {
          e.currentTarget.style.borderColor = 'var(--color-primary)';
          e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.02)';
        }
      }}
      onMouseLeave={(e) => {
        if (!file && !isDragging) {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.backgroundColor = 'var(--color-bg-base)';
        }
      }}
    >
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        style={{ display: 'none' }}
      />

      {file ? (
        // File Preview State
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          width: '100%', 
          gap: '12px', 
          padding: '8px 12px',
          backgroundColor: '#ffffff',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-sm)',
          boxSizing: 'border-box'
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{ 
            color: 'var(--color-primary)', 
            backgroundColor: 'var(--color-primary-light)', 
            padding: '8px', 
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {getFileIcon(file)}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flexGrow: 1, overflow: 'hidden' }}>
            <span style={{ 
              fontSize: '13px', 
              fontWeight: '600', 
              color: 'var(--color-text-main)',
              width: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'left'
            }}>
              {getFileName(file)}
            </span>
            {typeof file !== 'string' && (
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {formatFileSize(file.size)}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} style={{ color: 'var(--color-success)' }} />
            <button 
              type="button"
              onClick={removeFile}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--color-bg-base)',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-base)'}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        // Empty State
        <>
          <div style={{ color: 'var(--color-text-light)' }}>
            <UploadCloud size={32} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-main)' }}>
              {placeholder}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {subplaceholder}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
