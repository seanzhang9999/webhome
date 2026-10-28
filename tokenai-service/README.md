# TokenAI 报销费控服务

`awiki-coffee-trusted-space-v55-cfo.html` 的独立报销费控方案与固定事项使用本服务。
运行时为 Pi SDK 1.4.0，默认模型为本机配置的 DeepSeek。服务提供同一后端的独立聊天页。

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
TOKENAI_PUBLIC_ORIGIN=https://tokenai.awiki.ai
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

## 身份、跨域和消息

页面通过登录窗口和一次性授权码 + PKCE 取得 30 分钟访问令牌。令牌只放内存。
授权码绑定接收源、有效期和 verifier，不能重复使用。postMessage 校验 origin/source/state。
CORS 只允许服务本源与 `https://seanzhang9999.github.io`，它不能限定到仓库路径；后端
每个请求仍需身份和成员校验。新增财务用户只能通过运维 CLI。

固定事项业务键是租户范围内的 expense-control-main。服务端保存消息、事件、任务和
操作；Pi 原生 JSONL 保存模型上下文，SQLite 只保存关联和可见消息。事件流支持按 seq
续接，发送消息通过 clientMessageId 去重。同一事项的 Agent 消息按队列处理。
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

使用 deploy/tokenai.awiki.ai.conf 新增独立 Nginx 虚拟主机，检查 `nginx -t` 后平滑加载。
DNS 仅新增 tokenai 的专用记录，保留已有泛域名和其他服务。DNS01 证书签发使用
deploy/acme-dns.py 和本机现有 Aliyun CLI 配置；清理只删除本次精确 TXT 记录。

检查：`systemctl status tokenai-agent`、`curl https://tokenai.awiki.ai/healthz`。
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
