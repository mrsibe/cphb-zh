// Small helpers for working with LaTeX source without a full parser.

/**
 * Given `s` and the index of an opening `{`, return the index just past the
 * matching closing `}`.
 */
export function matchBrace(s, openIdx) {
  if (s[openIdx] !== "{") throw new Error("matchBrace: not at '{'");
  let depth = 0;
  let i = openIdx;
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
    i++;
  }
  return -1;
}

/** Replace every call of `\name{...}` (balanced braces) using `fn(inner, whole)`. */
export function replaceMacro(src, name, fn) {
  const needle = "\\" + name;
  let out = "";
  let i = 0;
  while (i < src.length) {
    const idx = src.indexOf(needle, i);
    if (idx === -1) {
      out += src.slice(i);
      break;
    }
    // Don't match longer command names (`\key` vs `\keyword`).
    const after = src[idx + needle.length];
    if (after && /[a-zA-Z]/.test(after)) {
      out += src.slice(i, idx + needle.length);
      i = idx + needle.length;
      continue;
    }
    let brace = idx + needle.length;
    // skip optional whitespace
    while (src[brace] === " " || src[brace] === "\t") brace++;
    if (src[brace] !== "{") {
      out += src.slice(i, idx + needle.length);
      i = idx + needle.length;
      continue;
    }
    const end = matchBrace(src, brace);
    if (end === -1) {
      out += src.slice(i);
      break;
    }
    const inner = src.slice(brace + 1, end - 1);
    out += src.slice(i, idx);
    out += fn(inner, src.slice(idx, end));
    i = end;
  }
  return out;
}

/** Remove every `\name{...}` call (balanced braces). */
export function removeMacro(src, name) {
  return replaceMacro(src, name, () => "");
}

/** Remove a bare command such as `\newpage` or `\noindent`. */
export function removeCommand(src, name) {
  const re = new RegExp("\\\\" + name + "(?![a-zA-Z])", "g");
  return src.replace(re, " ");
}

/**
 * Extract every `\begin{name}` ... `\end{name}` block (no nesting of the same
 * environment). Returns array of { start, end, body, header, whole }.
 */
export function extractEnv(src, name) {
  const open = "\\begin{" + name + "}";
  const close = "\\end{" + name + "}";
  const out = [];
  let searchFrom = 0;
  while (true) {
    const s = src.indexOf(open, searchFrom);
    if (s === -1) break;
    const e = src.indexOf(close, s + open.length);
    if (e === -1) break;
    const whole = src.slice(s, e + close.length);
    out.push({
      start: s,
      end: e + close.length,
      whole,
      body: src.slice(s + open.length, e),
    });
    searchFrom = e + close.length;
  }
  return out;
}

/**
 * Collect `\newcommand{\foo}[n]{...}` / `\newcommand\foo[n]{...}` definitions.
 * Returns array of { name, def } and the source with the definitions removed.
 */
export function collectNewCommands(src) {
  const re = /\\newcommand\s*(?:\{\s*\\([a-zA-Z]+)\s*\}|\\([a-zA-Z]+))/g;
  const defs = [];
  let out = "";
  let i = 0;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1] || m[2];
    let j = m.index + m[0].length;
    // optional [n] argument count
    if (src[j] === "[") {
      const close = src.indexOf("]", j);
      if (close !== -1) j = close + 1;
    }
    while (src[j] === " " || src[j] === "\t" || src[j] === "\r" || src[j] === "\n") j++;
    if (src[j] !== "{") continue;
    const end = matchBrace(src, j);
    if (end === -1) continue;
    defs.push({ name, def: src.slice(m.index, end) });
    out += src.slice(i, m.index);
    i = end;
    re.lastIndex = end;
  }
  out += src.slice(i);
  return { defs, src: out };
}
