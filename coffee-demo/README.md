# 咖啡进口智能体网络演示

打开 ../awiki-coffee-import-demo.html 即可离线使用。无外部字体、脚本、模型或接口依赖。

从源码构建：`node coffee-demo/build.mjs`

状态机及产物测试：`node --test coffee-demo/engine.test.mjs coffee-demo/artifact.test.mjs`

本地预览：`node coffee-demo/serve.mjs`，访问 http://127.0.0.1:4178/awiki-coffee-import-demo.html 。

N / 右箭头推进一条模拟消息，长按不重复推进，输入和弹窗中禁用。自动演示每2.1秒推进一条，遇到人审、暂停、离开页面或完成时停止。7个人审关口必须在右侧伙伴审阅决定草稿，再确认写回事项。切换旧群不会改变进度。

设置中可暂停、撤回、重置；刷新自动恢复。自由输入只作为本地备注，不生成AI答案或扩大授权。请勿输入真实敏感信息。

事件、附件在 scenario.mjs；权限门与存储恢复在 engine.mjs；界面在 app.mjs/theme.css。build.mjs复用旧演示CSS并生成独立HTML，不修改旧文件。GitHub Pages沿用仓库现有main部署流程。

研究和方案见 ../awiki-coffee-import-design.html 与 ../docs/plans/2026-09-16-coffee-network.md。


## 2026-09-16 交互校正

按原版恢复消息、一览、连接、AWiki、工作、设置六个入口。工作内保留事项/资源/专题/方案和搜索列表；消息仅承载普通会话，一览为Inbox/动态/待处理，连接按人员/群组/Agent/服务分类，AWiki按社区/Agent/服务/方案发现能力。所有业务建议、草稿审阅与确认均在右侧私人伙伴进行，人的确认结果再写回中间事项群。群成员在会话标题下和参与者详情中呈现，移除右侧角色科普卡。巴西人员与销售智能体发言使用葡萄牙语原文与中文译文双层展示。
