# Competitive Programmer's Handbook (Chinese edition)
#
# Markdown is the single source of truth in src/.
#   site  -> mdBook  -> book/          (HTML, deployed to GitHub Pages)
#   pdf   -> pandoc  -> Typst          (fixed layout)
#   epub  -> pandoc                    (reflowable)
#
# `make` (all three) needs: mdbook, pandoc, typst.
# `make migrate` additionally needs: node, tectonic, pdftocairo.

PANDOC ?= pandoc
MDBOOK ?= mdbook

NAME   := cphb-zh
DIST   := dist
SRC    := src
META   := metadata.yaml
TYPST_TEMPLATE := theme/book.typ

# Order matters: front matter, chapters (numeric prefix), back matter.
CHAPTERS := $(sort $(wildcard $(SRC)/[0-9][0-9]-*.md))
BODY     := $(SRC)/preface.md $(CHAPTERS) $(SRC)/bibliography.md

.PHONY: all build site pdf epub migrate clean

all: build

build: site pdf epub

site:
	$(MDBOOK) build

pdf: $(DIST)/$(NAME).pdf

$(DIST)/$(NAME).pdf: $(BODY) $(META) $(TYPST_TEMPLATE)
	@mkdir -p $(DIST)
	$(PANDOC) --metadata-file=$(META) $(BODY) \
		-o $@ \
		--pdf-engine=typst \
		--template=$(TYPST_TEMPLATE) \
		--toc --toc-depth=2 \
		--file-scope \
		--resource-path=$(SRC)

epub: $(DIST)/$(NAME).epub

$(DIST)/$(NAME).epub: $(BODY) $(META) theme/epub.css
	@mkdir -p $(DIST)
	$(PANDOC) --metadata-file=$(META) $(BODY) \
		-o $@ \
		--toc --toc-depth=2 \
		--file-scope \
		--css=theme/epub.css \
		--resource-path=$(SRC)

# Re-run the first-time LaTeX -> Markdown migration (not part of a normal build).
migrate:
	node tools/migrate.mjs

clean:
	rm -rf book $(DIST) .migrate
