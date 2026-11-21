/* 由 deepseek-shell/scripts/apply-shell-ui.mjs 注入到 dist/
 *
 * 首次启动引导页：解释什么是 API Key → 给出官网三步操作 → 直接填写保存。
 * 目的：拿到 APK 的人大多没用过 API Key，不知道「注册→建 Key→充值」这套流程。
 *
 * 关键约束：
 *   - 不改 chat-demo 源码；本页挂在 body 上，层级 1100（盖住它自带的设置弹窗）
 *   - 外链用普通 <a href>：Capacitor 的 shouldOverrideUrlLoading 会把非 localhost
 *     的主帧跳转交给系统浏览器（Bridge.java 的 launchIntent），App 界面不会丢
 *   - 保存后写入 chat-demo 自己的存储键 'chat-demo:api-key' 并 reload，
 *     让它启动时读到 Key（这是对上游内部实现的依赖，见 HANDOVER.md）
 */
(() => {
  'use strict';

  if (window.__dshOnboardingInstalled) return;
  window.__dshOnboardingInstalled = true;

  const API_KEY_STORAGE = 'chat-demo:api-key';
  const SKIP_FLAG = 'ds-onboarding-done';
  const API_PAGE = 'https://platform.deepseek.com/api_keys';

  const read = (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  const write = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* 隐私模式等情况下忽略 */
    }
  };

  const hasKey = () => !!String(read(API_KEY_STORAGE) || '').trim();
  const isSkipped = () => read(SKIP_FLAG) === '1';

  const build = () => {
    const root = document.createElement('div');
    root.className = 'dsh-onb';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', '首次使用引导');

    const inner = document.createElement('div');
    inner.className = 'dsh-onb-inner';

    const h = document.createElement('h1');
    h.className = 'dsh-onb-title';
    h.textContent = '先要一把 API Key 才能开始';

    const lede = document.createElement('p');
    lede.className = 'dsh-onb-lede';
    lede.textContent =
      'API Key 是调用 DeepSeek 模型服务的「钥匙」，需要你自己到官方平台申请。它按实际用量扣费，用多少花多少。';

    /* ---------- 三步指引 ---------- */
    const block = document.createElement('div');
    block.className = 'dsh-onb-block';

    const blockTitle = document.createElement('p');
    blockTitle.className = 'dsh-onb-block-title';
    blockTitle.textContent = '还没有 Key？官网三步搞定';

    const steps = document.createElement('ol');
    steps.className = 'dsh-onb-steps';

    const mkStep = (title, ...lines) => {
      const li = document.createElement('li');
      const b = document.createElement('b');
      b.textContent = title;
      li.append(b);
      for (const line of lines) {
        if (typeof line === 'string') {
          li.append(document.createElement('br'), document.createTextNode(line));
        } else {
          li.append(line);
        }
      }
      return li;
    };

    const warn = document.createElement('span');
    warn.className = 'dsh-onb-warn';
    warn.textContent =
      '生成后那串以 sk- 开头的字符只显示一次，关掉弹窗就看不到了 —— 一定先复制保存好。';

    steps.append(
      mkStep(
        '注册 / 登录',
        '点下面按钮打开官方开放平台，用手机号或邮箱注册并登录。',
        '注册本身不收费。'
      ),
      mkStep(
        '创建 API Key',
        '登录后，在左侧菜单点「API keys」，再点「创建 API key」。',
        '名字随便填（例如 phone），确定后立刻复制。',
        warn
      ),
      mkStep(
        '充值（按量扣费）',
        '账户没有余额时，调用会失败。左侧「充值」支持支付宝 / 微信。',
        '充多少用多少，余额可在「用量信息」里查看。'
      )
    );

    const link = document.createElement('a');
    link.className = 'dsh-onb-link';
    link.href = API_PAGE;
    link.textContent = '去 DeepSeek 官网申请 API Key →';

    block.append(blockTitle, steps, link);

    /* ---------- 填 Key ---------- */
    const input = document.createElement('input');
    input.className = 'dsh-onb-input';
    input.type = 'text';
    input.placeholder = '拿到后粘贴到这里（sk- 开头）';
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', 'API Key');

    const err = document.createElement('div');
    err.className = 'dsh-onb-err';

    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'dsh-onb-primary';
    save.textContent = '保存并开始聊天';

    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'dsh-onb-skip';
    skip.textContent = '稍后再说';

    const foot = document.createElement('p');
    foot.className = 'dsh-onb-foot';
    foot.textContent =
      '跳转的是 DeepSeek 官方站点；本应用为非官方客户端，与 DeepSeek 无从属关系。';

    save.addEventListener('click', () => {
      const key = input.value.trim();
      if (!key) {
        err.textContent = '请先粘贴 API Key，或点「稍后再说」。';
        err.dataset.show = '1';
        input.focus();
        return;
      }
      write(API_KEY_STORAGE, key);
      write(SKIP_FLAG, '1');
      // chat-demo 的设置在模块初始化时读取，必须重载才会生效
      location.reload();
    });

    input.addEventListener('input', () => {
      if (err.dataset.show === '1') err.dataset.show = '0';
    });

    skip.addEventListener('click', () => {
      write(SKIP_FLAG, '1');
      root.remove();
    });

    inner.append(h, lede, block, input, save, err, skip, foot);
    root.append(inner);
    return root;
  };

  const maybeShow = () => {
    if (hasKey() || isSkipped()) return;
    if (document.querySelector('.dsh-onb')) return;
    document.body.append(build());
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeShow, { once: true });
  } else {
    maybeShow();
  }
})();
