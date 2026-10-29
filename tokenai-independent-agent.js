(() => {
  const root = document.getElementById('independent-agent-map');
  if (!root) return;
  const views = {
    all: { parts: ['workspace','agent','systems','authority'], title: '身份可复用，授权各自成立', copy: '财务 Agent 可以进入多个工作环境，并在明确授权下访问多个业务系统。ANP 提供身份认证与授权互操作的共同基础，业务系统与应用共同落实权限执行和记录关联。', meta: '目标架构：需要兼容接口、明确的授权策略与实际互操作验收。' },
    workspace: { parts: ['workspace','agent'], title: '入口可以变化，伙伴保持明确归属', copy: '事项群、审核明细、办公系统或移动端，通过适配接口连接同一个独立 Agent。每个入口只提供本次获准的上下文，财务方仍管理它的身份、记忆和运行。', meta: '接入工作环境 ≠ 自动取得该环境的全部数据；仍遵守成员和资源权限。' },
    systems: { parts: ['agent','systems','authority'], title: '后台访问依据受限委托', copy: 'Agent 无需依赖某个前端页面持续打开。在业务系统接受的授权有效期内，它可以执行获准的后台任务；每个系统分别限定资源、动作与期限，敏感操作核验额外批准。', meta: '独立运行不产生额外权限；接口适配和各系统的权限执行仍是必要条件。' },
    authority: { parts: ['agent','authority','systems'], title: '统一关联身份、委托与操作结果', copy: '识别 Agent、验证请求主体，核实它代表谁及授权范围，再由目标系统决定是否执行。用可关联标识串起本次授权、事项、请求与回执，并核查到期、撤销和历史结果。', meta: 'ANP-02 认证已发布；ANP-05 授权仍是草案。完整授权跟踪由协议、系统和应用共同实现。' }
  };
  root.querySelectorAll('[data-independent-view]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.independentView, view = views[key];
    root.querySelectorAll('[data-independent-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    root.querySelectorAll('[data-independent-part]').forEach(item => { const selected = view.parts.includes(item.dataset.independentPart); item.classList.toggle('ind-muted', !selected); item.classList.toggle('ind-selected', selected && key !== 'all'); });
    root.querySelector('#independent-title').textContent = view.title;
    root.querySelector('#independent-copy').textContent = view.copy;
    root.querySelector('#independent-meta').textContent = view.meta;
  }));
})();
