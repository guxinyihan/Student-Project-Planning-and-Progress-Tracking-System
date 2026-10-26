# Frontend 开发入口

此目录预留 Web 页面和交互代码，当前只有职责说明，尚未选定框架。

- F1–F2：项目、成员和任务的建立、编辑、分配、状态更新，负责人 ZhangWeiyi。
- F3–F4：依赖编辑、拒绝原因、任务顺序、计划工期及关键活动展示，负责人 WeiMingrui。
- F5–F6：原始状态、完成率、独立直接 Blocked、个人任务和基本逾期属于 F5；F6 是三类可选组合警告。负责人 ZhangYuyang。界面显示 rawStatus 与 nullable isBlocked/isCritical，不引入第四个互斥存储状态，不锁定授权手动更新。

各功能负责人贯穿对应前后端交付。页面只提交候选源变更和 expectedRevision，展示同一当前 sourceRevision 的结果；F3 保存依赖，F4 独占 CPM，F5 派生直接阻塞/进度，F6 组合警告，页面不复制这些算法。源保存成功后协调刷新；保存失败保留输入与旧有效数据。

首个入口为项目及任务录入流程：创建项目 → 添加成员 → 创建并分配任务 → 保存 → 重新打开核对。再接入 proposal 四任务样例和概览。技术栈选定后补充入口文件、依赖与实际运行说明。

参考：[需求](../../docs/REQUIREMENTS.md)、[架构](../../docs/ARCHITECTURE.md)、[团队](../../docs/TEAM.md)。

TaskStatus 代码为 NOT_STARTED / IN_PROGRESS / COMPLETED；Not Started / In Progress / Completed 仅是对应显示标签。项目日期使用 plannedStartDate/projectDeadline，任务日期使用 taskDeadline。空项目 percentage=null，避免误导性0%；F4 未启用或分析不可用不使基础 Dashboard 失败。显示 NOT_ENABLED/UNAVAILABLE 提示并隐藏不受支持的当前关键/预计完成警告；缺关键集合或日期不得显示成“没有风险”。F3 未启用或不可用时阻塞信息为未知，不是“没有阻塞”。未知项目/任务采用架构约定的泛化错误，不泄露私有存在性。界面文案/排序、项目时区、截止当天与日期映射仍待确认。
