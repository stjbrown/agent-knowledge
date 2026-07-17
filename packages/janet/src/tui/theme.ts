import chalk from "chalk";
import type { EditorTheme } from "@earendil-works/pi-tui";

/**
 * Janet's minimal terminal theme. Good Place warm: cyan accents, soft dims.
 * Kept tiny on purpose — no gradients, no branding machinery.
 */
export const c = {
  accent: chalk.cyan,
  accentBold: chalk.cyan.bold,
  dim: chalk.dim,
  user: chalk.green,
  error: chalk.red,
  warn: chalk.yellow,
  bold: chalk.bold,
  italic: chalk.italic,
};

export const editorTheme: EditorTheme = {
  borderColor: (s: string) => chalk.cyan(s),
  selectList: {
    selectedPrefix: (s: string) => chalk.cyan(s),
    selectedText: (s: string) => chalk.cyan.bold(s),
    description: (s: string) => chalk.dim(s),
    scrollInfo: (s: string) => chalk.dim(s),
    noMatch: (s: string) => chalk.dim(s),
  },
};

export const markdownTheme = {
  heading: (s: string) => chalk.cyan.bold(s),
  link: (s: string) => chalk.cyan.underline(s),
  linkUrl: (s: string) => chalk.dim(s),
  code: (s: string) => chalk.yellow(s),
  codeBlock: (s: string) => chalk.yellow(s),
  codeBlockBorder: (s: string) => chalk.dim(s),
  quote: (s: string) => chalk.italic(s),
  quoteBorder: (s: string) => chalk.dim(s),
  hr: (s: string) => chalk.dim(s),
  listBullet: (s: string) => chalk.cyan(s),
  bold: (s: string) => chalk.bold(s),
  italic: (s: string) => chalk.italic(s),
  strikethrough: (s: string) => chalk.strikethrough(s),
  underline: (s: string) => chalk.underline(s),
};
