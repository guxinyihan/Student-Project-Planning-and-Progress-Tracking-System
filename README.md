# Student Project Planning and Progress Tracking System

**Group 9 · 星芒（Xingmang）**

Team leader：**WeiMingrui**

成员：**ZhangWeiyi、WeiMingrui、ZhangYuyang**

面向大学课程小组作业的 Web 系统：把项目、成员、任务分工、工期、截止日期和依赖关系放在同一份计划中，计算关键活动，并解释当前进度、阻塞原因和时间风险。

## 当前状态

当前为**项目初始化与开发准备阶段**。已整理 proposal 的需求、三人功能分工、模块边界、八周路线及手算验收样例；F1–F6 业务功能尚待实现。

初始化前核对（2026-10-01）：[远程仓库](https://github.com/guxinyihan/Student-Project-Planning-and-Progress-Tracking-System) 为公开仓库，默认分支 `main`，没有文件或提交，开放 issue 为 0。本次只新增缺失的初始文件。

Proposal 未指定语言、框架、数据库或部署平台；这些将在第一周确定。目前没有可运行应用、依赖清单、启动命令或自动测试程序，JSON 文件是验收输入及预期答案。

## 功能范围与 Group 9 分工

| 功能 | 首版目标 | 功能负责人 |
| --- | --- | --- |
| F1–F2 项目、成员与任务管理 | 项目起止日期、成员变更、任务增删改、负责人、正数工期、截止日期、状态与保存 | ZhangWeiyi |
| F3–F4 依赖与计划分析 | 前置关系校验、拒绝循环、有效顺序、计划工期、关键活动、自动重算 | WeiMingrui |
| F5–F6 进度与风险监控 | 四类显示状态、阻塞说明、完成率、未完成关键任务、逾期及计划冲突提示 | ZhangYuyang |

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
│   ├── REQUIREMENTS.md     # proposal 需求、验收与来源
│   ├── ARCHITECTURE.md     # 模块边界、数据流与设计约定
│   ├── TEAM.md             # Group 9 功能分工与协作
│   └── ROADMAP.md          # 八周计划与下一个开发入口
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

1. 阅读[需求与验收](docs/REQUIREMENTS.md)，先明确第一周待决事项，再记录技术栈和本地运行方式。
2. 对照[架构](docs/ARCHITECTURE.md)约定共享任务数据；不要在页面内另写一套计划或阻塞计算。
3. 从[开发路线](docs/ROADMAP.md)的第一、二周入口开始：建立项目、成员和任务的保存与重新打开闭环；同时使用[手算样例](tests/fixtures/schedule-cases.json)准备依赖和计划分析。
4. 按[贡献流程](CONTRIBUTING.md)领取小任务、提交分支和验收证据，定期集成三个功能区域。

## 第一份共同验收样例

沿用 proposal 第 9.4 节：A（需求分析）2 天；B（前端）3 天，依赖 A；C（后端）4 天，依赖 A；D（测试）2 天，依赖 B、C。

- 原计划：**8 天**，关键活动 **A、C、D**，B 有 1 天浮动时间。
- C 改为 6 天：保存后计划自动更新为 **10 天**。
- 在原计划中移除 C → D：项目工期为 **7 天**，C 仍属于项目。
- 添加形成循环的依赖：拒绝变更、说明原因，保留原有效计划。

工期按流逝的自然日计算，独立任务可并行；完成状态用于进度分析，不能直接扣减计划工期。详细规则与未来测试见[测试入口](tests/README.md)。

## 计划与交付

Proposal 计划自正式开工起约八周完成 Web 原型，并提交用户指南、需求与设计/UML、测试证据、小规模用户评估、实际贡献记录和演示材料。具体日历日期待开工日确定；第一版范围及排除项见[需求文档](docs/REQUIREMENTS.md)。
