# Competitive Programmer's Handbook（中文版）

[Competitive Programmer's Handbook](https://cses.fi/book/) 的中文翻译项目。

原书作者为 **Antti Laaksonen**（University of Helsinki），基于 *Competitive
Programmer's Handbook* 编写，中文版仅作翻译与排版整理。

> **技术路线**
>
> **Markdown 是唯一内容源** → mdBook 生成网站 → Pandoc + Typst 生成 PDF → Pandoc 生成 EPUB。
>
> 网站、PDF、EPUB 都不维护自己的正文副本。

- 在线阅读（GitHub Pages）：<https://mrsibe.github.io/cphb-zh/>
- PDF / EPUB：见 [Releases](https://github.com/mrsibe/cphb-zh/releases)

## 仓库结构

```text
cphb-zh/
├── src/                     # 唯一内容源（Markdown）
│   ├── SUMMARY.md           # mdBook 目录
│   ├── preface.md
│   ├── 01-introduction.md
│   ├── 02-time-complexity.md
│   ├── ...
│   ├── bibliography.md
│   └── assets/images/       # 由 TikZ 渲染出的 SVG 插图
│
├── theme/
│   ├── book.typ             # PDF 样式（Pandoc Typst 模板）
│   ├── epub.css             # EPUB 样式
│   └── mdbook-extra.css     # 网站样式微调
│
├── tools/                   # 一次性迁移工具（不参与常规构建）
│   ├── migrate.mjs          # LaTeX → Markdown + TikZ → SVG
│   ├── lib/tex.mjs
│   ├── lib/figures.mjs
│   └── filters/code.lua     # 给代码块补语言标记
│
├── original/                # 上游 LaTeX 原文，只作迁移来源，不参与构建
│   ├── book.tex / list.tex / preface.tex
│   └── chapterNN.tex
├── metadata.yaml            # 书名、作者、字体、章节编号等
├── book.toml                # mdBook 配置
├── Makefile                 # 统一构建入口
└── .github/workflows/build.yml
```

> 图片必须放在 `src/` 下（这里用 `src/assets/images/`），否则 mdBook 不会把它们
> 复制到输出目录；Pandoc 通过 `--resource-path=src` 解析同一批路径。

## 构建

需要：[mdBook](https://github.com/rust-lang/mdBook) ≥ 0.5、[Pandoc](https://pandoc.org/) ≥ 3.1、[Typst](https://typst.app/) ≥ 0.13。

```bash
make site    # 网站 -> book/
make pdf     # PDF  -> dist/cphb-zh.pdf
make epub    # EPUB -> dist/cphb-zh.epub

make build   # 以上三个一起
make clean   # 清掉 book/ dist/ .migrate/
```

本地预览网站：

```bash
mdbook serve --open
```

Windows 上 `make` 需要一个 POSIX shell（Git Bash 即可）。如果不想用 make，也可以直接调用：

```bash
mdbook build
pandoc --metadata-file=metadata.yaml src/preface.md src/[0-9][0-9]-*.md src/bibliography.md \
  -o dist/cphb-zh.pdf --pdf-engine=typst --template=theme/book.typ \
  --toc --file-scope --resource-path=src
```

### 中文（CJK）字体

PDF 通过 `metadata.yaml` 的 `mainfont` 选择字体，按顺序回退：

```yaml
mainfont:
  - "Noto Serif SC"        # Windows / Google Noto
  - "Noto Serif CJK SC"    # Debian/Ubuntu fonts-noto-cjk
  - "Source Han Serif SC"  # 思源宋体
  - "Songti SC"            # macOS
  - "SimSun"               # Windows 回退
```

CI 里通过 `fonts-noto-cjk` 提供中文字体。想换字体只需改 `metadata.yaml` 和
`theme/epub.css`，**正文 Markdown 一行都不用动**。

### 排版定制

所有 PDF 版式（封面、目录、章节编号、页眉、页码、代码框、译者注样式）都在
[`theme/book.typ`](theme/book.typ) 里，它是基于 Pandoc 内置 Typst 模板改写的完整模板。
网站样式在 `theme/mdbook-extra.css`，EPUB 样式在 `theme/epub.css`。

## Markdown 写作约定

为了让同一份 Markdown 被 mdBook 和 Pandoc 同时正确理解，正文只使用一个很小的子集：

```markdown
# 一级标题（每章一个）

## 二级标题

普通文本，**加粗**，*斜体*，`行内代码`。

[链接](https://example.com)

![图片](assets/images/xxx.svg)

```cpp
vector<int> a;
```

行内公式 $O(n \log n)$，块公式：

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$
```

请避免：

- 在正文里直接写 `<div>` / `<span>` 等 HTML；
- mdBook、Pandoc、Typst 各自的专有语法；
- 除 **GFM 管道表格** 之外的表格语法（迁移脚本已统一为管道表格）。

## 译者注

不篡改原作者正文，所有补充说明都写成引用块，并在开头明确标注：

```markdown
> **译者注**
>
> 原书写作时主要使用 C++11/14。现代竞赛环境通常已经支持 C++17，
> 部分平台支持 C++20。
```

这样网站、PDF、EPUB 三端都会把它渲染成醒目的提示框，正文层次也保持清晰：

```text
原文 → 中文翻译 → 译者注 → 练习补充
```

## 关于原始 LaTeX

`original/` 里的 `chapterNN.tex`、`book.tex`、`list.tex`、`preface.tex`、`book.pdf`
是上游原文，**只作为迁移来源**。首次迁移之后，只维护 `src/*.md`，不再维护
`.tex → .md` 的同步关系。

如果上游更新了 LaTeX，可以重新执行迁移（产物会直接覆盖 `src/`）：

```bash
node tools/migrate.mjs              # 全部重新生成
node tools/migrate.mjs --only 01    # 只重新生成第 1 章
node tools/migrate.mjs --no-figures # 只重生成 Markdown，复用已有 SVG
```

迁移工具额外需要 [Tectonic](https://tectonic-typesetting.github.io/)（渲染 TikZ）和
[poppler](https://poppler.freedesktop.org/) 的 `pdftocairo`（PDF → SVG）。
它们**只在迁移时需要**，日常构建不需要。

## License

原书采用 **Creative Commons BY-NC-SA 4.0**。中文翻译在相同许可下发布，详见
[LICENSE](LICENSE)。

原书主页：<https://cses.fi/book/> · 原始仓库：<https://github.com/pllk/cphb>
