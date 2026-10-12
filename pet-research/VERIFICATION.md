# 实际验证记录 · SIDE版 · 2026-10-12

基线main 4c3465e，原科研提交6af0207；最终SIDE提交以PR最新SHA为准。原咖啡文件及coffee-demo依赖没有改动。

## 云端实际执行

```
node pet-research/build.mjs
node --test pet-research/*.test.mjs coffee-demo/*.test.mjs
```

42项通过，0失败：28项科研状态/契约（含SIDE）、7项独立HTML/Node VM/构建检查、7项原咖啡回归。完整输出见test-results.txt。

验证覆盖温度三种选择、审批stage/version绑定、人工/设备L6顺序、参数/校准故障、异常隔离、严格阈值、旧版本测量、幂等和过时回单、下一轮专家重审、实质Agent消息和冻结工件、私人发布边界。

SIDE新增：同事件不同有效角色形成不同任务；先Task再能力；E→I→S→E→D非线性往返不改变L阶段或确认基线；候选/伪造建议角色不扩权；到期/撤销角色阻止L6与SIDE执行；有效角色但独立授权撤销时仍拒绝；错误audience/resource拒绝；旧Task版本/错误主体拒绝；旧TREE日志仅归档；AIC当前态；配置Matter差异/影响/具名批准/版本/发布回单。

Node VM使用最小DOM替身执行页面脚本与点击处理，不是浏览器。它不验证实际布局、真实localStorage、下载、dialog、焦点或计时器行为。

## 真实浏览器证据归属

本会话根线程Codex在Windows通过CUA实际操作了初版浏览器流程，非人类用户自行测试。根线程反馈：

- 人工流程：未选温度不能前进、L3/L5审批角色有效、L6接受/操作/测量顺序有效。
- 设备流程发现mode/config继承旧L7批准漏洞；云端已修复并回归。
- 1280×800、1440×900、390×844：初版可读，无页面横向溢出。
- 浏览器错误/警告：初版0，由根线程采集；云端未独立采集。

上述是初版证据，不能代表最终SIDE提交。根线程将在收到最终提交SHA后拉取并进行真实浏览器回归，再提供已测试SHA与结果，云端据此更新本文件及PR；不是要求人类用户自行验收。

## 云端浏览器限制

SITES_MANAGED_LINUX_CONTAINER=1且control-browser技能缺失。托管规则禁止替代浏览器控制路径，所以云端没有启动预览服务器、执行浏览器、生成三尺寸截图或报告console=0。

## 已修复初版实测问题

1. 隔离测量只显示原因/证据，旧版本只读历史，两者不参与当前评价或建议。
2. L7完成后不再批准/推进；创建下一轮提案进入L4规划与L5专家重审。
3. mode/config等全部新版本统一失效批准；审批记录绑定stage/version。
4. Board提供温度变更与重新客户确认；来源和旧确认保留。
5. L0–L7实质协作消息、完整冻结契约与工件、群备注、动态私人建议。
6. 按本次最终基线撤下TREE运行机制，改为事件+有效角色形成Task，再非线性选择SIDE能力，独立授权。

## 证据边界与下一步

四附件SHA由本会话根线程Codex对原附件字节复算并完整提取正文；云端按记录引用哈希，通过项目文件接口交叉核对正文，未独立复算。根线程还读取Rosetta20261009归档及OVAIM v7。云端完整读取SIDE v2.7/v1.1并核验main产品源码与WORKLOG，详见SIDE-SOURCES.md。

根线程最终回归重点：同事件按不同角色生成Task、非线性能力选择、候选/失效角色与独立授权拒绝、Board变更温度后旧结果隔离、mode/config后新L7关口、完成后下一轮入口、刷新/重放/导出/键盘以及三个尺寸与console。

PR保持draft，不合并main。Pages仅main push或workflow_dispatch部署，分支未发布。预期合并部署地址：https://seanzhang9999.github.io/webhome/awiki-pet-research-demo.html （当前不声称上线）。


## Windows构建回归与补充浏览器证据

根线程实际checkout远端6af0207后发现CRLF导致import移除失败（Cannot use import statement outside a module）。构建读取现已统一CRLF→LF，不依赖Git检出配置。新增真实子进程测试：临时目录将全部模块及构建文件写成CRLF，执行构建，确认产物无import且独立脚本可解析。测试已通过。

根线程对6af0207人工新轮与隔离显示修复的真实浏览器复测已通过。该结果单独归属于6af0207；SIDE最终版尚待根线程按新SHA回归。
