# 任务依赖与计划分析（F3–F4）

功能负责人：**WeiMingrui**。来源：proposal 第 9.1–9.4、11、13 节。

职责：前置关系增删与同项目/不同任务/重复/循环校验、拓扑顺序、最早和最晚时序、项目工期、总浮动时间、全部关键活动；任务、工期或依赖有效变更后自动重算。

输入为授权的 ProjectSnapshot（revision）及 F3 提供的 DependencyResultView。DS-F3.1/2/3 验证、检环和维护有效依赖，不派生 Blocked 或修改 F2 状态。DS-F4.1/2/3/4 负责排序、时点/工期、全部关键活动和重算，输出 ScheduleResultView（sourceRevision、availability、durationDays、timings、criticalTaskIds、estimatedProjectFinish）。F5/F6 不复制 CPM 或重算预计日期。

候选依赖在同一 expectedRevision 保护的提交决策内检查同项目、自引用、重复和直接/间接环；冲突或失败保留旧有效图/计划，不递增 revision。未知/不可访问任务统一给出 Invalid or inaccessible task.，详细循环原因仅在授权上下文返回。F3 不可用不能悄悄当空边集；F4 返回 UNAVAILABLE/DEPENDENCY_INPUT_UNAVAILABLE。

首个计算入口：使用[手算样例](../../../tests/fixtures/schedule-cases.json)验证 A=2、B=3、C=4、D=2 的 8 天计划，再验证 C=6 得 10 天，以及从原图移除 C → D 得 7 天。先完成正确的小图计算，再扩大界面与项目规模。

验收与后续入口：[需求](../../../docs/REQUIREMENTS.md)、[测试](../../../tests/README.md)、[路线](../../../docs/ROADMAP.md)。

F4 输入的 durationDays 要求有限正数自然日；TaskStatus 不扣减输入工期，也不自动串行同一负责人的并行活动。F4 未启用返回 NOT_ENABLED；启用且无任务为 NO_TASKS、工期/关键集合/预计完成均 null；输入无效、计算失败或来源失配为 UNAVAILABLE（分别按 INVALID_INPUT/CALCULATION_FAILED/STALE_RESULT）；已启用的非空任务缺少完整有效同版依赖则为 UNAVAILABLE/DEPENDENCY_INPUT_UNAVAILABLE；非空有效计划为 VALID。缺 plannedStartDate 时相对日程可有效，但 estimatedProjectFinish 为 null 并说明原因。缺关键集合不是已知空集。

源图/任务集合/工期/plannedStartDate 改变须使旧相关日程失效或更新；只在验证相关输入并重映射必要日期后才能重用相对值并发布当前 sourceRevision。基础 F3/F5 不依赖 F4；原手算 JSON 为未执行的历史夹具，不是当前接口字段或空状态的批准基线。详细协议和候选日期规则见[架构](../../../docs/ARCHITECTURE.md)。

## 本周待评审的统一精度与诊断政策

NumericPolicy 由 F4 集中拥有：首选规范十进制输入的精确十进制/有理数，不在正反向过程中舍入；仅证明的数学零时差为关键。二进制后端必须使用由输入/运算/范围/图及语言验证的统一误差区间，含零时用规范输入复核，不任意固定 epsilon。显示0.00不改变真正正时差。无法证明可靠分类时用 CALCULATION_FAILED/null当前日程事实，具体实现仍 D-03/D-07 PENDING。

F4 要求所有任务 durationDays 为存在、数值、有限正数；INVALID_INPUT 时不生成部分路径。授权 diagnostics 可含 taskId、field=durationDays、issue=MISSING/NON_NUMERIC/NON_FINITE/NON_POSITIVE、message，其他状态为 null；不能向无权者泄露字段/存在性。F2 核心保存与 F4 分析分开，必填/保存政策 D-03 PENDING。F4 未启用使用 FEATURE_NOT_ENABLED；空项目按既有 NO_TASKS 门禁，不混入无效工期分支。

D-04 推荐候选：日历日、Day0计划开始、finish=plannedStartDate+ceil(规范未舍入T)，严格大于才判任务逾期/项目冲突，相等不触发。缺日期或未确认映射时对应比较不可评估；MON不复制映射。新IT25/26/27使当前计划为27个NOT RUN，细节见[共享契约](../../../docs/integration/Cross_Module_Interface_Contract_ROUND2.md)及[测试矩阵](../../../docs/integration/Integration_Test_Matrix_ROUND2.md)。原整数JSON夹具保留，不是现行精度或已执行测试的证据。
