// Copyright (c) 2026 Skuld, LLC. All rights reserved.
// Proprietary and confidential. Reverse engineering prohibited.

/**
 * Design tokens for node categories: colors, icon names, display names, and order.
 *
 * Contract: maps from NodeCategory to presentational metadata used in the
 * node palette (Sidebar / UnifiedSidebar) and node rendering.
 *
 * NOTE: this was a missing module re-introduced in the TS tech debt fix
 * (see docs/STUDIO_TECH_DEBT.md). If a canonical source is re-introduced
 * elsewhere, re-point imports and delete this file.
 */

import type { NodeCategory } from "../types/flow";

export interface CategoryColors {
  bg: string;
  border: string;
  icon: string;
  text: string;
  accent: string;
}

export const categoryColors: Record<NodeCategory, CategoryColors> = {
  web: { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-600", text: "text-blue-700", accent: "bg-blue-500" },
  desktop: { bg: "bg-indigo-50", border: "border-indigo-200", icon: "text-indigo-600", text: "text-indigo-700", accent: "bg-indigo-500" },
  storage: { bg: "bg-cyan-50", border: "border-cyan-200", icon: "text-cyan-600", text: "text-cyan-700", accent: "bg-cyan-500" },
  files: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", text: "text-amber-700", accent: "bg-amber-500" },
  excel: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-600", text: "text-emerald-700", accent: "bg-emerald-500" },
  email: { bg: "bg-rose-50", border: "border-rose-200", icon: "text-rose-600", text: "text-rose-700", accent: "bg-rose-500" },
  api: { bg: "bg-purple-50", border: "border-purple-200", icon: "text-purple-600", text: "text-purple-700", accent: "bg-purple-500" },
  database: { bg: "bg-teal-50", border: "border-teal-200", icon: "text-teal-600", text: "text-teal-700", accent: "bg-teal-500" },
  document: { bg: "bg-orange-50", border: "border-orange-200", icon: "text-orange-600", text: "text-orange-700", accent: "bg-orange-500" },
  ai: { bg: "bg-fuchsia-50", border: "border-fuchsia-200", icon: "text-fuchsia-600", text: "text-fuchsia-700", accent: "bg-fuchsia-500" },
  vectordb: { bg: "bg-violet-50", border: "border-violet-200", icon: "text-violet-600", text: "text-violet-700", accent: "bg-violet-500" },
  code: { bg: "bg-slate-50", border: "border-slate-200", icon: "text-slate-600", text: "text-slate-700", accent: "bg-slate-500" },
  python: { bg: "bg-yellow-50", border: "border-yellow-200", icon: "text-yellow-600", text: "text-yellow-700", accent: "bg-yellow-500" },
  control: { bg: "bg-zinc-50", border: "border-zinc-200", icon: "text-zinc-600", text: "text-zinc-700", accent: "bg-zinc-500" },
  logging: { bg: "bg-stone-50", border: "border-stone-200", icon: "text-stone-600", text: "text-stone-700", accent: "bg-stone-500" },
  security: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-600", text: "text-red-700", accent: "bg-red-500" },
  human: { bg: "bg-pink-50", border: "border-pink-200", icon: "text-pink-600", text: "text-pink-700", accent: "bg-pink-500" },
  compliance: { bg: "bg-green-50", border: "border-green-200", icon: "text-green-600", text: "text-green-700", accent: "bg-green-500" },
  dataquality: { bg: "bg-sky-50", border: "border-sky-200", icon: "text-sky-600", text: "text-sky-700", accent: "bg-sky-500" },
  data: { bg: "bg-lime-50", border: "border-lime-200", icon: "text-lime-600", text: "text-lime-700", accent: "bg-lime-500" },
  bot: { bg: "bg-neutral-50", border: "border-neutral-200", icon: "text-neutral-600", text: "text-neutral-700", accent: "bg-neutral-500" },
  voice: { bg: "bg-cyan-50", border: "border-cyan-200", icon: "text-cyan-600", text: "text-cyan-700", accent: "bg-cyan-500" },
  insurance: { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-600", text: "text-blue-700", accent: "bg-blue-500" },
  trigger: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", text: "text-amber-700", accent: "bg-amber-500" },
  ms365: { bg: "bg-sky-50", border: "border-sky-200", icon: "text-sky-600", text: "text-sky-700", accent: "bg-sky-500" },
};

export const categoryIcons: Record<NodeCategory, string> = {
  web: "Globe",
  desktop: "Monitor",
  storage: "HardDrive",
  files: "FolderOpen",
  excel: "FileSpreadsheet",
  email: "Mail",
  api: "Plug",
  database: "Database",
  document: "FileText",
  ai: "Brain",
  vectordb: "Boxes",
  code: "Code2",
  python: "FileCode2",
  control: "GitBranch",
  logging: "ListOrdered",
  security: "ShieldCheck",
  human: "User",
  compliance: "FileLock",
  dataquality: "CheckCircle2",
  data: "Shuffle",
  bot: "Bot",
  voice: "Phone",
  insurance: "Umbrella",
  trigger: "Zap",
  ms365: "Mail",
};

export const categoryNames: Record<NodeCategory, string> = {
  web: "Web Automation",
  desktop: "Desktop Automation",
  storage: "Storage Providers",
  files: "Files & Folders",
  excel: "Excel / CSV / Data",
  email: "Email",
  api: "API & Integration",
  database: "Database",
  document: "PDF / OCR / Documents",
  ai: "AI / Intelligent",
  vectordb: "Vector Database",
  code: "Custom Code",
  python: "Python",
  control: "Control Flow",
  logging: "Logging",
  security: "Security & Secrets",
  human: "Human-in-the-loop",
  compliance: "Compliance & Privacy",
  dataquality: "Data Quality",
  data: "Data Integration",
  bot: "Bot Subprocess",
  voice: "Voice & Telephony",
  insurance: "Insurance",
  trigger: "Scheduling & Triggers",
  ms365: "Microsoft 365",
};

export const categoryOrder: NodeCategory[] = [
  "trigger",
  "bot",
  "web",
  "desktop",
  "storage",
  "files",
  "excel",
  "email",
  "ms365",
  "api",
  "database",
  "data",
  "document",
  "ai",
  "vectordb",
  "dataquality",
  "compliance",
  "security",
  "human",
  "control",
  "code",
  "python",
  "logging",
  "voice",
  "insurance",
];
