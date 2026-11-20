#!/usr/bin/env node
/**
 * 重新生成 scripts/bundled-packages.json —— "真正被打进前端产物"的第三方包清单。
 *
 * 为什么需要单独的构建：默认的 rspack stats 会把模块折叠成
 * `./src/main.tsx + 156 modules`，数不全。这里临时关闭 module concatenation，
 * 把统计用的产物输出到 scripts/.stats-out（不污染 chat-demo/dist），
 * 只为拿到完整的模块清单。
 *
 * 注意：这会读取 ../chat-demo 的 rspack 配置并做一次构建（不修改其源码与产物）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const shellRoot = path.resolve(here, '..');
const chatDemo = path.resolve(shellRoot, '..', 'chat-demo');
const cfgPath = path.join(chatDemo, 'rspack.config.ts');

if (!fs.existsSync(cfgPath)) {
  console.error(`✗ 找不到 ${cfgPath}（需要 chat-demo 源码目录）`);
  process.exit(1);
}

process.env.NODE_ENV = 'production';

// @rspack/core 装在 chat-demo 里（本壳项目没有），所以从那边解析
const req = createRequire(path.join(chatDemo, 'package.json'));
const rspackEntry = req.resolve('@rspack/core');
const { rspack } = await import(pathToFileURL(rspackEntry).href);
const cfgMod = await import(pathToFileURL(cfgPath).href);
const createConfig = cfgMod.createConfig ?? (() => cfgMod.default);

const outDir = path.join(here, '.stats-out');
const config = createConfig();
config.optimization = { ...(config.optimization || {}), concatenateModules: false, minimize: false };
config.output = { ...config.output, path: outDir, clean: true };
// chat-demo 的配置里 entry/模板用的是相对路径，必须在它的目录下解析
config.context = chatDemo;
process.chdir(chatDemo);

/** 从模块路径里取包名：取最后一个 node_modules 之后的段（兼容 pnpm 的 .pnpm/<pkg>@<ver>/node_modules/<pkg>） */
function pkgOf(name) {
  if (!name) return null;
  const parts = String(name).split(/[\\/]/);
  let idx = -1;
  for (let i = 0; i < parts.length; i++) if (parts[i] === 'node_modules') idx = i;
  if (idx < 0) return null;
  const rest = parts.slice(idx + 1);
  if (!rest.length) return null;
  if (rest[0].startsWith('@')) return rest.length > 1 ? `${rest[0]}/${rest[1]}` : rest[0];
  return rest[0];
}

const compiler = rspack(config);
compiler.run((err, stats) => {
  if (err) {
    console.error('✗ 编译失败:', err.message);
    process.exit(1);
  }

  const json = stats.toJson({
    all: false,
    modules: true,
    nestedModules: true,
    modulesSpace: 1000000,
    chunks: true,
    chunkModules: true,
    source: false,
  });

  const names = new Set();
  const walk = (mods) => {
    for (const m of mods || []) {
      const p = pkgOf(m.name);
      if (p) names.add(p);
      if (m.modules) walk(m.modules);
    }
  };
  walk(json.modules);
  for (const c of json.chunks || []) walk(c.modules);

  const folded = (json.modules || []).filter((m) => /\+\s*\d+\s*modules/.test(String(m.name))).length;
  const list = [...names].sort();

  // 防护：拿不到模块说明构建没真正跑起来，绝不能覆盖已有清单
  if (!list.length) {
    const msgs = (json.errors || []).map((e) => e.message).join(' | ');
    console.error('✗ 没有统计到任何第三方包，已放弃写入（保留原清单）。');
    if (msgs) console.error('  编译错误: ' + msgs.slice(0, 500));
    fs.rmSync(outDir, { recursive: true, force: true });
    process.exit(1);
  }

  fs.writeFileSync(path.join(here, 'bundled-packages.json'), JSON.stringify(list, null, 2) + '\n');
  fs.rmSync(outDir, { recursive: true, force: true });

  console.log(`模块数: ${(json.modules || []).length}  仍被折叠: ${folded}`);
  console.log(`第三方包: ${list.length}`);
  console.log('已写入 scripts/bundled-packages.json');
  console.log('下一步: node scripts/gen-notices.mjs');

  compiler.close(() => {});
});
