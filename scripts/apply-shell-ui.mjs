#!/usr/bin/env node
/**
 * 把「关于」入口注入到 dist/（幂等，可反复执行）。
 *
 * 为什么是注入而不是改源码：chat-demo 源码要保持原样，这里只加工我们自己的构建产物；
 * 每次重新生成 dist 后跑一次即可。
 *
 * 做的事：
 *   1. 复制 scripts/ui/shell-about.{css,js} → dist/
 *   2. 在 dist/index.html 的 <head>/<body> 末尾插入对应标签（已存在则跳过）
 *   3. 检查 dist/THIRD_PARTY_NOTICES.txt 是否存在（不存在则提示先跑 gen-notices）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const shellRoot = path.resolve(here, '..');
const dist = path.join(shellRoot, 'dist');
const uiDir = path.join(here, 'ui');

const CSS = 'shell-about.css';
const JS = 'shell-about.js';
const MARKER = 'dsh-shell-ui';

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error(`✗ 找不到 ${path.join(dist, 'index.html')}，请先准备 dist/`);
  process.exit(1);
}

for (const f of [CSS, JS]) {
  fs.copyFileSync(path.join(uiDir, f), path.join(dist, f));
}

const indexPath = path.join(dist, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

if (html.includes(MARKER)) {
  console.log('index.html 已包含注入标记，跳过标签插入（静态资源已刷新）');
} else {
  const cssTag = `<!-- ${MARKER} css --><link rel="stylesheet" href="${CSS}">`;
  const jsTag = `<!-- ${MARKER} js --><script defer src="${JS}"></script>`;

  if (!html.includes('</head>') || !html.includes('</body>')) {
    console.error('✗ index.html 结构异常（缺少 </head> 或 </body>）');
    process.exit(1);
  }
  html = html.replace('</head>', `${cssTag}</head>`);
  html = html.replace('</body>', `${jsTag}</body>`);
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('已在 index.html 注入 shell-about 的 <link> 与 <script>');
}

const notices = path.join(dist, 'THIRD_PARTY_NOTICES.txt');
if (!fs.existsSync(notices)) {
  console.warn('⚠ dist/THIRD_PARTY_NOTICES.txt 不存在，App 内许可页会回退到 LICENSE。先运行: node scripts/gen-notices.mjs');
} else {
  console.log(`✓ 许可清单: ${(fs.statSync(notices).size / 1024).toFixed(1)} KB`);
}

console.log(`✓ 已就位: dist/${CSS}, dist/${JS}`);
console.log('后续: npx cap sync（把 dist 同步进 android/ 与 ios/）');
