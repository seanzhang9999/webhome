---
name: awiki-ir-public-media-demo
version: "0.1-demo"
publisher: "AWiki / Fictional IR Demo"
description: "Public IR information and explicit-consent workflow sample for Personal Agents."
source_of_truth: "https://seanzhang9999.github.io/webhome/awiki-ir-public-content-v2.json"
demo_only: true
---

# AWiki IR 智媒体 · Agent / Skill 入口（演示）

这是一份**可公开读取的演示说明文件**，供人或带网页读取能力的 Personal Agent 理解本 PR 独立站的资料、工具意图和授权边界。**它不是可安装的正式认证 Skill、也不是一个正在运行的 MCP Server。**

## 当前入口

- PR 独立站：https://seanzhang9999.github.io/webhome/awiki-ir-pr-portal-v2.html
- 公开资料 JSON：https://seanzhang9999.github.io/webhome/awiki-ir-public-content-v2.json
- AWiki Me 模拟：https://seanzhang9999.github.io/webhome/awiki-ir-me-v2.html
- ChatGPT 工具模拟：https://seanzhang9999.github.io/webhome/awiki-ir-chatgpt-v2.html

## 虚构发行人及来源

发行人 **维港样例控股（Vela Harbour Holdings）**、IR 服务商 **Harbour IR Studio** 均为虚构。所有收入、报告、问询和答复也都是演示数据，不是港交所公告或真实证券研究。

公开来源按 ID、版本与批准状态引用：
- \`IR-DEMO-AR25\`：FY2025 经营概览（虚构），2024 收入 HK$7.8bn，2025 收入 HK$8.4bn。
- \`IR-DEMO-1H26\`：2026 年中期业务观察（虚构）。
- \`IR-DEMO-EVENT\`：公开投资者交流活动（虚构）。

## 推荐给 Personal Agent 的操作流程

1. **读取**：先阅读公开来源 JSON，区分原文、纯数学计算、AI 推断。不要将演示数据当作真实上市公司披露。
2. **解释与体验**：可以基于已公开的字段解释、计算和可视化，明确来源与局限。
3. **准备 IR 请求**：只生成提交草稿，清楚展示拟提交的问题、公开来源和接受回复方式，不得未经用户确认直接向公司发送。
4. **授权后服务**：真实产品需要签发有效的用户身份和操作凭证，服务方按 Pack、Space 与角色规则接受请求并返回回单。
5. **保存私人工作**：用户自己的 AURA WorkHub 管理 Matter、Delegation、Resource、Artifact 和 Receipt；默认不向发行人发送用户的其他私人研究。
6. **跟进**：回复经 IR 服务商拟稿、发行人批准；按用户指定的 AWiki Inbox／电子邮箱投递。邮件必须经过适当地址验证，不能把模拟回单当作实际发送。

## 模拟工具契约（尚无公开后端）

| 逻辑工具 | 功能 | 认证与当前状态 |
| --- | --- | --- |
| \`read_public_content\` | 获取来源、引用和版本 | 可直接 GET JSON，真实公共数据只有演示内容 |
| \`list_actions\` | 列出可用业务动作 | 可通过本文件阅读约定；不代表运行中的工具发现 |
| \`prepare_ir_question\` | 准备拟提交问题及证据 | 仅客户端生成草稿 |
| \`create_service_request\` | 用户确认后提交 IR 问询 | 目前仅 GitHub Pages 同源 localStorage 模拟；**无 MCP 端点** |
| \`save_to_awiki\` | 保存个人事项和授权委托 | 仅本浏览器模拟；**无真实 DID/OAuth API** |
| \`get_work_status\` | 查询私人事项和已批准回复 | 仅演示模拟页主动读取；**无 ChatGPT Webhook 推送** |

## 身份与隐私

- 访客可匿名阅读公开材料，无需登录。
- AWiki Inbox 需用户在正式版建立受控制的身份和委托授权。
- 电子邮箱回执必须得到明确同意；本 Demo 不发送或验证任何邮件，最多保存掩码说明。
- 企业内部文档、个人账户、未公开重大信息和其他 Agent 聊天历史不可通过公开页面读取。
- DID 可以证明控制关系，但不自动证明企业角色、投资资格或对外签发正式答复的权限。

## 正式接入前必须实现

持久化后端；多租户隔离；服务端 OAuth／可验证身份与角色；真实 MCP/PAP/A2A 适配及权限执行；邮件地址验证和合规邮件投递；IR 资料审核与来源核验；Board 工件与回单签名；日志和撤销能力。

本文只为展示设计意图，不构成证券投资建议或合规认证。
