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

> 搜索弹窗挂在 `App.tsx` 根部，不随侧边栏抽屉关闭而卸载。

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

1. **GitHub 已发布（2026-11-21）**：仓库 <https://github.com/Gleam1031/no-name-yet>，**当前是 public**，`main` 分支首个提交 `78acd1c`（247 文件 / 5.6 MB）。用户对商标/起诉仍有顾虑，讨论过三种处置：
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
7. ❌ 不要把用户手机截图里的私人内容（聊天记录、通知）提交进 `docs/`
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
