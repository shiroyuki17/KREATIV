import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { NavProvider, useNav } from "./nav.jsx";
import { LiveProvider } from "./live.jsx";
import { getAccessToken } from "./lib/authApi.js";
import LiveToasts from "./components/LiveToasts.jsx";
import Navbar from "./components/layout/Navbar.jsx";
import Footer from "./components/layout/Footer.jsx";
import AppShell from "./components/layout/AppShell.jsx";
import ChatWidget from "./components/ChatWidget.jsx";

import Hero from "./components/sections/Hero.jsx";
import TrendingNow from "./components/sections/TrendingNow.jsx";
import FeaturedWork from "./components/sections/FeaturedWork.jsx";
import LiveBriefs from "./components/sections/LiveBriefs.jsx";
import StandoutWork from "./components/sections/StandoutWork.jsx";
import Categories from "./components/sections/Categories.jsx";
import BentoShowcase from "./components/sections/BentoShowcase.jsx";
import JobBoard from "./components/sections/JobBoard.jsx";
import AISection from "./components/sections/AISection.jsx";
import Pricing from "./components/sections/Pricing.jsx";
import ProjectProgressDashboard from "./components/dashboard/ProjectProgressDashboard.jsx";

import ProjectDetail from "./components/views/ProjectDetail.jsx";
import FreelancerProfile from "./components/views/FreelancerProfile.jsx";
import ClientDashboard from "./components/views/ClientDashboard.jsx";
import FreelancerDashboard from "./components/views/FreelancerDashboard.jsx";
import MyProjects from "./components/views/MyProjects.jsx";
import Messages from "./components/views/Messages.jsx";
import Payments from "./components/views/Payments.jsx";
import Settings from "./components/views/Settings.jsx";
import Notifications from "./components/views/Notifications.jsx";
import TrustSafety from "./components/views/TrustSafety.jsx";
import AdminPanel from "./components/views/AdminPanel.jsx";
import PostJob from "./components/views/PostJob.jsx";
import FindTalent from "./components/views/FindTalent.jsx";
import FindWork from "./components/views/FindWork.jsx";
import Auth from "./components/views/Auth.jsx";
import AuthCallback from "./components/views/AuthCallback.jsx";
import Onboarding from "./components/views/Onboarding.jsx";
import HowItWorks from "./components/views/HowItWorks.jsx";
import HelpCenter from "./components/views/HelpCenter.jsx";
import Contact from "./components/views/Contact.jsx";
import Reviews from "./components/views/Reviews.jsx";
import NotFound from "./components/views/NotFound.jsx";
import Testimonials from "./components/sections/Testimonials.jsx";

// Pages that live inside the logged-in sidebar shell.
const APP_PAGES = new Set([
  "freelancer-dashboard",
  "client-dashboard",
  "find-work",
  "find-talent",
  "post-job",
  "my-projects",
  "messages",
  "payments",
  "notifications",
  "profile",
  "settings",
  "admin",
  "project",
  "tracker",
]);

// Of those, these actually require a real login — "find-work"/"find-talent"/
// "project"/"profile" stay publicly browsable (like Contra/Upwork's public
// marketplace pages) even though they render inside the sidebar shell.
const PROTECTED_PAGES = new Set([
  "freelancer-dashboard",
  "client-dashboard",
  "post-job",
  "my-projects",
  "messages",
  "payments",
  "notifications",
  "settings",
  "admin",
  "tracker",
]);

function HomePage() {
  return (
    <>
      <Hero />
      <TrendingNow />
      <FeaturedWork />
      <LiveBriefs />
      <Categories />
      <BentoShowcase />
      <JobBoard />
      <AISection />
      <ProjectProgressDashboard />
      <StandoutWork />
      <Testimonials />
      <Pricing />
    </>
  );
}

const KNOWN = new Set([
  "home", "trust", "how", "help", "contact", "reviews", "auth", "auth-callback", "onboarding",
  "project", "profile", "client-dashboard", "freelancer-dashboard", "my-projects",
  "messages", "payments", "settings", "notifications", "admin", "post-job",
  "find-talent", "find-work", "tracker",
]);

function View({ page }) {
  switch (page) {
    case "home": return <HomePage />;
    case "trust": return <TrustSafety />;
    case "how": return <HowItWorks />;
    case "help": return <HelpCenter />;
    case "contact": return <Contact />;
    case "reviews": return <Reviews />;
    case "auth": return <Auth />;
    case "auth-callback": return <AuthCallback />;
    case "onboarding": return <Onboarding />;
    case "project": return <ProjectDetail />;
    case "profile": return <FreelancerProfile />;
    case "client-dashboard": return <ClientDashboard />;
    case "freelancer-dashboard": return <FreelancerDashboard />;
    case "my-projects": return <MyProjects />;
    case "messages": return <Messages />;
    case "payments": return <Payments />;
    case "settings": return <Settings />;
    case "notifications": return <Notifications />;
    case "admin": return <AdminPanel />;
    case "post-job": return <PostJob />;
    case "find-talent": return <FindTalent />;
    case "find-work": return <FindWork />;
    case "tracker": return <div className="pt-4"><ProjectProgressDashboard /></div>;
    default: return <NotFound />;
  }
}

// Direct hash navigation (typing #/messages, a bookmark, …) bypasses any
// sidebar link gating, so this is the one place that actually enforces it —
// renders a blank frame (no protected content leaks) and bounces to /auth.
function RequireAuth() {
  const { nav } = useNav();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { nav("auth"); }, []);
  return <div className="min-h-screen bg-ink" />;
}

function Shell() {
  const { page } = useNav();

  // Full-screen flows — no site chrome
  if (page === "auth" || page === "auth-callback" || page === "onboarding") {
    return <div className="min-h-screen overflow-x-clip bg-ink text-white"><View page={page} /></div>;
  }

  // Unknown route → 404 (marketing chrome)
  if (!KNOWN.has(page)) {
    return (
      <div className="min-h-screen overflow-x-clip bg-ink text-white">
        <Navbar />
        <main><NotFound /></main>
        <Footer />
      </div>
    );
  }

  // Logged-in app — sidebar shell
  if (APP_PAGES.has(page)) {
    if (PROTECTED_PAGES.has(page) && !getAccessToken()) {
      return <RequireAuth />;
    }
    return (
      <AppShell>
        <div key={page} className="animate-page-in">
          <View page={page} />
        </div>
      </AppShell>
    );
  }

  // Marketing — top navbar + footer
  return (
    <div className="min-h-screen overflow-x-clip bg-ink text-white">
      <Navbar />
      <main key={page} className="animate-page-in">
        <View page={page} />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <NavProvider>
        <LiveProvider>
          <Shell />
          <LiveToasts />
          <ChatWidget />
        </LiveProvider>
      </NavProvider>
    </MotionConfig>
  );
}
