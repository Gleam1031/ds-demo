#!/usr/bin/env node
/**
 * 应用 deepseek-shell/patches/*.patch 到 ../chat-demo（幂等）。
 *
 * 背景：chat-demo 是上游前端，我们默认不改它；但对**必须修的上游缺陷**，
 * 改动记录在这里的 patch 文件里，以便：
 *   - 重新 clone 上游后能一键复原
 *   - 升级 chat-demo 时知道我们改了什么
 *
 * 用法：
 *   node scripts/apply-chat-demo-patches.mjs          # 应用全部
 *   node scripts/apply-chat-demo-patches.mjs --check  # 只检查状态，不落地
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const shellRoot = path.resolve(here, '..');
const repo = path.resolve(shellRoot, '..', 'chat-demo');
const patchDir = path.join(shellRoot, 'patches');
const checkOnly = process.argv.includes('--check');

if (!fs.existsSync(path.join(repo, '.git'))) {
  console.error(`✗ 找不到 chat-demo 仓库：${repo}`);
  process.exit(1);
}

const patches = fs.existsSync(patchDir)
  ? fs.readdirSync(patchDir).filter((f) => f.endsWith('.patch')).sort()
  : [];

if (patches.length === 0) {
  console.log('没有 patches/*.patch，跳过');
  process.exit(0);
}

const git = (args) => {
  try {
    return { ok: true, out: execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }) };
  } catch (error) {
    return { ok: false, out: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
};

let applied = 0;
let skipped = 0;
let failed = 0;

for (const name of patches) {
  const file = path.join(patchDir, name);

  // 已应用过（可以反向成功）= 跳过
  const reverse = git(['apply', '--check', '--reverse', file]);
  if (reverse.ok) {
    console.log(`= ${name} 已应用，跳过`);
    skipped += 1;
    continue;
  }

  const forward = git(['apply', '--check', file]);
  if (!forward.ok) {
    console.error(`✗ ${name} 无法应用（上游可能已改）：\n${forward.out.trim()}`);
    failed += 1;
    continue;
  }

  if (checkOnly) {
    console.log(`? ${name} 未应用，可以应用`);
    continue;
  }

  const res = git(['apply', file]);
  if (res.ok) {
    console.log(`+ ${name} 已应用`);
    applied += 1;
  } else {
    console.error(`✗ ${name} 应用失败：\n${res.out.trim()}`);
    failed += 1;
  }
}

console.log(`\n小结：应用 ${applied}，跳过 ${skipped}，失败 ${failed}`);
if (failed > 0) process.exit(1);
