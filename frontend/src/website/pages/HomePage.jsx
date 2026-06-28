import React from 'react';
import HeroSection from '../sections/HeroSection';
import AboutSnippet from '../sections/AboutSnippet';
import ServicesGrid from '../sections/ServicesGrid';
import WhyChooseUs from '../sections/WhyChooseUs';
import ProcessTimeline from '../sections/ProcessTimeline';
import GalleryGrid from '../sections/GalleryGrid';
import Testimonials from '../sections/Testimonials';
import QuoteCTA from '../sections/QuoteCTA';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <AboutSnippet />
      <ServicesGrid />
      <WhyChooseUs />
      <ProcessTimeline />
      <GalleryGrid />
      <Testimonials />
      <QuoteCTA />
    </div>
  );
}
