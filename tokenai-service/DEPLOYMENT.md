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
- TokenX 通过本机已有出口代理访问，错误测试凭据返回 HTTP 401。没有使用历史聊天凭据，
  尚未完成有效凭据的 initialize、tools/list 和业务调用。

未完成项：GitHub 当前授权只读，页面源码尚未推送，因此现有 GitHub Pages 页面未更新；
需要具有仓库写权限的网页登录。需要服务方轮换后的 TokenX 凭据写入管理配置源，再部署、
核对实际 schema 并执行只读验收。上传字段映射、审核业务和分享页面按实际契约逐步验收，
写操作及分享目前关闭。

本次修改不涉及 User/Message Service、AWiki Me/DSH 客户端或 ANP/DID，因而未运行这些
产品的全量系统/E2E。当前验证由新服务的定向 HTTP/浏览器检查负责。
