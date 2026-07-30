export const TRANSACTIONS = [
  { id: "TX-4821", desc: "Milestone 2 — Checkout flow revamp", party: "Nova Studio", date: "Jul 21, 2026", amount: "+$2,400", dir: "in", status: "Completed" },
  { id: "TX-4790", desc: "Milestone 3 funding", party: "Nova Studio", date: "Jul 20, 2026", amount: "$1,800", dir: "escrow", status: "In escrow" },
  { id: "TX-4711", desc: "Brand system sprint", party: "Luminary Finance", date: "Jul 12, 2026", amount: "+$3,250", dir: "in", status: "Completed" },
  { id: "TX-4688", desc: "Withdrawal to Visa •• 4821", party: "Payout", date: "Jul 08, 2026", amount: "−$5,000", dir: "out", status: "Completed" },
  { id: "TX-4655", desc: "AI chatbot integration — deposit", party: "Helix Health", date: "Jul 02, 2026", amount: "$2,000", dir: "escrow", status: "Pending" },
];

export const PORTFOLIO = [
  { title: "Aurora Banking App", tag: "Product Design", grad: "from-violet/60 via-violet-soft/30 to-transparent" },
  { title: "Nebula 3D Landing", tag: "WebGL · Motion", grad: "from-neon/50 via-neon/20 to-transparent" },
  { title: "Pulse Design System", tag: "Design Tokens", grad: "from-mint/50 via-mint/20 to-transparent" },
];

export const REVIEWS = [
  {
    name: "Nova Studio",
    project: "Checkout flow revamp",
    text: "Exceptional velocity without cutting corners. Every milestone landed early, and the escrow flow made payments effortless.",
    rating: 5.0,
    date: "Jul 2026",
  },
  {
    name: "Luminary Finance",
    project: "Brand system & tokens",
    text: "Rare mix of design taste and engineering depth. The token library is now the backbone of our product suite.",
    rating: 4.9,
    date: "Jun 2026",
  },
];

export const TESTIMONIALS = [
  { name: "Nova Studio", role: "Design agency · Client", initials: "NS", rating: 5.0, text: "We shipped a full 3D landing in two weeks. AI matching found the perfect specialist, and escrow made payments completely frictionless.", metric: "2 weeks to launch" },
  { name: "Daniel Kim", role: "Full-Stack Developer", initials: "DK", rating: 5.0, text: "I've never chased an invoice on KREATIV. Money is in escrow before I start — I just focus on shipping great work.", metric: "$96k earned in 2025" },
  { name: "Meridian Bank", role: "Fintech · Client", initials: "MB", rating: 4.9, text: "The talent bar is genuinely high. Every freelancer we hired was vetted, fast, and communicated like a full-time teammate.", metric: "12 hires, 0 disputes" },
  { name: "Mina Okafor", role: "Motion Designer", initials: "MO", rating: 4.9, text: "The milestone tracker keeps clients calm and me organized. Approvals and payouts happen in a single click.", metric: "76 five-star reviews" },
  { name: "Helix Health", role: "AI startup · Client", initials: "HH", rating: 4.8, text: "We scaled an ML team in days, not months. The dispute process is fair and human — it never came to that, but it's reassuring.", metric: "Team scaled in 4 days" },
  { name: "Ava Torres", role: "Product Designer", initials: "AT", rating: 5.0, text: "Best mix of quality clients and protected payments I've found. It feels built for people who take their craft seriously.", metric: "Top Rated since 2023" },
];

export const ACTIVE_PROJECTS = [
  { title: "Checkout flow revamp", who: "Daniel Kim", progress: 68, status: "In progress", budget: "$5,400", statusColor: "neon" },
  { title: "Design system audit", who: "Ava Torres", progress: 34, status: "In progress", budget: "$2,100", statusColor: "neon" },
  { title: "Landing page redesign", who: "Mina Okafor", progress: 100, status: "Delivered", budget: "$1,800", statusColor: "mint" },
];

export const INVITES = [
  { title: "Mobile banking app UX audit", client: "Meridian Bank", budget: "$4,000 – $6,000" },
  { title: "Design system for internal tools", client: "Nova Studio", budget: "$2,500 – $3,500" },
];

export const EARNINGS = [
  { m: "Feb", v: 5200 },
  { m: "Mar", v: 6100 },
  { m: "Apr", v: 4800 },
  { m: "May", v: 7400 },
  { m: "Jun", v: 6900 },
  { m: "Jul", v: 8450 },
];

export const MY_PROJECTS = {
  active: [
    { title: "Checkout flow revamp", client: "Nova Studio", budget: "$5,400", progress: 68, due: "Aug 04" },
    { title: "AI chatbot integration", client: "Helix Health", budget: "$110/hr", progress: 22, due: "Aug 18" },
  ],
  proposals: [
    { title: "React dashboard for fintech analytics", client: "Meridian Bank", bid: "$92/hr", sent: "2d ago", status: "Shortlisted" },
    { title: "Mobile banking app UX audit", client: "Meridian Bank", bid: "$4,800", sent: "5d ago", status: "Under review" },
  ],
  completed: [
    { title: "Brand system & tokens", client: "Luminary Finance", paid: "$6,500", rating: 5.0, date: "Jun 2026" },
    { title: "Landing page redesign", client: "Helix Health", paid: "$1,800", rating: 4.9, date: "May 2026" },
  ],
};

export const FL_SKILLS = [
  "React", "TypeScript", "Node.js", "Figma", "Design Systems", "3D / WebGL",
  "Motion", "AI / LLM", "Python", "Rive", "Next.js", "UX Research",
];

// Backend-ийн FreelancerProfile.category-той (мөн Job.category-тэй) яг
// тохирсон жагсаалт — Find Talent-ийн шүүлт бодит утгуудтай нийцнэ.
export const FL_CATEGORIES = ["Design", "Dev", "AI", "Motion", "Writing", "Marketing"];

export const CL_CATEGORIES = [
  "Web Development", "Product Design", "AI & Data", "Motion & 3D", "Branding", "Mobile Apps",
];

export const CL_BUDGETS = ["< $1k", "$1k – $5k", "$5k – $20k", "$20k+"];

export const RECEIVED = [
  {
    month: "July 2026",
    items: [
      { project: "Checkout flow revamp", from: "Nova Studio", kind: "Milestone 3 release", date: "Jul 24", amount: "+$1,800", status: "Clearing" },
      { project: "Checkout flow revamp", from: "Nova Studio", kind: "Milestone 2 release", date: "Jul 21", amount: "+$2,400", status: "Cleared" },
      { project: "AI chatbot integration", from: "Helix Health", kind: "Milestone 1 release", date: "Jul 15", amount: "+$1,450", status: "Cleared" },
    ],
  },
  {
    month: "June 2026",
    items: [
      { project: "Brand system & tokens", from: "Luminary Finance", kind: "Final milestone", date: "Jun 28", amount: "+$3,250", status: "Cleared" },
      { project: "Brand system & tokens", from: "Luminary Finance", kind: "Milestone 1 release", date: "Jun 10", amount: "+$3,250", status: "Cleared" },
    ],
  },
];

export const ADMIN_STATS = [
  { label: "Total users", value: 12400, suffix: "+", sub: "+312 this week" },
  { label: "GMV this quarter", value: 2.4, prefix: "$", suffix: "M", decimals: 1, sub: "+18% QoQ" },
  { label: "Held in escrow", value: 186, prefix: "$", suffix: "K", sub: "across 214 contracts" },
  { label: "Platform revenue", value: 124, prefix: "$", suffix: "K", sub: "commission YTD" },
];

export const ADMIN_SIGNUPS = [
  { m: "Feb", v: 640 },
  { m: "Mar", v: 820 },
  { m: "Apr", v: 710 },
  { m: "May", v: 980 },
  { m: "Jun", v: 1150 },
  { m: "Jul", v: 1320 },
];

export const ROLE_DIST = [
  { role: "Freelancers", count: "8,430", pct: 68, color: "from-neon to-neon" },
  { role: "Clients", count: "3,860", pct: 31, color: "from-violet to-violet-soft" },
  { role: "Admins", count: "110", pct: 1, color: "from-amber-400 to-amber-300" },
];

export const FRAUD_ALERTS = [
  { text: "Off-platform payment requested in chat — contract #C-4821 frozen", level: "High", time: "22m ago" },
  { text: "Duplicate portfolio detected on 2 new freelancer accounts", level: "Medium", time: "1h ago" },
  { text: "Rapid signup burst from a single IP range (14 accounts)", level: "Medium", time: "3h ago" },
];

export const ADMIN_USERS = [
  { id: 1, name: "Ulaanaa", email: "ulakaulaanaa451@gmail.com", initials: "UL", role: "Superadmin", status: "Active", joined: "Jan 2024" },
  { id: 2, name: "Ava Torres", email: "ava@luminary.co", initials: "AT", role: "Client", status: "Active", joined: "Mar 2025" },
  { id: 3, name: "Daniel Kim", email: "daniel.kim@dev.io", initials: "DK", role: "Freelancer", status: "Active", joined: "Feb 2025" },
  { id: 4, name: "Nova Studio", email: "ops@novastudio.com", initials: "NS", role: "Client", status: "Active", joined: "Nov 2024" },
  { id: 5, name: "Mina Okafor", email: "mina@motion.works", initials: "MO", role: "Freelancer", status: "Active", joined: "Jun 2025" },
  { id: 6, name: "Leo Vance", email: "leo.vance@ai.dev", initials: "LV", role: "Freelancer", status: "Pending", joined: "Jul 2026" },
  { id: 7, name: "Arcade Supply", email: "hello@arcade.supply", initials: "AS", role: "Client", status: "Active", joined: "Apr 2026" },
  { id: 8, name: "R. Novak", email: "rnovak@proton.me", initials: "RN", role: "Freelancer", status: "Suspended", joined: "Jul 2026" },
];

export const ADMIN_DISPUTES = [
  { id: "D-241", project: "Landing page revamp", parties: "TechFlow ↔ J. Barnes", amount: "$1,200", age: "14h", status: "Evidence" },
  { id: "D-240", project: "Logo & brand package", parties: "Kova Coffee ↔ S. Lin", amount: "$450", age: "3h", status: "New" },
  { id: "D-238", project: "Mobile app security audit", parties: "FinPay ↔ D. Osei", amount: "$2,300", age: "39h", status: "Deciding" },
];

export const ADMIN_ESCROWS = [
  { project: "Checkout flow revamp", parties: "Nova Studio → Daniel Kim", amount: "$1,800", state: "Funded", since: "Jul 20" },
  { project: "Design system audit", parties: "Luminary → Ava Torres", amount: "$2,100", state: "Funded", since: "Jul 22" },
  { project: "AI chatbot integration", parties: "Helix Health → Leo Vance", amount: "$2,000", state: "Pending deposit", since: "Jul 23" },
  { project: "3D explainer video", parties: "Arcade → Mina Okafor", amount: "$2,800", state: "Release queued", since: "Jul 23" },
];

export const SENT = [
  {
    month: "July 2026",
    items: [
      { project: "Design system audit", to: "Ava Torres", kind: "Escrow deposit", date: "Jul 22", amount: "$2,100", status: "Funded" },
      { project: "Checkout flow revamp", to: "Daniel Kim", kind: "Milestone payment", date: "Jul 21", amount: "−$2,400", status: "Released" },
      { project: "Payout", to: "Visa •• 4821", kind: "Withdrawal", date: "Jul 08", amount: "−$5,000", status: "Processing" },
    ],
  },
  {
    month: "June 2026",
    items: [
      { project: "Landing page redesign", to: "Mina Okafor", kind: "Final payment", date: "Jun 30", amount: "−$1,800", status: "Released" },
      { project: "Landing page redesign", to: "Mina Okafor", kind: "Escrow deposit", date: "Jun 05", amount: "$1,800", status: "Funded" },
    ],
  },
];
