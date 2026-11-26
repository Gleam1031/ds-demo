/* 由 deepseek-shell/scripts/apply-shell-ui.mjs 注入到 dist/
 * 作用：在主页右上角提供「关于」入口（竖三点），打开开源许可声明面板。
 * 设计约束：
 *   - 不改动 chat-demo 源码，也不动它渲染出来的 React 树（本 UI 挂在 body 上）
 *   - 右上角若已被「新对话」按钮占用，则自动让位到其左侧
 *   - 层级 940：高于正文，低于 chat-demo 自己的弹窗（1000+），弹窗打开时自动被盖住
 */
(() => {
  'use strict';

  if (window.__dshAboutInstalled) return;
  window.__dshAboutInstalled = true;

  const PKG = 'com.dsdemo.shell'; // 与 capacitor.config.json 的 appId 保持一致
  const BTN_ID = 'dsh-about-btn';

  const DOTS =
    '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
    '<circle cx="10" cy="4" r="1.7" fill="currentColor"/>' +
    '<circle cx="10" cy="10" r="1.7" fill="currentColor"/>' +
    '<circle cx="10" cy="16" r="1.7" fill="currentColor"/>' +
    '</svg>';

  const CLOSE_ICON =
    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">' +
    '<path d="M3.7 3.7 L14.3 14.3 M14.3 3.7 L3.7 14.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
    '</svg>';

  /** 右上角是否已被 App 自己的按钮占用（壳层自己的按钮不算） */
  const SHELL_BTN_IDS = [BTN_ID, 'dsh-auto-read-btn'];
  const isSlotBusy = () => {
    const vw = window.innerWidth;
    const slotLeft = vw - 54;
    const slotRight = vw - 10;
    const nodes = document.querySelectorAll('button, [role="button"], a[href]');
    for (const el of nodes) {
      if (SHELL_BTN_IDS.includes(el.id)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.top > 60 || r.bottom < 4) continue; // 只看顶栏一行
      if (r.right > slotLeft && r.left < slotRight) return true;
    }
    return false;
  };

  /** 当前是否在主页（欢迎页）：会话页渲染的是 SessionView，没有 welcome-* 容器 */
  const isHomePage = () => !!document.querySelector('[class*="welcome-"]');

  /** 只在主页显示「关于」入口；离开主页时顺带收起已打开的面板 */
  const syncVisibility = () => {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    const home = isHomePage();
    btn.classList.toggle('dsh-about-hidden', !home);
    if (!home && open) closePanel();
  };

  const place = () => {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    btn.dataset.shifted = isSlotBusy() ? '1' : '0';
    syncVisibility();
  };

  const buildPanel = () => {
    const backdrop = document.createElement('div');
    backdrop.className = 'dsh-about-backdrop';
    backdrop.setAttribute('data-dsh-about', 'panel');

    const panel = document.createElement('div');
    panel.className = 'dsh-about-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', '关于 / About');
    panel.setAttribute('data-dsh-about', 'panel');
    panel.tabIndex = -1;

    const head = document.createElement('div');
    head.className = 'dsh-about-head';

    const title = document.createElement('div');
    title.className = 'dsh-about-title';
    title.textContent = '关于 / About';

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'dsh-about-close';
    close.setAttribute('aria-label', '关闭 / Close');
    close.innerHTML = CLOSE_ICON;

    head.append(title, close);

    const body = document.createElement('div');
    body.className = 'dsh-about-body';

    const version =
      document.querySelector('meta[name="application-version"]')?.getAttribute('content') || '—';

    const meta = document.createElement('dl');
    meta.className = 'dsh-about-meta';
    const rows = [
      ['应用', 'DS Demo（非官方打包）'],
      ['包名', PKG],
      ['上游前端', `chat-demo v${version}（MIT）`],
      ['说明', '本应用由个人自行封装，不隶属于 DeepSeek，也未获其背书。'],
    ];
    for (const [k, v] of rows) {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      meta.append(dt, dd);
    }

    const note = document.createElement('p');
    note.className = 'dsh-about-note';
    note.textContent =
      '本应用基于 DeepSeek 官方开源前端 chat-demo（MIT 许可）封装，并包含若干第三方开源组件。' +
      '下方列出完整的版权声明与许可文本，以履行各许可证的署名义务。';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'dsh-about-section-title';
    sectionTitle.textContent = '开源许可 / Open source licenses';

    const loading = document.createElement('div');
    loading.className = 'dsh-about-loading';
    loading.textContent = '正在读取许可文本…';

    body.append(meta, note, sectionTitle, loading);

    panel.append(head, body);
    return { backdrop, panel, close, body, loading };
  };

  const loadNotices = async (loadingEl) => {
    const pre = document.createElement('pre');
    pre.className = 'dsh-about-pre';

    const tryFetch = async (file) => {
      const res = await fetch(file, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
      return res.text();
    };

    let text = null;
    const errors = [];
    for (const file of ['THIRD_PARTY_NOTICES.txt', 'LICENSE']) {
      try {
        text = await tryFetch(file);
        break;
      } catch (e) {
        errors.push(String(e.message || e));
      }
    }

    loadingEl.remove();

    if (text == null) {
      pre.textContent =
        '许可文本读取失败。\n\n' +
        '本应用基于 DeepSeek 官方开源前端 chat-demo（MIT License，Copyright (c) 2026 DeepSeek）封装。\n' +
        '完整声明见随包分发的 THIRD_PARTY_NOTICES.txt。\n\n' +
        `技术信息: ${errors.join(' | ')}`;
      return pre;
    }

    pre.textContent = text.replace(/^\ufeff/, '');
    return pre;
  };

  let open = null;

  const closePanel = () => {
    if (!open) return;
    open.backdrop.remove();
    open.panel.remove();
    document.removeEventListener('keydown', open.onKey, true);
    const { lastFocus } = open;
    open = null;
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  };

  const showAbout = () => {
    if (open) return;

    const { backdrop, panel, close, body, loading } = buildPanel();
    document.body.append(backdrop, panel);

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closePanel();
      }
    };
    document.addEventListener('keydown', onKey, true);

    backdrop.addEventListener('click', closePanel);
    close.addEventListener('click', closePanel);

    open = { backdrop, panel, onKey, lastFocus: document.activeElement };
    // 聚焦面板本身而不是关闭按钮：既保住可访问性，又避免移动端出现焦点环
    panel.focus({ preventScroll: true });

    void loadNotices(loading).then((pre) => {
      if (!open) return;
      body.append(pre);
    });
  };

  /**
   * 挂载点：必须挂在 App 的 .frame 里。
   * .frame 是 position:fixed，自己就是一个层叠上下文；抽屉的 z-index 只在 frame 内部生效。
   * 如果按钮挂在 body 上（根层叠上下文），根层级的 z-index 永远压过整个 frame，
   * 抽屉再高也盖不住它 —— 侧边栏打开时就会重叠。
   */
  const mountHost = () => document.querySelector('[class*="frame-"]') || document.body;

  const install = () => {
    if (document.getElementById(BTN_ID)) return;

    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.className = 'dsh-about-btn';
    btn.setAttribute('aria-label', '关于 / About');
    btn.setAttribute('title', '关于 / About');
    btn.innerHTML = DOTS;
    btn.addEventListener('click', showAbout);
    mountHost().append(btn);

    // frame 万一被重建，重新挂回去（很轻量）
    setInterval(() => {
      const el = document.getElementById(BTN_ID);
      const host = mountHost();
      if (!el) return;
      if (el.parentElement !== host) host.append(el);
    }, 1000);

    place();
    window.addEventListener('resize', place);
    window.addEventListener('orientationchange', place);
    // 顶栏会在「主页 ↔ 会话页」之间切换按钮，用低频轮询跟上（很轻量）
    setInterval(place, 300);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
