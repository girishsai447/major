const pptxgen = require("pptxgenjs");
const path = require("path");

const A = (f) => path.join(__dirname, "assets", f);

const NAVY = "142857";
const NAVY2 = "1B3568";
const ICE = "EEF4FC";
const WHITE = "FFFFFF";
const GOLD = "F2A900";
const EMERALD = "10B981";
const RED = "E11D48";
const MUTED = "5B6B85";
const BORDER = "E3E9F2";

const TITLE_FONT = "Cambria";
const BODY_FONT = "Calibri";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
const PW = 13.333, PH = 7.5;

function iconCircle(slide, { x, y, d = 0.6, bg, icon, pad = 0.16, transparency }) {
  const fill = transparency !== undefined ? { color: bg, transparency } : { color: bg };
  slide.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill, line: { type: "none" } });
  if (icon) {
    slide.addImage({ path: A(icon), x: x + pad, y: y + pad, w: d - 2 * pad, h: d - 2 * pad });
  }
}

function brandMark(slide) {
  iconCircle(slide, { x: 12.3, y: 0.5, d: 0.5, bg: NAVY, icon: "coin_white.png", pad: 0.12 });
}

function pageHeader(slide, kicker, title) {
  slide.addText(kicker.toUpperCase(), {
    x: 0.7, y: 0.42, w: 8, h: 0.3, fontFace: BODY_FONT, fontSize: 12, bold: true,
    color: GOLD, charSpacing: 2,
  });
  slide.addText(title, {
    x: 0.7, y: 0.68, w: 10.8, h: 0.7, fontFace: TITLE_FONT, fontSize: 32, bold: true, color: NAVY,
  });
  brandMark(slide);
}

function footer(slide, num) {
  slide.addText("EDUCOIN  ·  TEAM 6  ·  DEPT. OF CSE", {
    x: 0.7, y: 7.16, w: 6, h: 0.28, fontFace: BODY_FONT, fontSize: 9, color: "9AA7BD", charSpacing: 1,
  });
  slide.addText(String(num).padStart(2, "0"), {
    x: 12.4, y: 7.16, w: 0.5, h: 0.28, fontFace: BODY_FONT, fontSize: 9, color: "9AA7BD", align: "right",
  });
}

function lightSlide() {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  return s;
}

// ---------------------------------------------------------------- Slide 1
{
  const s = pres.addSlide();
  s.background = { color: NAVY };

  iconCircle(s, { x: 0.7, y: 0.55, d: 0.72, bg: GOLD, icon: "coin_white.png", pad: 0.16 });
  s.addText("B.TECH MAJOR PROJECT  ·  DEPT. OF CSE  ·  2026–2027", {
    x: 1.6, y: 0.62, w: 8, h: 0.5, fontFace: BODY_FONT, fontSize: 13, bold: true, color: GOLD, charSpacing: 2,
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 10.9, y: 0.55, w: 1.75, h: 0.42, rectRadius: 0.08,
    fill: { color: NAVY2 }, line: { color: GOLD, width: 1 },
  });
  s.addText("BLOCKCHAIN", {
    x: 10.9, y: 0.55, w: 1.75, h: 0.42, align: "center", valign: "middle",
    fontFace: BODY_FONT, fontSize: 11, bold: true, color: GOLD, charSpacing: 1.5,
  });

  s.addText("EduCoin", {
    x: 0.68, y: 1.95, w: 12, h: 1.15, fontFace: TITLE_FONT, fontSize: 60, bold: true, color: WHITE,
  });
  s.addText("Design and Implementation of a Stable Cryptocurrency for a Sector-Specific Requirement", {
    x: 0.7, y: 3.05, w: 10.8, h: 0.8, fontFace: BODY_FONT, fontSize: 19, color: "CADCFC",
  });

  s.addShape(pres.ShapeType.line, { x: 0.7, y: 4.05, w: 11.9, h: 0, line: { color: "2B4479", width: 1 } });

  iconCircle(s, { x: 0.7, y: 4.35, d: 0.5, bg: NAVY2, icon: "cap_white.png", pad: 0.12 });
  s.addText([
    { text: "Guide:  ", options: { bold: true, color: GOLD } },
    { text: "Dr. Deepak Sukheja — Associate Professor, Dept. of Computer Science & Engineering", options: { color: WHITE } },
  ], { x: 1.35, y: 4.35, w: 11, h: 0.5, valign: "middle", fontFace: BODY_FONT, fontSize: 14 });

  s.addText("TEAM 6 — PRESENTED BY", {
    x: 0.7, y: 5.05, w: 6, h: 0.3, fontFace: BODY_FONT, fontSize: 12, bold: true, color: GOLD, charSpacing: 2,
  });

  const students = [
    ["Girish Sai Tipirneni", "23071A05P4"],
    ["Ravva Sai Sanjeeth", "23071A05T9"],
    ["Siddhartha Brahmanapally", "23071A05U3"],
    ["Venuturla Jeevan M. Reddy", "23071A05U9"],
  ];
  const cw = 2.85, gap = 0.15, sx = 0.7, sy = 5.42, ch = 0.85;
  students.forEach(([name, roll], i) => {
    const x = sx + i * (cw + gap);
    s.addShape(pres.ShapeType.roundRect, {
      x, y: sy, w: cw, h: ch, rectRadius: 0.08, fill: { color: NAVY2 }, line: { type: "none" },
    });
    s.addText(name, {
      x: x + 0.15, y: sy + 0.1, w: cw - 0.3, h: 0.42, fontFace: BODY_FONT, fontSize: 12.5, bold: true, color: WHITE,
    });
    s.addText(roll, {
      x: x + 0.15, y: sy + 0.5, w: cw - 0.3, h: 0.3, fontFace: BODY_FONT, fontSize: 11, color: GOLD,
    });
  });

  // decorative chain-of-blocks motif, bottom right, low emphasis
  const bY = 6.55, bS = 0.42;
  [10.15, 10.95, 11.75].forEach((bx, i) => {
    s.addShape(pres.ShapeType.roundRect, {
      x: bx, y: bY, w: bS, h: bS, rectRadius: 0.06,
      fill: { type: "none" }, line: { color: "3A5488", width: 1.25 },
    });
    if (i < 2) {
      s.addShape(pres.ShapeType.line, {
        x: bx + bS, y: bY + bS / 2, w: 0.38, h: 0, line: { color: "3A5488", width: 1.25 },
      });
    }
  });
}

// ---------------------------------------------------------------- Slide 2 — Agenda
{
  const s = lightSlide();
  pageHeader(s, "Presentation Overview", "Agenda");

  const items = [
    "Introduction",
    "Existing System & Its Problems",
    "Proposed System — EduCoin",
    "Problem Statement & Objectives",
    "Methodology — System Architecture",
    "Methodology — Core Modules",
    "System Requirements",
    "Work Plan & Team Distribution",
    "References",
  ];
  const colW = 5.75, rowH = 0.66, startY = 1.85;
  const cols = [0.7, 6.85];
  items.forEach((label, i) => {
    const col = i < 5 ? 0 : 1;
    const row = i < 5 ? i : i - 5;
    const x = cols[col], y = startY + row * rowH;
    iconCircle(s, { x, y, d: 0.46, bg: col === 0 ? NAVY : GOLD, pad: 0.14 });
    s.addText(String(i + 1), {
      x, y, w: 0.46, h: 0.46, align: "center", valign: "middle",
      fontFace: BODY_FONT, fontSize: 15, bold: true, color: WHITE,
    });
    s.addText(label, {
      x: x + 0.62, y, w: colW - 0.62, h: 0.46, valign: "middle",
      fontFace: BODY_FONT, fontSize: 15, color: NAVY,
    });
  });

  footer(s, 2);
}

// ---------------------------------------------------------------- Slide 3 — Introduction
{
  const s = lightSlide();
  pageHeader(s, "01 — Overview", "Introduction");

  const bullets = [
    "Government scholarships fund tuition, examination, and hostel fees for millions of students every year.",
    "Once credited to a bank account, this money becomes ordinary currency — free to withdraw, transfer, or spend on anything.",
    "Blockchain offers a decentralized, tamper-evident ledger — the same foundation behind Bitcoin and Ethereum.",
    "EduCoin applies this technology to create a purpose-bound digital currency exclusively for education.",
  ];
  s.addText(
    bullets.map((t, i) => ({ text: t, options: { bullet: { code: "25B8", indent: 18 }, color: NAVY, breakLine: true, paraSpaceAfter: 16 } })),
    { x: 0.7, y: 1.95, w: 6.15, h: 4.6, fontFace: BODY_FONT, fontSize: 15.5, valign: "top", lineSpacingMultiple: 1.15 }
  );

  const cards = [
    ["link_white.png", NAVY, "Blockchain", "A distributed, tamper-evident ledger of every transaction"],
    ["contract_white.png", GOLD, "Smart Contract", "Self-enforcing code that defines exactly how funds may be spent"],
    ["coin_white.png", EMERALD, "Stable Digital Currency", "EduCoin — pegged 1:1 to the rupee and fully reserve-backed"],
  ];
  const cx = 7.15, cw = 5.5, ch = 1.28, gap = 0.22;
  cards.forEach(([icon, bg, title, desc], i) => {
    const y = 1.95 + i * (ch + gap);
    s.addShape(pres.ShapeType.roundRect, { x: cx, y, w: cw, h: ch, rectRadius: 0.09, fill: { color: ICE }, line: { type: "none" } });
    iconCircle(s, { x: cx + 0.25, y: y + (ch - 0.62) / 2, d: 0.62, bg, icon, pad: 0.15 });
    s.addText(title, { x: cx + 1.05, y: y + 0.16, w: cw - 1.25, h: 0.4, fontFace: BODY_FONT, fontSize: 15, bold: true, color: NAVY });
    s.addText(desc, { x: cx + 1.05, y: y + 0.58, w: cw - 1.25, h: 0.6, fontFace: BODY_FONT, fontSize: 11.5, color: MUTED, lineSpacingMultiple: 1.1 });
  });

  footer(s, 3);
}

// ---------------------------------------------------------------- Slide 4 — Existing System & Problems
{
  const s = lightSlide();
  pageHeader(s, "02 — Current State", "Existing System & Its Problems");

  // flow diagram left
  const fx = 0.7, fw = 5.3;
  const box = (y, h, label, bg, tColor, fs = 13) => {
    s.addShape(pres.ShapeType.roundRect, { x: fx, y, w: fw, h, rectRadius: 0.08, fill: { color: bg }, line: { type: "none" } });
    s.addText(label, { x: fx + 0.2, y, w: fw - 0.4, h, align: "center", valign: "middle", fontFace: BODY_FONT, fontSize: fs, bold: true, color: tColor });
  };
  box(1.95, 0.72, "Government Scholarship Funds", NAVY, WHITE);
  s.addImage({ path: A("arrowdown_navy.png"), x: fx + fw / 2 - 0.15, y: 2.72, w: 0.3, h: 0.3 });
  box(3.08, 0.72, "Regular Student Bank Account", ICE, NAVY);
  s.addImage({ path: A("arrowdown_navy.png"), x: fx + fw / 2 - 0.15, y: 3.85, w: 0.3, h: 0.3 });

  const half = (fw - 0.25) / 2;
  s.addShape(pres.ShapeType.roundRect, { x: fx, y: 4.2, w: half, h: 0.95, rectRadius: 0.08, fill: { color: "E7F8F1" }, line: { type: "none" } });
  s.addText("Education\n(sometimes)", { x: fx + 0.1, y: 4.28, w: half - 0.2, h: 0.8, align: "center", valign: "middle", fontFace: BODY_FONT, fontSize: 11.5, color: "0E7C55" });
  s.addShape(pres.ShapeType.roundRect, { x: fx + half + 0.25, y: 4.2, w: half, h: 0.95, rectRadius: 0.08, fill: { color: "FCE7EC" }, line: { type: "none" } });
  s.addText("Withdrawn / Non-\neducational spend", { x: fx + half + 0.35, y: 4.28, w: half - 0.2, h: 0.8, align: "center", valign: "middle", fontFace: BODY_FONT, fontSize: 11.5, bold: true, color: RED });

  s.addText("No control exists once funds reach a regular bank account.", {
    x: fx, y: 5.35, w: fw, h: 0.5, italic: true, fontFace: BODY_FONT, fontSize: 12, color: MUTED,
  });

  // problems right
  const problems = [
    "No usage restriction — funds can be freely withdrawn or transferred",
    "High risk of diversion to non-educational expenses",
    "No transparent trail from issuance to utilization",
    "Manual auditing is slow, costly, and error-prone",
    "No real-time visibility for the government or institutions",
  ];
  const px = 6.5, pw = 6.15, rowH = 0.92;
  problems.forEach((t, i) => {
    const y = 1.95 + i * rowH;
    iconCircle(s, { x: px, y, d: 0.5, bg: RED, icon: "warn_white.png", pad: 0.13 });
    s.addText(t, { x: px + 0.68, y: y - 0.02, w: pw - 0.68, h: 0.75, valign: "middle", fontFace: BODY_FONT, fontSize: 13.5, color: NAVY, lineSpacingMultiple: 1.1 });
  });

  footer(s, 4);
}

// ---------------------------------------------------------------- Slide 5 — Proposed System
{
  const s = lightSlide();
  pageHeader(s, "03 — Our Solution", "Proposed System — EduCoin");

  const steps = [
    ["bank_white.png", NAVY, "Government", "Treasury"],
    ["link_white.png", GOLD, "EduCoin", "Blockchain Ledger"],
    ["cap_white.png", EMERALD, "Student", "Wallet"],
    ["shield_white.png", NAVY2, "Smart Contract", "Policy Gate"],
  ];
  const n = steps.length, bw = 2.6, gap = 0.32, totalW = n * bw + (n - 1) * gap;
  const startX = (PW - totalW) / 2, by = 2.0, bh = 1.5;
  steps.forEach(([icon, bg, t1, t2], i) => {
    const x = startX + i * (bw + gap);
    s.addShape(pres.ShapeType.roundRect, { x, y: by, w: bw, h: bh, rectRadius: 0.1, fill: { color: ICE }, line: { type: "none" } });
    iconCircle(s, { x: x + bw / 2 - 0.32, y: by + 0.18, d: 0.64, bg, icon, pad: 0.15 });
    s.addText(t1, { x: x + 0.1, y: by + 0.92, w: bw - 0.2, h: 0.3, align: "center", fontFace: BODY_FONT, fontSize: 13.5, bold: true, color: NAVY });
    s.addText(t2, { x: x + 0.1, y: by + 1.2, w: bw - 0.2, h: 0.26, align: "center", fontFace: BODY_FONT, fontSize: 10.5, color: MUTED });
    if (i < n - 1) {
      s.addImage({ path: A("arrowright_navy.png"), x: x + bw + gap / 2 - 0.13, y: by + bh / 2 - 0.13, w: 0.26, h: 0.26 });
    }
  });

  // branch outcomes below the smart-contract box
  const gateX = startX + 3 * (bw + gap) + bw / 2;
  const outY = 4.15, outW = 4.1, outH = 0.95;
  const approvedX = gateX - outW - 0.5, rejectedX = gateX + 0.5;
  s.addShape(pres.ShapeType.line, { x: gateX, y: by + bh, w: approvedX + outW / 2 - gateX, h: outY - (by + bh), line: { color: "9AA7BD", width: 1.25, dashType: "dash" } });
  s.addShape(pres.ShapeType.line, { x: gateX, y: by + bh, w: rejectedX + outW / 2 - gateX, h: outY - (by + bh), line: { color: "9AA7BD", width: 1.25, dashType: "dash" } });

  s.addShape(pres.ShapeType.roundRect, { x: approvedX, y: outY, w: outW, h: outH, rectRadius: 0.09, fill: { color: "E7F8F1" }, line: { type: "none" } });
  s.addText("✔  Institution / Vendor\nApproved category (tuition, exam, hostel, books)", {
    x: approvedX + 0.2, y: outY, w: outW - 0.4, h: outH, valign: "middle", align: "center",
    fontFace: BODY_FONT, fontSize: 12, bold: true, color: "0E7C55", lineSpacingMultiple: 1.1,
  });
  s.addShape(pres.ShapeType.roundRect, { x: rejectedX, y: outY, w: outW, h: outH, rectRadius: 0.09, fill: { color: "FCE7EC" }, line: { type: "none" } });
  s.addText("✘  Unauthorized Recipient\nNon-educational spend — rejected", {
    x: rejectedX + 0.2, y: outY, w: outW - 0.4, h: outH, valign: "middle", align: "center",
    fontFace: BODY_FONT, fontSize: 12, bold: true, color: RED, lineSpacingMultiple: 1.1,
  });

  const chips = ["Transparent", "Tamper-proof", "Purpose-bound", "Traceable"];
  const chW = 2.75, chGap = 0.25, chTotal = chips.length * chW + (chips.length - 1) * chGap;
  const chX = (PW - chTotal) / 2, chY = 5.55;
  chips.forEach((c, i) => {
    const x = chX + i * (chW + chGap);
    s.addShape(pres.ShapeType.roundRect, { x, y: chY, w: chW, h: 0.55, rectRadius: 0.28, fill: { color: NAVY }, line: { type: "none" } });
    s.addText([{ text: "✓  ", options: { color: GOLD, bold: true } }, { text: c, options: { color: WHITE, bold: true } }], {
      x, y: chY, w: chW, h: 0.55, align: "center", valign: "middle", fontFace: BODY_FONT, fontSize: 12.5,
    });
  });

  footer(s, 5);
}

// ---------------------------------------------------------------- Slide 6 — Problem Statement & Objectives
{
  const s = lightSlide();
  pageHeader(s, "04 — Foundation", "Problem Statement & Objectives");

  s.addShape(pres.ShapeType.roundRect, { x: 0.7, y: 1.8, w: 11.9, h: 1.75, rectRadius: 0.1, fill: { color: ICE }, line: { type: "none" } });
  s.addImage({ path: A("quote_navy.png"), x: 0.95, y: 1.98, w: 0.4, h: 0.4 });
  s.addText(
    "Government scholarship funds, once transferred to a student's bank account, become ordinary currency — free to be withdrawn, transferred, or spent on non-educational activities. EduCoin restricts scholarship funds strictly to authorized educational purposes such as tuition, examination, and hostel fees.",
    { x: 1.5, y: 1.95, w: 10.7, h: 1.5, italic: true, fontFace: BODY_FONT, fontSize: 15, color: NAVY, valign: "middle", lineSpacingMultiple: 1.25 }
  );

  const objs = [
    ["01", "Mine the Educational Currency", "Develop EduCurrency using blockchain technology, where educational coins are generated and recorded securely — a transparent, verifiable mechanism for creating and managing the currency."],
    ["02", "Define Boundaries via Smart Contract", "Write a smart contract that defines and enforces how EduCurrency can be transferred and used — restricting transactions to authorized participants and approved educational purposes."],
  ];
  const ow = 5.75, ox = [0.7, 6.85], oy = 3.85, oh = 2.75;
  objs.forEach(([num, title, desc], i) => {
    const x = ox[i];
    s.addShape(pres.ShapeType.roundRect, { x, y: oy, w: ow, h: oh, rectRadius: 0.1, fill: { color: WHITE }, line: { color: BORDER, width: 1 } });
    s.addText(num, { x: x + 0.3, y: oy + 0.18, w: 1.5, h: 0.9, fontFace: TITLE_FONT, fontSize: 40, bold: true, color: GOLD });
    s.addText(title, { x: x + 0.3, y: oy + 1.0, w: ow - 0.6, h: 0.55, fontFace: BODY_FONT, fontSize: 16, bold: true, color: NAVY });
    s.addText(desc, { x: x + 0.3, y: oy + 1.55, w: ow - 0.6, h: 1.1, fontFace: BODY_FONT, fontSize: 12, color: MUTED, lineSpacingMultiple: 1.15 });
  });

  footer(s, 6);
}

// ---------------------------------------------------------------- Slide 7 — Architecture
{
  const s = lightSlide();
  pageHeader(s, "05 — Methodology", "System Architecture");

  const layers = [
    ["users_white.png", NAVY, "Participants", "Government · Institution · Student · Vendor"],
    ["laptop_white.png", NAVY2, "Application Layer", "Next.js UI + REST API Routes"],
    ["contract_white.png", GOLD, "Smart Contract Policy Engine", "10-rule enforcement engine (R1–R10)"],
    ["cubes_white.png", EMERALD, "Blockchain Core", "Blocks · SHA-256 · Proof-of-Work · Merkle Tree"],
    ["database_white.png", MUTED, "Persistence Layer", "Tamper-evident ledger storage"],
  ];
  const lx = 2.3, lw = 8.7, lh = 0.82, gap = 0.16, startY = 1.72;
  layers.forEach(([icon, bg, title, sub], i) => {
    const y = startY + i * (lh + gap);
    s.addShape(pres.ShapeType.roundRect, { x: lx, y, w: lw, h: lh, rectRadius: 0.09, fill: { color: bg }, line: { type: "none" } });
    iconCircle(s, { x: lx + 0.18, y: y + (lh - 0.5) / 2, d: 0.5, bg: "FFFFFF", transparency: 75, icon, pad: 0.11 });
    s.addText(title, { x: lx + 0.9, y: y + 0.1, w: lw - 1.1, h: 0.36, fontFace: BODY_FONT, fontSize: 15, bold: true, color: WHITE });
    s.addText(sub, { x: lx + 0.9, y: y + 0.44, w: lw - 1.1, h: 0.32, fontFace: BODY_FONT, fontSize: 11, color: "DCE6F5" });
    if (i < layers.length - 1) {
      s.addImage({ path: A("arrowdown_navy.png"), x: lx - 0.55, y: y + lh + gap / 2 - 0.11, w: 0.22, h: 0.22 });
    }
  });
  s.addText("Requests flow\ndown through\neach layer", {
    x: 0.55, y: startY + 0.3, w: 1.55, h: 1.0, align: "center", fontFace: BODY_FONT, fontSize: 10.5, italic: true, color: MUTED, lineSpacingMultiple: 1.1,
  });
  s.addText("Confirmations &\nbalances flow\nback up", {
    x: 11.2, y: startY + (5 * (lh + gap)) - 2.0, w: 1.55, h: 1.0, align: "center", fontFace: BODY_FONT, fontSize: 10.5, italic: true, color: MUTED, lineSpacingMultiple: 1.1,
  });

  footer(s, 7);
}

// ---------------------------------------------------------------- Slide 8 — Modules
{
  const s = lightSlide();
  pageHeader(s, "06 — Methodology", "Core Modules");

  const mods = [
    ["cubes_white.png", NAVY, "Blockchain Core", "Block structure, SHA-256 hashing, proof-of-work mining, Merkle-tree verification"],
    ["wallet_white.png", GOLD, "Wallet & Issuance", "Ed25519 key pairs, Government minting, reserve-backed 1:1 rupee peg"],
    ["contract_white.png", EMERALD, "Smart Contract Policy", "10-rule engine: authorized participants, approved categories, spending caps, expiry"],
    ["route_white.png", NAVY2, "Traceability & Settlement", "Issuance-to-utilization tracing, redemption to INR, clawback of lapsed funds"],
    ["chart_white.png", MUTED, "Application & Reporting", "Role dashboards, analytics, audit trail, admin console"],
  ];
  const mx = 0.7, mw = 11.9, mh = 0.92, gap = 0.16, startY = 1.72;
  mods.forEach(([icon, bg, title, desc], i) => {
    const y = startY + i * (mh + gap);
    s.addShape(pres.ShapeType.roundRect, { x: mx, y, w: mw, h: mh, rectRadius: 0.09, fill: { color: i % 2 === 0 ? ICE : WHITE }, line: { color: BORDER, width: i % 2 === 0 ? 0 : 1 } });
    iconCircle(s, { x: mx + 0.18, y: y + (mh - 0.6) / 2, d: 0.6, bg, icon, pad: 0.15 });
    s.addText(`Module ${i + 1} — ${title}`, { x: mx + 1.0, y: y + 0.13, w: mw - 1.3, h: 0.36, fontFace: BODY_FONT, fontSize: 14.5, bold: true, color: NAVY });
    s.addText(desc, { x: mx + 1.0, y: y + 0.48, w: mw - 1.3, h: 0.36, fontFace: BODY_FONT, fontSize: 11.5, color: MUTED });
  });

  footer(s, 8);
}

// ---------------------------------------------------------------- Slide 9 — System Requirements
{
  const s = lightSlide();
  pageHeader(s, "07 — Planning", "System Requirements");

  const col = (x, icon, bg, title, items) => {
    const w = 5.7, y0 = 1.85, h = 4.9;
    s.addShape(pres.ShapeType.roundRect, { x, y: y0, w, h, rectRadius: 0.1, fill: { color: ICE }, line: { type: "none" } });
    iconCircle(s, { x: x + 0.3, y: y0 + 0.3, d: 0.6, bg, icon, pad: 0.15 });
    s.addText(title, { x: x + 1.05, y: y0 + 0.3, w: w - 1.3, h: 0.6, valign: "middle", fontFace: BODY_FONT, fontSize: 17, bold: true, color: NAVY });
    s.addText(
      items.map((t) => ({ text: t, options: { bullet: { code: "25B8", indent: 16 }, color: NAVY, breakLine: true, paraSpaceAfter: 14 } })),
      { x: x + 0.4, y: y0 + 1.2, w: w - 0.8, h: h - 1.5, fontFace: BODY_FONT, fontSize: 13.5, valign: "top", lineSpacingMultiple: 1.15 }
    );
  };

  col(0.7, "server_white.png", NAVY, "Hardware Requirements", [
    "Processor: Intel Core i5 or equivalent (i7 recommended)",
    "RAM: 8 GB minimum, 16 GB recommended",
    "Storage: 500 MB free disk space",
    "Display: 1366 × 768 resolution or higher",
    "Stable internet connection (for deployment & demo)",
  ]);
  col(6.9, "laptop_white.png", GOLD, "Software Requirements", [
    "Framework: Next.js 15 (React 19, App Router)",
    "Language: TypeScript",
    "Styling: Tailwind CSS",
    "Cryptography: Node.js crypto — SHA-256, Ed25519",
    "Runtime: Node.js 18+   ·   OS: Windows / macOS / Linux",
    "Version Control: Git & GitHub",
  ]);

  footer(s, 9);
}

// ---------------------------------------------------------------- Slide 10 — Work Plan & Distribution
{
  const s = lightSlide();
  pageHeader(s, "08 — Planning", "Work Plan & Team Distribution");

  const stages = [
    ["M1", "Blockchain\nFoundation"],
    ["M2", "Issuance &\nWallets"],
    ["M3", "Smart Contract\nRestrictions"],
    ["M4", "Traceability &\nDashboards"],
    ["M5", "Complete\nApplication"],
  ];
  const tlY = 2.15, tlX0 = 1.3, tlX1 = 12.0;
  s.addShape(pres.ShapeType.line, { x: tlX0, y: tlY, w: tlX1 - tlX0, h: 0, line: { color: BORDER, width: 2 } });
  const step = (tlX1 - tlX0) / (stages.length - 1);
  stages.forEach(([tag, label], i) => {
    const cx = tlX0 + i * step;
    s.addShape(pres.ShapeType.ellipse, { x: cx - 0.24, y: tlY - 0.24, w: 0.48, h: 0.48, fill: { color: i === 0 ? GOLD : NAVY }, line: { color: WHITE, width: 2 } });
    s.addText(tag, { x: cx - 0.24, y: tlY - 0.24, w: 0.48, h: 0.48, align: "center", valign: "middle", fontFace: BODY_FONT, fontSize: 10, bold: true, color: WHITE });
    s.addText(label, { x: cx - 0.75, y: tlY + 0.35, w: 1.5, h: 0.6, align: "center", fontFace: BODY_FONT, fontSize: 10.5, bold: true, color: NAVY, lineSpacingMultiple: 1.05 });
  });
  s.addText("One milestone reviewed per month — each stage is fully demonstrable on its own.", {
    x: 0.7, y: 3.15, w: 11.9, h: 0.35, align: "center", italic: true, fontFace: BODY_FONT, fontSize: 11.5, color: MUTED,
  });

  const team = [
    ["G", "Girish Sai Tipirneni", "23071A05P4", "Blockchain Core & Explorer", "Stage 1"],
    ["R", "Ravva Sai Sanjeeth", "23071A05T9", "Smart Contract & Policy Engine", "Stage 3"],
    ["S", "Siddhartha Brahmanapally", "23071A05U3", "Traceability, Settlement & Analytics", "Stage 4"],
    ["V", "Venuturla Jeevan M. Reddy", "23071A05U9", "Application UI, Admin Console & Reports", "Stage 2 & 5"],
  ];
  const cw = 2.85, gap = 0.15, sx = 0.7, sy = 3.85, ch = 2.7;
  team.forEach(([init, name, roll, focus, stage], i) => {
    const x = sx + i * (cw + gap);
    s.addShape(pres.ShapeType.roundRect, { x, y: sy, w: cw, h: ch, rectRadius: 0.1, fill: { color: ICE }, line: { type: "none" } });
    iconCircle(s, { x: x + (cw - 0.6) / 2, y: sy + 0.22, d: 0.6, bg: NAVY, pad: 100 });
    s.addText(init, { x: x + (cw - 0.6) / 2, y: sy + 0.22, w: 0.6, h: 0.6, align: "center", valign: "middle", fontFace: TITLE_FONT, fontSize: 20, bold: true, color: GOLD });
    s.addText(name, { x: x + 0.15, y: sy + 0.95, w: cw - 0.3, h: 0.55, align: "center", fontFace: BODY_FONT, fontSize: 12.5, bold: true, color: NAVY, lineSpacingMultiple: 1.05 });
    s.addText(roll, { x: x + 0.15, y: sy + 1.42, w: cw - 0.3, h: 0.25, align: "center", fontFace: BODY_FONT, fontSize: 10, color: MUTED });
    s.addText(focus, { x: x + 0.15, y: sy + 1.72, w: cw - 0.3, h: 0.65, align: "center", fontFace: BODY_FONT, fontSize: 10.5, color: NAVY, lineSpacingMultiple: 1.1 });
    s.addShape(pres.ShapeType.roundRect, { x: x + cw / 2 - 0.55, y: sy + ch - 0.42, w: 1.1, h: 0.3, rectRadius: 0.15, fill: { color: GOLD }, line: { type: "none" } });
    s.addText(stage, { x: x + cw / 2 - 0.55, y: sy + ch - 0.42, w: 1.1, h: 0.3, align: "center", valign: "middle", fontFace: BODY_FONT, fontSize: 9.5, bold: true, color: NAVY });
  });

  footer(s, 10);
}

// ---------------------------------------------------------------- Slide 11 — References
{
  const s = lightSlide();
  pageHeader(s, "09 — Sources", "References");

  const refs = [
    'S. Nakamoto, "Bitcoin: A Peer-to-Peer Electronic Cash System," 2008.',
    'V. Buterin, "Ethereum: A Next-Generation Smart Contract and Decentralized Application Platform," Ethereum Whitepaper, 2014.',
    'National Institute of Standards and Technology, "Blockchain Technology Overview," NISTIR 8202, 2018.',
    "Next.js Documentation, Vercel Inc. — nextjs.org/docs",
    "Node.js Crypto Module Documentation, OpenJS Foundation — nodejs.org/api/crypto.html",
    'Department of CSE, "Design and Implementation of a Stable Cryptocurrency for Sector-Specific Requirement," Project Abstract, Team 6, 2026.',
  ];
  const rx = 0.7, rw = 11.9, rowH = 0.78, startY = 1.9;
  refs.forEach((t, i) => {
    const y = startY + i * rowH;
    s.addShape(pres.ShapeType.roundRect, { x: rx, y: y + 0.02, w: 0.42, h: 0.42, rectRadius: 0.08, fill: { color: i % 2 === 0 ? NAVY : GOLD }, line: { type: "none" } });
    s.addText(String(i + 1), { x: rx, y: y + 0.02, w: 0.42, h: 0.42, align: "center", valign: "middle", fontFace: BODY_FONT, fontSize: 13, bold: true, color: WHITE });
    s.addText(t, { x: rx + 0.62, y, w: rw - 0.62, h: 0.68, valign: "middle", fontFace: BODY_FONT, fontSize: 12.5, color: NAVY, lineSpacingMultiple: 1.1 });
  });

  footer(s, 11);
}

// ---------------------------------------------------------------- Slide 12 — Thank You
{
  const s = pres.addSlide();
  s.background = { color: NAVY };

  iconCircle(s, { x: PW / 2 - 0.4, y: 1.5, d: 0.8, bg: GOLD, icon: "coin_white.png", pad: 0.18 });
  s.addText("Thank You", { x: 0, y: 2.55, w: PW, h: 1.0, align: "center", fontFace: TITLE_FONT, fontSize: 48, bold: true, color: WHITE });
  s.addText("Questions & Discussion", { x: 0, y: 3.55, w: PW, h: 0.55, align: "center", fontFace: BODY_FONT, fontSize: 19, color: GOLD });
  s.addText("Prototype developed across five progressive stages — live demonstrations in upcoming reviews.", {
    x: 1.5, y: 4.35, w: 10.3, h: 0.5, align: "center", italic: true, fontFace: BODY_FONT, fontSize: 13, color: "CADCFC",
  });

  s.addShape(pres.ShapeType.line, { x: 3.5, y: 5.4, w: 6.33, h: 0, line: { color: "2B4479", width: 1 } });
  s.addText("Dr. Deepak Sukheja — Associate Professor, Dept. of CSE", {
    x: 0, y: 5.6, w: PW, h: 0.35, align: "center", fontFace: BODY_FONT, fontSize: 12.5, bold: true, color: WHITE,
  });
  s.addText("Girish Sai Tipirneni  ·  Ravva Sai Sanjeeth  ·  Siddhartha Brahmanapally  ·  Venuturla Jeevan M. Reddy", {
    x: 0, y: 5.95, w: PW, h: 0.35, align: "center", fontFace: BODY_FONT, fontSize: 11.5, color: "9AA7BD",
  });
}

pres.writeFile({ fileName: path.join(__dirname, "EduCoin_Abstract_Review_PPT.pptx") }).then(() => {
  console.log("DONE");
});
