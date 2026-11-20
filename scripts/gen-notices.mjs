#!/usr/bin/env node
/**
 * 生成 THIRD_PARTY_NOTICES.txt（随 APK/IPA 分发的第三方许可声明）。
 *
 * 数据来源：
 *   1. bundled-packages.json —— 由 rspack stats 实测得出"真正被打进前端产物"的包清单
 *      （生成方式见 README「许可声明」一节）
 *   2. chat-demo/node_modules 与 deepseek-shell/node_modules —— 取其 package.json 的
 *      license 字段与包内附带的 LICENSE/COPYING/NOTICE 全文
 *
 * 输出：
 *   dist/THIRD_PARTY_NOTICES.txt   （App 内"关于"页读取）
 *   THIRD_PARTY_NOTICES.txt        （随发布包一起分发）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const shellRoot = path.resolve(here, '..');
const appRoot = path.resolve(shellRoot, '..');

const CHAT_DEMO = path.join(appRoot, 'chat-demo');
const NM_ROOTS = [path.join(CHAT_DEMO, 'node_modules'), path.join(shellRoot, 'node_modules')];

// 原生壳自身依赖（不在前端 bundle 里，但确实随 App 分发）
const NATIVE_PKGS = ['@capacitor/core', '@capacitor/android', '@capacitor/ios'];

const LICENSE_FILE_RE = /^(licen[cs]e|copying|copyright|notice)(\.(md|txt|markdown))?$/i;

const readJson = (p) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
};

/** 在 node_modules 与 pnpm store 中定位某个包的所有副本 */
function locate(name) {
  const found = [];
  const storeKey = name.replace('/', '+');
  for (const root of NM_ROOTS) {
    const direct = path.join(root, name, 'package.json');
    if (fs.existsSync(direct)) found.push(path.dirname(direct));

    const store = path.join(root, '.pnpm');
    if (fs.existsSync(store)) {
      for (const entry of fs.readdirSync(store)) {
        if (!entry.startsWith(storeKey + '@')) continue;
        const cand = path.join(store, entry, 'node_modules', name, 'package.json');
        if (fs.existsSync(cand)) found.push(path.dirname(cand));
      }
    }
  }
  // 去重（按真实路径）
  const seen = new Set();
  return found.filter((d) => {
    const key = path.resolve(d).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function licenseTextOf(dir) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return null; }
  const hits = entries
    .filter((e) => e.isFile() && LICENSE_FILE_RE.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => a.length - b.length);
  for (const file of hits) {
    try {
      const text = fs.readFileSync(path.join(dir, file), 'utf8').trim();
      if (text) return { file, text };
    } catch { /* ignore */ }
  }
  return null;
}

const normLicense = (pkg) => {
  const l = pkg.license ?? pkg.licenses;
  if (typeof l === 'string') return l;
  if (Array.isArray(l)) return l.map((x) => (typeof x === 'string' ? x : x?.type)).filter(Boolean).join(' OR ');
  if (l?.type) return l.type;
  return 'UNKNOWN';
};

function collect(names) {
  const out = [];
  for (const name of names) {
    const dirs = locate(name);
    if (!dirs.length) {
      out.push({ name, version: '?', license: 'UNKNOWN', text: null, file: null });
      continue;
    }
    for (const dir of dirs) {
      const pkg = readJson(path.join(dir, 'package.json')) || {};
      const lt = licenseTextOf(dir);
      const repo = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url || '';
      out.push({
        name,
        version: pkg.version || '?',
        license: normLicense(pkg),
        text: lt?.text ?? null,
        file: lt?.file ?? null,
        repo: repo.replace(/^git\+/, '').replace(/\.git$/, ''),
      });
    }
  }
  return out;
}

const bundled = JSON.parse(fs.readFileSync(path.join(here, 'bundled-packages.json'), 'utf8'));
const upstreamLicense = fs.readFileSync(path.join(CHAT_DEMO, 'LICENSE'), 'utf8').trim();

const all = collect([...bundled, ...NATIVE_PKGS]).sort(
  (a, b) => a.name.localeCompare(b.name) || String(a.version).localeCompare(String(b.version))
);

const banner = (t) => `${'='.repeat(60)}\n${t}\n${'='.repeat(60)}`;

const parts = [];
parts.push(
  banner('THIRD-PARTY SOFTWARE NOTICES AND LICENSES'),
  '',
  '本文件随本应用一起分发，用于履行各开源组件许可证所要求的“保留版权声明与许可声明”义务。',
  '',
  '本应用（包名 com.dsdemo.shell，非官方打包）是一个非官方的第三方打包封装，不隶属于 DeepSeek，也未获得其背书。',
  '',
  '组成部分：',
  '  1. DeepSeek 官方开源前端 chat-demo（MIT）——见第 1 节；',
  '  2. Capacitor 原生桥（MIT）——见第 2 节；',
  `  3. 被打进前端产物的第三方开源包（共 ${bundled.length} 个）——见第 3 节。`,
  '',
  '第 3 节的包清单由构建期 rspack 模块统计实测得出，即真正随包分发的代码。',
  ''
);

parts.push(banner('1. DeepSeek chat-demo（上游前端，MIT License）'), '');
parts.push('来源: https://github.com/deepseek-ai/chat-demo', '');
parts.push(upstreamLicense, '');

parts.push(banner('2. Capacitor 原生桥（MIT License）'), '');
parts.push('来源: https://github.com/ionic-team/capacitor', '');
const cap = all.find((p) => p.name === '@capacitor/core');
if (cap?.text) parts.push(cap.text, '');
else parts.push('（未能读取许可文本，请参见 https://github.com/ionic-team/capacitor/blob/main/LICENSE）', '');

parts.push(banner(`3. 前端产物中的第三方组件（${bundled.length} 个）`), '');
parts.push('格式：包名 版本 —— 许可证类型（包内许可文件名）', '');
for (const p of all) {
  parts.push(`  ${p.name} ${p.version} — ${p.license}${p.file ? ` (${p.file})` : ''}`);
}
parts.push('');

const grouped = new Map();
for (const p of all) {
  if (!grouped.has(p.name)) grouped.set(p.name, []);
  grouped.get(p.name).push(p);
}

for (const [name, items] of [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  for (const p of items) {
    parts.push(banner(`${name} ${p.version}`), '');
    parts.push(`License: ${p.license}${p.file ? `   (${p.file})` : ''}`, '');
    if (p.text) parts.push(p.text, '');
    else {
      parts.push(
        `（该包发布时未附带许可文本文件；其 package.json 标注的许可证为 ${p.license}。）`
      );
      if (p.repo) parts.push(`上游仓库（许可见此）: ${p.repo}`);
      parts.push('');
    }
  }
}

const text = parts.join('\n');
const distFile = path.join(shellRoot, 'dist', 'THIRD_PARTY_NOTICES.txt');
const rootFile = path.join(shellRoot, 'THIRD_PARTY_NOTICES.txt');
// dist 内这份给 WebView 读（UTF-8 无 BOM，fetch().text() 直接可用）
fs.mkdirSync(path.dirname(distFile), { recursive: true });
fs.writeFileSync(distFile, text, 'utf8');
// 独立分发这份加 BOM，兼容 Windows 上按 ANSI 猜编码的老工具（记事本/Excel 等）
fs.writeFileSync(rootFile, '\ufeff' + text, 'utf8');
const targets = [distFile, rootFile];

const missing = all.filter((p) => !p.text).map((p) => `${p.name}@${p.version}`);
console.log(`包条目: ${all.length}（唯一包名 ${grouped.size}）`);
console.log(`写入: ${targets.map((t) => path.relative(shellRoot, t)).join('  +  ')}`);
console.log(`大小: ${(Buffer.byteLength(text) / 1024).toFixed(1)} KB`);
if (missing.length) console.log(`缺许可文本(${missing.length}): ${missing.join(', ')}`);
