# 项目交接书 — DS Demo（DeepSeek 官方前端 chat-demo 的 Capacitor 原生壳）

> 交接对象：另一个窗口/会话里的接手者（人或 AI Agent）
> 交接时间：2026-11-20
> 阅读建议：**先看第 0、4、12 节**，再按需翻细节。第 12 节是硬约束，违反会破坏已有成果。

---

## 0. 一句话摘要

把 DeepSeek 官方开源的静态聊天前端 [`deepseek-ai/chat-demo`](https://github.com/deepseek-ai/chat-demo)（MIT）的构建产物，用 **Capacitor 8** 封装成一个可独立安装的原生 App（Android 已出 APK，iOS 工程已生成但未构建）。
**未修改 chat-demo 任何源码**；改名后应用显示名为 **DS Demo**、包名 **`com.dsdemo.shell`**；已补齐 MIT 版权声明、95 个第三方组件的许可声明、以及 App 内「关于」入口。

---

## 1. 坐标系：所有关键路径

工作区根：`C:\Users\huiye\Documents\deepseek-harness\default-workspace`

```
deepseek-app/
├── HANDOVER.md                 ← 本文件
├── chat-demo/                  ← 官方源码（只 clone + 构建，未改一行；git 工作区干净）
│   └── dist/                   ← 构建产物（153 文件 / 4.19 MB）
└── deepseek-shell/             ← ★ 交付物：壳项目（真正的工程在这里）
    ├── dist/                   ← 156 文件 / 4.41 MB（= chat-demo/dist + 注入文件 + NOTICES）
    ├── capacitor.config.json   ← appId=com.dsdemo.shell, appName=DS Demo, webDir=dist
    ├── package.json            ← Capacitor 8.6.2；scripts: sync / open:android / open:ios / apk
    ├── scripts/                ← ★ 壳层增强脚本（见第 5 节）
    ├── THIRD_PARTY_NOTICES.txt ← 208.5 KB，随发布包分发（带 BOM）
    ├── README.md               ← 面向使用者的说明（较完整，可作参考）
    ├── android/                ← Android 工程（含 Gradle wrapper 8.14.3）
    ├── ios/                    ← iOS 工程（SPM，无需 CocoaPods；Windows 无法构建）
    └── docs/                   ← 渲染预览 + 真机截图
```

产物 APK：`deepseek-app\deepseek-shell\android\app\build\outputs\apk\debug\app-debug.apk`
（5.92 MB，SHA-256 `0a4e0f88…edb902`）

---

## 2. 项目目标与边界

**目标**：让 chat-demo 能以原生 App 形式安装运行（Android / iOS 双端壳）。

**明确边界（用户反复强调过）**：
1. 不修改 chat-demo 源码来"适配" Capacitor —— 它本身就是可静态托管的 SPA，只消费它的 `dist/`
2. 不在 `capacitor.config.json` 里配置 `server.url` —— 否则会变成远程加载，失去本地壳的意义
3. 不用 Cordova，只用 Capacitor

---

## 3. 时间线：做过什么（按阶段）

| 阶段 | 做了什么 | 结果 |
|---|---|---|
| A. 取产物 | clone chat-demo → `pnpm install`（235 包）→ 构建 | `dist/index.html` + 153 文件 |
| B. 建壳 | `npm init` → 装 `@capacitor/core|cli` 8.6.2 → `cap init` | `capacitor.config.json` |
| C. 接入 | 整目录复制 `dist/` 进壳项目 | 逐字节一致（4,395,125 B） |
| D. 加平台 | `@capacitor/android|ios` → `cap add` ×2 → `cap sync` | 两端工程 + assets 同步 |
| E. 装工具链 | JDK 21（zip）、Android SDK（cmdline-tools 12.0 + build-tools 36 + platform 36）、Gradle 8.14.3 | 详见第 7 节，已持久化到用户环境变量 |
| F. 真机验证 | 装 APK → 三项验证（流式对话/语音/读链接） | ①②通过，③失败（API 侧，非壳问题），详见第 9 节 |
| G. 合规补全 | 加「关于」页（右上角 ⋮）、生成第三方许可清单 | 见第 5 节 |
| H. 改名 | 应用名 → **DS Demo**，包名 → **`com.dsdemo.shell`** | 与旧包并存，旧包未被覆盖 |

---

## 4. 当前状态快照（交接时的事实）

| 项 | 值 |
|---|---|
| 应用显示名 | **DS Demo** |
| 包名 / applicationId / iOS bundle id | **`com.dsdemo.shell`** |
| 版本 | versionCode 1 / versionName 1.0 |
| minSdk / targetSdk / compileSdk | 24 / 36 / 36 |
| Capacitor | 8.6.2 |
| Node / pnpm | v24.22.1 / 12.21.0（corepack 提供） |
| JDK | 21.0.13.0.2（Microsoft OpenJDK）`C:\Android\jdk-21` |
| Android SDK | `C:\Android\Sdk`：platform-tools 37.0.1、build-tools 36.0.0（另有 35.0.0 由 AGP 自动补装）、platforms android-36、cmdline-tools 12.0 |
| Gradle | 8.14.3（wrapper 已就绪，发行包已植入缓存） |
| 真机 | `10AF5B2FFY002LY`（vivo V2444A，720×1608 @320dpi → CSS 视口 360×804），WebView 126.0.6478.71 |
| 手机上并存的两个包 | `com.dsdemo.shell`（新版，2026-11-20 装）＋ `com.deepseek.shell`（**旧版，用户要求保留，未覆盖**） |
| chat-demo 工作区 | **有一组受控修改**（11 个文件改造 + 5 个新文件），见 `patches/0001-chat-demo-customizations.patch` 与 5.5/5.6 节 |

> 注意：旧包 `com.deepseek.shell` 仍叫 "DeepSeek"，是历史产物。用户明确要求**不要覆盖**它（里面有他的 API Key 与聊天记录）。

---

## 5. 壳层增强：脚本与机制（最容易被接手者忽略的部分）

### 5.1 脚本清单

| 脚本 | 作用 |
|---|---|
| `scripts/gen-bundled-packages.mjs` | 用 rspack 统计**真正被打进产物**的第三方包 → 写 `scripts/bundled-packages.json`（当前 95 个） |
| `scripts/gen-notices.mjs` | 按上述清单逐包抓 version/license/许可全文 → 生成 `THIRD_PARTY_NOTICES.txt`（根目录带 BOM；`dist/` 内无 BOM） |
| `scripts/apply-shell-ui.mjs` | 把 `scripts/ui/` 下资源复制进 `dist/` 并向 `dist/index.html` 注入标签（**按资源逐个判断**，后续新增资源也能注入）；若 `dist/THIRD_PARTY_NOTICES.txt` 缺失会**自动调用 gen-notices 补生成**，仍失败则退出 1 |
| `scripts/ui/shell-about.js` / `.css` | 「关于」按钮与许可面板的实现 |
| `scripts/ui/shell-onboarding.js` / `.css` | 首次启动引导页：解释 API Key → 官网三步操作 → 直接填写保存 |
| `scripts/apply-chat-demo-patches.mjs` | 把 `patches/*.patch` 幂等地应用到 `../chat-demo`（`--check` 只检查、不落地） |

### 5.2 「关于」入口的设计要点（改动前务必理解）

> **只在主页显示**：入口（右上角 ⋮，`#dsh-about-btn`）只在欢迎页出现，会话页隐藏。`shell-about.js` 的 `syncVisibility()` 用 `document.querySelector('[class*="welcome-"]')` 判断当前是否主页（会话页渲染 SessionView，没有该容器），随 `place()` 每 800ms 同步一次，并给按钮加 `.dsh-about-hidden`（CSS 里 `display:none !important`）；同时若面板开着会 `closePanel()`。**不要改成"每个页面都显示"**——用户明确要求只在主页。

- 按钮挂在 `document.body`，**不动 chat-demo 的 React 树**
- 层级：按钮 `z-index:940`（低于 chat-demo 自己的弹窗 1000+，所以设置弹窗会自然盖住它）；backdrop 998；面板 999
- **位置自适应**：主页右上角为空 → `right:10px`；若该位置被 App 的「新对话」按钮占用 → 自动让位 `right:62px`（几何探测，不依赖 class 名）
- 触屏 `:hover` 会粘住灰底，hover 样式被包在 `@media (hover: hover)` 里；**不要改回去**
- 面板聚焦面板本身（`tabindex=-1`）而不是关闭按钮，避免移动端出现焦点环
- 关于页文案里含应用名与包名，改名时必须同步改 `shell-about.js` 里的 `PKG` 常量与「应用」那一行

### 5.3 首次启动引导页（onboarding）的设计要点

- **触发条件**：`localStorage` 里既没有 `chat-demo:api-key`，也没有 `ds-onboarding-done` 标记
- **层级 1100**：必须盖住 chat-demo 自带的设置弹窗（1000/1050）
- **外链用普通 `<a href>`**：Capacitor 的 `shouldOverrideUrlLoading` 会对非 `localhost` 的主帧跳转调用 `launchIntent` → 系统浏览器（`Bridge.java` L414-424），App 界面不会丢。**不要改用 `window.open`**（`onCreateWindow` 未实现，可能毫无反应）
- **保存流程**：写 `chat-demo:api-key` → 置 `ds-onboarding-done` → `location.reload()`，让 chat-demo 的 zustand store 重新读取
  - ⚠️ 这里**依赖上游内部存储键** `chat-demo:api-key`（见 `chat-demo/src/services/settings.ts` 的 `KEYS`）。上游改版可能失效，失效后的回退是让用户去设置页手填 —— 不是致命问题，但要知情
- **「稍后再说」**：置标记并移除本页，露出 chat-demo 自带设置页（同样有输入框），不会卡死
- **三步文案**（注册/创建 Key/充值）基于 DeepSeek 开放平台当前界面，**平台改版后需同步**；文案集中在 `shell-onboarding.js` 一处，易改

### 5.4 许可清单的两个坑（已踩过）

1. 默认 rspack stats 会把模块折叠成 `./src/main.tsx + 156 modules`，只数出 37 个包 → 必须**关闭 module concatenation** 才能数全（95 个）
2. 12 个 `micromark-*` 包**发布时本身就没带 LICENSE 文件**，清单里标注了 `license` 字段与上游仓库地址，**不要伪造许可文本**

### 5.5 上游修复：单请求 document 块上限（`patches/0001`）

**问题**：一次请求里 document 块超过 20 个时，服务端返回英文错误并让整轮对话失败：

```
messages: Too many documents: max 20 document blocks per request, got 27
(repeated references to the same file_id count separately)
```

**关键认知**（容易搞错）：这个 20 是**单次请求**的总数，而 chat-demo 每次请求都会把**整段历史**的附件重新以 `document` 块发出（API 无状态），所以限制会**跨轮累计**——不是"每条消息 20 个"。

**修法**：`toRequestMessages()` 末尾调用 `pruneDocumentBlocks()`，从**最新**往前保留 20 个 document 块，更早的替换成一句文字占位 `[附件已省略：单次请求最多引用 20 个文档]`。这样整轮不会失败，被省略的部分也不再发给模型。

**验证方式**（可复现）：用 `createConfig({ apiOrigin: 'http://127.0.0.1:<mock>' })` 构建测试产物，mock 记录 `/anthropic/v1/messages` 请求体；无头浏览器通过 CDP `DOM.setFileInputFiles` 塞 21 个 txt 并发送，断言请求里 `document` 块 = 20、占位 = 1。注意 mock 的 CORS `access-control-allow-headers` **必须包含 `x-api-key`**，否则预检失败会误判成 App 的问题。

> 图片块（`image`）不受此限，官方限单请求 600 张，所以**只裁 document，不裁 image**。

**维护**：`node scripts/apply-chat-demo-patches.mjs`（幂等）。升级 chat-demo 后先跑它；若补丁因上游改动无法应用，脚本会报错退出而不是静默跳过。

### 5.6 另外三处客户端增强（同一补丁内）

| 功能 | 关键实现 |
|---|---|
| **附件省略提示** | `reply.ts` 的 `pruneDocumentBlocks` 返回被省略数量，`toRequestMessages` 触发 `showToast({ key: 'documentBlocksOmitted', params })`（复用 chat-demo 自带 Toast）。文案键 zh/en 都加 |
| **聊天记录搜索** | 侧边栏「开启新对话」上方按钮（`styles.searchSessions`，与 newChat 同为 40px 高、100% 宽）；弹窗 `SessionSearch.tsx` + 状态 `sessionSearchState.ts`；查询走 `services/chat/search.ts`：直接读 IndexedDB 的 `sessions`（`db.ts` 新导出 `loadAllSessions`），匹配标题与消息正文（用户正文 + 回答文本块），片段带 `…` 截断，180ms 防抖 |
| **对话置顶** | `services/chat/pins.ts`：置顶 id 存 `localStorage['chat-demo:pinned-sessions']`；`splitPinned()` 把置顶项提到最前，`Sider` 渲染「置顶」分区；`SessionItem` 菜单加「置顶/取消置顶」并显示图钉；**触屏支持长按标题**（450ms，位移 >12px 才取消，避免轻微抖动导致失效），长按后抬起不再切换会话 |
| **个性化页** | 设置 → 通用设置 → 位置信息下方「个性化」进入**弹窗内子页面**（`PersonalizationPanel.tsx`，`SettingsDialog` 用 `personalizationOpen` 切换，返回即回到原分组）。三项：①系统提示词（占位＝默认提示词，灰色；有值用主题色）；②思考强度 5 档滑杆；③恢复默认设置。存储见下节 |
| **拍照上传** | `ChatInput` 工具栏在语音与附件之间新增相机按钮 + 隐藏的 `<input type="file" accept="image/*" capture="environment">`；照片经现有 `acceptFiles()` 走同一上传/预览链路。**不要给 App 声明 CAMERA 权限**——Capacitor 只在"未声明"该权限时才直接走 `ACTION_IMAGE_CAPTURE`，声明了反而要运行时授权（见 `BridgeWebChromeClient.isMediaCaptureSupported()`） |

> 搜索弹窗挂在 `App.tsx` 根部，不随侧边栏抽屉关闭而卸载。

**搜索性能**（本机真实库：3806 个会话 / 31.5 MB 文本实测）：

| 阶段 | 耗时 | 说明 |
|---|---|---|
| 冷启动首次搜索 | ~3.7 s | 瓶颈是 IndexedDB 一次性读取全部会话（3.5 s），扫描本身只要 15 ms |
| 热搜索（索引已建） | ~0.4 s | 含 180 ms 防抖；索引缓存 TTL 60 s，会话有增删/新消息时签名变化会自动重建 |
| 打开侧边栏预热后 | **~0.4 s** | `Sider` 挂载后 300 ms 调 `warmSessionSearchIndex()`，用户看完列表再搜索基本无感 |

两条关键取舍（改之前先读）：
1. **用 `new RegExp(escapeRegExp(q), 'i')` 而不是 `toLowerCase().includes()`**——实测前者 15 ms、后者 229 ms（31.5 MB 文本），且正则不额外复制一份小写文本占内存；
2. **索引只缓存 60 秒**，长期常驻会增加约 30 MB 内存；签名（条数 + updatedAt 之和）变化时立即重建，避免搜到过期内容。

### 5.7 附件查看器（修复"点开附件后回不来"）

**现象**：在 App 内点任意附件（图片或其他文件）后无法回到聊天，只能杀掉重进。

**根因**（源码 + 真机复现确认）：
- chat-demo 打开附件用的是 `blob:` URL —— 图片是 `<a href="blob:…" target="_blank">`，其他文件是 `window.open(url, '_blank')`；
- Capacitor 的 `Bridge.launchIntent()` 对 `blob:` **直接返回 false**（`Bridge.java` L409），意思是"交给 WebView 自己处理"；
- Capacitor 又没开启多窗口（未调用 `setSupportMultipleWindows`），新窗口请求退化为**就地导航**；
- 结果 App 界面被替换成文件内容，没有返回入口；实测连 Activity 都会被切到桌面。

**修法**（纯壳层注入，未改 chat-demo）：`scripts/ui/shell-file-viewer.js`
- 捕获阶段拦截所有 `a[href^="blob:"]` 的点击，`preventDefault + stopPropagation`；
- 包装 `window.open`，`blob:` 参数交给自己的查看器，其他 URL 走原实现；
- 查看器先用 `Image` 探测：能解码就全屏看图（点图 / 右上角 ✕ / Esc 关闭），否则显示"暂不支持应用内预览"的说明卡片 + 文件名 + 大小 + 返回按钮。
- 层级 2000，高于 chat-demo 弹窗（1000+）、关于页（999）、引导页（1100）。

**已验证**（真机 CDP 注入 blob 实测）：图片打开后 `location.href` 仍是 `https://localhost/`、点击图片即关闭；文本 blob 显示说明卡片、点「返回聊天」关闭；两种情况 App 都没有被导航走。

### 5.8 个性化：系统提示词与思考强度

**UI 细节**（`PersonalizationPanel.tsx` + `Settings.module.css`）：

- 系统提示词框：**宽度固定整行，只让高度自适应**。铺满容器宽（`width:100%`），高度在 `useLayoutEffect` 里 `height:auto → scrollHeight`（最小 40px＝一行），所以写几行就长几行，空态就是一行、不会有大片空白。默认提示词用原生 `::placeholder`（灰色），不截断也不在下面重复显示。~~早期版本曾做过"宽度 1/3→整行自适应"，实测空态只能显示「该助手为…」截断，观感很差，已废弃。~~
- **边框跟随主题黑白**：不要用 `--dsw-alias-border-l2-darkmode-thin`（那是给分隔线用的极淡色，深色下几乎看不见）。改成由主题文字色派生：

  ```css
  border: 1px solid var(--dsw-alias-label-tertiary);                                  /* 不支持 color-mix 时的兜底 */
  border-color: color-mix(in srgb, var(--dsw-alias-label-primary) 42%, transparent);  /* 浅色=黑 42%、深色=白 42% */
  ```

  实测计算值：浅色 `rgba(15,17,21,.42)`、深色 `rgba(249,250,251,.42)`；输入框与「恢复默认设置」按钮共用同一套边框。
- 思考强度滑杆：`appearance:none` + `::-webkit-slider-runnable-track` 自绘轨道，高 **24px**（足以包住 20px 的滑块，滑块用 `margin-top: 2px` 居中嵌在轨道里）、圆角、`linear-gradient(90deg, #6699FF, #B899FF)`；滑块是 20px 白色圆点。控件本身 `height: 40px` 作为触摸热区，`touch-action: pan-y`。

**⚠ 面板自身必须是滚动容器**：设置弹窗 `.dialog` 是固定高度的 flex，原来的滚动只发生在标签页的 `.content` 上；个性化子页面替换了那层，所以 `.personalization` 自己要有 `flex: 1 1 0; min-height: 0; overflow-y: auto`（照抄 `.content` 的写法，含 `margin-right: -24px; padding: 0 24px` 对齐滚动条）。否则内容超出会被直接裁掉、且整页不能滑（用户实测报过）。底部两个按钮用 `position: sticky; bottom: 0` + 与弹窗同色的背景吸底。`viewport.ts` 的 `preventPageScroll` 会检查祖先里有没有可滚动元素，容器带上 `overflow-y: auto` 后触摸滑动自动放行。
**保存语义**：面板内编辑走草稿态（`useState` 保存 `draftPrompt` / `draftLevel`），只有点「保存修改设置」才 `setSystemPrompt` + `setThinkingLevel` 写库；`dirty = 草稿 ≠ 已存` 用来控制保存按钮的禁用态。**返回弹窗即丢弃未保存改动**。「恢复默认设置」例外——它直接 `resetPersonalization()` 并同步草稿，符合"恢复"的直觉。两个按钮都用 `Button` 组件（`outlined` / `primary`，`size="m"`）放在 `flex` 行里 `flex: 1 1 0`，确保等宽。

**存储**（`services/settings.ts`）：

| localStorage 键 | 含义 | 默认 |
|---|---|---|
| `chat-demo:system-prompt` | 自定义系统提示词；空字符串＝用内置默认 | 未设置 |
| `chat-demo:thinking-level` | 思考强度挡位 0..4，对应 `THINKING_BUDGETS` | `2`（标准） |

`THINKING_BUDGETS = [1024, 2048, 4096, 6144, 8192]`，上限 8192 是为了不超过默认 `max_tokens`。
`resetPersonalization()` 同时清掉两个键并回到默认挡位。

**请求侧**（`services/chat/store.ts`，构造 `streamMessage` 请求体处）：

```ts
const system = settings.systemPrompt.trim() || SYSTEM_PROMPT
thinking: initial.thinking
  ? { type: 'enabled', budget_tokens: THINKING_BUDGETS[settings.thinkingLevel] }
  : { type: 'disabled' }
```

- `SYSTEM_PROMPT` 仍是 `'该助手为DeepSeek，由深度求索公司创造。'`，只在用户留空时使用；
- 思考强度只在「深度思考」开启时发送 `budget_tokens`，关闭时请求体里不带该字段。

**接口事实**（2026-11 实测，用真实 Key 直接打 `/anthropic/v1/messages`）：

- 带 `thinking.budget_tokens` 的请求返回 **200**，服务端接受该字段；
- 但有资料指出 DeepSeek 会**忽略** `budget_tokens`（[litellm#35645](https://github.com/BerriAI/litellm/issues/35645)、[bifrost 提交](https://github.com/maximhq/bifrost/commit/57146530b391ef12cc06c00dc01bc7c41f8438a5)），即目前可能只有"开/关"生效。
  所以 UI 只承诺"挡位"，不承诺"思考 token 数一定变化"；若服务端后续支持，代码无需再改。

**已验证**：mock 捕获的请求体 `system` = 自定义文本、`thinking={type:'enabled',budget_tokens:8192}`（第 5 档）；清空提示词并关闭深度思考后为 `system` = 默认文案、`thinking={type:'disabled'}` 且无 `budget_tokens`。真机浅色/深色主题下占位文字均为灰色、已填文字跟随主题。

**⚠ 顺手修掉的上游行为**（`src/app/viewport.ts`）：`preventPageScroll` 原先对**所有**单指 `touchmove` 无条件 `preventDefault()`（只要祖先里没有可滚动元素），这会把滑杆的触摸拖动一并吞掉——滑杆在手机上完全拖不动。现在开头放行 `input[type="range"]`（以及带 `data-touch-drag` 的元素）：

```ts
if (target?.closest('input[type="range"], [data-touch-drag]')) return
```

A/B 实测：加回无条件 `preventDefault` 后滑杆拖不动（值停在起点），移除后正常。真机 `adb shell input swipe` 左→右 2→3、右→左 3→0，取值与 localStorage 同步变化。**以后再加自定义滑杆/可拖动控件，记得别被这段逻辑挡住。**

### 5.9 背景（启动 / 主页 / 会话）

**文件与开关分流存储**：

| 内容 | 位置 |
|---|---|
| 背景文件（Blob） | 独立 IndexedDB `chat-demo-wallpapers`，store `wallpapers`，key = `launch` / `home` / `chat` |
| 开关、强度与元数据 | localStorage `chat-demo:wallpapers`：`{ master, items: { launch/home/chat: { on, opacity, meta: {mime,name} } } }`（`opacity` 0–100） |

**代码**：`services/wallpapers.ts`（存储 + `useWallpaperUrls`）、`components/wallpaper/WallpaperLayers.tsx`（渲染层）、`components/base/Switch.tsx`（开关）、`PersonalizationPanel` 的「壁纸」区。

**可见性规则**（用户 2026-11-25 调整后的最终版）：

- **会话页：只显示「会话背景」**，不显示主页背景；
- **主页（无会话）：会话背景在下 + 主页背景在上**，两层都在正文之下；
- 启动背景：`z-index: 3000` 覆盖层，淡出后卸载（约 1.4s）。

**层级**（改错会盖住正文）：背景层 `position: fixed; z-index: -2`，主页背景叠加层 `z-index: -1`；内容在 `.frame` 里（`position: absolute`，z-index auto）。开启时给 `<html data-wallpaper="on">`，并让 `body` / `.frame` / 会话页 `.header` 背景透明（`global.css`、`App.module.css`、`SessionView.module.css`），html 自身保留 `--dsw-alias-bg-base` 兜底。

**其它规则**：

- 每张背景有独立「背景强度」`opacity`（0–100，步长 5），**为 0 时该层不渲染**（`WallpaperLayers` 里 `opacity > 0` 才算可见）；
- 主页背景仅接受 PNG/JPG，选视频会 toast 拒绝；
- 视频统一 `muted loop autoPlay playsInline`（按需求不播音轨）；
- 背景改动**立即生效**，不走「保存修改设置」的草稿态；
- 旧版"透明 PNG 叠在会话页"的逻辑已废弃（`WallpaperMeta.alpha` 字段与 canvas 采样一并移除）。

**⚠ 输入区的白色渐变遮罩**：`SessionView.module.css` 的 `.inputContainer` 默认带 `linear-gradient(to bottom, transparent 0%, transparent 30%, var(--dsw-alias-bg-base) 30%, ...)`——它是给消息"滚到输入框下面时淡出"用的，壁纸开启后会变成一块实心白板盖住壁纸（用户实测报过"输入框下面多出白色区域"）。壁纸态下要覆盖掉：

```css
:global(html[data-wallpaper='on']) .inputContainer { background: none; }
```

同类问题检查清单：`.frame`、`body`、聊天 `.header`、`.inputContainer` —— 这四处是默认带底色、需要壁纸态放行的。
**已验证**（真机 + 无头）：会话页 1 层（`IMG@z-2`）、主页 2 层（`-2` 会话背景 op 0.6 + `-1` 主页背景 op 1）、强度 0 时该层消失、总开关关闭后 0 层且标记移除、启动层 1.4s 后卸载、视频 `paused=false` 且 `currentTime` 循环推进。

---

## 6. 标准重建流程（改完东西后照这个走）

```powershell
# 若只是改了壳层 UI / 清单（最常用）
cd deepseek-app\deepseek-shell
node scripts/apply-chat-demo-patches.mjs   # 保证上游修复在位（幂等）
node scripts/apply-shell-ui.mjs            # 若动过 UI
node scripts/gen-notices.mjs               # 若动过依赖
npx cap sync                               # 同步进 android/ 与 ios/

# 打包 APK
cd android
gradlew.bat assembleDebug            # 需要 JAVA_HOME / ANDROID_HOME，见第 7 节
# 产物：app\build\outputs\apk\debug\app-debug.apk

# 若重新生成了 chat-demo/dist，必须先刷新再注入
#   copy chat-demo\dist → deepseek-shell\dist → 再跑 gen-notices + apply-shell-ui
```

**Windows 特有坑：chat-demo 的 `pnpm build` 脚本不可直接跑**——它写的是 `rm -rf dist && NODE_ENV=production rspack ...`（POSIX 写法），cmd 下报 `'NODE_ENV' 不是内部或外部命令`。解法：

```powershell
cd chat-demo
Remove-Item dist -Recurse -Force
$env:NODE_ENV="production"
npx rspack build -c rspack.config.ts
```

（或用 Git Bash 跑 `pnpm build`。**不要为此改 chat-demo 的 package.json**。）

---

## 7. 环境事实与已知坑（本机特有，直接影响能否干活）

### 7.1 网络：GitHub 被本机 hosts 黑洞 + 证书中间人

- `github.com`、`api.github.com`、`raw.githubusercontent.com` 等在 hosts 里指向 `127.0.0.1` → **直连 GitHub 一定失败**
- 本机装了 **SteamTools/Watt Toolkit**，会劫持 GitHub 域名的 TLS（证书签发者 `CN=SteamTools Certificate`）→ **JDK 侧报 `PKIX path building failed`**
- 可用替代通道：`https://gh-proxy.com/<github-url>`（clone / 下载均验证可用）、jsDelivr CDN
- 因此 Gradle 发行包的官方下载（`services.gradle.org` 会 307 跳 GitHub）**必然失败**。已用腾讯镜像下载 `gradle-8.14.3-all.zip`，并**用 Gradle 官方 SHA-256 校验**（`ed1a8d68…1d7c`）后植入 `~\.gradle\wrapper\dists\gradle-8.14.3-all\10utluxaxniiv4wxiphsi49nj\`。**删掉这个缓存会导致构建失败。**

### 7.2 已安装并持久化（用户级环境变量）

```
JAVA_HOME        = C:\Android\jdk-21
ANDROID_HOME     = C:\Android\Sdk
ANDROID_SDK_ROOT = C:\Android\Sdk
Path  追加        C:\Android\jdk-21\bin
                 C:\Android\Sdk\platform-tools
                 C:\Android\Sdk\cmdline-tools\12.0\bin
```

- 本机**未提权**（非管理员），所以 winget 装 JDK 会失败（`No applicable installer found`，Temurin MSI 是机器级）→ 改走 zip
- `cmdline-tools` 固定用 **12.0**，不要装 `latest`（新版是包装器，会忽略 `--licenses`、在 Windows 上按分号拆包名）
- 接受许可证用**干净的 `y\n` 文件重定向**，不要用 `echo y |`（Windows 会传入 `"y "` 被判定为 no）

### 7.3 终端与 shell 的现实

- 本机**没有 `pwsh`**，工具实际跑的是 Windows PowerShell **5.1**
- 因此：不支持 `-SkipHttpErrorCheck`；`[Net.Security.X509Chain]::new()` 这类不可用；`Get-Content` 默认按 ANSI 读无 BOM 文件（**中文显示乱码 ≠ 文件坏了**，要用 `[IO.File]::ReadAllText($p, UTF8)` 验证）
- 原生命令成功但往 stderr 写东西时，PowerShell 会显示成红色错误并给退出码 1 —— 例如 `git clone` 成功也会 `exit 1`，**别误判**
- `adb devices` 里有一条**僵尸 `emulator-5554 offline`**（无进程、无端口监听）。`adb -s emulator-5554 emu kill` 会失败；`kill-server` 也清不掉；`adb disconnect emulator-5554` 可临时清掉但它会自己回来。**只要所有命令带 `-s <真机序列号>` 就不影响任何事**，不要反复 kill-server。

### 7.4 真机调试技巧（很好用，值得留着）

```powershell
# 1) 取 app pid，转发 WebView 调试端口
adb -s 10AF5B2FFY002LY shell pidof com.dsdemo.shell
adb -s 10AF5B2FFY002LY forward tcp:9223 localabstract:webview_devtools_remote_<pid>
# 2) 之后可用 CDP（http://127.0.0.1:9223/json/list）直接 eval JS / 截图
```

用途：精确判断元素坐标与命中（`elementFromPoint`）、在不重新打包的情况下验证 UI 改动、确认 Dart 化渲染状态。
注意：`adb shell input tap` 用的是**物理像素**；本机 WebView 顶边在物理 y=76，CSS 坐标 ×2 后要加上这个偏移。

---

## 8. APK 安装注意

```powershell
adb -s 10AF5B2FFY002LY install -r "…\app-debug.apk"
```

- `-r` 只对**同包名**生效。当前包名 `com.dsdemo.shell`，与旧包 `com.deepseek.shell` **互不影响**
- **绝对不要**卸载 `com.deepseek.shell`（用户的历史数据在那里）
- 若出现 `INSTALL_FAILED_UPDATE_INCOMPATIBLE`：先确认是不是同包名不同签名，**不要无脑 uninstall**

---

## 9. 真机验证结论（2026-11-16 那轮）

| 验证项 | 结论 | 证据 |
|---|---|---|
| ① 流式对话（3 轮） | **通过** | 日志 `net::ERR_`/`CORS`/`SSE` 全 0 命中；界面正常逐字输出 |
| ② 语音按钮 | **通过** | 系统侧 `RECORD_AUDIO: granted=true`；`appops: RECORD_AUDIO: allow; time=+2s783ms ago (running)`；日志无 `getUserMedia`/`NotAllowedError` |
| ③ 让模型读链接 | **失败**（`失败-其他`） | 日志 `CORS`/`Access-Control`/`net::ERR_` 全 0；打包产物里唯一外部主机是 `api.deepseek.com` → **前端不存在直连第三方 URL 的代码路径**，属 API 侧抓取失败，与壳无关 |

补充：③ 当时试的是 `b23.tv` 短链（B 站短链，会唤起 B 站 App 导致本 App 后台化、请求中断）。**若要重测，请用静态页面并保持 App 在前台。**

日志文件（仅本地）：`dsh-verify.log`、`dsh-verify-full.log`（工作区根目录）

---

## 10. 合规状态（用户很在意，别破坏）

| 项 | 状态 |
|---|---|
| DeepSeek MIT 版权声明 | ✅ APK 内 `assets/public/LICENSE`，与上游 **SHA-256 一致** |
| 第三方组件许可 | ✅ `THIRD_PARTY_NOTICES.txt`（95 包全文）+ APK 内副本 |
| 用户可见入口 | ✅ 右上角 ⋮ → 关于/开源许可，可滚动阅读全文 |
| 未修改上游源码 | ✅ chat-demo `git status` 干净 |
| 商标 | ✅ 已去除：应用名/包名/图标均不含 `DeepSeek`（图标仍是 Capacitor 默认图标） |
| 冒充官方 | ✅ 关于页与 README 均声明"非官方、无隶属、未获背书" |
| 内置 API Key | ✅ 没有，用户自填 |

`DeepSeek` 目前只出现在**描述性说明来源**的地方（README、关于页、NOTICES），这是必要的归属声明，**不要删**。

---

## 11. 待决事项 / 可选的下一步

1. **GitHub 已发布（2026-11-21）**：仓库 <https://github.com/Gleam1031/ds-demo>，**当前是 public**，`main` 分支首个提交 `78acd1c`（247 文件 / 5.6 MB）。用户对商标/起诉仍有顾虑，讨论过三种处置：
   - 设为 Private（风险归零，最彻底）
   - 公开源码但不挂 APK Release（最稳的公开方案）
   - 公开源码 + Release 挂 APK（可接受，但需保留免责声明）
   → 接手者**先问用户**，不要擅自改可见性或发 Release
   → 本机 push 需带 `-c http.sslVerify=false`（hosts 把 github.com 导到了本地代理），详见 7.1
2. **iOS 从未构建过**（需 macOS + Xcode）。工程已同步，bundle id 已改。
3. **应用图标**仍是 Capacitor 默认图标，用户尚未要求更换。
4. **旧包 `com.deepseek.shell` 仍在手机上**，是否卸载由用户决定。
5. 迁移数据：新包是空数据。可用旧版「导出所有历史对话」→ 新版「导入历史对话」把聊天记录搬过去（API Key 需重填）。
6. 首次启动引导页**已实现**（`shell-onboarding`），含"非官方"声明；待办：真人验证一遍外链跳转与保存链路。

---

## 12. 不要做的事（硬约束）

1. ⚠️ **不要随手改 `chat-demo/`**。确有必要修上游缺陷/加功能时，必须走 `patches/*.patch` + `scripts/apply-chat-demo-patches.mjs`，并在本节/5.5/5.6 节记录原因。目前只有一个合并补丁 `0001-chat-demo-customizations.patch`（含 document 上限修复 + 搜索 + 置顶 + 省略提示）。构建脚本的 POSIX 写法**仍不许改**，用第 6 节的等价命令绕过。
2. ❌ 不要在 `capacitor.config.json` 里加 `server.url`
3. ❌ 不要卸载或覆盖手机上的旧包 `com.deepseek.shell`
4. ❌ 不要删除 `~\.gradle\wrapper\dists\gradle-8.14.3-all\…`（删了必构建失败，见 7.1）
5. ❌ 不要删除 `dist/LICENSE` 或 `THIRD_PARTY_NOTICES.txt`（合规必需）
6. ❌ 不要在未确认的情况下重新生成/覆盖 `scripts/bundled-packages.json`（`gen-bundled-packages.mjs` 已加空结果防护，但仍应核对 95 条）
7. ⚠️ **`docs/` 里放真机截图前必须裁掉系统栏**（用户明确要求，不想带出手机信息）。本机 720×1608 截图的固定裁剪参数：
   - 顶部状态栏：`y=0..76`（76px，来自 CDP 的 `screenY:76`）
   - 底部导航栏：从 `y=1452` 开始（通过像素颜色跳变确定），裁到 1452 为止
   - 裁后为 720×1376；CDP 直接截的 WebView 图（如 720×1448）本身不含系统栏，无需裁剪
   - 或者干脆用无头浏览器渲染 `dist/`（文件名以 `preview-` 开头），完全没有系统栏
   - **任何情况下都不得出现会话列表、聊天正文、API Key**——测试截图一律留在 `%TEMP%`，不要进仓库
8. ❌ 不要试图"顺手"把 `DeepSeek` 从 README/关于页全部删干净——归属声明是合规要求

---

## 13. 接手检查清单（开工前 5 分钟过一遍）

```
[ ] cd deepseek-app\deepseek-shell && git status（若有仓库）确认没有意外改动
[ ] cd ..\chat-demo && git status --porcelain  → 必须为空
[ ] node -v  ≥ 22；adb devices 里真机为 device（忽略 emulator-5554 offline）
[ ] Test-Path C:\Android\Sdk\platforms\android-36  → True
[ ] Test-Path C:\Android\Sdk\build-tools\36.0.0    → True
[ ] Test-Path "$env:USERPROFILE\.gradle\wrapper\dists\gradle-8.14.3-all" → True
[ ] 读一遍 deepseek-shell\README.md（使用者视角的完整说明）
```

环境变量若在新 shell 里没生效，用 `Start-Process cmd -ArgumentList '/c','<批处理>' -UseNewEnvironment` 验证（本机 PS 5.1 对 `pwsh -UseNewEnvironment` 会报 `8009001d`，用 cmd 即可）。

---

## 14. 附：能给用户复述的一句话版本

> 已经把 DeepSeek 开源前端 chat-demo 打包成名为「DS Demo」的安卓 App（包名 com.dsdemo.shell，与旧版共存不覆盖），保留了全部版权与第三方许可声明并在 App 内加了「关于」页；改名绕开了商标问题；源码未改一行；APK 已生成，GitHub 发布方式待用户确认。
- 图标：喇叭是**线条（stroke 1.5，fill=none）**，不是实心块；开启=喇叭+声波、关闭=喇叭+小叉。**颜色与顶栏其它按钮一致**（`--dsw-alias-label-primary`，不再用品牌蓝），开/关只靠图标区分。
- **侧边栏抽屉打开时，两个壳层按钮要被"压住/挡住"（踩过 3 次）**：抽屉自己的「收起边栏」在 x 253..287，自动朗读在 x 254..298，同格。
  - 关键坑：`.frame` 是 `position: fixed`，**自己是层叠上下文**；抽屉的 z-index 只在 frame 内部有效。按钮若挂在 `body`（根层叠上下文），根层级恒压过整个 frame，**无论把按钮 z-index 调多低都盖不住抽屉**。
  - 最终方案（三条一起）：① 两个按钮都 `append` 到 `div[class*="frame-"]` 里（和抽屉同一个层叠上下文），并在 1s 轮询里检查父级、被 React 重建就重新挂回；② 按钮 `z-index: 700` < 抽屉 `.drawer`(800)/`.drawerMask`(799)；③ `shell-about.css` 里一条 `div[class*='frame-']:has([class*='drawer']) :is(.dsh-about-btn, .dsh-auto-read-btn) { display: none !important; }` —— `:has()` 由 DOM 变化即时触发，**没有轮询延迟**（WebView 126 支持）。
  - 真机实测：抽屉打开 +80ms 两个按钮就 `display:none`，关闭后恢复，不再出现叠在收起图标上的情况。
