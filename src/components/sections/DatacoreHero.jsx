import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260210_031346_d87182fb-b0af-4273-84d1-c6fd17d6bf0f.mp4";

const NAV_LINKS = [
  { label: "Home" },
  { label: "Services", hasChevron: true },
  { label: "Reviews" },
  { label: "Contact us" },
];

function Logo() {
  return (
    <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M1.04356 6.35771L13.6437 0.666504"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function DatacoreHero() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {/* Navbar */}
      <nav className="relative z-20 flex w-full items-center justify-between px-6 py-[16px] lg:px-[120px]">
        <div className="flex items-center gap-2">
          <Logo />
        </div>

        <div className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              className="flex items-center gap-1 font-manrope text-[14px] font-medium text-white transition-opacity hover:opacity-80"
            >
              {link.label}
              {link.hasChevron && <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <button
            className="rounded-[8px] border px-4 py-2 font-manrope text-[14px] font-semibold text-[#171717]"
            style={{ backgroundColor: "#ffffff", borderColor: "#d4d4d4" }}
          >
            Sign In
          </button>
          <button
            className="rounded-[8px] px-4 py-2 font-manrope text-[14px] font-semibold text-[#fafafa] shadow-md"
            style={{ backgroundColor: "#7b39fc" }}
          >
            Get Started
          </button>
        </div>

        <button
          onClick={() => setMenuOpen(true)}
          className="text-white lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 flex flex-col bg-black">
          <div className="flex items-center justify-between px-6 py-[16px]">
            <Logo />
            <button onClick={() => setMenuOpen(false)} className="text-white" aria-label="Close menu">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-8">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                className="flex items-center gap-1 font-manrope text-[20px] font-medium text-white"
              >
                {link.label}
                {link.hasChevron && <ChevronDown className="h-4 w-4" />}
              </button>
            ))}
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                className="rounded-[8px] border px-6 py-2.5 font-manrope text-[14px] font-semibold text-[#171717]"
                style={{ backgroundColor: "#ffffff", borderColor: "#d4d4d4" }}
              >
                Sign In
              </button>
              <button
                className="rounded-[8px] px-6 py-2.5 font-manrope text-[14px] font-semibold text-[#fafafa] shadow-md"
                style={{ backgroundColor: "#7b39fc" }}
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero content */}
      <div className="relative z-10 mt-32 flex flex-col items-center px-6 text-center">
        {/* Tagline pill */}
        <div
          className="flex h-[38px] items-center gap-2 rounded-[10px] border px-3 backdrop-blur-md"
          style={{
            backgroundColor: "rgba(85,80,110,0.4)",
            borderColor: "rgba(164,132,215,0.5)",
          }}
        >
          <span
            className="rounded-[6px] px-2 py-0.5 font-cabin text-[12px] font-medium text-white"
            style={{ backgroundColor: "#7b39fc" }}
          >
            New
          </span>
          <span className="font-cabin text-[14px] font-medium text-white">
            Say Hello to Datacore v3.2
          </span>
        </div>

        {/* Headline */}
        <h1
          className="mt-6 max-w-4xl font-instrument-serif text-5xl text-white lg:text-[96px]"
          style={{ lineHeight: 1.1 }}
        >
          Book your perfect stay instantly{" "}
          <em className="italic" style={{ letterSpacing: "0.5px" }}>
            and
          </em>{" "}
          hassle-free
        </h1>

        {/* Subtext */}
        <p className="mt-6 max-w-[662px] font-inter text-[18px] font-normal text-white/70">
          Discover handpicked hotels, resorts, and stays across your favorite destinations. Enjoy
          exclusive deals, fast booking, and 24/7 support.
        </p>

        {/* CTA buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            className="rounded-[10px] px-6 py-3 font-cabin text-[16px] font-medium text-white transition-colors hover:bg-[#8f57fd]"
            style={{ backgroundColor: "#7b39fc" }}
          >
            Book a Free Demo
          </button>
          <button
            className="rounded-[10px] px-6 py-3 font-cabin text-[16px] font-medium transition-colors hover:bg-[#3a3159]"
            style={{ backgroundColor: "#2b2344", color: "#f6f7f9" }}
          >
            Get Started Now
          </button>
        </div>
      </div>
    </section>
  );
}
