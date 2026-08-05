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
  "Writing & Content", "Marketing & Growth",
];

export const CL_BUDGETS = ["< $1k", "$1k – $5k", "$5k – $20k", "$20k+"];

