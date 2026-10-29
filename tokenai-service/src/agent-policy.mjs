import { isDeepStrictEqual } from 'node:util';

// Match the documented DeepSeek 1M context, while summarizing much earlier to
// keep a long-lived finance matter bounded. This is not an output-token budget.
export const MODEL_CONTEXT_TOKENS = 1_000_000;
export const COMPACTION_TRIGGER_TOKENS = 128_000;
export const MODEL_OUTPUT_TOKENS = 8192;
export const financeCompaction = { enabled: true, reserveTokens: MODEL_CONTEXT_TOKENS - COMPACTION_TRIGGER_TOKENS, keepRecentTokens: 12000 };
export function financeModel(config) {
  return { id: config.model, name: config.model, reasoning: true, input: ['text'], contextWindow: MODEL_CONTEXT_TOKENS, maxTokens: MODEL_OUTPUT_TOKENS,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    compat: { supportsDeveloperRole: false, maxTokensField: 'max_tokens', thinkingFormat: 'deepseek' } };
}
export function toolContextText(result) {
  if (result.content?.some(block => block.type !== 'text')) return JSON.stringify(result);
  const text = (result.content || []).map(block => block.text).join('\n');
  if (result.structuredContent !== undefined) {
    if (!text) return JSON.stringify(result.structuredContent);
    try { if (isDeepStrictEqual(JSON.parse(text), result.structuredContent)) return text; } catch {}
    return JSON.stringify({ text, structuredContent: result.structuredContent });
  }
  return text || JSON.stringify(result);
}
export function responseFailure({ stopped, timedOut, modelError, lastStop, compactionError, answer }) {
  if (stopped) return '本次回复已停止；已经提交的业务任务不会自动取消。';
  if (timedOut) return '本次回复超过处理时限，已停止生成；请缩小查询范围后重试，勿重复提交业务操作。';
  if (modelError) return modelError;
  if (lastStop === 'length') return '模型回复达到长度限制，未生成完整答复。请缩小查询范围后重试；这不表示审核业务已失败。';
  if (lastStop === 'aborted') return '模型响应被中断，未形成完整答复，请重试。';
  if (!answer && compactionError) return '历史上下文整理未完成，暂时无法形成答复，请稍后重试或联系管理员。';
  if (!answer || lastStop === 'toolUse') return '模型未生成最终答复；已记录响应状态供排查，请稍后重试。';
  return null;
}
