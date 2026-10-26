# 进度与计划风险监控（F5–F6）

功能负责人：**ZhangYuyang**。来源：proposal 第 9.5–9.6、11、13 节。

输入：SH-COORD 安全读取的一致 ProjectSnapshot、F3 DependencyResultView、显式 asOfDate 和可选 F4 ScheduleResultView。MON-M0 Dashboard Builder 协调 MON-M1 原始状态、MON-M2 完成率、MON-M3 直接阻塞、MON-M4 个人分配、MON-M5 基本逾期、MON-M6 被阻塞关键警告、MON-M7 项目截止警告；是七个功能模块加一个门面。权限复用 MG-M2，不自建第二套政策。

未完成任务存在未完成直接前置时，MON-M3 派生独立 Blocked 警告，只列出该未完成直接子集，并保留 rawStatus=NOT_STARTED 或 IN_PROGRESS。COMPLETED 不派生为未完成阻塞；授权状态更新不被警告锁定。F5 不写 F3 记录、不修改状态、不做 CPM。基础状态各计任务一次，blockedCount 不增加 totalTasks，也不扣减基础计数。非空 percentage=completedTasks/totalTasks×100；空项目 percentage=null、ProgressResult=NO_TASKS。

F5 的基本逾期事实用于 FR-13 Must，不依赖可选 F4/F6。F6 仍为 Could，保留时只组合 FR-15 的未完成逾期、被阻塞关键任务、有效当前 estimatedProjectFinish>projectDeadline 三类警告。缺 F4、缺计划开始/映射或来源版本失配时，不能显示缺乏依据的当前关键/项目完成警告，也不能把空警告当成没有风险；evaluationByType 标记未评估类型。F6 不重算 CPM 或预计日期。

首个入口：从 proposal 四任务例显示 D 被 B、C 阻塞；将 A、B 标记完成时完成率为 50%，D 只被 C 阻塞；C 完成后 D 解除阻塞。再验证 10 天计划对应 9 天项目窗口的 1 天冲突。

验收与后续入口：[需求](../../../docs/REQUIREMENTS.md)、[测试](../../../tests/README.md)、[路线](../../../docs/ROADMAP.md)。

所有派生结果带 sourceRevision。F5/F6 只消费与当前 revision 匹配的 ScheduleResultView；asOfDate 改变不递增源版本，却须刷新基本逾期和可选警告。F3 的有效 edges=[] 表示没有前置；NOT_ENABLED/UNAVAILABLE 的 edges=null 表示未知，isBlocked 和 blockedTaskIds 不能伪装为 false/[]。FR-13 与 Should Have 的 F3/FR-09 依赖是待团队/客户决策，不能升级正式优先级或宣称降级后完整验收。

buildDashboardSummary 返回 DashboardResult。仅访问/项目解析失败或源数据无法安全一致读取时为 ok=false；日程或依赖能力失败时仍返回 ok=true 的可靠状态、进度、个人任务和基本逾期，并明确缺失能力。OverdueResult 对缺 taskDeadline 的任务保留 notEvaluatedTaskIds/reasons；“未知”不代表“未逾期”。完整可用性、PublicError 和候选严格日期边界见[架构](../../../docs/ARCHITECTURE.md)。NFR-05 正式为 Reliability；可测试性、可维护性、可解释性只作未编号设计目标。所有本文件场景均 NOT RUN。
