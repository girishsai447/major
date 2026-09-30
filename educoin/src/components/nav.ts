import type { FeatureKey } from "@/config/features";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Feature gate; undefined = always visible. */
  feature?: FeatureKey;
  group: "Overview" | "Blockchain" | "EduCoin" | "Governance" | "Insight" | "System";
}

export const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: "🏠", group: "Overview" },
  { href: "/roadmap", label: "Project Roadmap", icon: "🗺️", group: "Overview" },

  { href: "/explorer", label: "Block Explorer", icon: "🔗", feature: "blockchain.explorer", group: "Blockchain" },

  { href: "/wallets", label: "Participants", icon: "👥", feature: "wallets", group: "EduCoin" },
  { href: "/treasury", label: "Reserve & Peg", icon: "🏦", feature: "reserve", group: "EduCoin" },
  { href: "/mint", label: "Issue Scholarship", icon: "🪙", feature: "minting", group: "EduCoin" },
  { href: "/transfer", label: "Spend EduCoin", icon: "💸", feature: "transfers", group: "EduCoin" },

  { href: "/contract", label: "Smart Contract", icon: "📜", feature: "smartContract", group: "Governance" },
  { href: "/audit", label: "Audit Trail", icon: "🛡️", feature: "auditTrail", group: "Governance" },
  { href: "/settlements", label: "Settlements", icon: "🔁", feature: "settlement", group: "Governance" },

  { href: "/trace", label: "Fund Tracing", icon: "🧭", feature: "traceability", group: "Insight" },
  { href: "/dashboard", label: "Analytics", icon: "📊", feature: "dashboards", group: "Insight" },

  { href: "/admin", label: "Admin Console", icon: "⚙️", feature: "adminConsole", group: "System" },
  { href: "/reports", label: "Reports", icon: "📄", feature: "reports", group: "System" },
  { href: "/whitepaper", label: "Whitepaper", icon: "📘", feature: "whitepaper", group: "System" },
  { href: "/about", label: "About", icon: "ℹ️", group: "System" },
];

export const NAV_GROUP_ORDER: NavItem["group"][] = [
  "Overview",
  "Blockchain",
  "EduCoin",
  "Governance",
  "Insight",
  "System",
];
