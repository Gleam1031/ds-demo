/* 由 deepseek-shell/scripts/apply-shell-ui.mjs 注入到 dist/
 *
 * 右上角「自动朗读」开关：固定放在最右侧控件的左边一格
 * （主页是「关于」左边、会话页是「加号」左边——两者都在 right:10、宽 44，所以这里用 right:62 即可）。
 * 注意：不要根据「关于」按钮的实时位置来算——那个按钮会在顶栏被占用时自己左移，两者会互相挤位。
 * 实际朗读逻辑在 chat-demo 内：按钮改写 localStorage 并派发 `dsh:auto-read` 事件，
 * settings.ts 监听后更新设置；回复结束时按开关自动朗读。
 */
(() => {
  'use strict';

  if (window.__dshAutoReadInstalled) return;
  window.__dshAutoReadInstalled = true;

  const BTN_ID = 'dsh-auto-read-btn';
  const STORAGE_KEY = 'chat-demo:auto-read';

  // 线条风格（与 App 内其它图标一致：描边、圆头，不用实心块）
  const SPEAKER_PATH =
    '<path d="M8.9 4.1 5.5 6.8H3.2a1 1 0 0 0-1 1v4.4a1 1 0 0 0 1 1h2.3l3.4 2.7V4.1Z" ' +
    'stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>';

  const SPEAKER_ON =
    '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
    SPEAKER_PATH +
    '<path d="M12.1 7.2a3.9 3.9 0 0 1 0 5.6M14.7 4.8a7.4 7.4 0 0 1 0 10.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
    '</svg>';

  const SPEAKER_OFF =
    '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
    SPEAKER_PATH +
    '<path d="M12.6 8.1 16.2 11.7M16.2 8.1l-3.6 3.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
    '</svg>';

  const isOn = () => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  };

  const paint = () => {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    const on = isOn();
    btn.dataset.on = on ? '1' : '0';
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? '自动朗读：已开启' : '自动朗读：已关闭');
    btn.setAttribute('title', on ? '自动朗读：已开启' : '自动朗读：已关闭');
    const icon = on ? 'on' : 'off';
    if (btn.dataset.icon !== icon) {
      btn.dataset.icon = icon;
      btn.innerHTML = on ? SPEAKER_ON : SPEAKER_OFF;
    }
  };

  const toggle = () => {
    const next = !isOn();
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // 存不下就只影响本次
    }
    paint();
    window.dispatchEvent(new CustomEvent('dsh:auto-read', { detail: next }));
  };

  /**
   * 挂载点：必须挂在 App 的 .frame 里（和侧边栏抽屉同一个层叠上下文），
   * 这样 z-index 700 < 抽屉 800 才真正生效；挂在 body 上会永远压过整个 frame。
   */
  const mountHost = () => document.querySelector('[class*="frame-"]') || document.body;

  const install = () => {
    if (document.getElementById(BTN_ID)) return;
    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.className = 'dsh-auto-read-btn';
    btn.dataset.icon = '';
    btn.addEventListener('click', toggle);
    mountHost().append(btn);
    paint();
    // frame 万一被重建，重新挂回去（很轻量）
    setInterval(() => {
      const el = document.getElementById(BTN_ID);
      const host = mountHost();
      if (!el) return;
      if (el.parentElement !== host) host.append(el);
    }, 1000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
