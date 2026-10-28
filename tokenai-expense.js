/* TokenAI expense client. Remembered sessions store a revocable token, never a password. */
(() => {
  'use strict';
  const base = 'https://tokenai.awiki.ai';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const state = { token: '', user: null, matter: null, messages: [], operations: [], status: null, error: '', progress: '', partial: '', busy: false, cursor: 0, draft: '', pendingMessage: null, before: null, workOrder: null, downloadNotice: null, companion: { status: 'idle', text: '' }, companionTab: 'auto', companionQuestions: [], companionDraft: '', companionSending: false, companionQuestionError: '', pendingPrivateQuestion: null };
  let streamController, loginWindow, loginRequest, companionTimer, liveTimer;
  const markdownCache = new Map(), preparedDownloads = new Map(), activeDownloads = new Set();
  const sessionKey = 'tokenai.session.v1';
  let pendingOrder = location.origin === base ? location.pathname.match(/^\/work-orders\/([0-9a-f-]{36})(?:\/report)?$/i)?.[1] : null;
  function savedSession() {
    try {
      const saved = JSON.parse(localStorage.getItem(sessionKey));
      if (saved && /^[A-Za-z0-9_-]{43}$/.test(saved.accessToken || '') && Number.isFinite(saved.expiresAt) && saved.expiresAt > Date.now()) return saved;
      localStorage.removeItem(sessionKey);
    } catch {}
    return null;
  }
  function clearSession(forget = true) {
    streamController?.abort();
    clearTimeout(companionTimer);
    clearTimeout(liveTimer); markdownCache.clear();
    for (const item of preparedDownloads.values()) URL.revokeObjectURL(item.url); preparedDownloads.clear(); activeDownloads.clear();
    if (forget) { try { localStorage.removeItem(sessionKey); } catch {} }
    Object.assign(state, { token: '', user: null, matter: null, messages: [], operations: [], status: null, error: '', progress: '', partial: '', cursor: 0, draft: '', pendingMessage: null, before: null, workOrder: null, downloadNotice: null, companion: { status: 'idle', text: '' }, companionTab: 'auto', companionQuestions: [], companionDraft: '', companionSending: false, companionQuestionError: '', pendingPrivateQuestion: null });
  }
  const b64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const random = () => b64(crypto.getRandomValues(new Uint8Array(32)));
  const labels = { pending: '等待确认', completed: '已完成', executing: '正在执行', unknown: '结果待核实', rejected: '已拒绝', expired: '确认已过期', failed: '执行失败' };
  function renderText(value, cache = true) {
    const input = String(value || '');
    if (cache && markdownCache.has(input)) return markdownCache.get(input);
    const template = document.createElement('template');
    template.innerHTML = window.TokenAIMarkdown ? window.TokenAIMarkdown.render(value) : esc(value).replace(/\n/g, '<br>');
    for (const element of template.content.querySelectorAll('a, code')) {
      const text = element.tagName === 'A' ? element.getAttribute('href') : element.textContent;
      let action = null, id = null, legacy = false;
      try {
        const url = new URL(text);
        if (url.origin === base) {
          const path = url.pathname.match(/^\/work-orders\/([0-9a-f-]{36})(\/report)?$/i);
          if (path) { id = path[1]; action = path[2] ? 'download-report' : 'view-order'; }
        } else if (['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/doc') { id = url.searchParams.get('subjectId'); if (/^[0-9a-f-]{36}$/i.test(id || '')) { action = 'view-order'; legacy = true; } }
      } catch {}
      if (action) {
        const replacement = document.createElement('span');
        replacement.innerHTML = `<button type="button" class="btn tiny" data-expense-action="${action}" data-subject="${esc(id)}">${action === 'download-report' ? '下载审核结果（Markdown）' : '查看审核明细'}</button>${legacy ? ` <button type="button" class="btn tiny" data-expense-action="download-report" data-subject="${esc(id)}">下载审核结果（Markdown）</button>` : ''}`;
        element.replaceWith(replacement);
      } else if (element.tagName === 'A') {
        element.target = '_blank'; element.rel = 'noopener noreferrer';
        try { if (['localhost', '127.0.0.1'].includes(new URL(text, location.href).hostname)) element.removeAttribute('href'); } catch {}
      }
    }
    const html = template.innerHTML;
    if (cache) { if (markdownCache.size >= 200) markdownCache.delete(markdownCache.keys().next().value); markdownCache.set(input, html); }
    return html;
  }
  function partnerHtml() {
    const advice = state.companion, status = !state.token ? '待登录' : ({ waiting: '等待主聊天结果', generating: '正在分析', ready: '建议已更新', error: '暂时无法更新', interrupted: '等待更新', idle: '等待主聊天' }[advice.status] || '等待更新');
    const body = !state.token ? '<p class="companion-note">登录后，AI 伙伴会根据主聊天中的新结果，为财务经理提供私人建议。</p>' : advice.text ? `<div class="tokenai-markdown">${renderText(advice.text)}</div>` : '<p class="companion-note">主聊天产生新内容后，我会自动整理需要关注的风险、待补材料和下一步建议。</p>';
    const updated = advice.updatedAt ? new Date(advice.updatedAt).toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' }) : '';
    const questions = state.companionQuestions.map(q => `<article class="companion-qa" data-question-id="${esc(q.id)}"><div class="companion-question"><small>我的提问 · ${esc(new Date(q.created).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))}</small><p>${esc(q.question)}</p></div><div class="companion-answer"><small>AI 伙伴回答</small>${q.status === 'completed' ? `<div class="tokenai-markdown">${renderText(q.answer)}</div>` : ['queued','running'].includes(q.status) ? '<p class="companion-note" role="status">正在结合主聊天回答…</p>' : `<p class="companion-note">本次回答未完成，可重新提问。</p><button type="button" class="btn tiny" data-expense-action="companion-reask" data-id="${esc(q.id)}">再问一次</button>`}</div></article>`).join('');
    const qa = `<p class="companion-note">这里是你主动发起的私人问答，与自动分析分开保存，不会发送到主聊天。</p>${questions || '<section class="p-card"><p class="companion-note">可以问：这次审核最需要关注什么？下一步应补哪些材料？</p></section>'}${state.companionQuestionError ? `<p class="companion-question-error" role="alert">${esc(state.companionQuestionError)}</p>${state.pendingPrivateQuestion ? '<button type="button" class="btn tiny" data-expense-action="companion-question-retry">重试提交</button>' : ''}` : ''}`;
    const automatic = `<section class="p-card"><div class="companion-note">基于主聊天的自动分析</div>${body}</section>${advice.error ? '<p class="companion-note">建议暂时未能更新，可以稍后点击“更新建议”。主聊天仍可继续使用。</p>' : ''}<p class="companion-note">${updated ? '最近建议更新于北京时间 ' + esc(updated) + '。' : ''}主聊天回复完成后自动更新。</p>`;
    return `<aside class="partner tokenai-companion" id="expense-companion"><header class="partner-head"><span class="companion-icon">✦</span><div><b>财务经理的 AI 伙伴</b><small>独立 Pi · DeepSeek · 私人交流</small></div><span class="companion-status" role="status">${esc(status)}</span></header><div class="companion-tabs" role="tablist" aria-label="AI 伙伴内容类型"><button type="button" role="tab" aria-selected="${state.companionTab === 'auto'}" data-expense-action="companion-tab" data-tab="auto">自动分析</button><button type="button" role="tab" aria-selected="${state.companionTab === 'qa'}" data-expense-action="companion-tab" data-tab="qa">私人问答${state.companionQuestions.length ? ' · ' + state.companionQuestions.length : ''}</button></div><div class="partner-scroll" data-companion-panel="${state.companionTab}">${state.companionTab === 'qa' ? qa : automatic}</div><footer class="partner-foot"><form data-companion-form="question"><textarea name="question" rows="2" maxlength="2000" placeholder="只问我的 AI 伙伴，不发送主聊天" aria-label="向我的 AI 伙伴提问" ${!state.token || !state.matter || state.companionSending ? 'disabled' : ''}>${esc(state.companionDraft)}</textarea><button type="submit" class="btn primary tiny" ${!state.token || !state.matter || state.companionSending ? 'disabled' : ''}>${state.companionSending ? '正在提交…' : '问 AI 伙伴'}</button></form><button type="button" class="btn tiny" data-expense-action="companion-refresh" ${!state.token || !state.matter || ['waiting','generating'].includes(advice.status) ? 'disabled' : ''}>更新自动分析</button><p>辅助判断 · 由财务人员决定，不自动审批或执行。</p></footer></aside>`;
  }
  function drawCompanion(followQuestion = false) {
    const root = document.querySelector('#expense-companion'); if (!root) return;
    const signature = JSON.stringify([state.token, state.companion, state.companionTab, state.companionQuestions, state.companionSending, state.companionQuestionError]);
    if (root.__companionSignature === signature) return;
    const input = root.querySelector('[name=question]'), focused = input === document.activeElement, selection = input ? [input.selectionStart, input.selectionEnd] : null;
    if (input && state.token) state.companionDraft = input.value;
    const qaSignature = JSON.stringify(state.companionQuestions.map(q => [q.id, q.status, q.answer.length]));
    const newAnswer = qaSignature !== root.__qaSignature;
    const top = root.querySelector('.partner-scroll')?.scrollTop || 0; root.outerHTML = partnerHtml();
    const current = document.querySelector('#expense-companion'); if (current) { current.__companionSignature = signature; current.__qaSignature = qaSignature; }
    const nextInput = current?.querySelector('[name=question]'); if (focused && nextInput && !nextInput.disabled) { nextInput.focus({ preventScroll: true }); if (selection) nextInput.setSelectionRange(...selection); }
    const scroll = current?.querySelector('.partner-scroll'); if (scroll) scroll.scrollTop = state.companionTab === 'qa' && (followQuestion || newAnswer) ? scroll.scrollHeight : top;
  }
  async function updateCompanion(force = false) {
    clearTimeout(companionTimer);
    if (!state.token || !state.matter) return;
    const accessToken = state.token, matterId = state.matter.id;
    try {
      const [result, questions] = await Promise.all([api('/api/v1/matters/' + matterId + (force ? '/companion:refresh' : '/companion'), force ? {} : undefined), api('/api/v1/matters/' + matterId + '/companion/questions')]);
      if (state.token !== accessToken || state.matter?.id !== matterId) return;
      state.companion = result; state.companionQuestions = questions.questions; drawCompanion();
      if (['waiting','generating','interrupted'].includes(result.status) || questions.questions.some(q => ['queued','running'].includes(q.status))) companionTimer = setTimeout(() => updateCompanion(), 1500);
    } catch (error) {
      if (state.token !== accessToken) return;
      state.companion = { ...state.companion, status: 'error', error: error.message }; drawCompanion();
    }
  }
  function workOrderHtml() {
    const data = state.workOrder; if (!data) return '';
    const rules = Array.isArray(data.rule_results) ? data.rule_results : Array.isArray(data.review_result?.results) ? data.review_result.results : Object.values(data.rule_results || {});
    return `<div style="position:fixed;inset:0;background:#17253b90;z-index:1000;display:grid;place-items:center;padding:16px"><section id="work-order-panel" role="dialog" aria-modal="true" aria-label="工单审核明细" style="background:white;color:#233145;border-radius:14px;width:min(900px,100%);max-height:90dvh;overflow:auto;padding:22px"><div class="headflex"><h2>${esc(data.title || '工单审核明细')}</h2><button class="btn tiny" type="button" data-expense-action="close-order">关闭</button></div><p>审核状态：${esc(data.status)} · 风险等级：${esc(data.risk_level)} · 业务类型：${esc(data.scenario_type)}</p><div class="tokenai-markdown">${renderText(data.audit_summary || data.review_result?.audit_summary || '')}</div><div class="btn-row"><button class="btn primary" type="button" data-expense-action="download-report" data-subject="${esc(data.subject_id)}" ${state.busy ? 'disabled' : ''}>下载审核结果（Markdown）</button></div>${downloadNoticeHtml()}<p class="muted small">下载内容由 TokenX 实时审核结果导出，包含规则结论与证据。控制台原报告文件尚不能通过当前公网通道下载。</p><h3>规则明细 · ${rules.length} 项</h3>${rules.map((r, i) => `<details style="border-top:1px solid #dce4ef;padding:12px 0"><summary>${i + 1}. ${esc(r.name || r.rule_code || '审核规则')} · ${esc(r.status || '')}</summary><div class="tokenai-markdown">${renderText(r.summary || '')}</div><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px">${esc(JSON.stringify(r, null, 2))}</pre></details>`).join('')}<details><summary>完整审核数据</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px">${esc(JSON.stringify(data, null, 2))}</pre></details></section></div>`;
  }
  async function api(path, body, method) {
    const requestToken = state.token;
    const headers = requestToken ? { Authorization: 'Bearer ' + requestToken } : {};
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const response = await fetch(base + path, { method: method || (body ? 'POST' : 'GET'), headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined, credentials: 'omit' });
    const result = await response.json().catch(() => ({ error: '服务返回了无法识别的响应' }));
    if (!response.ok) {
      if (response.status === 401 && state.token === requestToken) clearSession();
      throw new Error(result.error || '服务请求失败（' + response.status + '）');
    }
    return result;
  }
  function packHtml() {
    return `<main class="page"><span class="eyebrow">工作 / 业务方案</span><h1>报销费控协同方案</h1><p class="lead">财务人员与 TokenAI 报销费控助手在固定事项中协作，按日期和业务类型查询工单，查看审核明细与结论。</p><div class="grid"><section class="tile"><h3>固定事项</h3><p>报销费控工作台 · 持续保存消息与已关联任务，随时进入。</p><button type="button" class="btn primary" data-object="matter:expense">进入报销费控事项</button></section><section class="tile"><h3>人机协作</h3><p>授权财务人员 + TokenAI 报销费控助手（Pi Agent）。实际账号与权限由 TokenAI 服务验证。</p></section><section class="tile"><h3>可用能力</h3><p>查看场景、按日期和业务类型列出授权工单、查看工单审核明细及结果。上传及发起审核按服务授权开放，提交前确认具体操作。</p></section><section class="tile"><h3>结果依据</h3><p>结果来自 TokenX 实际工具调用。审核完成表示审核流程的结果，付款和到账情况需要相应业务系统提供依据。</p></section></div><p><a href="${base}" target="_blank" rel="noopener noreferrer">查看 TokenAI 服务状态</a></p></main>`;
  }
  function html() {
    const members = state.matter?.members || [{ name: '财务人员 · 登录后确认', kind: 'human' }, { name: 'TokenAI 报销费控助手', kind: 'agent' }];
    const operations = state.operations.filter(o => o.state === 'pending' || o.state === 'unknown').map(o => `<section class="advance ${o.state === 'unknown' ? 'warn' : ''}"><h3>${esc(o.tool)} · ${esc(labels[o.state])}</h3><p style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(JSON.stringify(o.args, null, 2))}</p>${o.state === 'pending' && o.user_id === state.user?.id ? `<div class="btn-row"><button type="button" class="btn primary" data-expense-action="approve" data-id="${esc(o.id)}" ${state.busy ? 'disabled' : ''}>确认执行本次操作</button><button type="button" class="btn" data-expense-action="reject" data-id="${esc(o.id)}" ${state.busy ? 'disabled' : ''}>拒绝</button></div>` : '<p>请先核查远程状态，避免重复提交。</p>'}</section>`).join('');
    const messages = state.messages.map(m => `<article class="msg"><span class="avatar ${m.actor === 'tokenai' ? 'agent' : 'human'}">${m.actor === 'tokenai' ? 'AI' : esc(m.name.slice(0, 1))}</span><div class="body"><div class="meta"><b>${esc(m.name)}</b><span>报销费控事项</span><time>${esc(new Date(m.created).toLocaleString())}</time></div><div class="bubble"><div class="tokenai-markdown">${renderText(m.text)}</div></div></div></article>`).join('');
    return `<main class="center" id="expense-root"><header class="chat-head"><div class="headflex"><div><span class="eyebrow">持续协作事项 · EXPENSE CONTROL</span><h2>报销费控工作台</h2><p>TokenAI · Pi Agent · TokenX Suite</p></div><span class="pill ${state.token ? 'ok' : 'gray'}">${state.token ? '已登录 · ' + esc(state.user?.name || '') : '待登录'}</span></div><div class="members">${members.map(m => `<span class="member"><span class="avatar ${m.kind === 'agent' ? 'agent' : 'human'}">${m.kind === 'agent' ? 'AI' : esc(m.name.slice(0, 1))}</span>${esc(m.name)}</span>`).join('')}</div></header><div class="chat-scroll" id="expense-scroll"><div class="timeline"><div class="split-note">本事项通过 TokenAI 处理真实请求。已授权财务组织可按日期、业务类型查询 TokenX 工单和审核明细，无需先提供 run_id；企业完整报销台账、付款和到账情况取决于业务系统实际提供的能力。</div>${!state.token ? `<section class="advance"><h3>连接财务工作台</h3><p>使用管理员开通的财务账号登录。页面中的演示角色选择不改变真实账号权限。</p><button type="button" class="btn primary" data-expense-action="login">登录 TokenAI 并连接</button></section>` : ''}${state.status ? `<div class="split-note">Pi ${esc(state.status.piVersion)} · ${esc(state.status.model.name)} · TokenX：${state.status.mcp.connected ? "已连接，" + state.status.mcp.discoveredTools + " 个工具" : esc(state.status.mcp.error || "未连接")}</div>` : ""}${state.error ? `<div class="advance error" role="alert"><h3>请求未完成</h3><p>${esc(state.error)}</p>${state.pendingMessage ? '<button type="button" class="btn" data-expense-action="retry">重试同一条消息</button>' : ''}</div>` : ''}${state.messages.length >= 100 && state.before ? '<button type="button" class="btn tiny" data-expense-action="older">加载更早消息</button>' : ''}${messages}${liveMessageHtml()}${operations}<p class="muted small" id="expense-progress" role="status">${esc(state.progress)}</p></div></div><footer class="chat-compose">${downloadNoticeHtml()}<form data-expense-form="message" class="partner-compose"><input name="text" maxlength="12000" value="${esc(state.draft)}" placeholder="例如：查询今日合同付款审核明细" aria-label="向 TokenAI 提问" ${!state.token || state.busy ? 'disabled' : ''}><button class="btn primary" type="submit" ${!state.token || state.busy ? 'disabled' : ''}>发送</button></form><div class="btn-row"><button class="btn tiny" type="button" data-expense-action="refresh" ${!state.token || state.busy ? 'disabled' : ''}>刷新记录</button><label class="btn tiny">添加附件<input type="file" data-expense-file hidden ${!state.token || state.busy ? 'disabled' : ''}></label>${state.token ? '<button class="btn tiny" type="button" data-expense-action="logout">退出登录</button>' : ''}<a class="btn tiny" href="${base}" target="_blank" rel="noopener noreferrer">服务状态</a></div><small>消息保存在服务端；审核和取消等操作需确认。附件上传到本事项后，是否可提交给 TokenX 以服务能力为准。</small></footer>${workOrderHtml()}</main>`;
  }
  function mount() {
    requestAnimationFrame(() => {
      const scroll = document.querySelector('#expense-scroll');
      if (scroll) { scroll.style.scrollBehavior = 'auto'; scroll.scrollTop = scroll.scrollHeight; }
    });
    drawCompanion();
  }
  function draw(follow = true) {
    clearTimeout(liveTimer); liveTimer = null;
    drawCompanion();
    const root = document.querySelector('#expense-root');
    if (!root) return;
    const old = root.querySelector('[name=text]');
    const inputFocused = old === document.activeElement, inputSelection = old ? [old.selectionStart, old.selectionEnd] : null;
    if (old && !old.disabled && state.token) state.draft = old.value;
    const orderTop = root.querySelector('#work-order-panel')?.scrollTop || 0;
    const scroll = root.querySelector('#expense-scroll');
    const top = scroll?.scrollTop || 0;
    root.outerHTML = html();
    const nextInput = document.querySelector('#expense-root [name=text]'); if (inputFocused && nextInput && !nextInput.disabled) { nextInput.focus({ preventScroll: true }); if (inputSelection) nextInput.setSelectionRange(...inputSelection); }
    const orderPanel = document.querySelector('#work-order-panel'); if (orderPanel) orderPanel.scrollTop = orderTop;
    const next = document.querySelector('#expense-scroll');
    if (next) { next.style.scrollBehavior = 'auto'; next.scrollTop = follow ? next.scrollHeight : top; }
  }
  function liveMessageHtml() {
    return state.partial ? `<article class="msg" id="expense-stream-message"><span class="avatar agent">AI</span><div class="body"><div class="meta"><b>TokenAI 报销费控助手</b><span>正在回复</span></div><div class="bubble"><div class="tokenai-markdown">${renderText(state.partial, false)}</div></div></div></article>` : '';
  }
  function scheduleLivePaint() {
    if (liveTimer) return;
    liveTimer = setTimeout(() => {
      liveTimer = null; const root = document.querySelector('#expense-root'); if (!root) return;
      const progress = root.querySelector('#expense-progress'), current = root.querySelector('#expense-stream-message');
      if (current) { if (state.partial) current.outerHTML = liveMessageHtml(); else current.remove(); }
      else if (state.partial && progress) progress.insertAdjacentHTML('beforebegin', liveMessageHtml());
      if (progress) progress.textContent = state.progress;
      const scroll = root.querySelector('#expense-scroll'); if (scroll) scroll.scrollTop = scroll.scrollHeight;
    }, 80);
  }
  function downloadNoticeHtml() {
    const notice = state.downloadNotice; if (!notice) return '';
    const file = preparedDownloads.get(notice.subjectId);
    return `<div class="download-notice ${notice.status === 'error' ? 'error' : ''}" role="status" aria-live="polite"><span>${esc(notice.text)}</span>${file ? ` <a class="btn tiny" href="${esc(file.url)}" download="${esc(file.name)}">保存文件</a><button type="button" class="btn tiny" data-expense-action="copy-report" data-subject="${esc(notice.subjectId)}">复制 Markdown</button>` : ''}${notice.status === 'error' ? `<button type="button" class="btn tiny" data-expense-action="download-report" data-subject="${esc(notice.subjectId)}">重试下载</button>` : ''}</div>`;
  }
  async function refresh(initial = false) {
    if (!state.token || !state.matter) return;
    const accessToken = state.token, matterId = state.matter.id;
    const path = '/api/v1/matters/' + state.matter.id;
    const [messages, operations, status] = await Promise.all([api(path + '/messages'), api(path + '/operations'), api('/api/v1/status')]);
    if (state.token !== accessToken || state.matter?.id !== matterId) return;
    state.messages = messages.messages; state.before = messages.before; state.operations = operations.operations;
    state.status = status;
    if (initial) state.cursor = messages.eventCursor;
    draw();
    updateCompanion();
  }
  async function connect() {
    state.user = await api('/api/v1/me');
    const matter = await api('/api/v1/solutions/expense-control/matter:ensure', {});
    state.matter = await api('/api/v1/matters/' + matter.id);
    state.cursor = 0; state.error = ''; await refresh(true); startStream();
    if (pendingOrder) { const id = pendingOrder; pendingOrder = null; await openWorkOrder(id).catch(e => { state.error = e.message; draw(false); }); }
  }
  async function restoreSession() {
    const saved = savedSession(); if (!saved) return false;
    state.token = saved.accessToken; state.progress = '正在恢复登录…';
    try { await connect(); state.progress = '已恢复登录'; draw(); return true; }
    catch (e) { clearSession(false); state.error = e.message; draw(); return false; }
  }
  async function login() {
    if (savedSession()) { await restoreSession(); return; }
    const verifier = random(), nonce = random();
    loginWindow = window.open('about:blank', 'tokenai-finance-login', 'width=520,height=680');
    if (!loginWindow) throw new Error('请允许打开 TokenAI 登录窗口，然后重试');
    const codeChallenge = b64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
    loginRequest = { verifier, nonce, expires: Date.now() + 5 * 60000 };
    loginWindow.location.href = base + '/auth?' + new URLSearchParams({ origin: location.origin, state: nonce, challenge: codeChallenge });
  }
  window.addEventListener('message', async event => {
    if (event.origin !== base || event.source !== loginWindow || !loginRequest || loginRequest.expires < Date.now() || event.data?.type !== 'tokenai-auth' || event.data.state !== loginRequest.nonce) return;
    const transaction = loginRequest; loginRequest = null;
    try {
      const result = await api('/api/v1/auth/token', { code: event.data.code, verifier: transaction.verifier, origin: location.origin });
      try {
        if (result.remember) localStorage.setItem(sessionKey, JSON.stringify({ accessToken: result.accessToken, expiresAt: result.expiresAt }));
        else localStorage.removeItem(sessionKey);
      } catch {}
      state.token = result.accessToken; await connect();
    } catch (e) { state.error = e.message; draw(); }
  });
  async function openWorkOrder(id) {
    if (!state.token) { pendingOrder = id; await login(); return; }
    state.workOrder = await api('/api/v1/work-orders/' + encodeURIComponent(id));
    state.error = ''; draw(false);
  }
  async function downloadReport(id) {
    if (!state.token) { pendingOrder = id; await login(); return; }
    if (activeDownloads.has(id)) return;
    activeDownloads.add(id); state.downloadNotice = { status: 'loading', subjectId: id, text: '正在准备审核结果导出，请稍候…' }; draw(false);
    const requestToken = state.token;
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 60000);
    try {
    const response = await fetch(base + '/api/v1/work-orders/' + encodeURIComponent(id) + '/report', { headers: { Authorization: 'Bearer ' + requestToken }, credentials: 'omit', signal: controller.signal });
    if (state.token !== requestToken) return;
    if (!response.ok) { if (response.status === 401) clearSession(); const error = await response.json().catch(() => ({})); throw new Error(error.error || '审核结果下载未完成'); }
    const blob = await response.blob();
    if (state.token !== requestToken) return;
    if (!blob.size || !response.headers.get('content-type')?.includes('text/markdown')) throw new Error('服务未返回有效的 Markdown 文件，请重试');
    const encoded = response.headers.get('content-disposition')?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const previous = preparedDownloads.get(id); if (previous) URL.revokeObjectURL(previous.url);
    if (!previous && preparedDownloads.size >= 5) { const oldest = preparedDownloads.keys().next().value; URL.revokeObjectURL(preparedDownloads.get(oldest).url); preparedDownloads.delete(oldest); }
    const file = { url: URL.createObjectURL(blob), name: encoded ? decodeURIComponent(encoded) : 'audit-result.md', blob };
    preparedDownloads.set(id, file);
    const anchor = document.createElement('a'); anchor.href = file.url; anchor.download = file.name; document.body.append(anchor); anchor.click(); anchor.remove();
    state.downloadNotice = { status: 'ready', subjectId: id, text: '文件已就绪；若没有自动保存，请点击“保存文件”，也可复制 Markdown。' };
    state.progress = '审核结果导出已准备';
    } catch (error) {
      if (state.token === requestToken) state.downloadNotice = { status: 'error', subjectId: id, text: error.name === 'AbortError' ? '准备文件超时，请重试。' : '下载未完成：' + error.message };
    } finally { clearTimeout(timeout); activeDownloads.delete(id); draw(false); }
  }
  async function send(message) {
    state.busy = true; state.error = ''; state.progress = '正在提交消息…'; state.partial = ''; draw();
    try {
      await api('/api/v1/matters/' + state.matter.id + '/turns', message);
      state.pendingMessage = null; state.draft = ''; state.progress = 'Agent 已接收，等待处理…';
      const input = document.querySelector('#expense-root [name=text]'); if (input) input.value = '';
      await refresh();
    } catch (e) { state.error = e.message; state.pendingMessage = message; }
    finally { state.busy = false; draw(); }
  }
  async function askCompanion(message) {
    if (!state.token || !state.matter || state.companionSending) return;
    const accessToken = state.token, matterId = state.matter.id;
    state.companionSending = true; state.companionQuestionError = ''; state.companionTab = 'qa'; drawCompanion(true);
    try {
      await api('/api/v1/matters/' + matterId + '/companion/questions', message);
      if (state.token !== accessToken || state.matter?.id !== matterId) return;
      state.companionDraft = ''; state.pendingPrivateQuestion = null;
      const input = document.querySelector('#expense-companion [name=question]'); if (input) input.value = '';
      await updateCompanion();
    } catch (error) { if (state.token === accessToken) { state.pendingPrivateQuestion = message; state.companionQuestionError = error.message; } }
    finally { if (state.token === accessToken) { state.companionSending = false; drawCompanion(true); } }
  }
  async function stream(controller) {
    while (state.token && !controller.signal.aborted) {
      try {
        const requestToken = state.token;
        const response = await fetch(base + '/api/v1/matters/' + state.matter.id + '/events?after=' + state.cursor, { headers: { Authorization: 'Bearer ' + requestToken }, signal: controller.signal, credentials: 'omit' });
        if (controller.signal.aborted || state.token !== requestToken) return;
        if (response.status === 401) { clearSession(); state.error = '登录已过期，请重新登录'; draw(); return; }
        if (!response.ok || !response.body) throw new Error('消息连接未建立（' + response.status + '）');
        const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = '';
        while (true) {
          const { value, done } = await reader.read(); if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let end;
          while ((end = buffer.indexOf('\n\n')) >= 0) {
            const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2);
            const type = frame.match(/^event: (.+)$/m)?.[1], raw = frame.match(/^data: (.+)$/m)?.[1];
            if (!type || !raw) continue;
            const data = JSON.parse(raw); state.cursor = data.seq;
            if (type === 'turn_started') { state.partial = ''; state.progress = 'Agent 正在处理…'; }
            if (type === 'text_delta') state.partial += data.text;
            if (type === 'tool_started') state.progress = '正在调用：' + data.tool;
            if (type === 'tool_completed') state.progress = data.isError ? '工具调用未完成' : '工具已返回结果';
            if (['turn_completed', 'turn_failed', 'operation_completed', 'approval_required', 'message_created'].includes(type)) {
              if (type === 'turn_completed' || type === 'turn_failed') { state.partial = ''; state.progress = type === 'turn_completed' ? '处理完成' : '处理未完成，请查看提示'; }
              await refresh();
            }
            scheduleLivePaint();
          }
          if (buffer.length > 1024 * 1024) throw new Error('消息响应过大');
        }
      } catch (e) { if (controller.signal.aborted) return; state.error = e.message; draw(); }
      if (state.token && !controller.signal.aborted) await new Promise(resolve => setTimeout(resolve, 2500));
    }
    draw();
  }
  function startStream() { streamController?.abort(); streamController = new AbortController(); stream(streamController).catch(e => { state.error = e.message; draw(); }); }
  document.addEventListener('submit', event => {
    if (event.target.matches('[data-companion-form=question]')) { event.preventDefault(); const question = event.target.elements.question.value.trim(); if (question) askCompanion({ clientMessageId: crypto.randomUUID(), question }); return; }
    if (!event.target.matches('[data-expense-form=message]')) return;
    event.preventDefault(); if (!state.token || state.busy) return;
    const text = event.target.elements.text.value.trim(); if (!text) return;
    const message = { clientMessageId: crypto.randomUUID(), text };
    state.pendingMessage = message; send(message);
  });
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-expense-action]'); if (!button || button.disabled) return;
    try {
      const action = button.dataset.expenseAction;
      if (action === 'companion-tab') { state.companionTab = button.dataset.tab === 'qa' ? 'qa' : 'auto'; drawCompanion(true); return; }
      if (action === 'companion-question-retry') { if (state.pendingPrivateQuestion) await askCompanion(state.pendingPrivateQuestion); return; }
      if (action === 'companion-reask') { const item = state.companionQuestions.find(q => q.id === button.dataset.id); if (item) { state.companionDraft = item.question; const input = document.querySelector('#expense-companion [name=question]'); if (input) input.value = item.question; drawCompanion(); } return; }
      if (action === 'companion-refresh') { await updateCompanion(true); return; }
      if (action === 'view-order') { state.progress = '正在读取工单审核明细…'; scheduleLivePaint(); await openWorkOrder(button.dataset.subject); }
      if (action === 'download-report') await downloadReport(button.dataset.subject);
      if (action === 'copy-report') { const file = preparedDownloads.get(button.dataset.subject); if (file) { const text = await file.blob.text(); if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text); else { const input = document.createElement('textarea'); input.value = text; input.style.position = 'fixed'; input.style.opacity = '0'; document.body.append(input); input.select(); const copied = document.execCommand('copy'); input.remove(); if (!copied) throw new Error('当前浏览器未允许复制'); } state.downloadNotice = { status: 'ready', subjectId: button.dataset.subject, text: '审核结果 Markdown 已复制。' }; } }
      if (action === 'close-order') state.workOrder = null;
      if (action === 'login') await login();
      if (action === 'refresh') { state.error = ''; await refresh(); }
      if (action === 'retry' && state.pendingMessage) await send(state.pendingMessage);
      if (action === 'older') {
        const page = await api('/api/v1/matters/' + state.matter.id + '/messages?before=' + state.before);
        state.messages = [...page.messages, ...state.messages]; state.before = page.before; draw(false);
      }
      if (action === 'approve' || action === 'reject') {
        state.busy = true; draw();
        const result = await api('/api/v1/operations/' + button.dataset.id + '/confirm', { approve: action === 'approve' });
        state.progress = labels[result.state] || result.state; await refresh();
      }
      if (action === 'logout') {
        try { await api('/api/v1/auth/logout', {}); } finally { clearSession(); }
      }
    } catch(e) { if (button.dataset.expenseAction === 'copy-report') state.downloadNotice = { status: 'error', subjectId: button.dataset.subject, text: '复制未完成，请使用保存文件：' + e.message }; else { state.error = e.message; state.progress = e.message; } }
    finally { if (!button.dataset.expenseAction.startsWith('companion-')) { state.busy = false; draw(!['older','download-report','copy-report','view-order','close-order'].includes(button.dataset.expenseAction)); } }
  });
  document.addEventListener('change', async event => {
    if (!event.target.matches('[data-expense-file]') || !state.token || state.busy) return;
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) { state.error = '附件不能超过 10 MiB'; draw(); return; }
    state.busy = true; draw();
    try {
      const body = new FormData(); body.append('file', file);
      const result = await api('/api/v1/matters/' + state.matter.id + '/files', body);
      state.progress = result.notice; state.draft = (state.draft + '\n附件：' + result.name + '（附件标识 ' + result.id + '）').trim();
    } catch(e) { state.error = e.message; }
    finally { state.busy = false; draw(); }
  });
  document.addEventListener('input', event => { if (event.target.matches('#expense-companion [name=question]')) state.companionDraft = event.target.value; });
  window.TokenAIExpense = { html, packHtml, partnerHtml, mount };
  window.addEventListener('storage', event => { if (event.key === sessionKey && !event.newValue) { clearSession(); draw(); } });
  if (savedSession()) restoreSession();
})();
