# Group9 本周ROUND2设计整合执行与进度报告

报告日期：2026-10-26。状态：**DRAFT PENDING TEAM REVIEW**。

本公开编辑版整理本周已完成的设计、文档和验证工作，保留原执行记录的业务结论及限制；本机路径、个人文件夹清单、内部备份/审计档案和环境配置不纳入公开仓库。原始执行记录保留归档。本报告不代表软件已实现或通过整合验收。

## 1. 本周完成情况

| 任务 | 本次实际结果 |
| --- | --- |
| A 正常路径 | IT25完整覆盖P25/r7、有效CPM→F5→F6；相对T10、关键A/C/D、Bfloat3、原始2/1/1、完成50%、D仅被C直接阻塞；不虚构绝对日期。 |
| B 精度 | IT26四个有效可复算案例、理论等长/二进制残差/真实1e-12正时差与8类无效输入。集中精度政策保留规范输入、无中间舍入，首选精确十进制/有理数；二进制需集中认证误差界及重算。 |
| C 诊断/降级 | IT27全量UNAVAILABLE/INVALID_INPUT、授权taskId/字段诊断与通用越权错误；F2保存政策分离，可靠F5及有效当前MON-M3保留。 |
| D 日期 | 日历日/Day0/start+ceil(规范未舍入T)/严格大于/相等不触发/缺失不可评估；D04仍PENDING；IT12/16/21/22条件化。 |
| E 状态/看板 | 三种保存状态不变；Blocked独立覆盖、直接未完成前置；F4失败按能力降级，F6关闭不关闭基础Dashboard。IT08/09/10/11/18原案例保留。 |
| F 接口/版本 | 所有派生结果绑定同一源revision；成功源写增一次，分析读/失败不增；合法reason作用域不变，无第二版本计数器。 |
| G 需求追踪 | 15FR/5NFR/5DR身份、原正式名称/优先级与来源列保留；IT25–27追踪到真实需求，FR13 Must对F3 Should的依赖仍D01待决。 |
| H 十项决策 | D01–10均补问题/推荐/理由/影响/后果/负责人/审批要求/状态；全部PENDING，原问题与负责人保留。 |
| I 文档交付 | 4组Word/PDF、5附件、3相关仓库MD、README/index同步；独立12节英文周报；历史日志只追加§13。 |

## 2. 当前正式文件

所有文件入口见[文档索引](../README.md)。四份原生报告与阅读版分别为21/15/32/18页，共86页；可编辑图表与预览按各模块一同提供。原生表分别41/13/41/15，原CPM公式、DS两张数值表和既有模块案例保留。

| 文件组 | 本仓库入口 |
| --- | --- |
| 总体设计 | [Word](../design/overall/00_Preliminary_System_Design_ROUND2.docx) / [PDF](../design/overall/00_Preliminary_System_Design_ROUND2.pdf) |
| F1/F2 | [Word](../design/modules/ZhangWeiyi/01_Project_Task_Module_Design_ROUND2.docx) / [PDF](../design/modules/ZhangWeiyi/01_Project_Task_Module_Design_ROUND2.pdf) |
| F3/F4 | [Word](../design/modules/WeiMingrui/02_Dependency_Schedule_Module_Design_ROUND2.docx) / [PDF](../design/modules/WeiMingrui/02_Dependency_Schedule_Module_Design_ROUND2.pdf) |
| F5/F6 | [Word](../design/modules/ZhangYuyang/03_Progress_Risk_Module_Design_ROUND2.docx) / [PDF](../design/modules/ZhangYuyang/03_Progress_Risk_Module_Design_ROUND2.pdf) |
| 跨模块整合 | [契约](../integration/Cross_Module_Interface_Contract_ROUND2.md)、[RTM](../integration/Requirement_Traceability_and_Priority_Matrix_ROUND2.md)、[决策日志](../integration/Integration_Conflict_and_Decision_Log_ROUND2.md)、[27场景矩阵](../integration/Integration_Test_Matrix_ROUND2.md)、[变更摘要](../integration/Change_Log_and_Evidence_Index_ROUND2.md) |
| 架构/骨架 | [架构](../ARCHITECTURE.md)、[需求](../REQUIREMENTS.md)、[团队](../TEAM.md)、[路线](../ROADMAP.md)及各模块README |

## 3. 验证结果与边界

| 分类 | 本周实际完成的检查 | 结果及限制 |
| --- | --- | --- |
| 文档/静态 |27个唯一IT、完整主字段/NOT RUN、正式需求追踪、十项推荐、版本/reason/降级一致性、路径/表格和原生报告结构检查。 | 文档检查通过，不是软件应用测试。 |
| 原案例保留 | 真实修改前基线为24个案例：20个完整案例块未变，IT12/16/21/22只追加条件性日期Preconditions；原标题、输入、操作、预期、模块、追踪和状态保留。 | 日期候选仍D-04 PENDING，不以补充前置说明冒充批准。 |
| 独立数值 | IT25 T10、关键A/C/D、B时差3、原始2/1/1、50%、D仅由C直接阻塞；4个精度有效案例、8个无效输入分类、4个条件日期及30×0.1整数边界例。 | 设计算术验证通过；真正正时差1e-12保持非关键，显示舍入不决定关键性。 |
| Word/PDF |4组原生报告与PDF比对，共2761个非空正文/表格文字项。 | 全部匹配，86页；发布副本选择与文件检查在上传前另行执行。 |
| 页面 | 本周最终页面记录为52页直接查看、34页同字节先前查看；后续证据对齐另外打开4个关键页。 | 没有把这描述成后续重新查看全部86页。 |
| 实际应用运行 | 没有可运行应用测试框架；没有增加系统实现。 | 全部27整合场景仍NOT RUN。浏览器、性能、并发、恢复、认证等运行结果未验证。 |

记录区分了文件修改、静态检查、独立数值计算、页面核验、未执行的软件测试和未批准的政策。保留失败与修正历史；不虚构通过率、工时、会议、组员认可或客户反馈。

## 4. 中间问题及修正

管理报告首次导出遗漏T02/T03，源Word行仍完整；内容核验发现后修正分页并重新导出，最终版本保留两项。排期报告首稿两处稀疏溢页通过压缩重复说明修正，公式和计算表未改。数值集合顺序、缓存案例文本、元数据和IT27条件逾期天数等检查假设或文字问题也保留了前后记录；这些不是应用运行测试失败或通过。

## 5. 尚待团队确认

| 决策 | 推荐方案（原英文，详细理由/后果在正式日志） | 状态 |
| --- | --- | --- |
| D-01 | Retain usable basic Must Dashboard and, where feasible, retain Should F3 for the Blocked subview. If F3 is absent/unavailable, disclose the subview limitation and seek a release-scope decision; do not alter formal Must/Should/Could priorities. | PENDING |
| D-02 | Use one explicit project-role permission table through MG-M2/SH-COORD for task, dependency, membership and note actions; distinguish view and edit rights. Add no approval workflow unless formally required. | PENDING |
| D-03 | Recommend permitting unestimated core tasks with durationDays=null only after explicit policy agreement; supplied estimates and F4 analysis use finite positive values with preserved canonical decimal precision. Do not impose an integer-only rule. Until a referenced-deletion policy is approved, reject deletion with unresolved dependency/note references; add no CANCELLED status. | PENDING |
| D-04 | Recommend elapsed calendar days including weekends/holidays; Day0 is plannedStartDate. Conditional LocalDate finish is plannedStartDate+ceil(T), using canonical unrounded NumericPolicy-resolved T. Use strict asOfDate>taskDeadline for unfinished overdue work and estimatedProjectFinish>projectDeadline for project conflict; equality triggers neither. Interpret dates in the agreed project calendar/timezone, never infer it from chat. Missing required dates/mapping remain unevaluated. | PENDING |
| D-05 | Keep three saved TaskStatus values, a separate Blocked overlay and empty-project percentage=null. Permit authorized manual status updates despite Blocked. Agree early-completion exceptions, display rounding and no-work wording separately. | PENDING |
| D-06 | Use the URS 1-2-second refresh expectation and typical15-40-task scale as initial future measurement references. Agree timing start/end, environment, device/network, load/concurrency, repetitions, usability tasks and failure/recovery scenarios before execution. | PENDING |
| D-07 | Use an ordinary modular monolith with one source revision, atomic source writes and coherent reads. Prefer centralized exact canonical base10/equivalent rational NumericPolicy; a binary backend needs centrally certified error intervals and exact/higher-precision resolution near zero or invariant conflicts. Select language, storage, limits and the concrete compare/save/read mechanism in detailed design. | PENDING |
| D-08 | Require authorized project membership, explicitly authorized invitations and an explicit acceptance step. Recommend completing a deliberate Leader handoff before the sole Leader leaves; do not guess an automatic successor. | PENDING |
| D-09 | Keep the minimum short-note function with stable original-author references. Do not add complex editing/deletion/audit-history features without scope agreement; member departure must leave retained references resolvable. | PENDING |
| D-10 | Show real personal assignments using the resolved project MemberId; do not add a priority field, score or automatic ranking model before defining high-priority. Label any presentation ordering as a UI proposal. | PENDING |

全部推荐仍为PENDING。原问题和负责人保留；实际审批应按团队/客户责任边界记录。D-03/D-07具体数值后端、输入范围/精度及误差界，D-04日历/时区/映射，权限、删除、状态例外、身份/邀请/Leader交接、备注范围与NFR验收仍待确认。

## 6. 独立英文周报

[Weekly Design Integration Progress Report](Weekly_Progress_Report_2026-10-26.md)包含12节：项目、目标、已完成工作、F3/F4改进、跨模块改进、测试扩展、需求追踪、推荐决策、验证证据、限制风险、剩余工作及下周计划。

## 7. 下一阶段

先由三位功能负责人审阅，再决定范围/权限、生命周期/精度/日期政策；选择最小技术与原子一致性方案，明确验收环境；其后完成详细设计和可执行子案例，再安排最小纵向实现与真实运行测试。历史计划和推荐不记录为已完成工作。

## 8. 发布与原始记录

本报告总结发布前完成的设计整改；提交和分支信息以仓库实际Git历史为准。公开分支提供正式报告、整合材料、架构说明和进度摘要；原始来源、完整本地审核与备份记录保留归档，不将个人环境和内部审核材料混入公开文件。仓库发布不等于正式批准或应用验收。
