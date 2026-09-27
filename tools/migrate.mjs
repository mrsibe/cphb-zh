#!/usr/bin/env node
// First-time (and re-runnable) migration: LaTeX (upstream pllk/cphb) -> Markdown.
//
//   node tools/migrate.mjs [--only 01,02] [--no-figures]
//
// Outputs:
//   src/preface.md
//   src/NN-slug.md
//   src/bibliography.md
//   src/SUMMARY.md
//   src/assets/images/chNN-figMM.svg
//
// After the migration the Markdown files are the single source of truth.
// This script exists to bootstrap them and to re-run when the upstream
// LaTeX changes; it is deliberately not part of the normal build.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

import {
  replaceMacro,
  removeMacro,
  removeCommand,
  extractEnv,
  collectNewCommands,
  matchBrace,
} from "./lib/tex.mjs";
import { renderChapterFigures } from "./lib/figures.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Upstream LaTeX lives in original/ and is only used as migration input.
const ORIG = path.join(ROOT, "original");
const SRC = path.join(ROOT, "src");
const IMAGES = path.join(SRC, "assets", "images");
const WORK = path.join(ROOT, ".migrate");

const args = process.argv.slice(2);
const only = (() => {
  const i = args.indexOf("--only");
  return i === -1 ? null : new Set(args[i + 1].split(",").map((s) => s.padStart(2, "0")));
})();
const withFigures = !args.includes("--no-figures");

const PANDOC_FILTER = path.join(ROOT, "tools", "filters", "code.lua");
const PANDOC_FMT =
  // Pipe tables are the only table syntax that CommonMark/mdBook renders;
  // disable pandoc's other table formats so it always emits pipe tables.
  "markdown-header_attributes+fenced_code_attributes" +
  "-simple_tables-multiline_tables-grid_tables";

function pandoc(input, from = "latex") {
  return execFileSync(
    "pandoc",
    ["-f", from, "-t", PANDOC_FMT, "--wrap=none", "--lua-filter", PANDOC_FILTER],
    { input, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
}

const read = (p) => fs.readFileSync(p, "utf8");
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Remove `\name{a}{b}...` with exactly `n` leading brace arguments. */
function removeMacroN(src, name, n) {
  const needle = "\\" + name;
  let out = "";
  let i = 0;
  for (;;) {
    const idx = src.indexOf(needle, i);
    if (idx === -1) {
      out += src.slice(i);
      break;
    }
    const after = src[idx + needle.length];
    if (after && /[a-zA-Z]/.test(after)) {
      out += src.slice(i, idx + needle.length);
      i = idx + needle.length;
      continue;
    }
    let j = idx + needle.length;
    let ok = true;
    for (let k = 0; k < n; k++) {
      while (src[j] === " " || src[j] === "\t" || src[j] === "\r" || src[j] === "\n") j++;
      if (src[j] !== "{") {
        ok = false;
        break;
      }
      const end = matchBrace(src, j);
      if (end === -1) {
        ok = false;
        break;
      }
      j = end;
    }
    if (!ok) {
      out += src.slice(i, idx + needle.length);
      i = idx + needle.length;
      continue;
    }
    out += src.slice(i, idx);
    i = j;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Bibliography
// ---------------------------------------------------------------------------

function buildBibliography() {
  const tex = read(path.join(ORIG, "list.tex"));
  const re = /\\bibitem\{([^}]+)\}/g;
  const marks = [];
  let m;
  while ((m = re.exec(tex)) !== null) marks.push({ key: m[1], start: m.index, bodyStart: re.lastIndex });

  const endIdx = tex.indexOf("\\end{thebibliography}");
  const citeMap = new Map();
  const lines = [];

  marks.forEach((mark, i) => {
    const stop = i + 1 < marks.length ? marks[i + 1].start : endIdx;
    const raw = tex.slice(mark.bodyStart, stop);
    const md = pandoc(raw)
      .replace(/:::.*$/gm, "")
      .replace(/\n{2,}/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    citeMap.set(mark.key, i + 1);
    lines.push(`${i + 1}. ${md}`);
  });

  const out =
    "# Bibliography\n\n" +
    "> 本页由 `tools/migrate.mjs` 从 `list.tex` 生成，正文中的 `\\cite` 引用会映射到这里。\n\n" +
    lines.join("\n\n") +
    "\n";

  fs.writeFileSync(path.join(SRC, "bibliography.md"), out, "utf8");
  console.log(`bibliography.md  (${marks.length} entries)`);
  return citeMap;
}

// ---------------------------------------------------------------------------
// LaTeX preprocessing
// ---------------------------------------------------------------------------

function preprocess(tex, citeMap) {
  let s = tex;

  // Collect custom macros (some are defined inside tikzpictures).
  const { defs, src } = collectNewCommands(s);
  s = src;

  // \key{...} -> \textbf{...}
  s = replaceMacro(s, "key", (inner) => `\\textbf{${inner}}`);

  // Citations -> plain bracketed numbers.
  s = replaceMacro(s, "cite", (inner) => {
    const nums = inner
      .split(",")
      .map((k) => citeMap.get(k.trim()) ?? "?")
      .join(", ");
    return `[${nums}]`;
  });

  // Index entries are not part of the online book (search replaces the index).
  s = removeMacro(s, "index");

  // Custom XOR operator defined in chapter 10.
  s = s.replace(/\\XOR(?![a-zA-Z])/g, "\\oplus");

  // Purely typographic / page layout commands.
  for (const cmd of ["noindent", "newpage", "clearpage", "cleardoublepage", "small", "footnotesize", "scriptsize", "normalsize", "centering", "hfill"]) {
    s = removeCommand(s, cmd);
  }
  s = removeMacroN(s, "markboth", 2);
  s = removeMacroN(s, "addcontentsline", 3);
  s = removeMacroN(s, "setcounter", 2);
  s = removeMacro(s, "vspace", () => "");
  s = removeMacro(s, "hspace", () => "");

  return { src: s, newCommandDefs: defs.map((d) => d.def) };
}

/** Replace tikzpictures with \includegraphics placeholders; collect figure bodies. */
function extractFigures(src, chapterNum) {
  const nn = String(chapterNum).padStart(2, "0");
  const figures = [];
  let s = src;

  // Repeat because offsets shift as we replace.
  for (;;) {
    const tikz = extractEnv(s, "tikzpicture");
    if (tikz.length === 0) break;
    const fig = tikz[0];
    const idx = figures.length;
    const file = `ch${nn}-fig${String(idx + 1).padStart(2, "0")}.svg`;

    // A figure inside a tabular is one cell of a table: it must stay on the
    // same line, otherwise the generated pipe table breaks.
    const tabulars = extractEnv(s, "tabular");
    const inTable = tabulars.some((t) => t.start < fig.start && t.end > fig.end);
    const img = inTable
      ? `\\includegraphics{assets/images/${file}}`
      : `\n\n\\includegraphics{assets/images/${file}}\n\n`;

    // Is the tikzpicture the only content of an enclosing center environment?
    const centers = extractEnv(s, "center").filter(
      (c) => c.start < fig.start && c.end > fig.end
    );
    const center = centers.length ? centers[centers.length - 1] : null;

    if (center && s.slice(center.start, fig.start).trim() === "\\begin{center}" &&
        s.slice(fig.end, center.end).trim() === "\\end{center}") {
      s = s.slice(0, center.start) + img + s.slice(center.end);
      figures.push({ body: fig.whole });
    } else {
      s = s.slice(0, fig.start) + img + s.slice(fig.end);
      figures.push({ body: fig.whole });
    }
  }

  // The loop always replaces the leftmost remaining figure, so `figures` is
  // already in source order.
  return { src: s, figures };
}

/** Remove pandoc fenced-div wrappers, normalize code fences and line breaks. */
function cleanupMarkdown(md) {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let depth = 0;
  let inFence = false;
  for (let line of lines) {
    if (/^\s*```/.test(line)) {
      line = line
        .replace(/^(\s*)```\s*\{#([A-Za-z0-9_+-]+)\}\s*$/, "$1```$2")
        .replace(/^(\s*)```\s*\{\.([A-Za-z0-9_+-]+)\}\s*$/, "$1```$2");
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line.replace(/[ \t]+$/, ""));
      continue;
    }
    if (/^:::[ \t]*\S/.test(line)) {
      depth++;
      continue;
    }
    if (depth > 0 && /^:::[ \t]*$/.test(line)) {
      depth--;
      continue;
    }
    line = line.replace(/[ \t]+$/, "");
    // A lone `\\` is a LaTeX line break between blocks: drop it.
    if (/^\\$/.test(line)) {
      out.push("");
      continue;
    }
    // A trailing single `\` is a hard line break: emit a CommonMark hard
    // break (two spaces) so the site, PDF and EPUB all agree.
    line = line.replace(/(?<!\\)\\$/, "  ");
    out.push(line);
  }
  return out
    .join("\n")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]")
    .replace(/!\[image\]\(/g, "![](")
    .replace(/\[([^\]]*)\]\{\.underline\}/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n+$/, "\n");
}

// ---------------------------------------------------------------------------
// Chapter conversion
// ---------------------------------------------------------------------------

function convertChapter(num, citeMap, { isPreface = false } = {}) {
  const nn = isPreface ? null : String(num).padStart(2, "0");
  const texFile = isPreface ? "preface.tex" : `chapter${nn}.tex`;
  const tex = read(path.join(ORIG, texFile));

  let title = isPreface ? "Preface" : null;
  if (!isPreface) {
    const m = tex.match(/\\chapter\{([^}]*)\}/);
    if (!m) throw new Error(`${texFile}: no \chapter`);
    title = m[1];
  }

  // Keep the \chapter marker: it makes pandoc emit `# Title` and, more
  // importantly, keeps \section at level 2 and so on. The heading is
  // replaced by our own below so the title never drifts from the file name.
  const s = tex;

  const { src, newCommandDefs } = preprocess(s, citeMap);
  const { src: withFigs, figures } = extractFigures(src, isPreface ? 0 : num);

  let names = [];
  if (withFigures) {
    names = renderChapterFigures(isPreface ? 0 : num, figures, newCommandDefs, IMAGES, WORK);
  }

  const md = pandoc(withFigs);
  let body = cleanupMarkdown(md).trim();

  // Pandoc already emits `# Title` when the \chapter is present, but we removed
  // it, so prepend the heading ourselves.
  const heading = `# ${title}\n\n`;
  const out = heading + body.replace(/^(#\s+[^\n]*\n\n?)/, "") + "\n";

  const file = isPreface ? "preface.md" : `${nn}-${slug(title)}.md`;
  fs.writeFileSync(path.join(SRC, file), out, "utf8");
  console.log(
    `${file.padEnd(36)} figures=${figures.length}${names.length ? ` rendered=${names.filter((n) => fs.existsSync(path.join(IMAGES, n))).length}` : ""}`
  );
  return { num, title, file: file, isPreface };
}

// ---------------------------------------------------------------------------
// SUMMARY.md
// ---------------------------------------------------------------------------

function parseBookStructure() {
  const tex = read(path.join(ORIG, "book.tex"));
  const parts = [];
  let current = { title: null, chapters: [] };
  const re = /\\(part|include)\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(tex)) !== null) {
    if (m[1] === "part") {
      if (current.chapters.length || current.title) parts.push(current);
      current = { title: m[2], chapters: [] };
    } else if (/^chapter\d+$/.test(m[2])) {
      current.chapters.push(Number(m[2].replace("chapter", "")));
    }
  }
  if (current.chapters.length || current.title) parts.push(current);
  return parts;
}

function writeSummary(chapters) {
  const byNum = new Map(chapters.filter((c) => !c.isPreface).map((c) => [c.num, c]));
  const parts = parseBookStructure();
  const lines = ["# Summary", "", "[Preface](preface.md)"];
  let partNo = 0;
  for (const part of parts) {
    if (part.title) {
      partNo++;
      lines.push("", `# ${part.title}`, "");
    }
    for (const n of part.chapters) {
      const ch = byNum.get(n);
      if (ch) lines.push(`- [${n}. ${ch.title}](${ch.file})`);
    }
  }
  lines.push("", "---", "", "[Bibliography](bibliography.md)", "");
  fs.writeFileSync(path.join(SRC, "SUMMARY.md"), lines.join("\n"), "utf8");
  console.log("SUMMARY.md");
}

// ---------------------------------------------------------------------------

fs.mkdirSync(SRC, { recursive: true });
fs.mkdirSync(IMAGES, { recursive: true });
fs.mkdirSync(WORK, { recursive: true });

const citeMap = buildBibliography();
const chapters = [];

chapters.push(convertChapter(0, citeMap, { isPreface: true }));
for (let i = 1; i <= 30; i++) {
  const nn = String(i).padStart(2, "0");
  if (only && !only.has(nn)) {
    // Keep the existing file in the summary.
    const existing = fs.readdirSync(SRC).find((f) => f.startsWith(`${nn}-`) && f.endsWith(".md"));
    if (existing) chapters.push({ num: i, title: existing.replace(`${nn}-`, "").replace(/\.md$/, "").replace(/-/g, " "), file: existing });
    continue;
  }
  chapters.push(convertChapter(i, citeMap));
}
writeSummary(chapters);
