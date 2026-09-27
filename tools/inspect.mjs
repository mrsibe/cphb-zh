import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const originalDir = path.join(root, "original");
const dir = fs.existsSync(originalDir) ? originalDir : root;

for (let i = 1; i <= 30; i++) {
  const n = String(i).padStart(2, "0");
  const f = path.join(dir, `chapter${n}.tex`);
  if (!fs.existsSync(f)) {
    console.log(n, "MISSING");
    continue;
  }
  const t = fs.readFileSync(f, "utf8");
  const ch = t.match(/\\chapter\{([^}]*)\}/);
  const secs = [...t.matchAll(/\\section\{([^}]*)\}/g)].map((m) => m[1]);
  const tikz = (t.match(/\\begin\{tikzpicture\}/g) || []).length;
  const lst = (t.match(/\\begin\{lstlisting\}/g) || []).length;
  console.log(
    `${n}\t${ch ? ch[1] : "?"}\tsecs=${secs.length}\ttikz=${tikz}\tlst=${lst}\t${secs
      .slice(0, 4)
      .join(" | ")}`
  );
}

// parts from book.tex
const book = fs.readFileSync(path.join(dir, "book.tex"), "utf8");
console.log("\n--- parts ---");
for (const m of book.matchAll(/\\part\{([^}]*)\}/g)) console.log(m[1]);
console.log("--- includes ---");
for (const m of book.matchAll(/\\include\{([^}]*)\}/g)) console.log(m[1]);
