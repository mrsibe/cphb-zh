// Pandoc Typst template for the Chinese edition of the
// Competitive Programmer's Handbook.
//
// Used as:  pandoc ... --template=theme/book.typ --pdf-engine=typst
//
// It is based on pandoc's built-in Typst template (pandoc >= 3.0) and adds
// CJK typography, book-style chapter openings, running headers, styled code
// blocks, note boxes for translator notes, and a standalone cover page.

#set terms(hanging-indent: 1.5em)

#set table(
  inset: 6pt,
  stroke: none,
)

#let horizontalRule = line(start: (25%, 0%), end: (75%, 0%))
// Polyfill divider to allow compiling with typst < 0.15:
#let divider = if "divider" in std { divider } else { horizontalRule }

#show figure.where(
  kind: table,
): set figure.caption(position: top)

#show figure.where(
  kind: image,
): set figure.caption(position: bottom)

$if(highlighting-definitions)$
// syntax highlighting functions from skylighting:
$highlighting-definitions$

$endif$

#let content-to-string(content) = {
  if content.has("text") {
    content.text
  } else if content.has("children") {
    content.children.map(content-to-string).join("")
  } else if content.has("body") {
    content-to-string(content.body)
  } else if content == [ ] {
    " "
  }
}

#let accent = rgb("44548A")

#let conf(
  title: none,
  subtitle: none,
  authors: (),
  keywords: (),
  date: none,
  abstract-title: none,
  abstract: none,
  thanks: none,
  cols: 1,
  margin: (x: 1.25in, y: 1.25in),
  paper: "us-letter",
  lang: "zh",
  region: "CN",
  font: none,
  fontsize: 11pt,
  mathfont: none,
  codefont: none,
  linestretch: 1,
  sectionnumbering: none,
  linkcolor: none,
  citecolor: none,
  filecolor: none,
  pagenumbering: "1",
  doc,
) = {
  set document(
    title: title,
    keywords: keywords,
  )
  set document(
    author: authors.map(author => content-to-string(author.name)).join(", ", last: " & "),
  ) if authors != none and authors != ()

  set page(
    paper: paper,
    margin: margin,
    numbering: pagenumbering,
    columns: cols,
    header: context {
      let hs = query(selector(heading.where(level: 1)).before(here()))
      if hs.len() > 0 {
        set text(size: 0.8em, fill: luma(105), font: font)
        let body = hs.last().body
        if calc.odd(here().page()) {
          align(right)[#body]
        } else {
          align(left)[#title]
        }
      }
    },
  )

  set par(
    justify: true,
    leading: linestretch * 0.65em,
  )
  set text(
    lang: lang,
    region: region,
    size: fontsize,
  )

  set text(font: font) if font != none
  show math.equation: set text(font: mathfont) if mathfont != none
  show raw: set text(font: codefont) if codefont != none

  set heading(numbering: if sectionnumbering == none {
    none
  } else {
    (..nums) => {
      let n = nums.pos()
      if n.len() <= 3 { numbering("1.1.1", ..n) } else { none }
    }
  })

  show link: set text(fill: rgb(content-to-string(linkcolor))) if linkcolor != none
  show ref: set text(fill: rgb(content-to-string(citecolor))) if citecolor != none
  show link: this => {
    if filecolor != none and type(this.dest) == label {
      text(this, fill: rgb(content-to-string(filecolor)))
    } else {
      text(this)
    }
  }

  // --- book styling -------------------------------------------------------

  let frontMatter = ("Preface", "Bibliography", "Index")

  // Chapter openings start on a new page.
  show heading.where(level: 1): it => {
    pagebreak(weak: true)
    let plain = content-to-string(it.body)
    if frontMatter.contains(plain) {
      // Front/back matter: render without a number and without counting it.
      block(
        width: 100%,
        above: 0.4em,
        below: 1.1em,
        text(size: 1.55em, weight: "bold", fill: accent)[#it.body],
      )
      counter(heading).update(c => c - 1)
    } else {
      block(
        width: 100%,
        above: 0.4em,
        below: 1.1em,
        text(size: 1.55em, weight: "bold", fill: accent)[#it],
      )
    }
  }
  show heading.where(level: 2): it => block(above: 1.35em, below: 0.7em, it)
  show heading.where(level: 3): it => block(above: 1.15em, below: 0.55em, it)

  // Code listings.
  show raw.where(block: true): it => block(
    width: 100%,
    inset: 9pt,
    radius: 3pt,
    fill: luma(246),
    stroke: 0.5pt + luma(210),
    above: 0.9em,
    below: 0.9em,
    it,
  )

  // Translator notes / remarks are blockquotes: give them a marker.
  show quote: it => {
    set text(size: 0.94em)
    block(
      width: 100%,
      inset: (left: 12pt, top: 8pt, bottom: 8pt, right: 10pt),
      radius: 2pt,
      fill: rgb("#F4F6FB"),
      stroke: (left: 3pt + accent),
      above: 0.9em,
      below: 0.9em,
      it,
    )
  }

  show figure: set align(center)

  // --- cover --------------------------------------------------------------

  if title != none {
    page(
      header: none,
      footer: none,
      numbering: none,
      margin: (x: 1in, y: 1in),
    )[
      #set align(center)
      #v(2.4cm)
      #text(size: 1.9em, weight: "bold", fill: accent, font: font)[#title]
      #if subtitle != none {
        v(0.9cm)
        text(size: 1.15em, fill: luma(90), font: font)[#subtitle]
      }
      #v(3.2cm)
      #for author in authors {
        text(size: 1.05em)[#author.name]
        linebreak()
      }
      #if date != none {
        v(0.4cm)
        text(size: 0.95em, fill: luma(110))[#date]
      }
      #v(1fr)
      #text(size: 0.85em, fill: luma(120))[
        Creative Commons BY-NC-SA 4.0 \
        https://cses.fi/book/
      ]
    ]
    pagebreak()
  }

  doc
}

#show: doc => conf(
$if(title)$
  title: [$title$],
$endif$
$if(subtitle)$
  subtitle: [$subtitle$],
$endif$
$if(author)$
  authors: (
$for(author)$
$if(author.name)$
    ( name: [$author.name$],
      affiliation: [$author.affiliation$],
      email: [$author.email$] ),
$else$
    ( name: [$author$],
      affiliation: "",
      email: "" ),
$endif$
$endfor$
    ),
$endif$
$if(keywords)$
  keywords: ($for(keywords)$"$keywords/nowrap$"$sep$,$endfor$),
$endif$
$if(date)$
  date: [$date$],
$endif$
  lang: "zh",
  region: "CN",
$if(abstract-title)$
  abstract-title: [$abstract-title$],
$endif$
$if(abstract)$
  abstract: [$abstract$],
$endif$
$if(thanks)$
  thanks: [$thanks$],
$endif$
$if(margin)$
  margin: ($for(margin/pairs)$$margin.key$: $margin.value$,$endfor$),
$endif$
$if(papersize)$
  paper: "$papersize$",
$endif$
$if(mainfont)$
  font: ($for(mainfont)$"$mainfont$",$endfor$),
$endif$
$if(fontsize)$
  fontsize: $fontsize$,
$endif$
$if(mathfont)$
  mathfont: ($for(mathfont)$"$mathfont$",$endfor$),
$endif$
$if(codefont)$
  codefont: ($for(codefont)$"$codefont$",$endfor$),
$endif$
$if(linestretch)$
  linestretch: $linestretch$,
$endif$
$if(section-numbering)$
  sectionnumbering: "$section-numbering$",
$endif$
  pagenumbering: $if(page-numbering)$"$page-numbering$"$else$"1"$endif$,
$if(linkcolor)$
  linkcolor: [$linkcolor$],
$endif$
$if(citecolor)$
  citecolor: [$citecolor$],
$endif$
$if(filecolor)$
  filecolor: [$filecolor$],
$endif$
  cols: $if(columns)$$columns$$else$1$endif$,
  doc,
)

$for(include-before)$
$include-before$

$endfor$
$if(toc)$
#outline(
  title: [目录],
  depth: $toc-depth$,
  indent: 1.2em,
);
$endif$

$body$

$if(citations)$
$for(nocite-ids)$
#cite(label("${it}"), form: none)
$endfor$
$if(csl)$

#set bibliography(style: "$csl$")
$elseif(bibliographystyle)$

#set bibliography(style: "$bibliographystyle$")
$endif$
$if(bibliography)$

#bibliography(($for(bibliography)$"$bibliography$"$sep$,$endfor$)$if(full-bibliography)$, full: true$endif$)
$endif$
$endif$
$for(include-after)$

$include-after$
$endfor$
