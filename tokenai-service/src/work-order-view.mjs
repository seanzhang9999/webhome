import { isNativeConsole, isNativeReport } from './native-view.mjs';
export const SUBJECT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireWorkOrderAccess(config, user, subjectId) {
  if (!config.workOrderTenant || user.tenant !== config.workOrderTenant) throw Object.assign(new Error('当前组织没有工单查询授权'), { statusCode: 403 });
  if (!SUBJECT_ID.test(subjectId)) throw Object.assign(new Error('工单标识不正确'), { statusCode: 400 });
}

export function publicWorkOrder(data, origin) {
  if (!data || typeof data !== 'object' || !SUBJECT_ID.test(data.subject_id || '')) throw new Error('TokenX 返回的工单标识无效');
  const url = origin + '/work-orders/' + encodeURIComponent(data.subject_id);
  const originalName = String(data.report?.original_file_name || data.report?.file_name || 'audit-report.md').replace(/[\x00-\x1f\\/]/g, '_').slice(0, 180);
  const filename = originalName.replace(/(?:_审核报告)?\.md$/i, '') + '_审核结果导出.md';
  const rewritten = data.console_url === url;
  const nativeAvailable = isNativeConsole(data.console_url, data.subject_id) || (rewritten && data.native_view_available === true);
  const originalAvailable = isNativeReport(data.report?.report_url) || (rewritten && data.report?.original_file_available === true);
  const businessData = { ...data };
  for (const key of ['share_url','share_expires_at','share_one_time']) delete businessData[key];
  return { ...businessData, console_url: url, native_view_available: nativeAvailable, report: { file_name: filename, report_url: url + '/report', source: 'TokenX 结构化审核结果导出', original_file_name: originalName, original_file_available: originalAvailable } };
}

export function rewriteWorkOrderResult(result, origin) {
  const rewritten = { ...result };
  rewritten.content = (result.content || []).map(block => {
    if (block.type !== 'text') return block;
    let parsed;
    try { parsed = JSON.parse(block.text); } catch { return block; }
    if (!parsed?.subject_id) return block;
    return { ...block, text: JSON.stringify(publicWorkOrder(parsed, origin)) };
  });
  if (result.structuredContent?.subject_id) rewritten.structuredContent = publicWorkOrder(result.structuredContent, origin);
  return rewritten;
}

const display = value => typeof value === 'string' ? value : JSON.stringify(value, null, 2);
export function workOrderRules(data) {
  if (Array.isArray(data.rule_results)) return data.rule_results;
  if (Array.isArray(data.review_result?.results)) return data.review_result.results;
  return Object.entries(data.rule_results || {}).map(([rule_code, value]) => value && typeof value === 'object' ? { rule_code, ...value } : { rule_code, summary: String(value) });
}
export function exportWorkOrderMarkdown(data) {
  const lines = ['# ' + String(data.title || '工单审核结果').replace(/[\r\n]+/g, ' '), '',
    '> 本文件由 TokenX 返回的结构化审核结果导出，包含审核结论和规则明细。它不等同于控制台原报告文件。', '',
    '- 工单 ID：' + data.subject_id, '- 业务类型：' + (data.scenario_type || ''), '- 审核状态：' + (data.status || ''), '- 风险等级：' + (data.risk_level || ''),
    '- 创建时间：' + (data.created_at || ''), '- 更新时间：' + (data.updated_at || ''), '', '## 审核结论', '', data.audit_summary || data.review_result?.audit_summary || '接口未提供摘要', '', '## 规则汇总', '', '```json', JSON.stringify(data.rule_summary || {}, null, 2), '```'];
  const rules = workOrderRules(data);
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    lines.push('', '## ' + (i + 1) + '. ' + String(rule.name || rule.rule_code || '审核规则').replace(/[\r\n]+/g, ' '));
    for (const [key, label] of [['rule_code','规则编号'],['status','状态'],['risk_level','风险等级'],['summary','结论'],['evidence','证据'],['suggestion','建议'],['confidence','置信度']]) if (rule[key] !== undefined && rule[key] !== null) lines.push('', '**' + label + '**', '', display(rule[key]));
  }
  lines.push('', '## 完整审核数据', '', '```json', JSON.stringify(data, null, 2), '```', '');
  return lines.join('\n');
}
