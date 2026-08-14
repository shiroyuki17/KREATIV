import { lazy, Suspense, useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { NavProvider, useNav, DASHBOARD_FOR } from "./nav.jsx";
import { LiveProvider } from "./live.jsx";
import { I18nProvider } from "./i18n.jsx";
import { hasSession, stashRedirect } from "./lib/authApi.js";
import LiveToasts from "./components/LiveToasts.jsx";
import Navbar from "./components/layout/Navbar.jsx";
import Footer from "./components/layout/Footer.jsx";
import AppShell from "./components/layout/AppShell.jsx";
import ChatWidget from "./components/ChatWidget.jsx";
import AuroraBackground from "./components/fx/AuroraBackground.jsx";

// ── Нүүр хуудас: шууд (eager) import ──
// Эдгээр нь анхны дэлгэцэнд ЯГ ОДОО хэрэгтэй тул тусад нь хуваавал
// зөвхөн нэмэлт round-trip нэмнэ.
import DatacoreHero from "./components/sections/DatacoreHero.jsx";
import Categories from "./components/sections/Categories.jsx";
import BentoShowcase from "./components/sections/BentoShowcase.jsx";
import AISection from "./components/sections/AISection.jsx";
import Pricing from "./components/sections/Pricing.jsx";
import Testimonials from "./components/sections/Testimonials.jsx";
import NotFound from "./components/views/NotFound.jsx";

// ── Бусад бүх хуудас: шаардлагатай үед нь (lazy) ──
// Өмнө нь 30 гаруй хуудас нэг bundle-д багтаж, нүүр хуудас нээхэд AdminPanel,
// Payments, WebRTC дуудлагын код хүртэл бүгд татагддаг байв (796 KB).
const ProjectDetail = lazy(() => import("./components/views/ProjectDetail.jsx"));
const FreelancerProfile = lazy(() => import("./components/views/FreelancerProfile.jsx"));
const ClientDashboard = lazy(() => import("./components/views/ClientDashboard.jsx"));
const FreelancerDashboard = lazy(() => import("./components/views/FreelancerDashboard.jsx"));
const MyProjects = lazy(() => import("./components/views/MyProjects.jsx"));
const Messages = lazy(() => import("./components/views/Messages.jsx"));
const Payments = lazy(() => import("./components/views/Payments.jsx"));
const Subscription = lazy(() => import("./components/views/Subscription.jsx"));
const Settings = lazy(() => import("./components/views/Settings.jsx"));
const Notifications = lazy(() => import("./components/views/Notifications.jsx"));
const TrustSafety = lazy(() => import("./components/views/TrustSafety.jsx"));
const AdminPanel = lazy(() => import("./components/views/AdminPanel.jsx"));
const PostJob = lazy(() => import("./components/views/PostJob.jsx"));
const FindTalent = lazy(() => import("./components/views/FindTalent.jsx"));
const FindWork = lazy(() => import("./components/views/FindWork.jsx"));
const FindServices = lazy(() => import("./components/views/FindServices.jsx"));
const GigDetail = lazy(() => import("./components/views/GigDetail.jsx"));
const Auth = lazy(() => import("./components/views/Auth.jsx"));
const AuthCallback = lazy(() => import("./components/views/AuthCallback.jsx"));
const ResetPassword = lazy(() => import("./components/views/ResetPassword.jsx"));
const Onboarding = lazy(() => import("./components/views/Onboarding.jsx"));
const HowItWorks = lazy(() => import("./components/views/HowItWorks.jsx"));
const HelpCenter = lazy(() => import("./components/views/HelpCenter.jsx"));
const Contact = lazy(() => import("./components/views/Contact.jsx"));
const Reviews = lazy(() => import("./components/views/Reviews.jsx"));
const Terms = lazy(() => import("./components/views/Terms.jsx"));
const DisputePolicy = lazy(() => import("./components/views/DisputePolicy.jsx"));

// Chunk татагдах хормын завсарт — бүтэн хуудас багтаах хэмжээний тайван
// орон зай. Spinner тавихаас татгалзав: chunk ихэвчлэн 100ms-аас
// хурдан ирдэг тул spinner нь зөвхөн анивчиж, илүү таагүй мэдрэгддэг.
function PageFallback() {
  return <div className="min-h-[60vh]" />;
}

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
  "subscription",
  "notifications",
  "profile",
  "settings",
  "admin",
  "project",
  "find-services",
  "gig",
]);

// Sidebar-ийн бүх хуудас нэвтрэлт шаардана — Find Work/Find Talent-ийг
// нээлттэй байлгах нь энд хүсээгүй зүйл гэж шийдсэн.
//
// ГАНЦ ҮЛ ХАМААРАХ нь профайл: /#/u/bat-erdene гэсэн линкийг хуваалцахад
// хүлээн авагч нь нэвтрэх шаардлагагүй байх ёстой — эс тэгвээс "mini site"
// гэдэг санаа өөрөө утгагүй болно. Backend талд GET /profile/freelancer/*
// аль хэдийн нээлттэй байсан тул зөвхөн frontend-ийн хаалт саад болж байв.
const PROTECTED_PAGES = new Set([...APP_PAGES].filter((p) => p !== "profile"));

function HomePage() {
  return (
    <>
      <DatacoreHero />
      <Categories />
      <BentoShowcase />
      <AISection />
      <Testimonials />
      <Pricing />
    </>
  );
}

const KNOWN = new Set([
  "home", "trust", "how", "help", "contact", "reviews", "auth", "auth-callback", "reset-password", "onboarding",
  "project", "profile", "client-dashboard", "freelancer-dashboard", "my-projects",
  "messages", "payments", "subscription", "settings", "notifications", "admin", "post-job",
  "find-talent", "find-work", "find-services", "gig", "terms", "dispute-policy",
]);

// Хуудсууд lazy болсон тул Suspense заавал хэрэгтэй. Гурван дуудлагын цэг
// (auth flow / sidebar shell / marketing) бүрд давтахын оронд View дотор
// нэг л удаа боов.
function View({ page }) {
  return (
    <Suspense fallback={<PageFallback />}>
      <ViewSwitch page={page} />
    </Suspense>
  );
}

function ViewSwitch({ page }) {
  switch (page) {
    case "home": return <HomePage />;
    case "trust": return <TrustSafety />;
    case "how": return <HowItWorks />;
    case "help": return <HelpCenter />;
    case "contact": return <Contact />;
    case "reviews": return <Reviews />;
    case "terms": return <Terms />;
    case "dispute-policy": return <DisputePolicy />;
    case "auth": return <Auth />;
    case "auth-callback": return <AuthCallback />;
    case "reset-password": return <ResetPassword />;
    case "onboarding": return <Onboarding />;
    case "project": return <ProjectDetail />;
    case "profile": return <FreelancerProfile />;
    case "client-dashboard": return <ClientDashboard />;
    case "freelancer-dashboard": return <FreelancerDashboard />;
    case "my-projects": return <MyProjects />;
    case "messages": return <Messages />;
    case "payments": return <Payments />;
    case "subscription": return <Subscription />;
    case "settings": return <Settings />;
    case "notifications": return <Notifications />;
    case "admin": return <AdminPanel />;
    case "post-job": return <PostJob />;
    case "find-talent": return <FindTalent />;
    case "find-work": return <FindWork />;
    case "find-services": return <FindServices />;
    case "gig": return <GigDetail />;
    default: return <NotFound />;
  }
}

// Direct hash navigation (typing #/messages, a bookmark, …) bypasses any
// sidebar link gating, so this is the one place that actually enforces it —
// renders a blank frame (no protected content leaks) and bounces to /auth.
function RequireAuth() {
  const { nav, page, params } = useNav();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { stashRedirect(page, params); nav("auth"); }, []);
  return <div className="min-h-screen bg-ink" />;
}

function Shell() {
  const { page, user, authReady, mode, nav } = useNav();

  // Нэвтэрсэн хэрэглэгчийг landing page дээр барихгүй — root хаяг руу орох,
  // sidebar-ийн логог дарах бүрд маркетингийн хуудас гарч, дашбоард руугаа
  // гараар буцах шаардлагатай байв. authReady болтол хүлээнэ: эс тэгвээс
  // эхний хормын "хэрэглэгч алга" төлөвөөр буруу шийдэж анивчина.
  useEffect(() => {
    if (page === "home" && authReady && user) {
      nav(DASHBOARD_FOR[mode] || DASHBOARD_FOR.freelancer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, authReady, user, mode]);

  // Full-screen flows — no site chrome
  if (page === "auth" || page === "auth-callback" || page === "reset-password" || page === "onboarding") {
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

  // Нэвтрээгүй зочин профайл үзэж байна — sidebar shell утгагүй (нэвтрэх
  // хэрэглэгч байхгүй), тиймээс маркетингийн хүрээгээр харуулна. Тэндээс
  // "Log in / Post a Job" рүү шууд орох зам ч нээлттэй үлдэнэ.
  if (page === "profile" && !hasSession()) {
    return (
      <div className="min-h-screen overflow-x-clip bg-ink text-white">
        <Navbar />
        <main key={page} className="animate-page-in pt-24">
          <View page={page} />
        </main>
        <Footer />
      </div>
    );
  }

  // Logged-in app — sidebar shell
  if (APP_PAGES.has(page)) {
    // hasSession() нь access ЭСВЭЛ refresh token байхад үнэн — access token
    // 15 минутын дараа хугацаа нь дуусдаг тул зөвхөн түүнийг шалгавал
    // хүчинтэй session-тэй хэрэглэгчийг нэвтрэх хуудас руу буруу шиднэ.
    if (PROTECTED_PAGES.has(page) && !hasSession()) {
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
      <AuroraBackground />
      <Navbar />
      <main key={page} className="animate-page-in">
        <View page={page} />
      </main>
      <Footer />
    </div>
  );
}

import { ErrorBoundary } from "./components/ui/ErrorBoundary.jsx";

export default function App() {
  return (
    <ErrorBoundary>
      {/* Хэл нь бүх хуудсанд хэрэгтэй тул хамгийн гадна талд. */}
      <I18nProvider>
        <MotionConfig reducedMotion="user">
          <NavProvider>
            <LiveProvider>
              <Shell />
              <LiveToasts />
              <ChatWidget />
            </LiveProvider>
          </NavProvider>
        </MotionConfig>
      </I18nProvider>
    </ErrorBoundary>
  );
}
