# 项目与任务管理（F1–F2）

功能负责人：**ZhangWeiyi**。来源：proposal 第 7、11、13 节。

职责：MG-M0 Management Facade 协调 MG-M1 项目、MG-M2 成员与权限策略、MG-M3 任务、MG-M4 备注；F1/F2 拥有 projectId/memberId/taskId/noteId 标识的源记录、assigneeId、plannedStartDate、projectDeadline、taskDeadline、durationDays、status 与备注。字段必填、精度和删除引用政策仍待确认。

输入为授权的一致 ProjectSnapshot、候选变更及 expectedRevision；成功 MutationResult 带 revision 和 SavedChange，失败 PublicError 不发布成功事实。SH-COORD 与 MG-M0/MON-M0 复用 MG-M2 策略；F3 独占依赖写入与循环验证，F5 独占直接阻塞/进度，F4 独占 CPM。TaskStatus 只有 NOT_STARTED、IN_PROGRESS、COMPLETED；BLOCKED 不是第四种源状态。

拟议首个流程为创建项目/成员、创建分配给同项目成员的任务并重新读取。成员离开时撤销活动访问、将受影响 assigneeId 置 null，保留任务、状态、备注、工期与依赖，不自动重分配。备注作者历史身份引用保留；唯一组长离开/继任待确认。任务删除先查 F3 和备注引用，未决政策下拒绝被引用删除；不直接写 F3 链接，也不新增取消状态。

验收与后续入口：[需求](../../../docs/REQUIREMENTS.md)、[路线](../../../docs/ROADMAP.md)、[测试](../../../tests/README.md)。

候选工期是否必填、允许精度和 F2 保存校验由团队/客户确认；F4 分析要求有限正数，缺失或无效分析输入仅意味着日程不可用，不能自动变成未批准的核心任务保存规则。统一 sourceRevision/availability、泛化访问错误与失败保留规则见[架构](../../../docs/ARCHITECTURE.md)。当前为 DRAFT 设计说明，无功能实现或测试通过声明。
