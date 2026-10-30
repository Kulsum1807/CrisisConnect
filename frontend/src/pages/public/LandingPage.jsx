import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, AlertTriangle, Radio, Users, ArrowRight, HeartPulse, Flame, Car, PhoneCall } from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import EmergencyBanner from '../../components/common/EmergencyBanner.jsx';

export const LandingPage = () => {
  return (
    <div className="flex flex-col gap-10 sm:gap-14 pb-8">
      {/* 112 Helpline Notice */}
      <EmergencyBanner />

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-700 to-slate-900 text-white p-6 sm:p-12 shadow-xl">
        <div className="relative z-10 max-w-2xl flex flex-col gap-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-white/90 border border-white/20 w-fit">
            <span className="w-2 h-2 rounded-full bg-emergency animate-pulse" />
            <span>24/7 Coordinated Emergency Dispatch</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display leading-tight">
            Every Second Matters in an Emergency.
          </h1>

          <p className="text-sm sm:text-base text-gray-200 leading-relaxed">
            CrisisConnect connects citizens facing critical emergencies with verified nearby first responders in real time. Fast dispatch, live tracking, and deterministic response workflows.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link to="/login">
              <Button
                variant="emergency"
                size="lg"
                className="shadow-lg shadow-emergency/40 text-sm sm:text-base px-6 py-3.5"
              >
                <AlertTriangle className="w-5 h-5 mr-2" />
                Trigger SOS / Report Now
              </Button>
            </Link>
            <a
              href="tel:112"
              id="call-112-landing"
              className="touch-target inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold rounded-lg text-sm sm:text-base border border-red-500 shadow-lg shadow-red-900/30 transition-all select-none"
              aria-label="Call 112 National Emergency Helpline"
            >
              <PhoneCall className="w-5 h-5 animate-pulse" />
              <span>Call 112</span>
            </a>
            <Link to="/register-responder">
              <Button
                variant="outline"
                size="lg"
                className="text-white border-white/60 hover:bg-white/10 text-sm sm:text-base"
              >
                Join as First Responder
              </Button>
            </Link>
          </div>

        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-[-10%] top-[-20%] w-96 h-96 rounded-full bg-emergency/20 blur-3xl pointer-events-none" />
        <div className="absolute left-[30%] bottom-[-20%] w-96 h-96 rounded-full bg-primary-100/10 blur-3xl pointer-events-none" />
      </section>

      {/* Feature Highlights */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-surface p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
          <div className="w-12 h-12 rounded-lg bg-red-50 text-emergency flex items-center justify-center">
            <HeartPulse className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-appText-primary font-display">One-Tap Emergency SOS</h3>
          <p className="text-xs sm:text-sm text-appText-secondary leading-relaxed">
            Citizens can trigger high-urgency alerts with immediate GPS broadcast. Offline and location-denied fallbacks ensure no alert is dropped.
          </p>
        </div>

        <div className="bg-surface p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
            <Radio className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-appText-primary font-display">Exclusive Concurrency Claim</h3>
          <p className="text-xs sm:text-sm text-appText-secondary leading-relaxed">
            Atomic concurrency control guarantees that only one verified responder can claim an incident, eliminating duplicate or conflicted dispatching.
          </p>
        </div>

        <div className="bg-surface p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-appText-primary font-display">Verified Volunteer Network</h3>
          <p className="text-xs sm:text-sm text-appText-secondary leading-relaxed">
            Every responder undergoes administrator identity verification and manages their availability before handling critical life events.
          </p>
        </div>
      </section>

      {/* Supported Incident Types */}
      <section className="bg-surface p-6 sm:p-8 rounded-xl border border-gray-200 shadow-sm">
        <div className="text-center max-w-xl mx-auto mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-appText-primary font-display">
            Multi-Category Emergency Support
          </h2>
          <p className="text-xs sm:text-sm text-appText-secondary mt-1">
            Deterministic severity rules automatically prioritize resources based on clinical and situational triage.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 flex flex-col items-center text-center gap-2">
            <HeartPulse className="w-6 h-6 text-red-600" />
            <span className="text-xs font-bold text-appText-primary">Medical & Cardiac</span>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 flex flex-col items-center text-center gap-2">
            <Flame className="w-6 h-6 text-orange-600" />
            <span className="text-xs font-bold text-appText-primary">Fire & Trapped</span>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 flex flex-col items-center text-center gap-2">
            <Car className="w-6 h-6 text-amber-600" />
            <span className="text-xs font-bold text-appText-primary">Traffic Collision</span>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 flex flex-col items-center text-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="text-xs font-bold text-appText-primary">Crime & Threat</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
