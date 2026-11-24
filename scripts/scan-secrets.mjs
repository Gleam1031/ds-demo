#!/usr/bin/env node
/**
 * 密钥泄漏自检：扫描仓库内所有文本文件，发现疑似真实密钥就报错退出。
 *
 * 用途：提交前/发版前跑一次；也可挂进 CI。
 *   node scripts/scan-secrets.mjs
 *
 * 只报警并隐去内容——命中处只显示"文件:行号"和前缀，不打印完整密钥，
 * 避免二次泄漏（比如把终端输出贴到聊天里）。
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')

/** 常见密钥形态；宁可误报也不要漏报 */
const RULES = [
  { name: 'DeepSeek / OpenAI 风格', re: /\bsk-[A-Za-z0-9_-]{20,}/g },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}/g },
  { name: 'AWS Access Key', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g },
  { name: '私钥块', re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g },
]

/** 这些目录/文件不扫：构建产物、依赖、二进制 */
const SKIP_DIRS = new Set(['node_modules', '.git', 'build', 'dist', 'ios', 'android'])
const SKIP_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.apk', '.jar', '.zip', '.gz',
  '.so', '.dll', '.exe', '.class', '.dex', '.woff', '.woff2', '.ttf', '.pdf',
])

/** 白名单：文档里用于演示的假值 */
const ALLOW = [/sk-demo/i, /sk-1234567890/i, /sk-your-key/i, /sk-xxx+/i]

const findings = []

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.gitignore') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      walk(full)
      continue
    }
    if (SKIP_EXT.has(path.extname(entry.name).toLowerCase())) continue
    let stat
    try {
      stat = fs.statSync(full)
    } catch {
      continue
    }
    if (stat.size > 2 * 1024 * 1024) continue

    let text
    try {
      text = fs.readFileSync(full, 'utf8')
    } catch {
      continue
    }
    const lines = text.split('\n')
    lines.forEach((line, index) => {
      for (const rule of RULES) {
        rule.re.lastIndex = 0
        const match = rule.re.exec(line)
        if (!match) continue
        if (ALLOW.some((pattern) => pattern.test(match[0]))) continue
        findings.push({
          file: path.relative(ROOT, full).replace(/\\/g, '/'),
          line: index + 1,
          rule: rule.name,
          // 只留前 6 个字符，够定位、不足以还原
          masked: match[0].slice(0, 6) + '***',
        })
      }
    })
  }
}

walk(ROOT)

if (findings.length === 0) {
  console.log('✅ 未发现疑似密钥')
  process.exit(0)
}

console.error(`✗ 发现 ${findings.length} 处疑似密钥：`)
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}  [${f.rule}]  ${f.masked}`)
}
console.error('\n请立即：1) 删除这些内容  2) 到对应平台吊销并重新签发  3) 勿只删提交（历史仍可查）')
process.exit(1)
