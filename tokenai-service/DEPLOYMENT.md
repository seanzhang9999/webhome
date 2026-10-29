# 当前上海部署

更新日期：2026-10-29，时区 Asia/Shanghai。

当前入口：https://tokenai.awiki.info/ 。本机实例元数据 region-id 为 cn-shanghai；
专用 A 记录指向 47.101.44.101，awiki.info 下记录 ID 为 2115672473147661312。
新建的精确 Nginx 虚拟主机为 /etc/nginx/conf.d/tokenai.awiki.info.conf，复用上海现有的
awiki.info 通配符证书（SAN 覆盖 *.awiki.info，当前到期 2027-01-06）。未更改证书续期配置。

服务仍为 tokenai-agent.service，监听 127.0.0.1:19320。账号、固定事项、消息与私人问答
继续使用 /var/lib/tokenai-agent 的既有数据。受限配置只变更 TOKENAI_PUBLIC_ORIGIN；
模型与 MCP 凭据、代理、权限开关均保留。前端 API、登录窗口和原生工单入口切到 .info，
CORS 允许 .info 与 https://seanzhang9999.github.io，旧 .ai Origin 不再取得 API 跨域许可。
聊天中的旧 .ai 工单链接只转换为当前域名的查看/下载动作，不向旧域名发请求。

未修改 awiki.ai DNS、原 .ai 虚拟主机、其证书/续期任务或任何硅谷服务器配置。既有证书
与 DNS01 文件保留为历史配置；当前 .info 部署不运行其中针对 awiki.ai 的操作。
本次新增配置仅用于 awiki.info 下 tokenai 子域名，主站配置保持原有内容。

20 项本仓库检查通过，含新域名跨站登录、来源校验及旧工单链接兼容。当前 HTTPS 主机
验证成功，/healthz 返回 200，匿名 /api/v1/me 返回 401，GitHub 来源有正确 CORS 响应，
旧 .ai 来源返回 403。后续上线验证记录见对应任务结果。

# 历史部署记录

日期：2026-10-28，时区 Asia/Shanghai。

初次部署入口（历史）：https://tokenai.awiki.ai/ 。公网 HTTPS `/healthz` 返回 200；匿名访问
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

线上回归已通过：test/live-work-orders.mjs 对生产 HTTPS API 创建隔离测试事项，并在
保留旧“需要 run_id”的会话回复时自然询问指定日期合同付款审核。实际完成工单列表与
逐单详情查询，未要求 run_id，未生成写操作。测试事项和账号已按精确 ID 清理，真实
固定事项和用户历史保持原有内容。GitHub Pages 的新客户端以 v=3 发布。

新增 Demo 记住登录（7天，默认勾选），记住账号名并缓存可撤销令牌；取消勾选保持内存
会话，退出清理。新增工单查看及审核结果 Markdown 导出入口；历史 localhost 控制台
地址在聊天中转换成查看和下载按钮。原报告文件路径在公网实测 404，因此下载明确为
MCP 审核数据导出。客户端 v=4；15 项定向检查通过，待部署后真实入口复核。

真实工单回归已完成：TokenAI 和 GitHub Pages 两个入口都通过明细展示、实际结果下载、
刷新恢复登录及退出清理，原 localhost 链接也能在历史消息中转换为按钮。报告仍明确为
审核结果导出，不宣称已开放上游原报告文件。

后续界面扩展：新增本地安全 Markdown 渲染资源及右侧独立 Pi 财务经理私人伙伴；消息
处理完成后更新建议，建议按用户/事项保存，不进入共享聊天。当前客户端 v=6，18 项
定向验证通过；既有演示账号口令按用户明确指令更新，受限登录资料同步，不写入 Git。

后续改进：执行过程采用增量流式绘制和 Markdown 缓存，操作和文件准备进度以内嵌
提示展示；下载提供原生保存链接和 Markdown 复制入口。截图指定的三份导出已分别
检查后端 HTTP 200 与 Chrome 实际下载。右侧新增主动私人问答，与跟随主聊天的自动
分析用独立标签页和数据表区分。客户端 v=7、样式 v=2，19 项定向验证通过。

本次修改不涉及 User/Message Service、AWiki Me/DSH 客户端或 ANP/DID，因而未运行这些
产品的全量系统/E2E。当前验证由新服务的定向 HTTP/浏览器检查负责。

2026-10-29 原生结果入口：按用户要求保留既有审核明细及 AI 伙伴，将主按钮改为“打开审核
结果”，由登录用户明确点击后为当前工单创建一次性原生查看会话，在新窗口打开 TokenX。
次要按钮保留“下载整理版（Markdown）”。上游 X-Frame-Options/CSP 未调整，不做 iframe
嵌入或移除安全头的代理；通用模型分享工具和业务写操作仍关闭。23 项回归检查通过。
原生查看上线后，使用用户指定的工单验证了新窗口原站加载及实际规则匹配；本页 AI 与
草稿保留，GitHub Pages 的现有查看/导出/登录恢复仍通过。原站首次加载资源需要等待。

独立浮窗调整：原生结果按钮通过 popup=yes 和按屏幕计算的尺寸/位置请求独立浏览窗口，
保留新窗口 opener 置空和现有一次性查看流程；最终窗口形式仍由浏览器/内置客户端决定。
本次只原子替换活动版本的 tokenai-expense.js，不重启服务、不变更数据与权限；前端旧文件
在 /opt/tokenai-agent/frontend-backups 下受限保存。公开资源与仓库内容一致，浏览器回归通过。
