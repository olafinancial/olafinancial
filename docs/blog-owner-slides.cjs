/**
 * Pul Planning — How to Add a Blog Post (Non-Technical)
 * Run: NODE_PATH=/tmp/node_modules node docs/blog-owner-slides.js
 */
const pptxgen = require("pptxgenjs");

const C = {
  bg: "0A1628",
  surface: "111F38",
  surface2: "162240",
  accent: "00C896",
  accentDim: "0D3D32",
  gold: "F59E0B",
  danger: "F43F5E",
  text: "E8EDF5",
  text2: "94A3B8",
  text3: "64748B",
  white: "FFFFFF",
  good: "00C896",
  bad: "F43F5E",
};

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Pul Planning";
pres.title = "How to Add a Blog Post — Non-Technical Guide";
pres.subject = "Owner instructions for pul.llc blog";

function addBg(slide) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 5.625,
    fill: { color: C.bg },
  });
}

function addFooter(slide, page, total = 12) {
  slide.addText("Pul Planning  ·  pul.llc/blog.html  ·  No coding required", {
    x: 0.5, y: 5.28, w: 7.5, h: 0.28,
    fontSize: 11, color: C.text3, fontFace: "Arial",
  });
  slide.addText(`${page} / ${total}`, {
    x: 8.2, y: 5.28, w: 1.3, h: 0.28,
    fontSize: 11, color: C.text3, fontFace: "Arial", align: "right",
  });
}

function stepBadge(slide, num, x, y) {
  slide.addShape(pres.shapes.OVAL, {
    x, y, w: 0.42, h: 0.42,
    fill: { color: C.accent },
  });
  slide.addText(String(num), {
    x, y: y + 0.05, w: 0.42, h: 0.35,
    fontSize: 14, bold: true, color: C.bg, fontFace: "Arial", align: "center",
  });
}

// ── 1. Title ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  addBg(s);
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.18, h: 5.625,
    fill: { color: C.accent },
  });
  s.addText("PUL PLANNING", {
    x: 0.7, y: 1.3, w: 8, h: 0.35,
    fontSize: 13, bold: true, color: C.accent, fontFace: "Arial",
    charSpacing: 3,
  });
  s.addText("How to Add a Blog Post", {
    x: 0.7, y: 1.85, w: 8.5, h: 0.75,
    fontSize: 36, bold: true, color: C.text, fontFace: "Arial",
  });
  s.addText("A simple visual guide for non-technical users\nUse only your web browser — no apps to install", {
    x: 0.7, y: 2.75, w: 8, h: 0.7,
    fontSize: 16, color: C.text2, fontFace: "Arial",
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.7, y: 3.7, w: 4.2, h: 0.55,
    fill: { color: C.accent }, rectRadius: 0.08,
  });
  s.addText("Live blog:  pul.llc/blog.html", {
    x: 0.7, y: 3.8, w: 4.2, h: 0.4,
    fontSize: 14, bold: true, color: C.bg, fontFace: "Arial", align: "center",
  });
  addFooter(s, 1);
}

// ── 2. You only need a browser ────────────────────────────
{
  const s = pres.addSlide();
  addBg(s);
  s.addText("You only need a browser", {
    x: 0.5, y: 0.35, w: 9, h: 0.5,
    fontSize: 28, bold: true, color: C.text, fontFace: "Arial",
  });
  s.addText("Nothing to install. Sign in to GitHub and follow the clicks.", {
    x: 0.5, y: 0.95, w: 9, h: 0.35,
    fontSize: 15, color: C.text2, fontFace: "Arial",
  });

  const cards = [
    { title: "✓  Web browser", body: "Chrome, Edge, Safari, or Firefox" },
    { title: "✓  GitHub access", body: "Account that can edit the Pul repo" },
    { title: "✓  Your article", body: "Title, summary, and a few paragraphs" },
  ];
  cards.forEach((c, i) => {
    const x = 0.5 + i * 3.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.7, w: 2.9, h: 2.4,
      fill: { color: C.surface }, rectRadius: 0.12,
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.7, w: 2.9, h: 0.12,
      fill: { color: C.accent }, rectRadius: 0.02,
    });
    s.addText(c.title, {
      x: x + 0.2, y: 2.2, w: 2.5, h: 0.55,
      fontSize: 16, bold: true, color: C.accent, fontFace: "Arial",
    });
    s.addText(c.body, {
      x: x + 0.2, y: 2.9, w: 2.5, h: 0.8,
      fontSize: 14, color: C.text2, fontFace: "Arial",
    });
  });
  addFooter(s, 2);
}

// ── 3. Two pieces ─────────────────────────────────────────
{
  const s = pres.addSlide();
  addBg(s);
  s.addText("Each post = two pieces", {
    x: 0.5, y: 0.35, w: 9, h: 0.5,
    fontSize: 28, bold: true, color: C.text, fontFace: "Arial",
  });
  s.addText("Think of it like writing a letter, then adding it to the table of contents.", {
    x: 0.5, y: 0.95, w: 9, h: 0.35,
    fontSize: 15, color: C.text2, fontFace: "Arial",
  });

  // Piece 1
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 1.55, w: 4.2, h: 3.0,
    fill: { color: C.surface }, rectRadius: 0.12,
  });
  s.addShape(pres.shapes.OVAL, {
    x: 0.8, y: 1.85, w: 0.55, h: 0.55,
    fill: { color: C.accent },
  });
  s.addText("1", {
    x: 0.8, y: 1.92, w: 0.55, h: 0.45,
    fontSize: 18, bold: true, color: C.bg, fontFace: "Arial", align: "center",
  });
  s.addText("The article", {
    x: 1.5, y: 1.9, w: 2.8, h: 0.45,
    fontSize: 20, bold: true, color: C.text, fontFace: "Arial",
  });
  s.addText("The words people read — title, paragraphs, tips.\n\nSaved as a simple text file ending in .md\n(like a Word doc, but plainer).", {
    x: 0.8, y: 2.65, w: 3.6, h: 1.6,
    fontSize: 14, color: C.text2, fontFace: "Arial",
  });

  // Piece 2
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.3, y: 1.55, w: 4.2, h: 3.0,
    fill: { color: C.surface }, rectRadius: 0.12,
  });
  s.addShape(pres.shapes.OVAL, {
    x: 5.6, y: 1.85, w: 0.55, h: 0.55,
    fill: { color: C.gold },
  });
  s.addText("2", {
    x: 5.6, y: 1.92, w: 0.55, h: 0.45,
    fontSize: 18, bold: true, color: C.bg, fontFace: "Arial", align: "center",
  });
  s.addText("The list entry", {
    x: 6.3, y: 1.9, w: 2.9, h: 0.45,
    fontSize: 20, bold: true, color: C.text, fontFace: "Arial",
  });
  s.addText("Tells the website “this post exists” so it shows on the blog page.\n\nOne small block of info: title, date, summary.", {
    x: 5.6, y: 2.65, w: 3.6, h: 1.6,
    fontSize: 14, color: C.text2, fontFace: "Arial",
  });
  addFooter(s, 3);
}

// ── 4. Big picture flow ───────────────────────────────────
{
  const s = pres.addSlide();
  addBg(s);
  s.addText("The big picture — 3 steps", {
    x: 0.5, y: 0.35, w: 9, h: 0.5,
    fontSize: 28, bold: true, color: C.text, fontFace: "Arial",
  });

  const steps = [
    { n: "1", t: "Write the article", d: "Create a file on GitHub with your story" },
    { n: "2", t: "Add to the list", d: "Register title, date & summary" },
    { n: "3", t: "Check the blog", d: "Wait a few minutes → open pul.llc" },
  ];
  steps.forEach((st, i) => {
    const x = 0.5 + i * 3.15;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.4, w: 2.95, h: 2.8,
      fill: { color: C.surface }, rectRadius: 0.12,
    });
    s.addShape(pres.shapes.OVAL, {
      x: x + 1.05, y: 1.7, w: 0.85, h: 0.85,
      fill: { color: C.accent },
    });
    s.addText(st.n, {
      x: x + 1.05, y: 1.85, w: 0.85, h: 0.6,
      fontSize: 28, bold: true, color: C.bg, fontFace: "Arial", align: "center",
    });
    s.addText(st.t, {
      x: x + 0.2, y: 2.8, w: 2.55, h: 0.45,
      fontSize: 16, bold: true, color: C.text, fontFace: "Arial", align: "center",
    });
    s.addText(st.d, {
      x: x + 0.2, y: 3.35, w: 2.55, h: 0.6,
      fontSize: 13, color: C.text2, fontFace: "Arial", align: "center",
    });
    if (i < 2) {
      s.addText("→", {
        x: x + 2.75, y: 2.5, w: 0.45, h: 0.4,
        fontSize: 22, bold: true, color: C.accent, fontFace: "Arial",
      });
    }
  });
  addFooter(s, 4);
}

// ── 5. Before you start ───────────────────────────────────
{
  const s = pres.addSlide();
  addBg(s);
  s.addText("Before you start — have ready", {
    x: 0.5, y: 0.35, w: 9, h: 0.5,
    fontSize: 28, bold: true, color: C.text, fontFace: "Arial",
  });

  const items = [
    { icon: "①", label: "Title", ex: "e.g. “5 tips for your emergency fund”" },
    { icon: "②", label: "Short summary", ex: "1–2 sentences for the blog card" },
    { icon: "③", label: "Your name", ex: "As the author" },
    { icon: "④", label: "Today’s date", ex: "Format: 2026-07-24  (year-month-day)" },
  ];
  items.forEach((it, i) => {
    const y = 1.15 + i * 0.9;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.5, y, w: 9.0, h: 0.78,
      fill: { color: C.surface }, rectRadius: 0.1,
    });
    s.addText(it.icon, {
      x: 0.7, y: y + 0.18, w: 0.5, h: 0.45,
      fontSize: 18, bold: true, color: C.accent, fontFace: "Arial",
    });
    s.addText(it.label, {
      x: 1.3, y: y + 0.12, w: 3.2, h: 0.5,
      fontSize: 16, bold: true, color: C.text, fontFace: "Arial",
    });
    s.addText(it.ex, {
      x: 4.5, y: y + 0.18, w: 4.7, h: 0.45,
      fontSize: 14, color: C.text2, fontFace: "Arial",
    });
  });
  addFooter(s, 5);
}

// ── 6. Step 1 — Create article ────────────────────────────
{
  const s = pres.addSlide();
  addBg(s);
  stepBadge(s, 1, 0.5, 0.38);
  s.addText("Step 1 — Create the article file", {
    x: 1.05, y: 0.38, w: 8, h: 0.45,
    fontSize: 26, bold: true, color: C.text, fontFace: "Arial",
  });

  const steps = [
    "Open the posts folder on GitHub (link on last slide)",
    "Click green  Add file  →  Create new file",
    "Type a simple filename ending in  .md",
    "Paste your article (use the template next)",
    "Scroll down →  Commit changes  → save to  main",
  ];
  steps.forEach((t, i) => {
    const y = 1.15 + i * 0.7;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.5, y, w: 9.0, h: 0.58,
      fill: { color: C.surface }, rectRadius: 0.08,
    });
    s.addShape(pres.shapes.OVAL, {
      x: 0.7, y: y + 0.1, w: 0.38, h: 0.38,
      fill: { color: C.accentDim },
    });
    s.addText(String(i + 1), {
      x: 0.7, y: y + 0.14, w: 0.38, h: 0.32,
      fontSize: 13, bold: true, color: C.accent, fontFace: "Arial", align: "center",
    });
    s.addText(t, {
      x: 1.3, y: y + 0.12, w: 7.9, h: 0.38,
      fontSize: 15, color: C.text, fontFace: "Arial",
    });
  });
  addFooter(s, 6);
}

// ── 7. Filename rules ─────────────────────────────────────
{
  const s = pres.addSlide();
  addBg(s);
  s.addText("Filename rules (very important)", {
    x: 0.5, y: 0.35, w: 9, h: 0.5,
    fontSize: 26, bold: true, color: C.text, fontFace: "Arial",
  });
  s.addText("The name must be simple so the website can find your post.", {
    x: 0.5, y: 0.9, w: 9, h: 0.35,
    fontSize: 14, color: C.text2, fontFace: "Arial",
  });

  // Good
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 1.45, w: 4.35, h: 3.2,
    fill: { color: C.surface }, rectRadius: 0.12,
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 1.45, w: 4.35, h: 0.55,
    fill: { color: "0A3D2E" }, rectRadius: 0.08,
  });
  s.addText("✓  GOOD names", {
    x: 0.7, y: 1.55, w: 4, h: 0.4,
    fontSize: 16, bold: true, color: C.accent, fontFace: "Arial",
  });
  s.addText("emergency-fund-tips.md\nwhat-is-fis.md\nsaving-for-retirement.md", {
    x: 0.8, y: 2.25, w: 3.8, h: 1.8,
    fontSize: 15, color: C.text, fontFace: "Consolas",
  });
  s.addText("lowercase · hyphens · ends with .md", {
    x: 0.8, y: 4.15, w: 3.8, h: 0.3,
    fontSize: 12, color: C.text3, fontFace: "Arial",
  });

  // Bad
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.15, y: 1.45, w: 4.35, h: 3.2,
    fill: { color: C.surface }, rectRadius: 0.12,
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.15, y: 1.45, w: 4.35, h: 0.55,
    fill: { color: "3D1520" }, rectRadius: 0.08,
  });
  s.addText("✗  AVOID these", {
    x: 5.35, y: 1.55, w: 4, h: 0.4,
    fontSize: 16, bold: true, color: C.danger, fontFace: "Arial",
  });
  s.addText("My Blog Post.md\nEmergency Fund.docx\npost!", {
    x: 5.45, y: 2.25, w: 3.8, h: 1.8,
    fontSize: 15, color: C.text, fontFace: "Consolas",
  });
  s.addText("no spaces · no Word files · no symbols", {
    x: 5.45, y: 4.15, w: 3.8, h: 0.3,
    fontSize: 12, color: C.text3, fontFace: "Arial",
  });
  addFooter(s, 7);
}

// ── 8. Article template ───────────────────────────────────
{
  const s = pres.addSlide();
  addBg(s);
  s.addText("Paste this template, then edit", {
    x: 0.5, y: 0.3, w: 9, h: 0.45,
    fontSize: 24, bold: true, color: C.text, fontFace: "Arial",
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 0.95, w: 9.0, h: 3.95,
    fill: { color: C.surface2 }, rectRadius: 0.1,
  });
  s.addText(
    "# Your post title here\n\n" +
    "Write your first paragraph here. Keep it clear and friendly.\n\n" +
    "## First section heading\n\n" +
    "- You can use bullet points\n" +
    "- Like this\n\n" +
    "## Second section\n\n" +
    "More paragraphs here.\n\n" +
    "*Educational only — not personalised financial advice.*",
    {
      x: 0.75, y: 1.15, w: 8.5, h: 3.55,
      fontSize: 13, color: C.text, fontFace: "Consolas", valign: "top",
    }
  );
  addFooter(s, 8);
}

// ── 9. Step 2 — List entry ────────────────────────────────
{
  const s = pres.addSlide();
  addBg(s);
  stepBadge(s, 2, 0.5, 0.38);
  s.addText("Step 2 — Add the post to the list", {
    x: 1.05, y: 0.38, w: 8, h: 0.45,
    fontSize: 24, bold: true, color: C.text, fontFace: "Arial",
  });

  const steps = [
    "Open the file  posts.json  on GitHub (link on last slide)",
    "Click the pencil icon  (Edit this file)",
    "Paste a new block at the top of the list (example next)",
    "Make sure  slug  matches your filename (without .md)",
    "Commit changes  → save to  main",
  ];
  steps.forEach((t, i) => {
    const y = 1.1 + i * 0.7;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.5, y, w: 9.0, h: 0.58,
      fill: { color: C.surface }, rectRadius: 0.08,
    });
    s.addShape(pres.shapes.OVAL, {
      x: 0.7, y: y + 0.1, w: 0.38, h: 0.38,
      fill: { color: "3D2E0A" },
    });
    s.addText(String(i + 1), {
      x: 0.7, y: y + 0.14, w: 0.38, h: 0.32,
      fontSize: 13, bold: true, color: C.gold, fontFace: "Arial", align: "center",
    });
    s.addText(t, {
      x: 1.3, y: y + 0.12, w: 7.9, h: 0.38,
      fontSize: 14, color: C.text, fontFace: "Arial",
    });
  });
  addFooter(s, 9);
}

// ── 10. List block example ────────────────────────────────
{
  const s = pres.addSlide();
  addBg(s);
  s.addText("What to paste into the list", {
    x: 0.5, y: 0.25, w: 9, h: 0.4,
    fontSize: 24, bold: true, color: C.text, fontFace: "Arial",
  });
  s.addText("Change the words to match YOUR post. The “slug” must match your filename.", {
    x: 0.5, y: 0.7, w: 9, h: 0.3,
    fontSize: 13, color: C.text2, fontFace: "Arial",
  });

  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.4, y: 1.15, w: 5.5, h: 3.7,
    fill: { color: C.surface2 }, rectRadius: 0.1,
  });
  s.addText(
    '{\n' +
    '  "slug": "emergency-fund-tips",\n' +
    '  "title": "5 tips for your emergency fund",\n' +
    '  "date": "2026-07-24",\n' +
    '  "author": "Your Name",\n' +
    '  "excerpt": "Simple steps for an emergency fund.",\n' +
    '  "tags": ["savings", "tips"]\n' +
    '},',
    {
      x: 0.55, y: 1.3, w: 5.2, h: 3.4,
      fontSize: 13, color: C.accent, fontFace: "Consolas", valign: "top",
    }
  );

  // Legend cards
  const legend = [
    { k: "slug", v: "Same as filename, no .md" },
    { k: "title", v: "What readers see" },
    { k: "date", v: "YYYY-MM-DD only" },
    { k: "excerpt", v: "1 short sentence" },
  ];
  legend.forEach((L, i) => {
    const y = 1.15 + i * 0.9;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 6.15, y, w: 3.4, h: 0.78,
      fill: { color: C.surface }, rectRadius: 0.08,
    });
    s.addText(L.k, {
      x: 6.35, y: y + 0.1, w: 3.0, h: 0.28,
      fontSize: 13, bold: true, color: C.accent, fontFace: "Arial",
    });
    s.addText(L.v, {
      x: 6.35, y: y + 0.38, w: 3.0, h: 0.28,
      fontSize: 12, color: C.text2, fontFace: "Arial",
    });
  });
  addFooter(s, 10);
}

// ── 11. Step 3 — Check live ───────────────────────────────
{
  const s = pres.addSlide();
  addBg(s);
  stepBadge(s, 3, 0.5, 0.38);
  s.addText("Step 3 — Check that it’s live", {
    x: 1.05, y: 0.38, w: 8, h: 0.45,
    fontSize: 26, bold: true, color: C.text, fontFace: "Arial",
  });

  const checks = [
    { t: "Wait 2–5 minutes", d: "GitHub is publishing the website" },
    { t: "Open the blog", d: "https://pul.llc/blog.html" },
    { t: "Find your post", d: "It should appear at the top of the list" },
    { t: "Open and read it", d: "Click the card or use ?post=your-slug" },
    { t: "If it looks old", d: "Hard refresh: Ctrl+Shift+R  (Mac: Cmd+Shift+R)" },
  ];
  checks.forEach((c, i) => {
    const y = 1.1 + i * 0.72;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.5, y, w: 9.0, h: 0.62,
      fill: { color: C.surface }, rectRadius: 0.08,
    });
    s.addShape(pres.shapes.OVAL, {
      x: 0.7, y: y + 0.12, w: 0.38, h: 0.38,
      fill: { color: C.accent },
    });
    s.addText(String(i + 1), {
      x: 0.7, y: y + 0.16, w: 0.38, h: 0.32,
      fontSize: 13, bold: true, color: C.bg, fontFace: "Arial", align: "center",
    });
    s.addText(c.t, {
      x: 1.3, y: y + 0.08, w: 3.5, h: 0.45,
      fontSize: 15, bold: true, color: C.text, fontFace: "Arial",
    });
    s.addText(c.d, {
      x: 4.9, y: y + 0.12, w: 4.3, h: 0.4,
      fontSize: 13, color: C.text2, fontFace: "Arial",
    });
  });
  addFooter(s, 11);
}

// ── 12. Checklist + links ─────────────────────────────────
{
  const s = pres.addSlide();
  addBg(s);
  s.addText("Your checklist & helpful links", {
    x: 0.5, y: 0.3, w: 9, h: 0.45,
    fontSize: 26, bold: true, color: C.text, fontFace: "Arial",
  });

  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 0.95, w: 4.4, h: 3.85,
    fill: { color: C.surface }, rectRadius: 0.12,
  });
  s.addText("Checklist", {
    x: 0.75, y: 1.15, w: 3.9, h: 0.4,
    fontSize: 16, bold: true, color: C.accent, fontFace: "Arial",
  });
  s.addText(
    "☐  Created article file (.md)\n\n" +
    "☐  Committed on GitHub\n\n" +
    "☐  Added entry in posts.json\n\n" +
    "☐  Committed that too\n\n" +
    "☐  Waited a few minutes\n\n" +
    "☐  Checked pul.llc/blog.html",
    {
      x: 0.75, y: 1.65, w: 3.9, h: 2.9,
      fontSize: 14, color: C.text, fontFace: "Arial",
    }
  );

  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.15, y: 0.95, w: 4.35, h: 3.85,
    fill: { color: C.surface }, rectRadius: 0.12,
  });
  s.addText("Open these links", {
    x: 5.4, y: 1.15, w: 3.9, h: 0.4,
    fontSize: 16, bold: true, color: C.gold, fontFace: "Arial",
  });
  s.addText(
    "Blog (live)\npul.llc/blog.html\n\n" +
    "Posts folder (Step 1)\ngithub.com/olafinancial/olafinancial\n→ blog/posts\n\n" +
    "List file (Step 2)\n…/blog/posts.json\n\n" +
    "Full written guide\nBLOG_OWNER_GUIDE.md in the repo",
    {
      x: 5.4, y: 1.6, w: 3.9, h: 2.95,
      fontSize: 12, color: C.text2, fontFace: "Arial",
    }
  );
  addFooter(s, 12);
}

const out = "/home/shill/Documents/Financial App Project/Pul_Blog_Posting_Guide.pptx";
pres.writeFile({ fileName: out }).then(() => {
  console.log("Wrote", out);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
