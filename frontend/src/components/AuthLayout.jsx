import React from 'react';
import { Outlet } from 'react-router-dom';
import loginBg from '../assets/LOGIN.png';

export default function AuthLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', overflow: 'hidden' }}>

      {/* Global CSS for unified Auth Styling */}
      <style>
        {`
          .auth-left-pane {
            width: 100%;
            max-width: 45%;
            flex: 0 0 45%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 3rem;
            position: relative;
            z-index: 10;
            background-color: #0f172a;
          }
          .auth-right-pane {
            flex: 1;
            position: relative;
            background-color: #0f172a;
            overflow: hidden;
          }
          
          /* The workshop image */
          .auth-workshop-bg {
            width: 100%;
            height: 100%;
            object-fit: cover;
            filter: contrast(1.1) brightness(0.9);
          }
          
          /* The dark gradient fading from left to right over the image */
          .auth-image-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(to right, #0f172a 0%, rgba(15, 23, 42, 0.4) 40%, transparent 100%);
            pointer-events: none;
          }
          
          /* Shared Form Styling within Auth Layout */
          .auth-container {
            width: 100%;
            max-width: 380px;
            margin: 0 auto;
            animation: authFadeIn 0.3s ease-out forwards;
          }
          
          @keyframes authFadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .auth-header {
            margin-bottom: 2.5rem;
          }
          
          .auth-title {
            font-size: 22px;
            font-weight: 700;
            color: #f8fafc;
            margin: 24px 0 8px;
          }
          
          .auth-subtitle {
            font-size: 13px;
            color: #94a3b8;
            margin: 0;
            line-height: 1.5;
          }
          
          .auth-form-group {
            margin-bottom: 20px;
          }
          
          .auth-label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #cbd5e1;
            margin-bottom: 8px;
          }
          
          .auth-input-wrapper {
            position: relative;
          }
          
          .auth-input-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #64748b;
            display: flex;
            align-items: center;
          }
          
          .auth-input {
            width: 100%;
            padding: 12px 14px 12px 42px;
            background-color: rgba(30, 41, 59, 0.5);
            border: 1px solid rgba(100, 116, 139, 0.3);
            border-radius: 8px;
            font-size: 13px;
            color: #f8fafc;
            outline: none;
            transition: all 0.2s;
            box-sizing: border-box;
          }
          
          .auth-input:focus {
            border-color: #3b82f6;
            background-color: rgba(30, 41, 59, 0.8);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
          }
          
          .auth-input::placeholder {
            color: #475569;
          }
          
          .auth-btn-primary {
            width: 100%;
            padding: 12px 20px;
            background-color: #2563eb;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: background-color 0.2s;
            margin-top: 1.5rem;
          }
          
          .auth-btn-primary:hover:not(:disabled) {
            background-color: #1d4ed8;
          }
          
          .auth-btn-primary:disabled {
            background-color: #3b82f6;
            opacity: 0.7;
            cursor: not-allowed;
          }
          
          .auth-link {
            color: #93c5fd;
            font-size: 12px;
            text-decoration: none;
            transition: color 0.2s;
            background: none;
            border: none;
            padding: 0;
            cursor: pointer;
          }
          
          .auth-link:hover {
            color: #60a5fa;
          }
          
          .auth-footer {
            margin: 3rem auto 0;
            width: 100%;
            max-width: 380px;
            display: flex;
            gap: 16px;
            font-size: 11px;
            color: #475569;
          }
          
          .auth-footer a {
            color: #64748b;
            text-decoration: none;
          }
          
          .auth-footer a:hover {
            color: #94a3b8;
          }
          
          .auth-alert-error {
            padding: 12px 16px;
            background-color: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 8px;
            color: #fca5a5;
            font-size: 13px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          /* Responsive Layout */
          @media (max-width: 1024px) {
            .auth-left-pane {
              max-width: 50%;
              flex: 0 0 50%;
              padding: 2.5rem;
            }
          }
          
          @media (max-width: 768px) {
            .auth-left-pane {
              max-width: 100%;
              flex: 1;
              padding: 2rem;
              background-color: rgba(15, 23, 42, 0.85);
              backdrop-filter: blur(10px);
            }
            .auth-right-pane {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: 0;
            }
            .auth-image-overlay {
              background: #0f172a;
              opacity: 0.85;
            }
          }
        `}
      </style>

      {/* LEFT PANE: Form Content */}
      <div className="auth-left-pane">
        <Outlet />

        <div className="auth-footer">
          <span>&copy; {new Date().getFullYear()} TechFocal</span>
          <a href="#">Website</a>
          <a href="#">Documentation</a>
          <a href="#">Support</a>
        </div>
      </div>

      {/* RIGHT PANE: Workshop Visual */}
      <div className="auth-right-pane">
        <img src={loginBg} alt="TechFocal Workshop" className="auth-workshop-bg" />
        <div className="auth-image-overlay"></div>
      </div>

    </div>
  );
}
