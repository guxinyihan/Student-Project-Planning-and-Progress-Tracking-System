# Student Project Planning and Progress Tracking System

**Group 9 · 星芒（Xingmang）**

Team leader：**WeiMingrui**

成员：**ZhangWeiyi、WeiMingrui、ZhangYuyang**

面向大学课程小组作业的 Web 系统：把项目、成员、任务分工、工期、截止日期和依赖关系放在同一份计划中，计算关键活动，并解释当前进度、阻塞原因和时间风险。

## 当前状态

当前为**ROUND2 初步设计与跨模块接口整合阶段**。截至2026-10-26，三份个人设计及总体报告已完成编辑整合，均为 **DRAFT PENDING TEAM REVIEW**。当前整合测试矩阵含 **27个计划场景，全部 NOT RUN**；D-01至D-10均 **PENDING**。文档接收、静态检查和独立数值复算不代表功能已实现、应用测试已通过或客户已批准。当前文件见[设计与整合文档索引](docs/README.md)，本周工作见[进度报告](docs/progress/Weekly_Integration_Execution_Report_2026-10-26.md)。

[项目仓库](https://github.com/guxinyihan/Student-Project-Planning-and-Progress-Tracking-System)保存课程项目文档与后续开发骨架。历史周设计资料保留在本地归档；当前ROUND2文件以文档索引中的入口为准。

Proposal 未指定语言、框架、数据库或部署平台；这些仍待详细设计与团队决定。目前没有可运行应用、依赖清单、启动命令或自动测试程序，JSON 文件是验收输入及预期答案。

## 功能范围与 Group 9 分工

| 功能 | 首版目标 | 功能负责人 |
| --- | --- | --- |
| F1–F2 项目、成员与任务管理 | 项目/成员/角色/任务/分配/日期/工期/TaskStatus/备注源记录；成员离开后任务未分配而保留 | ZhangWeiyi |
| F3–F4 依赖与计划分析 | F3 独占有效依赖；F4 可选计算可信图上的日程/关键活动并标记可用性及 sourceRevision | WeiMingrui |
| F5–F6 进度与风险监控 | F5 独占进度、直接 Blocked 与基本逾期事实；F6 可选组合三类 FR-15 警告，不复制 CPM | ZhangYuyang |

此分工沿用 proposal 第 13 节，负责人对功能跨前端、后端、领域规则的交付负责。三人共同参与需求、设计、实现、测试、文档和演示；WeiMingrui 还负责团队协调。详见[团队协作说明](docs/TEAM.md)。

## 目录

```text
.
├── README.md
├── CONTRIBUTING.md
├── .gitignore
├── .gitattributes
├── .github/
│   ├── ISSUE_TEMPLATE/development_task.yml
│   └── pull_request_template.md
├── docs/
│   ├── REQUIREMENTS.md     # URS 优先级、设计追踪和历史 proposal 场景
│   ├── ARCHITECTURE.md     # 模块边界、数据流与设计约定
│   ├── TEAM.md             # Group 9 功能分工与协作
│   ├── ROADMAP.md          # 八周计划与下一个开发入口
│   ├── README.md           # 当前设计/整合/进度索引
│   ├── design/             # 当前ROUND2报告与可编辑图
│   ├── integration/        # 共享契约、RTM、决策与27场景矩阵
│   └── progress/           # 本周公开进度报告
├── src/
│   ├── frontend/README.md  # 页面与交互入口
│   ├── backend/README.md   # 用例、接口与持久化入口
│   └── domain/
│       ├── README.md
│       ├── management/README.md  # F1–F2
│       ├── scheduling/README.md  # F3–F4
│       └── monitoring/README.md  # F5–F6
└── tests/
    ├── README.md
    └── fixtures/schedule-cases.json
```

目录内 README 说明待实现职责；它们不代表已存在的业务代码。

## 从这里继续开发

1. 阅读[需求与验收](docs/REQUIREMENTS.md)，保留正式优先级：FR-09 Should、FR-10/11/12 Could、FR-13/14 Must、FR-15 Could。先确认 F3 对 FR-13 的依赖范围与其他待决事项，再安排详细设计。
2. 对照[架构](docs/ARCHITECTURE.md)约定共享任务数据；不要在页面内另写一套计划或阻塞计算。
3. 从[开发路线](docs/ROADMAP.md)的第一、二周入口开始：建立项目、成员和任务的保存与重新打开闭环；同时使用[手算样例](tests/fixtures/schedule-cases.json)准备依赖和计划分析。
4. 按[贡献流程](CONTRIBUTING.md)记录真实输入、设计修改和后续执行证据。先完成负责人及团队审核、范围与政策决定，再进入详细设计和实现。

## 第一份共同验收样例

沿用 proposal 第 9.4 节：A（需求分析）2 天；B（前端）3 天，依赖 A；C（后端）4 天，依赖 A；D（测试）2 天，依赖 B、C。

- 原计划：**8 天**，关键活动 **A、C、D**，B 有 1 天浮动时间。
- C 改为 6 天：保存后计划自动更新为 **10 天**。
- 在原计划中移除 C → D：项目工期为 **7 天**，C 仍属于项目。
- 添加形成循环的依赖：拒绝变更、说明原因，保留原有效计划。

工期按流逝的自然日计算，独立任务可并行；完成状态用于进度分析，不能直接扣减计划工期。详细规则与未来测试见[测试入口](tests/README.md)。

## 计划与交付

Proposal 计划自正式开工起约八周完成 Web 原型，并提交用户指南、需求与设计/UML、测试证据、小规模用户评估、实际贡献记录和演示材料。具体日历日期待开工日确定；第一版范围及排除项见[需求文档](docs/REQUIREMENTS.md)。

## 本轮统一协议

TaskStatus 使用 NOT_STARTED / IN_PROGRESS / COMPLETED；BLOCKED 是可未知的独立警告。项目日期为 plannedStartDate/projectDeadline，任务日期为 taskDeadline。源快照用 revision，修改用 expectedRevision，派生结果用 sourceRevision；源变更仅成功提交后递增一次。F4 或 F3 能力失败时，可靠基础 Dashboard 继续，并明确未知能力；不得把缺失关键集合或预计日期解释为无风险。完整协议与仍待确认的日期/生命周期规则见[架构说明](docs/ARCHITECTURE.md)。
