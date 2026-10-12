# 实际验证记录 · SIDE最终版 · 2026-10-12

应用冻结提交：`1abd318611dcf13baacc2632c43b22fea073dcd9`。原咖啡基线 `4c3465e` 的HTML、设计页及coffee-demo目录无改动。

## 自动验证

云端构建成功，Windows复核通过。`node --test pet-research/*.test.mjs coffee-demo/*.test.mjs`：44项通过、0失败，包括28项科研状态/契约、9项独立HTML/VM/CRLF构建检查、7项原咖啡回归。见test-results.txt。VM不代替真实浏览器。

## 真实浏览器验收

根线程Codex通过CUA实际操作Windows上的Codex In-app Browser。完整逐项记录、版本归属、工具通道恢复与截图见[BROWSER-QA.md](BROWSER-QA.md)。

- SIDE事件+有效角色→Task→任意能力往返→独立授权→回单；候选角色、绑定失效与独立授权不足均拒绝。
- 人工L0–L7闭环、自动播放停人审、温度变更与历史隔离、设备参数/校准暂停及重审、缺失D1卡阻断、新L7不继承旧批准、撤销不可绕过。
- 最终冻结版从页内重置后再次完成人工闭环与v2设备闭环；新L7等待负责人批准。页内重置取消保留状态、确认清空并持久化，warning清除。
- 1440×900 Board、1280×800 TC-01弹窗、390×844 SIDE：无页面横向溢出，截图保存于screenshots/。主体同步、导航、刷新、重放与实际下载均检查。
- 实际采集页面error/warn为0。曾发生浏览器控制协议超时，已恢复并读取实际状态，不将失败调用推断为成功。
- 最终实际下载JSON：schema2，19commands、29events、8contracts、2results、1配置变更，不含私人测试标记。先前完整异常流程导出46commands/67events也未含私人备注。

## 证据归属与边界

云端执行实现、Node/VM测试与SIDE来源核验；其control-browser技能缺失，未在云端执行真实浏览器。根线程完成四附件原始字节SHA复算、正文提取、Rosetta/OVAIM阅读，以及本记录中的真实浏览器检查。

所有测量为模拟，未连接真实模型、20亿材料库、仪器，未实现DID签名/加密；操作角色为本地模拟。S1 50℃/−24℃各24h与S2 60℃/−20℃各24h三循环仍待真实客户确认。来源要求、方案假设和演示数值分别展示。原附件和私密会话未公开。

PR保留draft，未合并main，Pages尚未发布。当前成果可离线运行并由GitHub分支持续访问。
