import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Shield, X, Check, Copy, KeyRound, Loader2, Smartphone, Download, ChevronRight } from 'lucide-react';

export default function MfaSetupPromptModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState([]);

  const inputRefs = useRef([]);

  useEffect(() => {
    const fetchSetupData = async () => {
      try {
        const response = await axios.get('/api/mfa/setup');
        setSetupData(response.data);
      } catch (err) {
        console.error('Failed to init MFA setup', err);
      }
    };
    fetchSetupData();
  }, []);

  const handleDismiss = () => {
    // Close the modal instantly for a snappy UI
    onClose();
    // Inform the backend asynchronously
    axios.post('/api/mfa/dismiss').catch(err => {
      console.error(err);
    });
  };

  const handleCodeChange = (index, value) => {
    if (!/^[0-9]*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }

    // Auto submit if all filled
    if (index === 5 && value && newCode.every(v => v !== '')) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (paste.length > 0) {
      const newCode = [...code];
      for (let i = 0; i < paste.length; i++) {
        newCode[i] = paste[i];
      }
      setCode(newCode);
      if (paste.length === 6) {
        inputRefs.current[5].focus();
        handleVerify(paste);
      } else {
        inputRefs.current[paste.length].focus();
      }
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(setupData.secret);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleVerify = async (fullCode) => {
    const codeToVerify = fullCode || code.join('');
    if (codeToVerify.length !== 6) return;

    setLoading(true);
    setError('');
    setIsShaking(false);

    try {
      const response = await axios.post('/api/mfa/setup', {
        secret: setupData.secret,
        code: codeToVerify
      });
      if (response.data.recovery_codes) {
        setRecoveryCodes(response.data.recovery_codes);
      }
      setStep(3); // Success Screen
    } catch (err) {
      setIsShaking(true);
      setError(err.response?.data?.message || 'Invalid authentication code.');
      setTimeout(() => setIsShaking(false), 500);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0].focus();
    } finally {
      setLoading(false);
    }
  };

  const downloadRecoveryCodes = () => {
    const text = `TechFocal WMS - Recovery Codes\nStore these securely. Each code can only be used once.\n\n${recoveryCodes.join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'techfocal-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mfa-modal-overlay">
      <div className={`mfa-modal-content ${isShaking ? 'shake-animation' : ''}`}>

        {/* HEADER */}
        {step !== 3 && (
          <div className="mfa-modal-header">
            <div className="mfa-header-content">
              <div className="mfa-icon-bg">
                <Shield size={24} className="mfa-primary-icon" />
              </div>
              <div>
                <h2>Secure Your Account</h2>
                <p>Protect your account with Two-Factor Authentication (2FA). This adds an extra layer of security.</p>
              </div>
            </div>
            <button className="mfa-close-btn" onClick={handleDismiss} title="Close">
              <X size={20} />
            </button>
          </div>
        )}

        {/* PROGRESS */}
        {step !== 3 && (
          <div className="mfa-progress-bar">
            <div className="mfa-progress-indicator" style={{ width: step === 1 ? '50%' : '100%' }} />
          </div>
        )}

        <div className="mfa-modal-body">
          {/* STEP 1: DOWNLOAD APP */}
          {step === 1 && (
            <div className="mfa-step-animation fade-in">
              <div className="mfa-step-header">
                <span className="mfa-step-badge">Step 1 of 2</span>
                <h3>Download an Authenticator App</h3>
              </div>

              <div className="mfa-apps-grid">
                <div className="mfa-app-card">
                  <div className="mfa-app-icon"><Smartphone size={20} color="#ea4335" /></div>
                  <div className="mfa-app-info">
                    <h4>Google Authenticator</h4>
                    <p>iOS and Android</p>
                  </div>
                </div>
                <div className="mfa-app-card">
                  <div className="mfa-app-icon"><Smartphone size={20} color="#00a4ef" /></div>
                  <div className="mfa-app-info">
                    <h4>Microsoft Authenticator</h4>
                    <p>iOS and Android</p>
                  </div>
                </div>
                <div className="mfa-app-card">
                  <div className="mfa-app-icon"><Smartphone size={20} color="#e53e3e" /></div>
                  <div className="mfa-app-info">
                    <h4>Twilio Authy</h4>
                    <p>Cross-platform</p>
                  </div>
                </div>
              </div>

              <div className="mfa-footer-actions" style={{ justifyContent: 'space-between', marginTop: '32px' }}>
                <button className="mfa-btn-secondary" onClick={handleDismiss}>Skip for Now</button>
                <button className="mfa-btn-primary" onClick={() => setStep(2)}>
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SCAN & VERIFY */}
          {step === 2 && (
            <div className="mfa-step-animation slide-left">
              <div className="mfa-step-header" style={{ marginBottom: '24px' }}>
                <span className="mfa-step-badge">Step 2 of 2</span>
                <h3>Scan QR Code & Verify</h3>
              </div>

              {setupData ? (
                <div className="mfa-setup-container">
                  <div className="mfa-qr-section">
                    <div className="mfa-qr-card">
                      <div dangerouslySetInnerHTML={{ __html: atob(setupData.qr_code_svg) }} />
                    </div>
                    <p className="mfa-instruction-text">Open your authenticator app and scan this QR code.</p>
                  </div>

                  <div className="mfa-manual-key-section">
                    <p className="mfa-sub-label">Can't scan the code?</p>
                    <button
                      className={`mfa-secret-copy-btn ${copySuccess ? 'copied' : ''}`}
                      onClick={handleCopySecret}
                    >
                      <KeyRound size={16} className="mfa-secret-icon" />
                      <span className="mfa-secret-text">{setupData.secret}</span>
                      {copySuccess ? (
                        <span className="mfa-copy-success"><Check size={14} /> Copied!</span>
                      ) : (
                        <Copy size={14} className="mfa-copy-icon" />
                      )}
                    </button>
                  </div>

                  <div className="mfa-verification-section">
                    <p className="mfa-sub-label" style={{ marginBottom: '8px' }}>Enter the 6-digit code</p>
                    <div className="mfa-code-inputs">
                      {code.map((digit, index) => (
                        <input
                          key={index}
                          ref={el => inputRefs.current[index] = el}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleCodeChange(index, e.target.value)}
                          onKeyDown={e => handleKeyDown(index, e)}
                          onPaste={handlePaste}
                          className="mfa-digit-input"
                          disabled={loading}
                        />
                      ))}
                    </div>
                    {error && <p className="mfa-error-text">{error}</p>}
                  </div>

                  <div className="mfa-recovery-info">
                    <Shield size={14} color="#3b82f6" />
                    <p>Recovery codes will be generated after successful verification. Store them securely.</p>
                  </div>

                  <div className="mfa-footer-actions" style={{ justifyContent: 'space-between', marginTop: '32px' }}>
                    <button className="mfa-btn-text" onClick={() => setStep(1)}>Back</button>
                    <button
                      className="mfa-btn-primary"
                      onClick={() => handleVerify()}
                      disabled={loading || code.some(d => d === '')}
                    >
                      {loading ? <><Loader2 size={16} className="animate-spin" /> Verifying...</> : 'Verify & Enable'}
                    </button>
                  </div>

                  <div className="mfa-trust-footer">
                    <span>⏱ Takes less than 1 minute</span>
                    <span>•</span>
                    <span>🔒 End-to-end encrypted</span>
                  </div>
                </div>
              ) : (
                <div className="mfa-loading-state">
                  <Loader2 size={32} className="animate-spin text-primary" />
                  <p>Generating secure setup keys...</p>
                </div>
              )}
            </div>
          )}

          {/* SUCCESS SCREEN */}
          {step === 3 && (
            <div className="mfa-success-screen fade-in">
              <div className="mfa-success-icon-wrap">
                <Check size={48} color="#22c55e" />
              </div>
              <h2>Two-Factor Authentication Enabled</h2>
              <p>Your account is now protected. Recovery codes have been generated for emergency access.</p>

              <div className="mfa-success-actions">
                <button className="mfa-btn-secondary mfa-btn-full" onClick={downloadRecoveryCodes}>
                  <Download size={18} style={{ marginRight: '8px' }} /> Download Recovery Codes
                </button>
                <button className="mfa-btn-primary mfa-btn-full" onClick={() => onClose()}>
                  Continue to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
