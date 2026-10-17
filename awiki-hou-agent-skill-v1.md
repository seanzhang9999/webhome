---
name: hou-hong-public-smartmedia-demo
description: Source-grounded academic media reading and consent-based delegation plan for AI agents
version: "0.1-demo"
demo_only: true
official_author_site: false
public_data: https://seanzhang9999.github.io/webhome/awiki-hou-smartmedia-public-v1.json
---

# 侯宏老师经济学 × AI 智媒体 · Agent 使用说明（概念演示）

> **不是侯老师本人运营或授权的正式网站，也不是正在运行的 MCP/ACP/A2A 服务。** 原始文章归其原始发布方及权利人管理，引用时必须区分正式原文、他人报道和本站示意内容。

## 可访问的公开入口

- 智媒体演示站：https://seanzhang9999.github.io/webhome/awiki-hou-smartmedia-v1.html
- 机器可读来源与服务边界：https://seanzhang9999.github.io/webhome/awiki-hou-smartmedia-public-v1.json
- AWiki 智媒体整体商业逻辑：https://seanzhang9999.github.io/webhome/awiki-smartmedia-blueprint-v1.html

## 推荐给 ChatGPT / Personal Agent 的工作方式

1. 读取 JSON，确认文章标题、作者、原发布网站、日期与链接。任何正文核实须打开其原文；本站只提供导读和公开引用。
2. 向用户提供选择：**阅读理解 / 情景模型 / 保存私人研究 / 向作者提交讨论或学生问题 / 联系他人**。不强制从内容消费转为业务事项。
3. 请求私人上下文时，只需引用用户主动授权的 AWiki Matter、资源或少量输入；不要自行推断可以访问完整私人 WorkHub。
4. 需要把某项私人分析交给其他 Agent、个人电脑或云空间运行时，先明确执行者、输入范围、保留位置、费用和回单要求。
5. 向作者或其他人发送内容之前，向用户展示提交对象、目标地址、是否抄送、正文、引用来源及可见范围，并取得单独确认。
6. 共享 Board 的内容和结果必须与私人上下文分开；AI 生成摘要不得冒充侯老师本人的正式学术立场。
7. 用户可选择网页回显、AWiki DID Inbox、电子邮箱、特定收件人或外部 Agent；各渠道需独立的准入与真实执行接口，**本演示仅记录本地准备状态，不实际发送**。

## 工具意图（正式版本待开发）

| 意图 | 当前状态 | 未来真实系统的必备条件 |
| --- | --- | --- |
| `read_public_content` | 真实可读取静态 JSON | 版本与来源维护 |
| `simulate_token_economics` | 浏览器确定性算式 | 明确假设与非预测声明 |
| `get_author_discussion` | 浏览器示例状态 | 审核、反滥用与权限 |
| `prepare_discussion_submission` | 本地草稿 | 授权、披露与回应机制 |
| `save_private_artifact` | localStorage 演示 | 用户 WorkHub 数据层与导出 |
| `delegate_to_user_agent` | 本地待委托记录 | AURA/MYA/OVAIM 实际身份与执行适配 |
| `deliver_result` | 模拟生成回执 | DID Inbox / 邮件验证 / 系统投递与审计 |

## 身份、隐私与流转边界

- 用户的个人 AURA 与面向公众服务的作者 Agent 不同。作者 Agent 不能自动读取用户的私有资料。
- 登录 AWiki 和将研究成果发送给作者，是两个独立的授权动作；不能把 Sponsor 的 Token 支付解释为取得私人上下文。
- 本地或云端执行必须依据用户授权与实际技术能力。仅复制网页链接给 ChatGPT，并不自动部署工具或读取个人 ChatGPT 会话。
- 即使数据在 AWiki 中完成计算，若运行过程中要向外部 LLM 传输明文，必须真实展示实际传输范围；不得绝对承诺所有计算一定“不出域”。
- 身份签名证明某个主体做出声明，不自动证明声明内容真实，也不取代作者批准。

## 对今晚讨论的建议

先验证**一篇已获授权的文章 + 一个可复用互动模型 + 一个读者问题/课堂 Board + 一次用户私人委托与回单**，通过真实反馈判断是否应扩展专业服务、课程、会员、活动、IR 企业服务与国际化内容渠道。

以上全部为产品研究原型，不是运行中的后台。
