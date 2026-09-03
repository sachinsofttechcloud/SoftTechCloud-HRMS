"use client";
import NetworkBackground from "./network-background";

export default function AnimatedThemeWrapper({ children, className = "" }) {
  return (
    <div className={`theme-animated-wrapper ${className}`}>
      {/* Floating Animated Light Orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* Animated Subtle Tech Grid */}
      <div className="global-grid" />

      {/* Interactive Particle Network Canvas */}
      <NetworkBackground />

      {/* Foreground Content */}
      <div className="relative z-10 w-full flex items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}
