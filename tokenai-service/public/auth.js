'use strict';
const params = new URLSearchParams(location.search);
const origin = params.get('origin'), state = params.get('state'), codeChallenge = params.get('challenge');
const allowed = [location.origin, 'https://seanzhang9999.github.io'];
const error = document.querySelector('#error');
if (!allowed.includes(origin) || !/^[A-Za-z0-9_-]{43}$/.test(state || '') || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge || '') || !window.opener) {
  error.textContent = '登录请求无效，请从报销费控工作台重新进入。'; document.querySelector('button').disabled = true;
}
document.querySelector('#login').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.target, button = form.querySelector('button'); button.disabled = true; error.textContent = '';
  try {
    const response = await fetch('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: form.elements.username.value, password: form.elements.password.value, origin, codeChallenge }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || '登录失败');
    form.elements.password.value = '';
    window.opener.postMessage({ type: 'tokenai-auth', code: result.code, state }, origin); window.close();
  } catch(e) { error.textContent = e.message; button.disabled = false; }
});
