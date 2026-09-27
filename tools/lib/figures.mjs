// Render LaTeX `tikzpicture` environments to SVG using Tectonic + pdftocairo.
//
// The whole book uses TikZ for its diagrams. We compile all figures of one
// chapter into a single multi-page `standalone` document (one page per
// tikzpicture) and then split the resulting PDF into per-figure SVG files.
// That keeps the number of expensive TeX runs low (~30 instead of ~400).

import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const PREAMBLE = String.raw`\documentclass[multi={tikzpicture},border=2pt]{standalone}
\usepackage{tikz}
\usetikzlibrary{arrows,arrows.meta,backgrounds,calc,chains,decorations.pathmorphing,decorations.pathreplacing,decorations.shapes,fit,matrix,patterns,positioning,shapes,shapes.geometric,snakes}
\usepackage{amsmath,amssymb}
\usepackage{ifthen}
\usepackage{multicol}
\usepackage{xcolor}
\usepackage{fontawesome5}
% skak.sty is not in the Tectonic bundle; the only chess glyph CPHB uses is the
% queen, which fontawesome5 provides.
\providecommand{\symqueen}{\faChessQueen}
\providecommand{\symking}{\faChessKing}
\providecommand{\symrook}{\faChessRook}
\providecommand{\symbishop}{\faChessBishop}
\providecommand{\symknight}{\faChessKnight}
\providecommand{\sympawn}{\faChessPawn}
\definecolor{keywords}{HTML}{44548A}
\definecolor{strings}{HTML}{00999A}
\definecolor{comments}{HTML}{990000}
\newcommand{\key}[1]{\textbf{#1}}
`;

function have(cmd, args = ["--version"]) {
  const r = spawnSync(cmd, args, { stdio: "ignore" });
  return r.error === undefined;
}

export const toolsAvailable = () => ({
  tectonic: have("tectonic"),
  pdftocairo: have("pdftocairo", ["-v"]),
});

/**
 * pdftocairo renders at the diagram's natural size, which for a few wide
 * figures exceeds the printable text width. Scale the SVG's display size down
 * (the viewBox is left untouched, so it stays crisp) to at most `maxPt`.
 */
export function capSvgWidth(file, maxPt = 400) {
  let svg = fs.readFileSync(file, "utf8");
  const m = svg.match(/width="([\d.]+)pt"\s+height="([\d.]+)pt"/);
  if (!m) return;
  const w = parseFloat(m[1]);
  if (!(w > maxPt)) return;
  const ratio = maxPt / w;
  const h = parseFloat(m[2]) * ratio;
  svg = svg.replace(
    m[0],
    `width="${(maxPt).toFixed(2)}pt" height="${h.toFixed(2)}pt"`
  );
  fs.writeFileSync(file, svg, "utf8");
}

/**
 * @param {number} chapterNum
 * @param {{body:string, scale?:string}[]} figures  raw tikzpicture bodies
 * @param {string[]} newCommandDefs               all \newcommand definitions of the chapter
 * @param {string} imageDir                       output directory for SVG files
 * @param {string} workDir                        scratch directory
 * @returns {string[]} SVG file names (relative to imageDir)
 */
export function renderChapterFigures(chapterNum, figures, newCommandDefs, imageDir, workDir) {
  const nn = String(chapterNum).padStart(2, "0");
  const names = figures.map((_, i) => `ch${nn}-fig${String(i + 1).padStart(2, "0")}.svg`);

  if (figures.length === 0) return names;

  const { tectonic: hasTectonic, pdftocairo: hasPdfToCairo } = toolsAvailable();
  if (!hasTectonic || !hasPdfToCairo) {
    console.warn(
      `  ! skipping figure render for chapter ${nn}: ` +
        `${!hasTectonic ? "tectonic " : ""}${!hasPdfToCairo ? "pdftocairo " : ""}not found`
    );
    return names;
  }

  fs.mkdirSync(workDir, { recursive: true });
  fs.mkdirSync(imageDir, { recursive: true });

  const doc =
    PREAMBLE +
    newCommandDefs.join("\n") +
    "\n\\begin{document}\n" +
    figures.map((f) => f.body.trim()).join("\n") +
    "\n\\end{document}\n";

  const texFile = path.join(workDir, `ch${nn}.tex`);
  fs.writeFileSync(texFile, doc, "utf8");

  try {
    execFileSync("tectonic", ["-X", "compile", texFile, "--outdir", workDir], {
      stdio: ["ignore", "ignore", "pipe"],
      encoding: "utf8",
    });
  } catch (err) {
    const log = path.join(workDir, `ch${nn}.log`);
    console.error(`  ! chapter ${nn}: tectonic failed`);
    if (fs.existsSync(log)) {
      const text = fs.readFileSync(log, "utf8");
      const errors = text
        .split("\n")
        .filter((l) => l.startsWith("!") || l.includes("Error"))
        .slice(0, 8);
      if (errors.length) console.error("    " + errors.join("\n    "));
    } else if (err.stderr) {
      console.error("    " + String(err.stderr).trim().split("\n").slice(-5).join("\n    "));
    }
    return names;
  }

  const pdf = path.join(workDir, `ch${nn}.pdf`);

  for (let i = 0; i < figures.length; i++) {
    const out = path.join(imageDir, names[i]);
    try {
      execFileSync(
        "pdftocairo",
        ["-svg", "-f", String(i + 1), "-l", String(i + 1), pdf, out],
        { stdio: "ignore" }
      );
      capSvgWidth(out, 400);
    } catch {
      console.warn(`  ! chapter ${nn}: failed to convert figure ${i + 1} to SVG`);
    }
  }
  return names;
}
