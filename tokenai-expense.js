/* TokenAI expense matter client. Credentials live only in memory. */
(() => {
  'use strict';
  const base = 'https://tokenai.awiki.ai';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const state = { token: '', user: null, matter: null, messages: [], operations: [], status: null, error: '', progress: '', partial: '', busy: false, cursor: 0, draft: '', pendingMessage: null, before: null };
  let streamController, loginWindow, loginRequest;
  function clearSession() {
    streamController?.abort();
    Object.assign(state, { token: '', user: null, matter: null, messages: [], operations: [], status: null, error: '', progress: '', partial: '', cursor: 0, draft: '', pendingMessage: null, before: null });
  }
  const b64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const random = () => b64(crypto.getRandomValues(new Uint8Array(32)));
  const labels = { pending: '等待确认', completed: '已完成', executing: '正在执行', unknown: '结果待核实', rejected: '已拒绝', expired: '确认已过期', failed: '执行失败' };
  async function api(path, body, method) {
    const headers = state.token ? { Authorization: 'Bearer ' + state.token } : {};
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const response = await fetch(base + path, { method: method || (body ? 'POST' : 'GET'), headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined, credentials: 'omit' });
    const result = await response.json().catch(() => ({ error: '服务返回了无法识别的响应' }));
    if (!response.ok) {
      if (response.status === 401) clearSession();
      throw new Error(result.error || '服务请求失败（' + response.status + '）');
    }
    return result;
  }
  function packHtml() {
    return `<main class="page"><span class="eyebrow">工作 / 业务方案</span><h1>报销费控协同方案</h1><p class="lead">财务人员与 TokenAI 报销费控助手在固定事项中协作，查询审核进度、核对问题并跟踪结果。</p><div class="grid"><section class="tile"><h3>固定事项</h3><p>报销费控工作台 · 持续保存消息与已关联任务，随时进入。</p><button type="button" class="btn primary" data-object="matter:expense">进入报销费控事项</button></section><section class="tile"><h3>人机协作</h3><p>授权财务人员 + TokenAI 报销费控助手（Pi Agent）。实际账号与权限由 TokenAI 服务验证。</p></section><section class="tile"><h3>可用能力</h3><p>查看场景、查询本事项授权任务的状态与结果。上传及发起审核按服务授权开放，提交前确认具体操作。</p></section><section class="tile"><h3>结果依据</h3><p>结果来自 TokenX 实际工具调用。审核完成表示审核流程的结果，付款和到账情况需要相应业务系统提供依据。</p></section></div><p><a href="${base}" target="_blank" rel="noopener noreferrer">查看 TokenAI 服务状态</a></p></main>`;
  }
  function html() {
    const members = state.matter?.members || [{ name: '财务人员 · 登录后确认', kind: 'human' }, { name: 'TokenAI 报销费控助手', kind: 'agent' }];
    const operations = state.operations.filter(o => o.state === 'pending' || o.state === 'unknown').map(o => `<section class="advance ${o.state === 'unknown' ? 'warn' : ''}"><h3>${esc(o.tool)} · ${esc(labels[o.state])}</h3><p style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(JSON.stringify(o.args, null, 2))}</p>${o.state === 'pending' && o.user_id === state.user?.id ? `<div class="btn-row"><button type="button" class="btn primary" data-expense-action="approve" data-id="${esc(o.id)}" ${state.busy ? 'disabled' : ''}>确认执行本次操作</button><button type="button" class="btn" data-expense-action="reject" data-id="${esc(o.id)}" ${state.busy ? 'disabled' : ''}>拒绝</button></div>` : '<p>请先核查远程状态，避免重复提交。</p>'}</section>`).join('');
    const messages = state.messages.map(m => `<article class="msg"><span class="avatar ${m.actor === 'tokenai' ? 'agent' : 'human'}">${m.actor === 'tokenai' ? 'AI' : esc(m.name.slice(0, 1))}</span><div class="body"><div class="meta"><b>${esc(m.name)}</b><span>报销费控事项</span><time>${esc(new Date(m.created).toLocaleString())}</time></div><div class="bubble"><p style="overflow-wrap:anywhere">${esc(m.text)}</p></div></div></article>`).join('');
    return `<main class="center" id="expense-root"><header class="chat-head"><div class="headflex"><div><span class="eyebrow">持续协作事项 · EXPENSE CONTROL</span><h2>报销费控工作台</h2><p>TokenAI · Pi Agent · TokenX Suite</p></div><span class="pill ${state.token ? 'ok' : 'gray'}">${state.token ? '已登录 · ' + esc(state.user?.name || '') : '待登录'}</span></div><div class="members">${members.map(m => `<span class="member"><span class="avatar ${m.kind === 'agent' ? 'agent' : 'human'}">${m.kind === 'agent' ? 'AI' : esc(m.name.slice(0, 1))}</span>${esc(m.name)}</span>`).join('')}</div></header><div class="chat-scroll" id="expense-scroll"><div class="timeline"><div class="split-note">本事项通过 TokenAI 处理真实请求。可查询当前事项已授权关联的审核任务；企业完整报销台账、付款和到账情况取决于业务系统实际提供的能力。</div>${!state.token ? `<section class="advance"><h3>连接财务工作台</h3><p>使用管理员开通的财务账号登录。页面中的演示角色选择不改变真实账号权限。</p><button type="button" class="btn primary" data-expense-action="login">登录 TokenAI 并连接</button></section>` : ''}${state.status ? `<div class="split-note">Pi ${esc(state.status.piVersion)} · ${esc(state.status.model.name)} · TokenX：${state.status.mcp.connected ? "已连接，" + state.status.mcp.discoveredTools + " 个工具" : esc(state.status.mcp.error || "未连接")}</div>` : ""}${state.error ? `<div class="advance error" role="alert"><h3>请求未完成</h3><p>${esc(state.error)}</p>${state.pendingMessage ? '<button type="button" class="btn" data-expense-action="retry">重试同一条消息</button>' : ''}</div>` : ''}${state.messages.length >= 100 && state.before ? '<button type="button" class="btn tiny" data-expense-action="older">加载更早消息</button>' : ''}${messages}${state.partial ? `<article class="msg"><span class="avatar agent">AI</span><div class="body"><div class="meta"><b>TokenAI 报销费控助手</b><span>正在回复</span></div><div class="bubble"><p style="overflow-wrap:anywhere">${esc(state.partial)}</p></div></div></article>` : ''}${operations}<p class="muted small" role="status">${esc(state.progress)}</p></div></div><footer class="chat-compose"><form data-expense-form="message" class="partner-compose"><input name="text" maxlength="12000" value="${esc(state.draft)}" placeholder="询问可用审核场景，或查询已关联任务的进度和结果" aria-label="向 TokenAI 提问" ${!state.token || state.busy ? 'disabled' : ''}><button class="btn primary" type="submit" ${!state.token || state.busy ? 'disabled' : ''}>发送</button></form><div class="btn-row"><button class="btn tiny" type="button" data-expense-action="refresh" ${!state.token || state.busy ? 'disabled' : ''}>刷新记录</button><label class="btn tiny">添加附件<input type="file" data-expense-file hidden ${!state.token || state.busy ? 'disabled' : ''}></label>${state.token ? '<button class="btn tiny" type="button" data-expense-action="logout">退出登录</button>' : ''}<a class="btn tiny" href="${base}" target="_blank" rel="noopener noreferrer">服务状态</a></div><small>消息保存在服务端；审核和取消等操作需确认。附件上传到本事项后，是否可提交给 TokenX 以服务能力为准。</small></footer></main>`;
  }
  function draw() {
    const root = document.querySelector('#expense-root');
    if (!root) return;
    const old = root.querySelector('[name=text]');
    if (old && !old.disabled && state.token) state.draft = old.value;
    const scroll = root.querySelector('#expense-scroll');
    const follow = !scroll || scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 100;
    const top = scroll?.scrollTop || 0;
    root.outerHTML = html();
    const next = document.querySelector('#expense-scroll');
    if (next) next.scrollTop = follow ? next.scrollHeight : top;
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
  }
  async function connect() {
    state.user = await api('/api/v1/me');
    const matter = await api('/api/v1/solutions/expense-control/matter:ensure', {});
    state.matter = await api('/api/v1/matters/' + matter.id);
    state.cursor = 0; state.error = ''; await refresh(true); startStream();
  }
  async function login() {
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
      state.token = result.accessToken; await connect();
    } catch (e) { state.error = e.message; draw(); }
  });
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
  async function stream(controller) {
    while (state.token && !controller.signal.aborted) {
      try {
        const response = await fetch(base + '/api/v1/matters/' + state.matter.id + '/events?after=' + state.cursor, { headers: { Authorization: 'Bearer ' + state.token }, signal: controller.signal, credentials: 'omit' });
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
            draw();
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
      if (action === 'login') await login();
      if (action === 'refresh') { state.error = ''; await refresh(); }
      if (action === 'retry' && state.pendingMessage) await send(state.pendingMessage);
      if (action === 'older') {
        const page = await api('/api/v1/matters/' + state.matter.id + '/messages?before=' + state.before);
        state.messages = [...page.messages, ...state.messages]; state.before = page.before; draw();
      }
      if (action === 'approve' || action === 'reject') {
        state.busy = true; draw();
        const result = await api('/api/v1/operations/' + button.dataset.id + '/confirm', { approve: action === 'approve' });
        state.progress = labels[result.state] || result.state; await refresh();
      }
      if (action === 'logout') {
        try { await api('/api/v1/auth/logout', {}); } finally { clearSession(); }
      }
    } catch(e) { state.error = e.message; }
    finally { state.busy = false; draw(); }
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
  window.TokenAIExpense = { html, packHtml };
})();
