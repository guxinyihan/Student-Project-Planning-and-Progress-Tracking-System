# Domain 开发入口

领域模块封装 proposal 的业务规则和计算语义，不依赖浏览器、Web 框架或数据库。当前只有模块说明。

| 目录 | 功能与负责人 | 输出 |
| --- | --- | --- |
| [management](management/README.md) | F1–F2；ZhangWeiyi | 有效的项目、成员和任务变更，或校验原因 |
| [scheduling](scheduling/README.md) | F3–F4；WeiMingrui | 有效依赖顺序、工期、任务时序、浮动时间、关键活动 |
| [monitoring](monitoring/README.md) | F5–F6；ZhangYuyang | 显示状态、阻塞原因、进度计数和风险说明 |

共享数据草案在[架构](../../docs/ARCHITECTURE.md)，业务与验收在[需求](../../docs/REQUIREMENTS.md)。模块使用同一份项目快照；监控读取计划结果，计划分析不读取页面或数据库。

实现语言和包布局待选型。先核对[手算 fixture](../../tests/fixtures/schedule-cases.json)，再把相应规则实现为可独立验证的领域操作；不要把示例答案硬编码为业务输出。
