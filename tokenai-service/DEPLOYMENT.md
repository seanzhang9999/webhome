# 本机部署记录

日期：2026-10-28，时区 Asia/Shanghai。

已部署入口：https://tokenai.awiki.ai/ 。公网 HTTPS `/healthz` 返回 200；匿名访问
`/api/v1/me` 返回 401。域名新增专用 A 记录指向 47.101.44.101，记录 ID
2115440866734247936。原 `*.awiki.ai` 记录保留，不修改 awiki.ai 主站。

独立服务：`tokenai-agent.service`；系统用户：tokenai；监听 127.0.0.1:19320。
运行配置 `/etc/tokenai-agent/environment`，数据 `/var/lib/tokenai-agent`，部署目录
`/opt/tokenai-agent/current`。本机管理配置源为
`/home/ecs-user/.config/tokenai-agent/environment`，部署时复制到运行配置。

证书：Let's Encrypt，当前到期 2027-01-26；专用 Nginx 虚拟主机
`/etc/nginx/conf.d/tokenai.awiki.ai.conf`。`tokenai-cert-renew.timer` 已启用，续期 service
使用单独 Certbot venv 和 DNS01 hooks；当前证书未到期的续期检查已成功执行。

初始财务管理员的登录资料仅保存在本机受限文件
`/home/ecs-user/.config/tokenai-agent/bootstrap.json`，权限 0600。本文件不记录密码。

验收：

- `TOKENAI_BROWSER_PATH=<本机Chromium> npm test`：10 项通过。
- `npm audit --omit=dev --audit-level=high --registry=https://registry.npmjs.org`：0 vulnerabilities。
- 真实 DeepSeek 文本对话和动态工具调用成功；动态工具返回 fixture。
- 线上 HTTPS/Nginx/systemd/浏览器登录/真实 Pi 消息通过。
- `TOKENAI_SMOKE_SOURCE=1` 下，以 GitHub Pages 来源运行待发布源码，跨站访问线上
  TokenAI 并收到实际模型回复；未拦截或模拟 TokenAI API。临时租户精确清理。
- GitHub 写权限开通后，实现提交 `8d0b9e3` 已推送 main；Pages workflow
  `40705458493` 成功。正式页面与 tokenai-expense.js 均返回 200，包含报销费控入口。
- 使用 `TOKENAI_SMOKE_PAGE=https://seanzhang9999.github.io/webhome/awiki-coffee-trusted-space-v55-cfo.html`
  对正式页面执行真实浏览器验收：不覆盖源码、不模拟 API，跨站登录、固定事项、Pi/DeepSeek
  回复和消息持久化通过，浏览器错误 0，TokenX 业务写入 0，临时验收租户已清理。
- TokenX 通过本机已有出口代理访问，错误测试凭据返回 HTTP 401。没有使用历史聊天凭据，
  尚未完成有效凭据的 initialize、tools/list 和业务调用。

后续配置更新：用户明确指定 MCP 凭据后，已写入受限配置（不在本记录中保存值），有效
凭据的 initialize、工具发现与 scenario_list 已通过。服务端为 TokenX Suite 1.30.0，
发现 10 个工具，场景目录返回 11 个套件。上传 inputSchema 已核对为 filename 与
content_base64，并配置了对应映射；写操作仍关闭。scenario_result 的 include_share=true
被拒绝，分享需使用单独确认流程。

聊天定位修复：发送消息、收到流式/完整回复、重新打开固定事项时显示底部最新内容。
显式加载早期消息保留阅读位置。35 条长历史消息下已复现旧问题，修复后浏览器回归通过，
连同后端定向检查共 10 项通过。

线上只读闭环已验收：独立 TokenAI 页面和正式 GitHub Pages 页面均完成登录、发问、
Pi 调用实际 tokenx_scenario_list、结果返回、消息持久化及底部定位。检查了 tool_completed
事件确认真实执行成功，两个入口浏览器错误均为 0，业务写入为 0。页面客户端资源升级为
tokenai-expense.js?v=2，避免旧缓存继续使用原来的定位逻辑。

联调脚本已修正为只等待完成的 Agent 消息，并在清理前等待处理结束。一次提前清理导致的
临时验收记录残留已按核验后的精确事项 ID 清理；复测成功且未修改用户事项。

未完成项：上传业务、审核业务和分享页面按实际契约逐步验收；写操作及分享目前关闭。

工单能力修正：新增 scenario_work_orders 与 scenario_work_order 接入 Pi 的只读工具集，
并配置组织绑定；不是仅刷新发现清单。日期按 Asia/Shanghai 解释，列表可用 date_from、
date_to、scenario_type 直接筛选，详情使用 subject_id。已有会话每轮加载新能力和时间
上下文，无需用户先提供 run_id。真实 DeepSeek/MCP 组合已完成列表和逐单明细调用，
只回报脱敏验证元数据，具体业务内容不保存到公开部署记录。

本次修改不涉及 User/Message Service、AWiki Me/DSH 客户端或 ANP/DID，因而未运行这些
产品的全量系统/E2E。当前验证由新服务的定向 HTTP/浏览器检查负责。
