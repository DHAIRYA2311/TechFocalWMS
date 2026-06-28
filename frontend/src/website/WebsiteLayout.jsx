import React, { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import WebNavbar from './components/WebNavbar';
import WebFooter from './components/WebFooter';
import './website.css';

const LoadingSpinner = () => (
  <div className="flex justify-center items-center min-h-[50vh] bg-warm-white">
    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
  </div>
);

export default function WebsiteLayout({ user, onLoginClick, onDashboardClick }) {
  const location = useLocation();

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Subtle scroll reveals
    const els = document.querySelectorAll(
      '.website-scope .fade-up, .website-scope .fade-in, .website-scope .slide-left, .website-scope .slide-right, .website-scope .scale-in'
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -20px 0px' }
    );

    els.forEach((el) => {
      el.classList.remove('revealed');
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [location.pathname]);

  return (
    <div className="website-scope flex flex-col min-h-screen bg-warm-white selection:bg-primary/10 selection:text-primary">
      <WebNavbar user={user} onLoginClick={onLoginClick} onDashboardClick={onDashboardClick} />
      
      <main className="flex-grow flex flex-col bg-warm-white">
        <Suspense fallback={<LoadingSpinner />}>
          <Outlet />
        </Suspense>
      </main>
      
      <WebFooter />
    </div>
  );
}

