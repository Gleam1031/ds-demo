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

  const SPEAKER_ON =
    '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
    '<path d="M9.2 3.4 5.6 6.6H3.1a.9.9 0 0 0-.9.9v5a.9.9 0 0 0 .9.9h2.5l3.6 3.2V3.4Z" fill="currentColor"/>' +
    '<path d="M12.4 7.1a4.1 4.1 0 0 1 0 5.8M15 4.8a7.6 7.6 0 0 1 0 10.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
    '</svg>';

  const SPEAKER_OFF =
    '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
    '<path d="M9.2 3.4 5.6 6.6H3.1a.9.9 0 0 0-.9.9v5a.9.9 0 0 0 .9.9h2.5l3.6 3.2V3.4Z" fill="currentColor" opacity="0.55"/>' +
    '<path d="M12.6 8.2 16.4 12M16.4 8.2l-3.8 3.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
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

  const install = () => {
    if (document.getElementById(BTN_ID)) return;
    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.className = 'dsh-auto-read-btn';
    btn.dataset.icon = '';
    btn.addEventListener('click', toggle);
    document.body.append(btn);
    paint();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
