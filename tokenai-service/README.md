# TokenAI 报销费控服务

`awiki-coffee-trusted-space-v55-cfo.html` 的独立报销费控方案与固定事项使用本服务。
运行时为 Pi SDK 1.4.0，默认模型为本机配置的 DeepSeek。服务提供同一后端的独立聊天页。

## 财务经理的 AI 伙伴与 Markdown

报销事项右侧使用独立 Pi 会话提供私人建议。主聊天处理完成后自动基于最近可见消息
更新，也可手动“更新建议”。该会话共享模型供应商配置，具有独立系统提示和上下文，
所有工具关闭，不调用 MCP、不审批、不发主群消息。每个用户/事项独立保存最新建议；
读取需要当前事项成员资格，主聊天忙碌时等待完成，消息未变时复用缓存，失败不无限重试。
删除测试事项或账号会级联清理私人建议。

右侧区分“自动分析”和“私人问答”。私人问题具有独立输入框、历史记录和异步状态，
只在用户提问时生成回答；可结合本人的自动分析、主聊天及最近私人问答，不会改写
自动分析或进入共享消息。问题通过 clientMessageId 去重，当前用户由认证确定，重启
时中断队列不会自动重放。两个区域分别更新，避免主聊天变化覆盖私人问答。

流式文本按 80ms 合并绘制，只更新正在生成的消息；固定消息缓存安全 Markdown 结果，
不再逐 token 重建整个历史。操作状态和文件准备进度在聊天内显示。报告准备完成后
保留原生“保存文件”链接和“复制 Markdown”作为自动下载被浏览器拦截时的操作入口；
单个文件去重准备、最多保留五份内存 Blob，退出时清理。

聊天、审核摘要和私人建议使用本地打包的 Marked + DOMPurify 渲染 Markdown，支持标题、
表格、列表、引用和代码块。只保留安全语义标签，去掉脚本、表单、图片跟踪、样式和 DOM
标识等属性；业务入口按钮由应用在净化后按固定地址规则生成。`npm run build:markdown`
重新生成受版本控制的 tokenai-markdown.js，部署不依赖第三方 CDN。

审核明细右侧嵌入“当前工单”的私人 AI 问答，可从规则入口或快捷问题开始。浏览器只发送
subjectId 和问题，服务端先校验事项成员及工单连接组织，再以 include_share=false 读取
真实工单，将限长的摘要、规则、证据与建议送入无工具的独立 Pi 会话。界面显示本次工单
读取时间；不同工单的私人历史分别取用，普通私人问答不混入工单历史。主聊天和自动分析
不被这些问答改写。关闭明细停止前端轮询，已提交问答继续保存在本人名下。

新增 companion_question_contexts 附表保存问题对应的工单及限长事实快照，不改变原问题表
列结构；按 question_id 级联清理。消息幂等标识不能跨问题或跨工单复用。每次生成和完成
阶段检查账号与事项权限，后台重启保持原有中断语义，不重放未完成问题。

## 运行与配置

要求 Node.js >=22.19，使用 Node SQLite。安装依赖：`npm ci --ignore-scripts`。
启动：`npm start`；定向验证：`npm test`。浏览器测试使用 Playwright；已有浏览器可通过
`TOKENAI_BROWSER_PATH` 指定。首次开通账号运行 `npm run admin -- bootstrap`，随机密码
只写入 `~/.config/tokenai-agent/bootstrap.json`（0600），不会显示在日志中。
后续账号：`npm run admin -- add-user USERNAME NAME TENANT < /protected/password-file`。
同租户的财务账号在首次进入时加入该租户的固定事项；新租户得到不同事项。

上述命令默认用于开发状态目录。已部署服务的账号管理应明确使用线上状态与配置：

```sh
sudo -u tokenai env TOKENAI_STATE_DIR=/var/lib/tokenai-agent TOKENAI_ENV_FILE=/etc/tokenai-agent/environment /opt/tokenai-agent/node/bin/node /opt/tokenai-agent/current/src/admin.mjs add-user USERNAME NAME TENANT < /protected/password-file
```

受限环境文件默认 `~/.config/tokenai-agent/environment`（0600）：

```dotenv
DEEPSEEK_API_KEY=<由安全配置注入>
TOKENX_MCP_TOKEN=<由安全配置注入的当前有效凭据>
TOKENAI_MODEL=deepseek-v4-flash
TOKENAI_MODEL_BASE_URL=https://api.deepseek.com
TOKENAI_PUBLIC_ORIGIN=https://tokenai.awiki.info
TOKENAI_PORT=19320
TOKENAI_ENABLE_WRITES=0
TOKENAI_ENABLE_SHARE=0
```

本机访问 MCP 需沿用现有出口代理时，可在同一受限文件设置 `TOKENAI_MCP_PROXY_URL`。
MCP transport 显式使用该代理并保留 TLS 校验，拒绝重定向以避免转发 Bearer 凭据。
不修改系统 DNS、不关闭证书校验，也不改变用户共享代理设置。

实际凭据不得写入 Git、命令行参数、截图、聊天或日志。已有明文披露的 MCP 凭据需要
服务方轮换；部署不自动将历史聊天中的凭据转换成上线配置。

`TOKENAI_STATE_DIR` 指定独立状态目录。`TOKENAI_ENV_FILE` 指定受限环境文件。
未配置 TokenX 时普通模型聊天仍可用，页面明确显示 MCP 不可用，不能生成虚构业务结果。

## MCP 与业务边界

MCP 客户端使用官方 SDK 的 Streamable HTTP transport，自动协商协议、初始化及通知。
公网 URL 固定为 `https://mcp-local.parleyvoice.com/mcp`。只接受显式工具白名单。
Pi 不加载宿主扩展、技能、上下文文件、shell、文件读写或任意网络工具；MCP 调用由
应用自定义工具桥接，所有入口统一检查权限、schema 和操作确认。

默认开放 scenario_list/status/result。状态及结果工具仅接受本事项登记的远程任务标识。
配置 `TOKENX_WORK_ORDER_TENANT=<获授权财务组织的 tenant>` 后，为该组织额外开放
`scenario_work_orders` 与 `scenario_work_order`。前者按日期、业务类型、关键字、状态等
过滤并分页，后者用 `subject_id` 返回逐规则审核明细；不要求先登记本地 run_id 或附件。
此绑定对应用户授权使用的 TokenX 凭据数据范围，其他组织不能调用这两个工具。所有
`include_share=true` 均被拒绝，签发链接须走单独确认。模型每轮取得北京时间日期和
实际工具清单，已有会话无需重建即可使用新增查询能力。
通过 `admin.mjs attach-run USERNAME VERIFIED_RUN_ID` 可以关联管理员已独立核验归属的
现有任务。此操作不能用于猜测归属。已发起的审核任务自动登记。

写操作需 `TOKENAI_ENABLE_WRITES=1`，每次具体参数由发起财务人员确认，10 分钟内有效。
同一确认不会重复执行；网络失败后状态为 unknown，先核查，不能重放。进程重启也不
恢复执行写操作。分享需要另加 `TOKENAI_ENABLE_SHARE=1`，且应先验证分享页面公网可达。

附件保存在受限状态目录，页面文件 ID 不等于 TokenX file_id。上传使用单独的
`tokenx_upload_attachment` 工具读取本事项附件；文件内容不进入模型上下文和操作预览。
上传字段必须根据实测 inputSchema 明确配置，禁止猜测：

```dotenv
TOKENX_UPLOAD_CONTENT_FIELD=<schema 中接收内容的字符串字段>
TOKENX_UPLOAD_NAME_FIELD=<schema 中接收文件名的字段，可省略>
TOKENX_UPLOAD_ENCODING=base64
TOKENX_UPLOAD_DEFAULTS={}
```

支持 base64 或 text；text 仅用于 text/* 附件。映射不匹配 schema 时拒绝上传。
若 TokenX 需要其他 REST 路径、预签名 URL 或其他协议，须在服务方确认契约后扩展适配，
当前代码不会绕过固定公网 /mcp 路径。不得在未实测业务流程时宣称写操作已验收。

审核运行状态不等于企业报销台账、银行付款或到账记录。缺少对应数据工具时明确说明。

## 工单明细与审核结果导出

`/work-orders/<subject_id>` 是 TokenAI 的工单查看入口，使用 TokenAI 账号即可查看已授权
工单，无需 TokenX 控制台账号。聊天里新链接直接打开内嵌明细；旧 localhost:8089/doc
链接也会转换成可操作的查看/下载按钮。`/api/v1/work-orders/<subject_id>` 与其 `/report`
子路径验证登录和连接所属组织；地址中不携带令牌，也不代理任意上游 URL。

上游升级后已提供公网 console_url 和报告链接。明细主按钮为“打开审核结果”，由当前
用户主动点击后，优先以可调整大小的独立浮窗打开 TokenX 原生只读工作台；本页的审核摘要
和私人 AI 伙伴保留。通过 popup/width/height 向浏览器请求独立窗口，内置浏览器或移动端
仍可能选择标签页。
原站仍禁止跨站 iframe，本版不嵌入、不代理改写原页，也不修改其响应头。

POST /api/v1/work-orders/:subjectId/native-view 校验当前财务身份与连接组织，并重新读取
工单；仅此显式查看动作调用 include_detail=false/include_share=true 创建一次性查看链接。
链接必须匹配当前 subject_id、固定 HTTPS 来源与 /share/audit/ 路径，并具有不超过一小时
的剩余有效期及 one-time 标记（当前上游默认约 30 分钟）。上游无时区后缀的过期时间按其
UTC 契约解析。相同用户/请求标识短期去重，链接仅返回本次界面，不写入共享消息或数据库；
普通工单结果剔除分享凭据。Pi 的普通工具调用仍拒绝 include_share=true，通用分享及业务
写工具保持关闭。原站查看会话由 TokenX 管理，重新查看可再次点击按钮取得新链接。

“下载整理版（Markdown）”作为次要按钮保留，从真实 MCP 结果生成摘要、逐规则结论、
证据、建议和结构化数据，文件名标为“审核结果导出”，不冒充控制台原报告文件。
导出强制 attachment、MIME text/markdown、nosniff，聊天/明细页面均转义业务数据。

审核明细以中文状态、总体结论和规则卡片展示。规则展开后分别显示结论、证据原文、
引用/文件/页码与处理建议；支持字符串及对象证据、数组与映射规则，并保留未知状态原值。
未返回的证据或建议明确提示缺失，不由页面推断。原始 JSON 收在默认折叠的技术详情，
自动生成的 auto_run 标题使用业务类型作为显示标题，原始标题仍保留在完整数据中。
所有业务文本插入页面前转义，技术详情也以转义文本显示；两处工作台使用同一渲染器。

## 身份、跨域和消息

页面通过登录窗口和一次性授权码 + PKCE 取得访问令牌。默认勾选“记住登录（7天）”，
将可撤销的登录令牌与到期时间存入本源 localStorage，刷新及重开时由服务端验证后恢复。
用户名在 TokenAI 登录窗口本源保存；不缓存明文密码。取消勾选时仍为 30 分钟内存会话。
退出登录会撤销当前令牌并清理本源缓存；过期或账号禁用也会清理缓存。记住偏好绑定到
一次性授权码，不能在换取令牌时升级时长。新增偏好表不改变旧 codes 表，兼容旧版回滚。
授权码绑定接收源、有效期和 verifier，不能重复使用。postMessage 校验 origin/source/state。
CORS 只允许服务本源与 `https://seanzhang9999.github.io`，它不能限定到仓库路径；后端
每个请求仍需身份和成员校验。新增财务用户只能通过运维 CLI。

固定事项业务键是租户范围内的 expense-control-main。服务端保存消息、事件、任务和
操作；Pi 原生 JSONL 保存模型上下文，SQLite 只保存关联和可见消息。事件流支持按 seq
续接，发送消息通过 clientMessageId 去重。同一事项的 Agent 消息按队列处理。
打开事项、发出消息和回复更新时自动显示底部最新内容；加载早期消息时保留阅读位置。
停止回复不会取消远程业务任务；取消任务走单独确认。演示页重置不会清理真实服务数据。

## 部署和回滚

先完成 SECURITY-REVIEW.md 中的检查，再运行：

```sh
sudo python3 deploy/install-service.py
```

服务安装为独立 tokenai 系统用户，监听 127.0.0.1:19320，状态目录 /var/lib/tokenai-agent。
部署脚本输出 release 和 previous 路径。已有运行配置保留受限备份。
源码及依赖放入 /opt/tokenai-agent/releases，current 指向当前版本。服务配置在
/etc/tokenai-agent/environment，systemd 注入后由主进程读取。主配置变更应在源受限文件
修改后通过部署脚本应用，避免误以为修改源文件会自动影响运行服务。

使用 deploy/tokenai.awiki.info.conf 新增独立 Nginx 虚拟主机，检查 `nginx -t` 后平滑加载。
DNS 仅新增 awiki.info 下 tokenai 的专用 A 记录，指向上海本机。Nginx 使用本机既有
awiki.info 通配符证书，部署前核对 SAN 覆盖 tokenai.awiki.info 及有效期，不改动证书续期
配置。旧 .ai 域名的 Nginx、证书和 DNS01 脚本作为历史配置保留；当前 .info 部署不调用
这些脚本，不修改 awiki.ai 或硅谷配置。

检查：`systemctl status tokenai-agent`、`curl https://tokenai.awiki.info/healthz`。
回滚：把 /opt/tokenai-agent/current 指回 previous，重启 tokenai-agent；需要时恢复对应
环境备份。回滚不删除数据库、附件和 Pi 会话。DNS/Nginx 回退只处理本任务专用记录。
完整恢复需保留 /var/lib/tokenai-agent、受限环境和部署版本；勿将数据备份放进 GitHub。

## 验证范围

`test/service.test.mjs` 覆盖 PKCE、授权码重放、成员/租户隔离、持久化、确认与超时去重、
未知工具拒绝、任务归属、重启恢复、CORS 和消息幂等。
`test/browser.test.mjs` 覆盖源页面方案/固定事项、真实登录协议、消息接口返回及演示重置
隔离；该测试使用业务返回 fixture，不代表 TokenX 公网业务验收。
实际 DeepSeek 对话和工具调用应单独检查。TokenX 的发现、只读及写业务实调分别记录，
不能用 fixture 替代。AWiki Me/DSH、ANP/DID 与银行接口不在本次修改范围。

线上定向检查可以运行 `test/live-smoke.mjs`，默认检查独立 TokenAI 页面；设置
`TOKENAI_SMOKE_PAGE` 为正式 GitHub Pages URL 时检查真实跨站入口。该脚本需要访问
部署数据库以创建及精确清理临时验收租户，使用 `sudo` 执行；不调用 TokenX 写操作。
`TOKENAI_SMOKE_SOURCE=1` 仅用于发布前的页面源码覆盖，不能据此声称正式页面已验收。

`sudo node test/live-work-orders.mjs` 对线上 HTTPS API 执行日期工单查询回归：在获授权组织
内创建仅临时账号可见的独立测试事项，保留旧的能力拒绝回复，然后用自然语言询问日期
范围内合同付款审核明细。检查真实列表/详情工具执行，不修改实际固定事项，最后按精确
账号和事项 ID 清理。业务内容不输出到日志，也不执行审核或分享。

`sudo env TOKENAI_REPORT_SUBJECT_ID=<已授权工单UUID> TOKENAI_BROWSER_PATH=<已有Chromium路径> node test/live-audit-companion.mjs`
定向验证线上明细内的真实 MCP 上下文与 DeepSeek 私人问答。创建仅用于验收的财务账号，
不发送共享消息、不执行 TokenX 写操作，完成后精确删除该账号的成员关联、令牌及私人记录。

原生结果入口可用 `TOKENAI_REPORT_SUBJECT_ID=<已授权工单UUID> TOKENAI_BROWSER_PATH=<Chromium路径> node test/live-native-result.mjs`
做定向检查：只打开原站只读结果窗口，核对本页 AI 和草稿保留；不输出一次性 URL 或业务正文。
输出分别报告“新窗口已打开”和“原站审核内容是否完成加载”，两者不混同。
