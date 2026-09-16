# 咖啡进口智能体网络演示

打开 ../awiki-coffee-import-demo.html 即可离线使用。无外部字体、脚本、模型或接口依赖。

从源码构建：`node coffee-demo/build.mjs`

状态机及产物测试：`node --test coffee-demo/engine.test.mjs coffee-demo/artifact.test.mjs`

本地预览：`node coffee-demo/serve.mjs`，访问 http://127.0.0.1:4178/awiki-coffee-import-demo.html 。

N / 右箭头推进一条模拟消息，长按不重复推进，输入和弹窗中禁用。自动演示每2.1秒推进一条，遇到人审、暂停、离开页面或完成时停止。7个人审关口必须点击主对话的“审阅并确认”，并在预览中再次确认。切换旧群不会改变进度。

设置中可暂停、撤回、重置；刷新自动恢复。自由输入只作为本地备注，不生成AI答案或扩大授权。请勿输入真实敏感信息。

事件、附件在 scenario.mjs；权限门与存储恢复在 engine.mjs；界面在 app.mjs/theme.css。build.mjs复用旧演示CSS并生成独立HTML，不修改旧文件。GitHub Pages沿用仓库现有main部署流程。

研究和方案见 ../awiki-coffee-import-design.html 与 ../docs/plans/2026-09-16-coffee-network.md。
