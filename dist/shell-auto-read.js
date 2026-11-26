/* 由 deepseek-shell/scripts/apply-shell-ui.mjs 注入到 dist/
 *
 * 右上角「自动朗读」开关：位置跟随“关于”按钮（主页）或 App 自己的“加号”（会话页）的左侧。
 * 只为壳层 UI，实际朗读逻辑在 chat-demo 内：按钮改写 localStorage 并派发
 * `dsh:auto-read` 事件，settings.ts 监听到后更新设置；回复结束时按开关自动朗读。
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
    const icon = on ? SPEAKER_ON : SPEAKER_OFF;
    if (btn.dataset.icon !== (on ? 'on' : 'off')) {
      btn.dataset.icon = on ? 'on' : 'off';
      btn.innerHTML = icon;
    }
  };

  /** 放在“关于”（主页）或最右侧按钮（会话页“加号”）的左边 */
  const place = () => {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    const vw = window.innerWidth;
    let refLeft = null;

    const about = document.getElementById('dsh-about-btn');
    if (about && getComputedStyle(about).display !== 'none') {
      refLeft = about.getBoundingClientRect().left;
    } else {
      let rightmost = null;
      for (const el of document.querySelectorAll('button, [role="button"], a[href]')) {
        if (el.id === BTN_ID) continue;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (r.top > 60 || r.bottom < 4) continue;
        if (!rightmost || r.left > rightmost.left) rightmost = r;
      }
      refLeft = rightmost ? rightmost.left : vw - 10;
    }

    const right = Math.max(10, Math.round(vw - refLeft + 8));
    btn.style.right = `${right}px`;
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
    place();
    window.addEventListener('resize', place);
    window.addEventListener('orientationchange', place);
    // 页面切换会换掉顶栏按钮，低频跟随即可
    setInterval(() => {
      place();
      paint();
    }, 800);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
