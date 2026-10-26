# Backend 开发入口

此目录预留 Web 接口、用例协调和持久化适配代码，尚无服务或数据库配置。

按三个功能区域协调接口，具体 URL、语言与框架待选型。SH-COORD 由 MG-M0/MON-M0 门面实现，复用 MG-M2 的统一项目成员/权限策略；它获取一致 ProjectSnapshot、控制 expectedRevision 校验与原子保存、成功后的 SavedChange/刷新以及 PublicError 映射，不引入新服务或消息代理。业务规则调用[领域模块](../domain/README.md)。

拟议首个流程为创建项目和成员、按以后确认的字段政策创建任务并重新读取。成员离开时协调撤销活动访问并将受影响 assigneeId=null，保留任务/备注/依赖/状态，不自动重分配。删除任务须查 F3/备注引用，政策未决时拒绝被引用删除。依赖修改的循环检查与 expectedRevision 比较在同一受保护提交决策内完成。

每次成功原子源变更只递增一个项目 revision（创建拟议从1开始）；拒绝、冲突或保存失败不递增、不发布成功变更，保留用户输入和旧有效源数据。派生视图用 sourceRevision 引用同一计数器；图/任务集合/工期/plannedStartDate 失效或更新相关日程，状态刷新 F5，日期比较刷新基本逾期/可选 F6。F4 单独失败不使可靠基础 Dashboard 失败，旧关键性/预计完成不作为当前结果。

计划数据保存与重新打开的一致性须通过集成场景验证。测试存储与开发存储分离；未来配置样例只能包含示例值。三人按[功能分工](../../docs/TEAM.md)协作，WeiMingrui 协调接口与集成。

参考：[架构](../../docs/ARCHITECTURE.md)、[需求](../../docs/REQUIREMENTS.md)、[测试](../../tests/README.md)。

所有读取及结果重用均重新授权。未知/非成员/不可访问项目统一 Invalid or inaccessible project.，任务统一 Invalid or inaccessible task.；详细权限或依赖原因仅在可访问上下文返回。NFR-05 Reliability 要求明确失败、保留输入/有效源记录及服务临时不可用后恢复；恢复阈值未批准。统一数据/可用性与候选日期规则见[架构](../../docs/ARCHITECTURE.md)。这些是设计协议，不是已实现事务或通过测试的保证。
