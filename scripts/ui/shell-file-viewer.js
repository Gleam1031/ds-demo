/* 由 deepseek-shell/scripts/apply-shell-ui.mjs 注入到 dist/
 *
 * 附件查看器拦截层。
 *
 * 背景：chat-demo 打开附件用的是 blob: URL —— 图片走 <a target="_blank">，
 * 其他文件走 window.open(url, '_blank')。在 Capacitor 的 WebView 里：
 *   - blob: 不能交给系统应用（Bridge.launchIntent 对 blob 返回 false）
 *   - Capacitor 没有开启多窗口，new window 就会被就地加载
 * 结果：点击附件会把 App 界面替换成文件内容，且没有任何返回入口，只能杀掉重进。
 *
 * 这里在壳层拦下这两种打开方式，改成应用内查看器：
 *   - 图片：全屏查看，点图片 / 点关闭按钮 / 按返回键关闭
 *   - 其他类型：说明暂不支持应用内预览，给出文件名与关闭按钮
 */
(() => {
  'use strict';

  if (window.__dshFileViewerInstalled) return;
  window.__dshFileViewerInstalled = true;

  const OVERLAY_ID = 'dsh-file-viewer';
  const isBlobUrl = (value) => typeof value === 'string' && /^blob:/i.test(value);

  let current = null;

  const close = () => {
    if (!current) return;
    const { root, onKey } = current;
    current = null;
    document.removeEventListener('keydown', onKey, true);
    root.remove();
  };

  const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
  };

  const buildShell = (name) => {
    const root = document.createElement('div');
    root.id = OVERLAY_ID;
    root.className = 'dsh-fv';

    const bar = document.createElement('div');
    bar.className = 'dsh-fv-bar';

    const title = document.createElement('div');
    title.className = 'dsh-fv-title';
    title.textContent = name || '附件';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'dsh-fv-close';
    closeBtn.setAttribute('aria-label', '返回聊天');
    closeBtn.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
      '<path d="M4.2 4.2 L15.8 15.8 M15.8 4.2 L4.2 15.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
      '</svg>';

    bar.append(title, closeBtn);

    const body = document.createElement('div');
    body.className = 'dsh-fv-body';

    root.append(bar, body);
    closeBtn.addEventListener('click', close);

    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    };
    document.addEventListener('keydown', onKey, true);

    current = { root, onKey };
    document.body.append(root);
    return { root, body };
  };

  const showImage = (url, name) => {
    const { body } = buildShell(name);
    const img = document.createElement('img');
    img.className = 'dsh-fv-image';
    img.alt = name || '';
    img.src = url;
    img.addEventListener('click', close);
    body.append(img);
  };

  const showUnsupported = (url, name) => {
    const { body } = buildShell(name);

    const card = document.createElement('div');
    card.className = 'dsh-fv-card';

    const icon = document.createElement('div');
    icon.className = 'dsh-fv-card-icon';
    icon.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M14 3v5h5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';

    const fileName = document.createElement('div');
    fileName.className = 'dsh-fv-card-name';
    fileName.textContent = name || '附件';

    const note = document.createElement('div');
    note.className = 'dsh-fv-card-note';
    note.textContent = '这类文件暂不支持在应用内预览，聊天记录不会丢失。';

    // 用 blob 读取大小，给用户一点确认信息
    const meta = document.createElement('div');
    meta.className = 'dsh-fv-card-meta';

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'dsh-fv-back';
    back.textContent = '返回聊天';
    back.addEventListener('click', close);

    card.append(icon, fileName, note, meta, back);
    body.append(card);

    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        meta.textContent = formatBytes(blob.size);
      })
      .catch(() => {
        meta.textContent = '';
      });
  };

  /** 先按图片试加载：成功就用图片查看器，失败就是其他类型 */
  const openViewer = (url, name) => {
    if (!isBlobUrl(url) || current) {
      if (current) close();
      if (!isBlobUrl(url)) return false;
    }
    const probe = new Image();
    probe.onload = () => showImage(url, name);
    probe.onerror = () => showUnsupported(url, name);
    probe.src = url;
    return true;
  };

  // ① <a href="blob:...">（图片）——捕获阶段拦下，避免 WebView 就地导航
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest('a[href^="blob:"]');
      if (!anchor) return;
      event.preventDefault();
      event.stopPropagation();
      const name = anchor.getAttribute('title') || anchor.textContent?.trim() || '';
      openViewer(anchor.getAttribute('href') || '', name);
    },
    true
  );

  // ② window.open(blob:...)（其他文件）——不交给 WebView 新窗口
  const nativeOpen = window.open;
  window.open = function open(url, ...rest) {
    if (isBlobUrl(url)) {
      openViewer(url, '');
      return null;
    }
    return nativeOpen.call(window, url, ...rest);
  };
})();
