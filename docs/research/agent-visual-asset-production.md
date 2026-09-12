# Agent visual asset production playbook

> **中文定位：面向 Agent 的 ChemRealm 美术资产生产手册**
> Research date: 2026-09-12
> Status: Research / M6-M7 implementation guidance
> Scope: ChemRealm 的实验器材、试剂、现象、缩略图和教学插图
> Normative relationship: 本文件是研究与生产方法，不替代已生效的视觉标准、ADR 或 SPEC。

## 0. 这份文档要解决什么

ChemRealm 的风险不是“没有一张漂亮的烧杯图片”，而是 Agent 每次都能生成一张看似漂亮、但彼此不属于同一个实验世界的图片：比例不同、光线不同、液面不可信、刻度不可读、连接口不存在，最后只能靠一次性 UI 代码把它们拼起来。

因此本文件把“画美术资源”定义为一条可复现的生产流程：

```text
视觉目标
  ↓
资产 brief
  ↓
参考板与原创边界
  ↓
轮廓 / 比例 / 视角锁定
  ↓
master asset
  ↓
受控变体与状态
  ↓
Representation Engine 集成
  ↓
固定视口截图审查
  ↓
接受或返工
```

核心结论：

> **不要让 Agent 直接“画一个漂亮的器材”。要让它在一组明确的视觉、几何、交互和科学约束内，生产一件属于 ChemRealm 资产系统的器材。**

本手册吸收 NOBOOK 的资源库、编辑器、演示态和器材操作思路，但不复制其具体模型、贴图、图标、布局或品牌风格。NOBOOK 研究原文见 [`from-nobook.md`](./from-nobook.md)；当前 ChemRealm 的器材几何、材质和验收硬标准见 [`apparatus-standard.md`](../visual/apparatus-standard.md)。

---

## 1. NOBOOK 给 Agent 美术生产的真正启示

公开资料显示，NOBOOK 的强项不是单个实验的装饰，而是把器材库、场景编辑、器材属性、拖拽装配、演示模式和教材资源组织成一个长期可扩展的系统。[官方化学界面说明](https://nobook-doc-cdn.nobook.com/chem/NB%E5%8C%96%E5%AD%A6%E5%AE%9E%E9%AA%8C%E7%95%8C%E9%9D%A2%E5%8F%8A%E7%9B%B8%E5%BA%94%E5%8A%9F%E8%83%BD%E7%89%B9%E6%80%A7%E8%AF%B4%E6%98%8E.html)和 [NOBOOK 化学产品说明](https://www.nobook.com/nb_huaxue_ziyuan.html)共同支持以下提炼。

### 1.1 资产库先于场景数量

一件器材应当被设计为可复用的资产，而不是某个实验页面里的私有插图。它需要同时具备：

- 可识别的轮廓；
- 稳定的比例和测量语义；
- 可连接的部位；
- 可操作的区域；
- 可改变的状态；
- 可生成缩略图和无障碍名称的元数据。

### 1.2 编辑态和演示态必须分开

同一件资产应能服务于教师编辑、课堂演示和学生探索，但不应为每种模式重画一套视觉对象。模式是对同一 World 和 Render State 的展示策略，而不是三套互相漂移的场景。

### 1.3 “好看”首先是状态可读

玻璃高光、液体颜色和粒子效果只有在不遮挡以下信息时才有价值：

- 液面和凹液面的读数；
- 器材是否已经连接；
- 物质处于哪一相；
- 现象是否正在发生；
- 当前数值和单位；
- 哪些对象可以操作。

### 1.4 交互对象需要语义部位

最终资产不能只有一张边界框。它至少要能区分：

```text
whole object
├─ part       可单独操作的部件
├─ port       可建立连接的接口
├─ region     可感知但未必形成连接的区域
└─ capability 当前允许的操作能力
```

这也是 Agent 不能只交付一张透明 PNG 的原因：图片没有办法表达滴定管活塞、瓶口、导管端点和夹持区之间的区别。

---

## 2. ChemRealm 对“美观”的可执行定义

“美观”不能作为 Agent 的最终验收理由。每件资产先按以下维度检查，再谈个人审美。

| 维度 | 可观察标准 | 常见失败 |
|---|---|---|
| 轮廓 | 缩小到缩略图仍能一眼辨认用途和方向 | 细节很多，但外轮廓像普通瓶子 |
| 比例 | 器材部件、刻度、液面与真实用途相容 | 烧杯像量筒，滴定管像装饰管 |
| 材质 | 玻璃、液体、金属、橡胶有不同但克制的材质层次 | 玻璃像塑料，液体像贴纸，金属像糖果 |
| 光照 | 同一场景的高光、阴影和透明度方向一致 | 每个模型来自不同光源 |
| 信息层级 | 主要实验状态最醒目，装饰细节不抢读数 | 粒子和高光盖住刻度与液面 |
| 统一性 | 同一资产族有相同视角、描边、色彩和比例规则 | 每件器材单独漂亮，放在一起像拼贴 |
| 交互可读性 | 可选、可拖、可连接、不可用状态有稳定反馈 | 用户看不出哪里能操作 |
| 科学可读性 | 视觉状态与 ObservableModel 一致，单位和读数不伪造精度 | 画面很好看，但液体体积无法解释 |

内部可以用 1–5 分做迭代评分，但以下项目是硬门槛：

1. 不能通过缩略图辨认用途的资产不得进入集成；
2. 违反器材比例、液面或连接语义的资产不得进入集成；
3. 与已有资产光照、视角或材质冲突的资产必须返工；
4. 任何依赖硬编码化学结论的视觉效果不得进入发布路径。

---

## 3. 三种生产方式与推荐边界

### 3.1 纯提示词生成最终图片

**优点：** 快，适合探索风格和构图。
**缺点：** 尺寸、对称性、刻度、文字、连接口和系列一致性不可控。

**结论：** 只能作为概念探索、气氛图、资源缩略图或非交互插图的起点，不能直接作为核心器材运行资产。

### 3.2 从一开始制作完整 3D 资产库

**优点：** 比例、视角、材质、变体和灯光控制最好。
**缺点：** 第一条纵向切片成本高；如果几何语义没有先定义，仍可能只是漂亮的静态模型。

**结论：** 适合后续分子查看器、复杂装配和多视角检查，不应成为 v0 交付所有器材的前置条件。

### 3.3 推荐：AI 概念探索 + 参数化/矢量/2.5D master

```text
生成模型
  → 探索轮廓、构图、色彩和材质方向
  → 人工/Agent 选择一条原创方向
  → 参数化或矢量方式重建可控 master
  → 运行时生成液面、刻度、连接态和现象
```

这是 ChemRealm v0 的推荐路径。它保留生成模型的审美探索能力，同时把以下内容交还给确定性资产和代码：

- 几何比例；
- 刻度与单位文字；
- 连接口和锚点；
- 液面高度；
- 透明层顺序；
- 颜色状态；
- 交互状态；
- 化学现象。

### 3.4 分工规则

| 内容 | 生成模型可参与 | 最终权威 |
|---|---|---|
| 轮廓方向、材质灵感 | 可以 | Art brief + 选定 master |
| 背景、氛围、缩略图 | 可以 | 视觉验收 |
| 玻璃高光草案 | 可以 | 视觉 token / shader |
| 刻度、单位、标签 | 只能提供草案 | 排版系统 / 数据模型 |
| 液面与凹液面 | 不可直接决定 | `V(h)` / `h(V)` + ObservableModel |
| 连接口、操作部位 | 不可猜测 | 资产 manifest |
| 颜色变化、沉淀、气泡 | 不可决定因果 | Scientific Core → ObservableModel |
| 运行时状态动画 | 不可私自添加 | approved render state |

---

## 4. Agent 的标准生产流程

### Step 1 — 先写 Asset Brief，不先写 prompt

每个资产开始前必须有一份 brief。没有 brief 的“先画出来看看”只能算探索，不得进入发布路径。

```yaml
assetId: apparatus.conical-flask.v1
assetType: apparatus
purpose: titration-receiving-vessel
view: orthographic-side-elevation
coordinateUnit: mm
visualFamily: chemrealm-lab-v1
requiredParts:
  - body
  - mouth
  - base
  - liquid-region
requiredPorts:
  - mouth-center
capabilities:
  - receive-liquid
  - contain-liquid
volumetric: true
volumeProfile: required
readouts:
  - liquid-level
states:
  - idle
  - selected
  - receiving
  - overflow-warning
  - invalid-operation
mustNot:
  - perspective-convergence
  - unreadable-labels
  - hard-coded-chemical-colour
  - decorative-liquid-motion-without-state
```

Brief 必须回答：

- 它在什么实验中出现；
- 哪些部位必须可操作；
- 哪些部位必须可连接；
- 它是否承担体积或读数语义；
- 它有哪些运行时状态；
- 哪些东西绝对不能由生成模型自由发挥。

### Step 2 — 建立三层参考板

参考图不能只收集“喜欢的图片”，而要分成三层：

1. **质量参考**：NOBOOK 等成熟虚拟实验产品展示的操作清晰度和完整度；
2. **科学参考**：真实器材、教材照片、标准刻度和正确使用姿态；
3. **原创方向**：ChemRealm 自己的颜色、线条、玻璃表现、信息卡和缩略图语言。

质量参考可以回答“完成度要多高”，科学参考回答“对象应该是什么”，原创方向回答“ChemRealm 不能长成谁的复制品”。

参考板必须记录 URL、来源、使用目的和许可证状态。第三方图片只能作为参考，不得直接裁切、描摹或当作 shipped asset。

### Step 3 — 先锁 silhouette 和比例

Agent 第一次输出不应追求粒子、反光和复杂纹理，而应只验证：

- 外轮廓；
- 器材方向；
- 部件比例；
- 可见的连接口；
- 与同族器材的相对尺寸。

审查顺序固定为：

```text
缩略图轮廓
→ 灰度结构
→ 透明/材质
→ 颜色
→ 状态与现象
```

如果轮廓和比例没有通过，禁止通过增加高光、粒子或阴影来“补美感”。

### Step 4 — 生成 master，而不是生成一堆不可控变体

一个资产族先选一个 master：

- 一个固定视角；
- 一个固定光照；
- 一个固定玻璃和金属材质规则；
- 一套可复用的锚点和部件命名；
- 一个可测试的几何尺寸。

后续的选中态、装液态、加热态和错误态都从 master 派生。不要让 Agent 为每个状态重新生成整张器材图，否则状态之间会出现边缘、刻度和比例跳变。

### Step 5 — 用生成模型做受控变化

需要审美探索时，一次只改变一个变量：

- 线条粗细；
- 玻璃透明度；
- 高光强度；
- 背景色；
- 阴影软硬；
- 缩略图构图。

不要同时改变器材比例、视角、材质、背景和颜色。否则 Agent 无法知道哪一个变化真正改善了资产。

每次生成必须记录：模型/工具、提示词、参考图、seed（若工具支持）、生成日期、选定原因和未采用原因。

### Step 6 — 接入运行时后再审美

脱离场景的单张 PNG 不能证明资产好看。至少要放进确定性的 fixture world，检查：

- 不同液体体积；
- 选中和拖拽状态；
- 与另一件器材连接；
- 透明玻璃叠加；
- 数值和单位读数；
- 不同窗口尺寸；
- 编辑态和演示态。

许多“生成图很好看”的资产在运行时会暴露：液面穿过器材壁、连接口偏移、阴影遮住读数、缩放后线条失衡等问题。因此运行时截图才是主要验收证据。

---

## 5. Prompt 协议：提示词只是 brief 的一个编译结果

Agent 不应直接凭感觉写一句自然语言 prompt。prompt 必须由 brief 编译出来，至少包含以下区块：

```text
Subject:
  exact apparatus and intended use

Geometry:
  orthographic side elevation, explicit proportions, visible ports and parts

Visual family:
  ChemRealm visual family, glass/material/stroke/light rules

Composition:
  centered, isolated, enough negative space for runtime overlays

Rendering intent:
  clean 2.5D educational laboratory asset, readable silhouette

Exclusions:
  no perspective convergence, no unreadable text, no extra instruments,
  no hidden ports, no brand marks, no copied interface, no decorative chemistry

Output:
  concept sheet or clean asset reference; not the final scientific data layer
```

### 5.1 滴定管概念探索示例

下面的 prompt 只用于探索视觉方向，不是最终资产合同：

```text
Create an original educational chemistry apparatus concept for ChemRealm:
a vertical burette shown in a clean orthographic side elevation, with a clearly
visible stopcock, narrow transparent glass body, readable silhouette, restrained
cool-neutral glass, one consistent light direction, soft contact shadow, and
ample empty space around the object for a runtime volume readout. The object
belongs to a coherent family of high-school laboratory apparatus and should
look precise, calm, and approachable rather than photorealistic or toy-like.

Do not invent or render graduation numbers, units, logos, UI controls, chemical
effects, liquid levels, extra tubes, perspective convergence, decorative bubbles,
or branding. Do not imitate any existing virtual-lab product or use its assets.
Return three controlled silhouette/material variations with the same geometry.
```

关键点是把“不要画刻度和液面”写进 prompt。刻度和液面应该由 ChemRealm 的确定性排版与 observable 状态生成，而不是接受模型可能生成的乱码或错误读数。

### 5.2 负向约束不是越多越好

负向约束应只覆盖会破坏产品的风险：

- 透视方向错误；
- 结构缺失；
- 额外器材；
- 不可读文字；
- 品牌和水印；
- 过度装饰；
- 与资产族不一致的光照；
- 直接复制竞品风格。

如果 prompt 长到无法判断重点，回到 brief 缩小任务，而不是继续堆形容词。

---

## 6. 资产包必须同时交付视觉和语义

一个可进入运行时的资产包至少包括：

```text
asset-id/
├─ master/                 原创 master 几何或矢量资产
├─ preview/                缩略图和固定背景预览
├─ states/                 由 master 派生的状态定义或图层
├─ manifest.json           尺寸、部件、端口、能力、可访问名称
├─ source-record.md        参考、生成工具、prompt、seed、作者记录
├─ license.md              资产许可证和第三方声明
└─ qa/                     固定视口截图、问题记录、验收结果
```

### 6.1 Manifest 的最小语义

```ts
type ApparatusAssetManifest = {
  assetId: string;
  visualFamily: string;
  coordinateUnit: "mm";
  view: "orthographic-side-elevation";
  dimensions: {
    widthMm: number;
    heightMm: number;
  };
  parts: readonly {
    id: string;
    bounds: readonly [number, number, number, number];
    capabilities: readonly string[];
  }[];
  ports: readonly {
    id: string;
    kind: string;
    positionMm: readonly [number, number];
    orientationDeg: number;
  }[];
  volumetric: boolean;
  volumeProfile?: string;
  accessibilityLabel: string;
};
```

这段是生产所需的语义示意，不是现在就要冻结的 TypeScript API。正式接口仍需在 M6 Representation Engine spec 中确定。

### 6.2 文字和数字永远分层

以下内容不应烘焙进生成图片：

- 器材名称；
- 单位；
- 刻度数字；
- pH、体积、温度等实时数值；
- 状态提示；
- 化学方程式。

它们必须由排版系统和运行时数据生成。这样可以保证翻译、无障碍、大字体、精度政策和科学状态一致。

---

## 7. Agent 审查回路

同一个 Agent 不应同时扮演“生成者”和“唯一验收者”。即使是单 Agent 工作流，也要按角色顺序进行自我对抗审查：

```text
生成 Agent
  ↓
Art Director：系列感、构图、材质、层级
  ↓
Scientific Reviewer：比例、读数、现象、单位和科学边界
  ↓
Runtime Reviewer：端口、锚点、状态、可操作性和性能
  ↓
Accessibility Reviewer：对比度、文字、非颜色信息、触控目标
  ↓
Owner visual review
```

每个角色只回答自己的问题，不用“整体感觉不错”替代检查。

### 7.1 Art Director checklist

- 100% 缩放时是否干净，缩略图时是否仍清楚；
- 玻璃、液体、金属是否看起来属于同一个视觉系统；
- 高光、阴影、描边是否统一；
- 场景是否有明确视觉焦点；
- 装饰是否遮挡科学信息；
- 资产是否像可操作的实验器材，而非商品渲染图；
- 是否有复制 NOBOOK 或其他产品的独特视觉特征。

### 7.2 Scientific Reviewer checklist

- 器材的形状是否支持其宣称的实验用途；
- 体积器材是否有 `V(h)` / `h(V)`；
- 液面是否来自正确的 observable 状态；
- 刻度和单位是否由数据层生成；
- 颜色、沉淀、气泡、火焰是否有上游状态依据；
- 是否把教学约定画成了自然科学事实；
- 是否出现了伪造精度或无法解释的现象。

### 7.3 Runtime Reviewer checklist

- part、port、region 是否能被独立寻址；
- 拖拽预览与最终 World mutation 是否分离；
- 资产缩放后端口是否仍对齐；
- selected、disabled、invalid、active 状态是否来自 render state；
- 资产是否能在编辑态、演示态和学生探索态复用；
- 是否引入了 `packages/render` 到 Scientific Core 的反向依赖；
- 是否需要把整张图片替换成参数化图层。

### 7.4 Accessibility Reviewer checklist

- 关键读数是否有足够对比度；
- 科学信息是否不只由颜色承载；
- 数值是否能以文字/辅助技术获取；
- 核心操作区域是否足够大且不依赖像素级拖拽；
- 选中态和错误态是否同时有形状、描边、文字或动作反馈。

---

## 8. 失败模式与返工规则

| 失败模式 | 不能接受的修法 | 正确返工 |
|---|---|---|
| 生成了乱码刻度 | 让模型再生成一次直到“看起来像数字” | 删除烘焙文字，由排版系统生成 |
| 玻璃像塑料 | 继续加蓝色和高光 | 重新检查透明层、边缘、遮挡和光照规则 |
| 液体像贴纸 | 增加更多渐变和泡泡 | 拆成容器内层、液面、凹液面、状态效果 |
| 器材比例错误 | 用 CSS 缩放某个部件补救 | 回到 silhouette/proportion master |
| 连接口不明显 | 用 UI 箭头长期覆盖 | 修正 port 视觉提示与交互态，箭头只做临时提示 |
| 每个器材各自漂亮 | 接受后再靠场景滤镜统一 | 退回资产族，统一视角、灯光、材质和线条 |
| 效果很炫但没科学来源 | 在 renderer 中加入 `if chemical then effect` | 补 ObservableModel 映射或删除效果 |
| 资产脱离场景很好看 | 以单张图作为验收证据 | 用 fixture world 做多视口和多状态截图 |
| 参考 NOBOOK 后变得很像 | 只改 Logo 或颜色 | 回到原创轮廓、原创布局、原创材质语言，并记录参考边界 |

返工优先级固定为：

```text
科学/几何错误
→ 交互/状态错误
→ 系列一致性错误
→ 信息层级错误
→ 细节和风格 polish
```

不能用最后一层 polish 掩盖前四层问题。

---

## 9. 第一条 Agent 美术纵向切片

第一批建议只做滴定实验的八件基础资产：

1. 锥形瓶；
2. 滴定管；
3. 铁架台；
4. 烧杯；
5. 移液管；
6. 玻璃棒；
7. 指示剂瓶；
8. 温度计。

验收不以“八件图都生成出来”为目标，而以以下场景通过为目标：

```text
资源库
→ 拖入滴定管和锥形瓶
→ 对齐并建立语义连接/支撑关系
→ 加入液体
→ 显示正确液面和读数
→ 执行滴定
→ 根据 observable state 显示指示剂变化
→ 切换演示态
→ 在四个固定视口截图
```

### 9.1 这条切片必须证明

- 所有器材遵守同一视角、光照、玻璃和描边语言；
- 滴定管与锥形瓶的相对尺寸可读；
- 液面由体积 profile 驱动，而不是按图片高度猜测；
- 刻度、单位和实时读数不是图片的一部分；
- 选中、拖动、连接和无效操作有清楚的状态反馈；
- 演示态能隐藏编辑噪声，但不隐藏必要的实验信息；
- 颜色和现象来自 ObservableModel；
- 资产能在固定 fixture world 中重复生成相同截图。

### 9.2 第一批不做

- 200 个器材的铺量；
- 每个实验单独一套风格；
- 复杂粒子特效库；
- 直接从 NOBOOK 截图描摹；
- 把生成模型的整张场景图当作运行时画布；
- 在没有渲染基线前冻结具体颜色 token。

---

## 10. 验收矩阵

每件进入 M6/M7 发布路径的资产都应留下类似以下证据：

| Criterion | Result | Evidence |
|---|---|---|
| Silhouette readable at thumbnail | PASS/FAIL | thumbnail fixture |
| Geometry and proportions are approved | PASS/FAIL | master dimensions + review image |
| View/light/material family is consistent | PASS/FAIL | side-by-side asset sheet |
| Parts/ports/capabilities are declared | PASS/FAIL | manifest test |
| Volumetric asset has `V(h)` and `h(V)` | PASS/FAIL/N/A | profile test |
| Runtime state is observable-driven | PASS/FAIL | projection test + source path |
| Labels and readings are runtime-generated | PASS/FAIL | layer inspection |
| Editor/demo/student modes reuse the same asset | PASS/FAIL | mode screenshots |
| Four named viewports remain usable | PASS/FAIL | baseline screenshots |
| Accessibility checks pass | PASS/FAIL | contrast and interaction evidence |
| Originality/licensing record exists | PASS/FAIL | source-record + license record |
| No prototype art or watermark ships | PASS/FAIL | release capture |

任何科学、几何、运行时状态、许可证或原创性项目为 FAIL 时，资产不得标记为 release-ready。视觉上“差不多”的资产只能标记为 concept 或 prototype。

---

## 11. Agent 交付模板

下一位 Agent 不应只提交“已生成若干图片”。最小 handoff 应包括：

```text
Asset batch:
Visual family:
Master assets:
Runtime states:
Known limitations:
Scientific dependencies:
Interaction dependencies:
Reference and license records:
Generation tool / model / seed:
Commands to reproduce previews:
Screenshot evidence:
Acceptance matrix:
Current gate: concept / integrated / owner review / release-ready
```

如果只能提供单张图片而不能提供 manifest、来源、状态和验收证据，交付状态必须是 `concept`，不能写成完成。

---

## 12. 最终原则

ChemRealm 的美术 Agent 不是“画图机器”，而应当像一个受约束的美术制作团队：

```text
生成者探索可能性
Art Director 统一语言
Scientific Reviewer 守住真实
Runtime Reviewer 守住可操作性
Accessibility Reviewer 守住可读性
Owner 审查最终气质
```

NOBOOK 证明了成熟虚拟实验产品需要一套统一的器材与场景语言。ChemRealm 要在此基础上再增加一条自己的底线：

> **视觉资产可以由 Agent 探索，但不能由 Agent 私自决定科学、几何或交互真值。**

只有当一件资产既漂亮、又能被复用、被操作、被解释、被重放和被验收时，它才是 ChemRealm 的资产，而不是一张漂亮图片。
