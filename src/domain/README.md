# Domain 开发入口

领域模块在修订版 URS 与第二轮 DRAFT 接口协议下封装规则，不依赖浏览器、Web 框架或数据库。当前只有设计说明，没有业务实现。

| 目录 | 功能与负责人 | 输出 |
| --- | --- | --- |
| [management](management/README.md) | MG-M0/M1–4；F1/F2，ZhangWeiyi | 源记录和 MutationResult；复用 MG-M2 权限策略 |
| [scheduling](scheduling/README.md) | DS-F3.1–3、DS-F4.1–4；WeiMingrui | 有效 DependencyResultView、可选 ScheduleResultView；不派生 Blocked |
| [monitoring](monitoring/README.md) | MON-M0/M1–7；F5/F6，ZhangYuyang | F5 直接 Blocked/进度/基本逾期；F6 三类可选警告；不写源记录或重算 CPM |

共享契约见[架构](../../docs/ARCHITECTURE.md)，需求/优先级见[需求](../../docs/REQUIREMENTS.md)。SH-COORD 获得一个项目 revision 的快照；修改带 expectedRevision，派生结果带 sourceRevision。F5/F6 仅消费版本匹配的有效日程；未知依赖或日程保留明确 availability，基本可靠 Dashboard 降级继续。

实现语言和包布局待选型。原[手算 fixture](../../tests/fixtures/schedule-cases.json)，是未运行的历史 proposal 输入，不是当前字段/空状态的批准契约。先完成团队/客户待决事项和 Integration Test Matrix 再安排实现；不把示例答案硬编码为业务输出。
