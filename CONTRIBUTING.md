# 翻译指南

本项目的正文只有一个来源：`src/*.md`。网站、PDF、EPUB 都从它生成，因此翻译时
只需要遵守很少的几条规则。

## 工作流

1. 选择一个还没有译完的章节（见文末进度表），提一个 issue 或直接开 PR 声明。
2. 编辑 `src/NN-slug.md`，把英文正文译成中文。
3. 本地 `make site` 或 `mdbook serve --open` 检查渲染，再用 `make pdf` / `make epub`
   确认另外两端没问题。
4. 提交 PR。

不要直接修改 `original/chapterNN.tex`。原始 LaTeX 只是迁移来源，翻译一律改 Markdown。

## Markdown 约定

只使用一个很小的子集，保证 mdBook 与 Pandoc 都理解一致：

| 用途 | 写法 |
| --- | --- |
| 章标题 | `# Introduction`（每章一个一级标题） |
| 节标题 | `## ...` / `### ...` / `#### ...` |
| 加粗 / 斜体 | `**加粗**` / `*斜体*` |
| 行内代码 | `` `int` `` |
| 代码块 | ` ```cpp ` ... ` ``` ` |
| 行内公式 | `$O(n \log n)$` |
| 块公式 | `$$ ... $$`（多行时用 `\\` 换行） |
| 图片 | `![](assets/images/chNN-figMM.svg)` |
| 表格 | GFM 管道表格 `\| a \| b \|` |
| 译者注 | 引用块 `> **译者注**` |

**不要**在正文里写：

- `<div>`、`<span>` 等 HTML；
- mdBook / Pandoc / Typst 任意一端的专有语法；
- 非管道语法的表格。

### 标题

一级标题保留，但翻译成中文，例如 `# 简介`。文件名（`01-introduction.md`）和
`src/SUMMARY.md` 里的链接**不要改**，否则三端构建都会断。

### 代码

代码本身不翻译，注释可以翻译成中文：

```cpp
for (int i = 1; i <= n; i++) {
    // 这里写代码
}
```

### 公式

公式保持 LaTeX 原样，不翻译变量名。块公式里换行要用 `\\`：

$$
\begin{array}{lcl}
(a+b) \bmod m & = & (a \bmod m + b \bmod m) \bmod m \\
(a-b) \bmod m & = & (a \bmod m - b \bmod m) \bmod m
\end{array}
$$

### 译者注

原书写作于 2017–2021 年，涉及的语言标准、竞赛环境、题目链接可能已经变化。
这类补充说明一律写成 **译者注** 引用块，不要改动原作者正文：

```markdown
> **译者注**
>
> 原书写作时主要使用 C++11/14。现代竞赛环境通常已经支持 C++17，
> 部分平台支持 C++20。
```

引用块在三端都会渲染成醒目的提示框。

## 术语表

为保持一致，常用术语建议按下表翻译（欢迎在 PR 中补充）：

| English | 中文 |
| --- | --- |
| competitive programming | 竞赛程序设计 / 算法竞赛 |
| time complexity | 时间复杂度 |
| greedy algorithm | 贪心算法 |
| dynamic programming | 动态规划 |
| complete search | 完全搜索 / 暴力枚举 |
| data structure | 数据结构 |
| graph | 图 |
| tree | 树 |
| edge / vertex (node) | 边 / 顶点（结点） |
| array | 数组 |
| range query | 区间查询 |
| segment tree | 线段树 |
| binary indexed tree | 树状数组（Fenwick 树） |
| shortest path | 最短路 |
| spanning tree | 生成树 |
| maximum flow | 最大流 |
| modular arithmetic | 模运算 |
| randomization | 随机化 |

## 章节进度

把 `[ ]` 改成 `[x]` 表示该章已经翻译完成。

```text
[ ] Preface                       src/preface.md
[ ] 01 Introduction               src/01-introduction.md
[ ] 02 Time complexity            src/02-time-complexity.md
[ ] 03 Sorting                    src/03-sorting.md
[ ] 04 Data structures            src/04-data-structures.md
[ ] 05 Complete search            src/05-complete-search.md
[ ] 06 Greedy algorithms          src/06-greedy-algorithms.md
[ ] 07 Dynamic programming        src/07-dynamic-programming.md
[ ] 08 Amortized analysis         src/08-amortized-analysis.md
[ ] 09 Range queries              src/09-range-queries.md
[ ] 10 Bit manipulation           src/10-bit-manipulation.md
[ ] 11 Basics of graphs           src/11-basics-of-graphs.md
[ ] 12 Graph traversal            src/12-graph-traversal.md
[ ] 13 Shortest paths             src/13-shortest-paths.md
[ ] 14 Tree algorithms            src/14-tree-algorithms.md
[ ] 15 Spanning trees             src/15-spanning-trees.md
[ ] 16 Directed graphs            src/16-directed-graphs.md
[ ] 17 Strong connectivity        src/17-strong-connectivity.md
[ ] 18 Tree queries               src/18-tree-queries.md
[ ] 19 Paths and circuits         src/19-paths-and-circuits.md
[ ] 20 Flows and cuts             src/20-flows-and-cuts.md
[ ] 21 Number theory              src/21-number-theory.md
[ ] 22 Combinatorics              src/22-combinatorics.md
[ ] 23 Matrices                   src/23-matrices.md
[ ] 24 Probability                src/24-probability.md
[ ] 25 Game theory                src/25-game-theory.md
[ ] 26 String algorithms          src/26-string-algorithms.md
[ ] 27 Square root algorithms     src/27-square-root-algorithms.md
[ ] 28 Segment trees revisited    src/28-segment-trees-revisited.md
[ ] 29 Geometry                   src/29-geometry.md
[ ] 30 Sweep line algorithms      src/30-sweep-line-algorithms.md
[ ] Bibliography                  src/bibliography.md
```
