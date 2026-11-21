#!/usr/bin/env node
/**
 * 把壳层注入的 UI（「关于」入口 + 首次启动引导页）注入到 dist/（幂等，可反复执行）。
 *
 * 为什么是注入而不是改源码：chat-demo 源码要保持原样，这里只加工我们自己的构建产物；
 * 每次重新生成 dist 后跑一次即可。
 *
 * 做的事：
 *   1. 复制 scripts/ui/ 下的静态资源 → dist/
 *   2. 在 dist/index.html 的 <head>/<body> 末尾插入对应标签（已存在则跳过）
 *   3. 检查 dist/THIRD_PARTY_NOTICES.txt（不存在则提示先跑 gen-notices）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const shellRoot = path.resolve(here, '..');
const dist = path.join(shellRoot, 'dist');
const uiDir = path.join(here, 'ui');

const MARKER = 'dsh-shell-ui';

/** 需要注入的资源清单（顺序即注入顺序；about 在前，onboarding 在后） */
const ASSETS = [
  { css: 'shell-about.css', js: 'shell-about.js' },
  { css: 'shell-onboarding.css', js: 'shell-onboarding.js' },
];

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error(`✗ 找不到 ${path.join(dist, 'index.html')}，请先准备 dist/`);
  process.exit(1);
}

const copied = [];
for (const a of ASSETS) {
  for (const f of [a.css, a.js]) {
    fs.copyFileSync(path.join(uiDir, f), path.join(dist, f));
    copied.push(`dist/${f}`);
  }
}

const indexPath = path.join(dist, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

if (!html.includes('</head>') || !html.includes('</body>')) {
  console.error('✗ index.html 结构异常（缺少 </head> 或 </body>）');
  process.exit(1);
}

// 逐资源判断，避免"已有旧标记就整段跳过"导致新增资源注入不进去
let addedCss = 0;
let addedJs = 0;
for (const a of ASSETS) {
  if (!html.includes(`href="${a.css}"`)) {
    html = html.replace('</head>', `<!-- ${MARKER} css --><link rel="stylesheet" href="${a.css}"></head>`);
    addedCss += 1;
  }
  if (!html.includes(`src="${a.js}"`)) {
    html = html.replace('</body>', `<!-- ${MARKER} js --><script defer src="${a.js}"></script></body>`);
    addedJs += 1;
  }
}
if (addedCss || addedJs) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log(`已在 index.html 注入: ${addedCss} 个 <link>、${addedJs} 个 <script>`);
} else {
  console.log('index.html 已包含全部壳层 UI 标签，跳过注入（静态资源已刷新）');
}

const notices = path.join(dist, 'THIRD_PARTY_NOTICES.txt');
if (!fs.existsSync(notices)) {
  console.warn('⚠ dist/THIRD_PARTY_NOTICES.txt 不存在，App 内许可页会回退到 LICENSE。先运行: node scripts/gen-notices.mjs');
} else {
  console.log(`✓ 许可清单: ${(fs.statSync(notices).size / 1024).toFixed(1)} KB`);
}

console.log(`✓ 已就位: ${copied.join(', ')}`);
console.log('后续: npx cap sync（把 dist 同步进 android/ 与 ios/）');
