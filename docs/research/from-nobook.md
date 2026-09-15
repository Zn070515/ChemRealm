# 从 NOBOOK 反推 ChemRealm：UI、药品系统、待选区、运行态 Inspector 与化学过程世界深度调研

> **文档性质：** 产品研究 / 竞品考古 / 架构输入，不是 ChemRealm 规范本身
> **研究日期：** 2026-09-16（持续更新）
> **研究对象：** NOBOOK（NB）化学实验的教师端、学生端、开放平台、历史产品资料、政府采购技术规格、教学应用案例、版本演化与社区使用
> **研究重点：** UI 信息架构、右侧待选区、药品/器材 Catalog、参数化材料实例、容器状态查看、实时反应信息、相态/拓扑/历史依赖、竞争与连续过程、数值存在阈值、现象表现、交互语义、内容规模与长期维护成本
> **与 ChemRealm 的关系：** 本文一方面提炼“成熟虚拟化学世界已经证明有价值的产品能力”，另一方面把这些产品能力继续向科学运行时深挖：哪些行为仅靠药品名/方程式数据库无法正确实现，ChemRealm 必须怎样用 Scientific Reality、process network、Inspector 和数值语义承接。本文不建议复制 NOBOOK 的闭源实现、商业权限、UI 皮肤、素材或不可审计的科学逻辑。M6 的当前资产落地规范是 [混合器材资产管线](../superpowers/specs/2026-09-15-m6-hybrid-apparatus-asset-pipeline.md)；本研究只负责外部证据与产品推论，不替代该规范。

---

## 0. 为什么需要重做这份调研

前几轮对 NOBOOK 的理解一度过于简单：把它概括成“一个器材/药品很多、可以拖拽的虚拟实验室”。这会严重低估它真正积累的产品能力。

继续追踪官方手册、开放平台 API、政府采购技术规格、教学使用案例、版本日志和社区玩法之后，可以更准确地描述 NOBOOK：

> **NOBOOK 已经形成了一个围绕 stateful laboratory objects 组织的中学化学实验环境：用户从高密度 Catalog 中实例化器材和药品，修改实例参数，操作世界中的对象，容器内部状态持续变化，系统把反应过程与定量数据投影回 UI，并用丰富的视觉/声音/操作反馈维持“实验室正在运行”的感知。**

它并不等价于 ChemRealm 想要的“可验证 Scientific Reality”。公开资料不足以证明 NOBOOK 内部拥有统一、严格、可审计的热力学/动力学求解体系。但它在 **内容密度、世界可操作性、状态可读性、反应过程可见性、长期内容工业** 上的积累必须认真对待。

用户对当前 NOBOOK 的直接观察还补充了公开资料不容易完整呈现的两点：

1. 浓、稀盐酸在自由实验中的视觉表现并不相同；
2. 选中画布中的容器后，可以查看内容物及质量、物质的量、浓度、温度、压强等运行态数据，界面侧部/下部还会实时更新正在发生的反应。

这两条“直接观察”在本文中不会被冒充成官方文档结论；但官方 API、历史 UI 文档和明确标注 NOBOOK 的采购规格分别从不同方向证实了 **独立信息区 + T/V/n/c/m/P 数据追踪 + 反应方程式实时展示** 的产品体系，因此二者能够互相印证。

---

# 1. 调研方法与证据等级

## 1.1 来源类型

本次不是只看 NOBOOK 官网宣传页，而是交叉使用以下来源：

1. **NOBOOK 当前官网与当前化学资源页**：确认仍在公开运营的产品表面、资源组织与当前官方宣传口径；
2. **NOBOOK 官方历史产品手册**：理解无机编辑器、器材库、器材属性、器材信息、场景信息、演示模式等具体 UI；
3. **NOBOOK 开放平台 2.0 API**：确认当前产品内部至少把 Catalog、属性设置、信息区、编辑器/播放器、场景 JSON 持久化等作为独立组件；
4. **政府采购 / 中标技术规格**：尤其是明确写出品牌 NOBOOK、制造商北京乐步教育科技有限公司的文件，用来确认器材/药品规模、数据追踪、取用量、温度/压强等具体能力；
5. **教学应用研究 / 教师实践案例**：观察条件、温度、时间变化时 NOBOOK 实际如何更新反应方程式与物质消耗；
6. **版本日志镜像 / 下载站历史记录**：观察长期维护中持续修补的化学反应、现象、声音、器材破损等边角问题；
7. **App Store 与学生端更新记录**：理解移动端 UI 如何从高密度工具栏转向渐进式/隐藏式操作；
8. **Bilibili 等社区实操**：只用于判断用户如何“玩”这个系统，不用于证明科学正确性；
9. **项目所有者直接观察**：用于补足当前客户端中公开网页不容易抓到的运行态 UI 细节。

## 1.2 可信度分级

本文用以下等级区分“能确认”和“只能推断”：

| 等级 | 含义 | 典型来源 |
|---|---|---|
| **A** | 当前或近年的一手证据，可高置信确认产品能力 | 当前官方 API、当前官网、明确品牌/厂商的政府采购规格 |
| **B** | 一手历史资料，可确认某阶段已存在该能力，但不能保证 2026 UI 完全不变 | 官方历史手册、官方历史宣传 |
| **C** | 外部实操/教学研究，对真实使用行为很有价值，但不是产品内部架构说明 | 教学论文、教师案例、App Store 使用反馈 |
| **D** | 第三方镜像/社区内容，适合发现线索与理解用户行为，不可单独用来证明核心科学机制 | 下载站版本日志、Bilibili、论坛 |
| **Owner observation** | 当前实机/直接使用观察 | 用户本人的 NOBOOK 使用经验 |

## 1.3 一条贯穿全文的纪律

本文反复区分三件事：

- **产品外部行为已经证明什么；**
- **公开资料允许我们合理推断什么；**
- **公开资料仍然无法证明什么。**

例如：

- 能确认 NOBOOK 会根据某些条件动态显示不同反应方程式；
- 能确认它存在速率、平衡、压强等系统；
- 但不能因此声称它内部所有反应都由统一热力学 solver 自动求得；
- 能确认液体药品浓度可以修改；
- 但不能因此声称所有浓度相关视觉都由连续物性函数计算；
- 能确认世界场景可以序列化为 JSON；
- 但不能因此把它等同于 ChemRealm 的 event sourcing / deterministic replay。

---

# 2. 最重要的总判断：NOBOOK 的护城河不是“279 种药”

如果只问“有多少药品”，会错过 NOBOOK 最重要的东西。

更准确的抽象是：

```text
Resource Library
      ↓
Material / Apparatus Catalog
      ↓
Search / Taxonomy
      ↓
Catalog Entry
      ↓ instantiate
World Instance
      ↓
Property Configuration
      ↓
Interaction
      ↓
Container / World State
      ↓
Active Reaction / Process
      ↓
Observable Consequence
      ↓
Inspector / Data Tracking / Reaction Feed
      ↓
Save / Present / Continue Experiment
```

NOBOOK 的“丰富感”来自这些层的乘法，而不是单纯的 item count。

可以把用户感知的化学自由度粗略写成：

\[
F \approx C \times P \times K \times I \times S \times R \times O
\]

其中：

- **C — Catalog Breadth：** 有多少可拿出的器材、材料、生活化对象与规格；
- **P — Parameterization：** 浓度、量、温度、速率、器材参数等可否修改；
- **K — Combinability：** 是否允许自由组合，而不是只能跑预设实验；
- **I — Interaction Richness：** 倒、滴、取、摇、混、搅、热、接、封闭、通气等；
- **S — State Legibility：** 用户能否查看容器/世界的内部状态；
- **R — Reaction/Process Visibility：** 是否能看见正在发生什么反应、何时变化；
- **O — Observable Richness：** 颜色、沉淀、气泡、烟雾、火焰、爆炸、声音、漏液等。

这七个维度中的任何一个接近零，“自由实验室”的感知都会明显坍塌。

---

# 3. NOBOOK 实际上有多个 UI，而不是一个“右侧栏”

## 3.1 资源管理空间：先决定“进入哪个实验”

官方历史与当前资源页都显示，NOBOOK 首先有一个实验资源/内容空间：

- 精品实验；
- 我的实验；
- 历史上还有回收站；
- 当前按教材、章节、知识点组织；
- 当前还区分探究实验、3D 资源、视频资源、互动课件、学案等；
- 支持教学进度、使用最多、最新发布等排序。

当前公开化学资源页显示的资源数量是数百量级，且不断变化，不能把某次爬取数字当永久常数。

**关键认识：**

> “实验资源库”与“实验画布右侧的器材/药品 Catalog”是两个不同 Catalog。

前者组织 **Scenario / Teaching Resource**，后者组织 **World Object Templates**。

## 3.2 编辑器：高密度 toolbox + 画布

无机实验编辑器的典型结构包含：

- 中央实验画布；
- 右侧器材/药品库；
- 搜索和多种分类；
- 顶部保存、演示、设置等；
- 场景缩放与视角；
- 对象属性编辑；
- 对象信息区；
- 场景信息；
- 底部/旁侧操作栏。

这不是简单的“Canvas + Sidebar”。官方当前开放平台 API 将以下元素分别暴露成独立 UI 开关：

```text
topToolbarVisible
leftToolbarVisible
rightToolbarVisible      # 器材库
bottomToolbarVisible
settingsMenuVisible      # 器材属性设置
playerToolBarVisible
infoVisible              # 器材信息区
```

这对 ChemRealm 有直接启示：**Catalog、Property Editor、Runtime Inspector 不应被设计成同一种东西。**

## 3.3 播放器 / 演示模式：不是编辑器换个皮肤

官方手册长期区分“编辑”和“演示”。开放平台也明确区分 player 与 editor，并为 `infoVisible` 设计：

- `hasEquipmentDrawer`：有器材库的编辑器布局；
- `noEquipmentDrawer`：没有器材库的播放器布局。

这说明 NOBOOK 已经在产品层承认：

> **创作世界、操作世界、演示世界，需要不同的信息密度。**

## 3.4 学生移动端：正在主动弱化“巨型右栏”

近年学生 App 更新描述出现：

- 实验室侧边栏极简整合；
- 隐藏式功能入口；
- 器材操作引导；
- 器材百科；
- 更强调沉浸式实验。

这说明长期产品演化已经从“桌面教师工具箱”分叉出“学生渐进式操作界面”。

因此 ChemRealm 不应该把“成熟 UI”理解成一套万能 sidebar。更合理的是：

```text
Desktop Authoring / Teacher   → information dense
Student Exploration          → progressive disclosure
Presentation                 → world dominant
Inspection                   → state dominant
Mobile                       → contextual actions
Organic / Electrochemistry   → domain-specific projection
```

---

# 4. 右侧待选区：真正成熟的是“检索系统”，不仅是“东西多”

## 4.1 官方明确存在四种并行检索路径

历史官方手册详细描述了：

1. **搜索框**：模糊搜索、首字母等；
2. **物质名称快捷搜索**：按金属、非金属、带电离子团等化学语义查找；
3. **分类搜索**：反应容器、辅助器材、固体药品、液体药品、气体药品；
4. **首字母索引**：按字母快速跳转。

当前公开编辑器仍保留反应容器 / 辅助器材 / 固体 / 液体 / 气体这些主分类。

这说明 NOBOOK 已经解决了一个只有在 Catalog 规模上去以后才会变严重的问题：

> **用户知道自己想“做什么化学”，但不一定知道 Catalog 里精确叫什么。**

因此搜索不能只有 `name contains query`。

## 4.2 化学语义搜索很值得 ChemRealm 学

“按金属 / 非金属 / 带电离子团”寻找药品，本质上是在做：

```text
User intent: “我要含 Fe 的试剂”
        ↓
chemical-semantic index
        ↓
FeCl3 / FeSO4 / Fe(NO3)3 / ...
```

未来 ChemRealm 更适合进一步扩展：

- 中文名 / 英文名；
- 化学式；
- 常用简称；
- 拼音 / 首字母；
- element index；
- ion/component index；
- phase；
- acid/base/salt/oxidant/reductant 等高层标签；
- curriculum/common-lab tags；
- 最近使用；
- 收藏；
- scientific capability / validation status。

## 4.3 高密度 Catalog 必须允许“快速拿”与“深度选”同时存在

用户不应该每次都从 300 项里搜索“盐酸”。成熟交互通常同时需要：

- 常用预设；
- 最近使用；
- 教材常用；
- 当前 Scenario 推荐；
- 全部库；
- 深度化学检索。

这也是 ChemRealm 后期需要区分 `MaterialFamily` 与 `StockPreset` 的原因。

---

# 5. 器材 Catalog 的长尾远比“烧杯、试管、滴定管”复杂

当前公开编辑器能直接看到大量规格化反应容器和特殊器材，例如：

- 多规格烧杯；
- 多规格试管、具支试管；
- 多规格容量瓶、量筒；
- 酸/碱滴定管；
- 圆底烧瓶、平底烧瓶、蒸馏烧瓶、三颈烧瓶；
- 多种分液漏斗、滴液漏斗、恒压滴液漏斗；
- 多种 U 型管；
- 坩埚、蒸发皿、表面皿、点滴板、研钵；
- 启普发生器；
- 特定干燥/气体处理装置；
- 废液缸、污物杯；
- 消毒液、洁厕灵等生活化对象；
- 组合器材。

这说明“器材丰富度”本身也不是一层简单图标库，而是至少包含：

```text
Apparatus Family
      ↓
Size / Specification
      ↓
Ports / Capacity / Geometry
      ↓
Supported Operations
      ↓
Assembly / Topology
      ↓
Runtime State
```

对于 ChemRealm，这意味着“百种药品”不能脱离“百种器材/规格/连接语义”独立考虑。

---

# 6. 药品规模：数字会变，但“百量级内容密度”是确定事实

公开资料中的药品/器材数字并不一致：

| 时间/来源 | 器材 | 药品 | 备注 |
|---|---:|---:|---|
| 2018 官方展会资料 | 112 | 253 | 还列 150 个经典实验资源 |
| 2019 学校采购 | 122 | 279 | 明确写 NOBOOK 化学实验室系统，3 年持续更新 |
| 2025 明确品牌/厂商中标规格 | 约 150 | 约 150 | NOBOOK V3.0，不同采购包/学段口径 |
| 官方历史宣传 | 合计“300 多种” | 未分开 | 营销口径 |

因此不能得出“2026 NOBOOK 精确有 279 种化学药品”。

更重要的是：**“药品条目数”不等于“独立 chemical identity 数量”。**

Catalog 很可能混合：

```text
ChemicalIdentity
MaterialFamily
Phase/Form
Concentration / Stock Preset
Teaching-facing Catalog Entry
```

例如：

- 浓盐酸 / 稀盐酸；
- 浓硫酸 / 稀硫酸；
- 无水硫酸铜 / 硫酸铜溶液 / 胆矾；
- 固体 NaCl / NaCl 溶液；

用户看见的是不同可选条目，但底层科学身份和材料配方层级并不相同。

**对 ChemRealm 的要求因此不是“也做 279 个 JSON”。**

而是从一开始就分清：

```text
ChemicalIdentity
    ≠ MaterialFamily
    ≠ StockPreset
    ≠ CatalogEntry
    ≠ MaterialInstance
```

---

# 7. Catalog Entry ≠ World Instance：这是整个系统的关键边界

在右侧待选区里，“盐酸”只是一个可被实例化的模板。

拖到画布以后，它变成世界中的一个具体对象/具体库存：

```text
HydrochloricAcidFamily
      ↓ select preset / parameterize
MaterialInstance
├─ concentration
├─ amount / volume
├─ temperature
├─ container relation
├─ current composition
└─ current history/state
```

从此以后它不能再只通过 `catalogId = HCl` 来解释世界状态。

这条边界一旦做错，会产生大量架构污染：

- 修改浓度变成“切换另一个药品 ID”；
- 反应产物无法自然继续存在；
- 同一药品在不同容器中的状态被混为一谈；
- 视觉表现只能写 `if materialId`；
- Inspector 无法解释“这一瓶现在是什么”；
- replay / branch 难以保持语义。

ChemRealm 的最终设计必须把“模板”和“实例”分开。

---

# 8. 浓度不是标签：NOBOOK 已经把它做成运行参数

官方产品文档明确宣传：

> 液体药品浓度可以由用户设置，并可实时追踪反应数据。

这至少证明浓度不是固定显示标签。

教学应用研究进一步报告：

- 大部分溶液浓度可调；
- 在某些实验里，浓度不足时反应不会发生；
- 反应物的用量与剩余量会被系统计算。

因此从外部行为看，浓度至少可能进入：

```text
reaction eligibility
reaction extent / amount
observable regime
```

而用户的当前实机观察又补充：浓、稀盐酸在自由实验里的动画/可见表现不同。

## 8.1 这里最重要的不是猜 NOBOOK 内部怎么算

公开资料不足以证明它使用：

```text
fumeIntensity = continuous physical function(c, T, humidity, ...)
```

也可能是：

- threshold rule；
- preset mapping；
- material-state regime；
- 经验效果表；
- 多种机制混合。

因此 ChemRealm 不应该“逆向猜内部代码”，而应该吸收外部产品要求：

> **同一个 MaterialFamily 的参数变化应该有因果意义，并能影响 Scientific / Observable / Interaction state。**

## 8.2 ChemRealm 需要的正确结构

例如盐酸不应建模成：

```text
DrugId = concentrated_hcl
DrugId = dilute_hcl
```

更合理的是：

```text
ChemicalIdentity / components
      ↓
MaterialFamily: hydrochloric-acid-aqueous
      ↓
StockPreset:
  - dilute HCl
  - 1 mol/L HCl
  - concentrated HCl
      ↓
MaterialInstance:
  concentration = ...
  amount = ...
  T = ...
      ↓
Scientific Reality
      ↓
Empirical / physical Observable Models
      ↓
fuming / appearance / behavior
```

预设是 UX 快捷方式，不应成为第二套科学真理。

---

# 9. 不同浓度/状态的“视觉不同”揭示了 Observable System 的重要性

当前资源库公开可见：

- 三种浓稀不同的硫酸铜溶液；
- 盐酸、硫酸的物理性质；
- 浓盐酸与浓氨水生成白烟；
- 浓硫酸稀释；
- 浓硫酸腐蚀；
- 不同浓度相关实验。

这说明浓度/材料状态不是只进入数值面板，还要进入视觉层。

NOBOOK 长期维护的现象类型，从采购规格、教学资源与版本日志可以看到至少包括：

- 颜色及深浅变化；
- 沉淀；
- 絮状沉淀/浑浊；
- 溶解与扩散；
- 气泡/产气；
- 烟/雾/白烟；
- 火焰；
- 爆炸/剧烈反应；
- 液体流动；
- 器材破裂后的漏液；
- 声音反馈。

## 9.1 ChemRealm 不应该把所有现象强行第一性原理化

对于很多高中可见现象，浏览器里做完整 CFD、气溶胶、成核、生长、光散射并不现实，也不必要。

正确路线应是：

```text
Scientific State
      ↓
Observable Model
   ├─ physical model where justified
   └─ empirical model where appropriate
      ↓
Visual Parameters
      ↓
Renderer
```

经验 Observable 必须带：

- 适用域；
- 来源；
- 参数；
- 版本；
- 置信类别；
- 失败/退化策略。

这样可以做到“视觉丰富”而不退化成 `if FeCl3 then yellow`。

---

# 10. 交互不是统一的 add(material, amount)

NOBOOK 的实际交互根据物相和器材不同而变化。

官方学生端手册明确展示液体操作：把盛有液体的容器拖向另一个容器，会出现倾倒控制，并可以调节倾倒量。

明确品牌/厂商的采购技术规格进一步写到：

- 固体药品支持精确取用质量；
- 液体支持控制倾倒体积；
- 物体/药品支持滚动、倾倒、震荡、混合、搅拌等运动表现。

历史产品与资源又能看到：

- 胶头滴管；
- 定量量取；
- 粉末/块状固体取用；
- 加热；
- 通气；
- 装置连接；
- 气密性；
- 摇晃/混合；
- 点燃；
- 滴定等。

因此更合理的交互抽象是：

```text
Solid   → pick / scoop / weigh / transfer
Liquid  → pour / pipette / drop / measure / titrate
Gas     → generate / collect / flow / vent
Apparatus → connect / seal / heat / rotate / clamp / open / close
```

这对 ChemRealm 很重要：**“自由组合”不是允许把两个 ID 塞进同一个数组，而是对象之间存在丰富的操作语义和拓扑。**

---

# 11. Property Editor、Entity Inspector、Scene Inspector 是三种东西

这是此次调研中对 ChemRealm UI 最重要的发现之一。

官方历史 UI 文档已经把它们拆开：

## 11.1 Property Editor：我要怎么配置这个对象

“器材属性”用于编辑对象的基础属性和删除等配置操作。

它回答：

> **这个对象应该被设置成什么？**

## 11.2 Entity / Equipment Info：这个对象现在是什么状态

“器材信息”在选中画布对象后显示对应信息。

当前开放平台仍然有独立 `infoVisible`，并区分编辑器有器材库和播放器无器材库两种布局。

它回答：

> **这个对象现在是什么？**

## 11.3 Scene Info：整个世界现在是什么状态

官方 UI 还有独立“场景信息”。

它回答：

> **整个场景/环境是什么状态？**

## 11.4 这三个 surface 在 ChemRealm 里不应再混掉

未来建议：

```text
Catalog Drawer
  “我能拿什么？”

Property / Setup Panel
  “我要怎么配置它？”

Entity Inspector
  “它现在是什么状态？”

World / Environment Inspector
  “整个世界现在是什么状态？”
```

强行塞进同一个右栏，只会导致后期信息密度失控。

---

# 12. 容器状态查看：NOBOOK 已经建立了“state legibility”预期

用户直接观察当前 NOBOOK 时指出：选择一个容器，可以看到内容物的：

- 质量；
- 物质的量；
- 浓度；
- 温度；
- 压强；
- 以及正在发生的反应。

公开资料能从多个方向交叉印证这一体系：

1. 官方 UI 文档：存在独立“器材信息”和“场景信息”；
2. 当前开放平台：`infoVisible` 仍然是独立组件；
3. 明确标注 NOBOOK / 北京乐步的近年采购技术规格：数据追踪包括反应方程式、温度、体积、物质的量、浓度、质量；并要求压强会随温度和气体量变化。

因此虽然公开资料不能保证“2026 每一个版本、每个容器的 UI 字段排列都完全一样”，但可以确认：

> **NOBOOK 把化学运行态数据暴露给用户，而不是只让用户看动画。**

这就是 **State Legibility**。

## 12.1 这会成为 ChemRealm 必须超过 NOBOOK 的地方

ChemRealm 最终的 Inspector 可以做渐进式深度：

### 默认层：高中生可理解

```text
烧杯 A
体积         48.2 mL
温度         25.1 °C
压强         101.3 kPa (if meaningful)

内容物
盐酸 / 氯化钠 / 水 ...

正在发生
主要酸碱过程 ...
```

### 深一层：定量状态

```text
mass
amount
concentration
phase amounts
pH
conductivity / observable quantities
```

### 科学层：Scientific Reality

```text
conserved components
equilibrium species
activities
ionic strength
mass balance
charge balance
phase stability
```

### 审计层：模型与证据

```text
model id / version
validity domain
provenance
assumptions
residual / convergence
approximation flags
```

这正好把 ChemRealm 的 **Correct / Visible / Thinkable** 连起来。

---

# 13. 实时反应区：NOBOOK 已经不只是“显示一条静态方程式”

政府采购规格明确要求：

- 反应数据实时可视化；
- 包括化学反应方程式；
- 方程式可移动、可放大显示。

这至少说明 Reaction Equation 是 UI 中一个主动的信息对象，而不是固定实验说明里的静态文本。

## 13.1 教学案例证明反应信息会随条件与时间变化

一篇以 NOBOOK 为平台的高中化学教学案例记录了乙醇 + 浓硫酸体系：

- 加入 10 mL 乙醇和 30 mL 浓硫酸；
- 升温至约 140 ℃时，烧瓶附近显示乙醇分子间脱水生成乙醚的反应；
- 升至约 170 ℃时，显示乙醇消去生成乙烯；
- 继续反应一段时间，又显示新的副反应；
- 研究者还报告 NOBOOK 会计算药品使用量与剩余量，且浓度不足时某些反应不会发生。

这不能证明 NOBOOK 使用统一 kinetics solver，但能证明一个重要产品事实：

> **Reaction Feed / Reaction State 可以依赖温度、浓度、时间/进程与当前物质状态而变化。**

## 13.2 ChemRealm 不能直接把“当前反应方程式”当科学真理

真实平衡体系里经常同时存在：

```text
acid-base equilibria
water autoionization
complexation
hydrolysis
precipitation
redox
mass transfer
```

“当前正在发生哪条高中方程式”本身是一种 representation。

因此 ChemRealm 应当建立：

```text
Scientific Process State
      ↓
Reaction / Process Interpretation
      ↓
Pedagogical Reaction Feed
```

而不是：

```text
Reaction Equation UI
      ↓
决定世界怎么反应
```

---

# 14. ChemRealm 可以把 NOBOOK 的 Reaction Feed 升级成“因果日志”

事件溯源世界给 ChemRealm 一个 NOBOOK 未公开证明拥有的额外优势：**因果链可以被回放。**

例如默认用户只看到：

```text
Ag⁺ + Cl⁻ → AgCl↓
```

展开以后：

```text
14:32:10  加入 0.50 mL AgNO3
14:32:10  Ag component inventory 增加
14:32:10  equilibrium/phase solve
14:32:10  ionic product crosses precipitation condition
14:32:10  AgCl(s) becomes stable
14:32:10  precipitated amount = ...
14:32:10  observable turbidity increases
```

再点科学解释：

```text
model
Ksp/provenance
activity convention
validity
residual
```

这种设计能把“实时方程式很直观”的优点，与 ChemRealm 的科学可审计性结合起来。

---

# 15. 反应产物要留在世界里，而不是“动画播完就没了”

自由实验真正难的地方是 reaction chaining。

如果：

```text
A + B → C
```

发生后，C 必须继续成为世界真实状态的一部分，之后可以：

```text
C + D → E
```

而不是第一段动画播完以后只留下“现象”。

近年相关采购技术规格强调：反应产物应保留相应化学性质、可继续参与反应、过程可追溯。教学案例中也能看到前一步副产物继续影响后续实验。

**ChemRealm 应将这一点写成成熟世界的硬要求：**

> 只要处于受支持模型域内，生成物必须作为真实世界状态继续存在，并能成为后续 Scientific Reality 的输入。

这也是为什么 `MaterialInstance`、`ContainerContents` 和 `SpeciesState` 必须分层。

---

# 16. 温度与压强不是装饰字段

NOBOOK 的近年技术规格写到：

- 能表现热力学相关现象；
- 能量随化学反应发生变化；
- 压强随温度和气体量发生相应变化；
- 数据追踪包括温度等。

公开当前官网又长期把“压强系统”作为化学三大系统之一。

教学案例则显示反应路径/显示方程式会随温度变化。

因此 T/P 在产品心智上不是：

```text
UI decoration: 25 °C, 101 kPa
```

而是：

```text
World / local state
      ↓
reaction / physical behavior
      ↓
observable + inspector
```

ChemRealm 以后进入气体、热化学、挥发、溶解、动力学时，必须明确区分：

- environment T/P；
- vessel-local T/P；
- gas-space P；
- model reference conditions；
- user-set initial condition；
- dynamically evolved condition。

不能永远靠一个全局 `temperature = 25°C`。

---

# 17. “错误操作”与危险现象：NOBOOK 追求的是可见后果

相关采购规格和长期资源可以看到：

- 粉尘爆炸；
- 可燃混合气点燃；
- 强烈产气；
- 某些不当操作的危险现象；
- 器材破裂；
- 液体漏出；
- 爆炸/剧烈反应等。

第三方版本日志镜像甚至记录过：

- 某些条件下的爆炸效果；
- 破裂试管缓慢漏液；
- 危险操作提示；
- 倾倒声音延迟修复。

虽然这些具体 changelog 不是官方一手资料，但它们很好地说明长期维护面：**“世界后果”不仅是化学方程式，还包括器材状态、声音、流体和危险可见性。**

这与 ChemRealm 已经形成的原则高度一致：

> **Consequence before Judgement。**

能安全模拟的情况下，不应该第一时间弹：

```text
❌ 操作错误
```

而应优先让世界产生合理后果，然后由 ACE / assessment / explanation 解释为什么。

---

# 18. 声音、破损、漏液看起来是“小东西”，其实决定实验是否“活着”

在工具软件里，声音或漏液很容易被当成 polish。

在虚拟实验里不是。

用户对“这是一个世界”的判断来自很多低层反馈：

- 液体是否像液体；
- 瓶子倒下会怎样；
- 试管破裂以后是否真的失去容纳能力；
- 加热有没有持续状态；
- 倾倒声音是否同步；
- 爆炸后器材/内容物如何变化；
- 气泡是否随速率变化；
- 浑浊是否渐变。

NOBOOK 长期版本维护恰恰暴露：这些细节需要多年迭代，而不是引擎一次解决。

ChemRealm 的 `Visual quality is a product requirement` 应进一步扩大为：

> **World feedback quality is a product requirement。**

包括视觉、听觉、状态反馈、交互反馈、过程反馈。

---

# 19. 世界可以序列化：NOBOOK 已经有 scene document 概念

当前开放平台 API 直接暴露：

```text
getData(): string
setData(data: string): void
```

其中 `getData()` 返回整个实验场景的 JSON 字符串，官方示例直接写明可以持久化到数据库；`setData()` 可以重新加载。

历史手册也有导入/导出实验文件。

这证明 NOBOOK 至少拥有：

> **Serializable Scene / Experiment Document。**

但不能把它夸大成：

> event sourcing / deterministic replay / branching。

公开资料没有证明这些。

ChemRealm 的优势应该建立在：

```text
NOBOOK-like editable/persistable world
+
semantic events
+
deterministic replay where feasible
+
branch/fork
+
time travel
+
scientific model identity
```

---

# 20. 一个统一 Chemical World 不等于一个统一 UI

NOBOOK 当前开放平台把化学至少拆成：

- 无机化学；
- 有机化学；
- 电化学。

历史官方产品又有：

- 3D 分子；
- 晶体结构；
- 演示动画等。

官方手册甚至明确说，有机实验编辑器与无机编辑器的最大区别之一就是没有器材库。

这个产品事实非常重要：

> **化学不同 domain 需要不同 representation。**

ChemRealm 的 “One World, many projections” 不应该被误解成：

> “所有化学都强行放在烧杯拖拽 UI 里。”

更合理的是：

```text
Shared scientific truth / world identity
      ↓
Inorganic bench projection
Organic graph/mechanism projection
Electrochemistry projection
Molecular/crystal projection
Quantitative chart projection
Teacher presentation projection
Student guided projection
```

---

# 21. NOBOOK 的内容库与 Sandbox 是互相喂养的

表面上：

- 精品实验是“预制内容”；
- DIY 是“自由实验”。

实际上二者应该理解为同一个内容工业的两个表面。

每新增/打磨一个经典实验：

- 会逼出新的器材；
- 会逼出新的材料；
- 会逼出新的反应规则；
- 会逼出新的可见现象；
- 会暴露旧模型缺口；
- 会提供可回归的真实教学场景。

因此 ChemRealm 未来也不应该把：

```text
Scenario Library
```

与：

```text
Free Sandbox
```

做成两个互相独立的项目。

Scenario 应成为 Scientific Reality + Material Catalog + World Runtime 的长期 acceptance corpus。

---

# 22. 社区行为揭示“丰富感”本身就是 affordance

社区中长期存在：

- “把所有液体药品加到一起”；
- “制取八大气体”；
- 制作复杂配合物；
- “不管了，加钠”等玩法。

这些内容不证明科学正确性，却强烈证明一个 UX 事实：

> **当 Catalog 足够丰富、组合足够自由、后果足够可见时，用户会自然产生探索冲动。**

这种冲动不是一句“支持自由实验”能够制造出来的。

可以称之为：

> **Affordance through abundance。**

成熟 Chemical World 打开时必须给用户一种：

> “我还能拿这个、那个、再试一个离谱组合”

的感知。

ChemRealm 如果科学内核再严谨，右边长期只有四个材料，用户仍然只会把它视为滴定 demo。

---

# 23. 商业权限也是 NOBOOK Catalog 的一部分，但 ChemRealm 不应该复制

NOBOOK 当前价格页显示：

- 免费版实验资源只开放一部分；
- DIY 器材也只开放一部分；
- 付费/学校版开放更多。

社区也会讨论隐藏/VIP 药品。

因此 NOBOOK 的某些 Catalog 状态包含：

```text
exists
visible / hidden
free / paid
available / locked
```

ChemRealm 的 GOAL 明确禁止付费墙与会员，因此不能复制 entitlement 模型。

但这个 UI 结构可以转化成更科学的 capability 状态：

```text
VERIFIED
SUPPORTED_BUT_NOT_FULLY_VALIDATED
APPROXIMATE
EXPERIMENTAL
MODEL_OUT_OF_DOMAIN
NOT_YET_SUPPORTED
```

这会比“VIP 锁”更符合 ChemRealm 的身份。

---

# 24. 长期版本维护证明：底座好也不会让补药“轻松”

这是对前几轮讨论最重要的修正。

第三方历史版本日志镜像记录了大量极具体的长期调整，例如：

- 增补 KOH 相关反应；
- 调整 Na2CO3 + CuSO4；
- 调整无水 CuSO4 溶解相关问题；
- 优化 Na + H2O + 酚酞；
- 调整 F2 颜色；
- 调整高浓度 H2O2 / KMnO4 等剧烈现象；
- 加强某些爆炸/危险反馈；
- 修破裂试管漏液；
- 修倒液声音延迟；
- 加新反应原理与器材交互。

这些记录是次级来源，不能拿每一条当官方规范；但它们揭示了一种极可信的维护模式：

> **一个成熟的大型药品库，长期成本主要不是“新增名称”，而是 reaction coverage、property data、observable tuning、interaction edge cases、cross-combination regression。**

所以“底座做好以后补药不折磨”必须改成：

> **底座做好以后，可以避免为第 237 种药发明第 237 套软件架构；但第 237 种药仍然可能需要严肃的科学数据、物性、反应域、现象、交互、素材和组合验证工作。**

这是两回事。

---

# 25. 内容规模越大，“组合爆炸”越不可逃避

假设有：

- 200 个 MaterialFamily；
- 100 个 apparatus families；
- 每种材料多个浓度/形态；
- 多种温度/压力；
- 混合、加热、通气、连接等操作；

理论组合数会迅速不可穷举。

因此成熟系统不能依赖：

> “每两瓶药都手工写一个 happy-path 测试”。

ChemRealm 需要机器可读的 coverage model：

```text
MaterialFamily
      ↓
required scientific capabilities
      ↓
model adapter coverage
      ↓
validity domains
      ↓
known observable models
      ↓
reference fixtures
      ↓
combination/property-based tests
```

Catalog 中也不能把“可选”误导成“所有参数下都已验证”。

---

# 26. “自由组合”应该产生验证义务

成熟世界最危险的营销语言是：

> “任何药品任意组合都能反应。”

如果科学模型不能支撑，宁愿明确：

```text
MODEL_OUT_OF_DOMAIN
```

也不能为了“什么都能玩”而给一个看似合理的动画。

ChemRealm 可以定义成熟 Catalog 状态：

| 状态 | 含义 |
|---|---|
| VERIFIED | 该材料/参数域/相关模型有明确 reference validation |
| SUPPORTED | 合同层支持，但特定组合可能没有独立 reference 覆盖 |
| APPROXIMATE | 明确采用经验/教学近似，并展示范围 |
| EXPERIMENTAL | 可以探索，但验证尚不充分 |
| OUT_OF_DOMAIN | 当前模型明确不能可靠回答 |
| UNSUPPORTED | 尚无对应能力 |

这样“丰富度”和“科学可信度”就不必互相欺骗。

---

# 27. NOBOOK 的强项与公开资料无法证明的边界

## 27.1 可以高置信确认

- 有高密度器材/药品 Catalog；
- 固/液/气等分类；
- 多种搜索/索引；
- 器材与药品可实例化进画布；
- 对象有属性设置；
- 对象有独立信息区；
- 场景有独立信息；
- 液体药品浓度可修改；
- 固体/液体取用量可以控制；
- 跟踪反应方程式、T、V、n、c、m 等运行态数据；
- 压强与温度/气体量相关的系统行为；
- 方程式会随实验条件/过程变化；
- 存在速率、化学平衡、压强等产品系统；
- 场景可序列化保存/恢复；
- 编辑器与播放器有不同 UI；
- 移动端在向渐进式/隐藏式工具演进；
- 长期有百量级化学内容与持续更新。

## 27.2 可以合理推断，但不要写成“已证明内部架构”

- Material/Container 至少持有足以驱动运行态 UI 的状态；
- 某些反应规则依赖浓度、温度、时间/进程；
- 某些现象系统依赖材料状态；
- 产物可以继续进入后续实验行为；
- 运行时很可能由规则、数据表、若干系统和专项逻辑共同组成。

## 27.3 公开资料不能证明

- 所有反应由统一 thermodynamic solver 自动预测；
- 所有动力学由统一 kinetic solver 计算；
- 所有浓度相关视觉是连续物性函数；
- 279 个药品等于 279 个独立化学实体；
- 任意两种药品在任意参数下都科学正确；
- 数据追踪字段全部来自统一守恒状态而非多个子系统；
- NOBOOK 有 ChemRealm 同等级的 model provenance；
- NOBOOK 有 deterministic replay、branch/fork、time travel；
- NOBOOK 对模型适用域有用户可见、版本化的严格拒绝机制。

这些恰恰是 ChemRealm 可以建立长期差异的地方。

---

# 28. NOBOOK 的真正产品结构：十二个 surface

综合所有资料，可以把 NOBOOK 无机化学体验抽象成至少十二层：

| Surface | 作用 | 用户问题 |
|---|---|---|
| Resource Catalog | 精品实验、教材资源 | “我要进入哪个实验？” |
| Material/Apparatus Catalog | 器材药品待选区 | “我能拿什么？” |
| Search/Taxonomy | 分类、字母、化学索引 | “我怎么找到它？” |
| Spawn/Instance | 拖拽/点击进入画布 | “这一份现在属于我的世界了吗？” |
| Property Editor | 浓度、器材属性等 | “我要怎么配置它？” |
| Entity Inspector | 容器/器材运行态 | “它现在是什么状态？” |
| Scene Inspector | 场景/环境信息 | “整个世界现在是什么状态？” |
| Interaction Layer | 倒、滴、热、连、摇、混等 | “我能对它做什么？” |
| Reaction Runtime | 当前反应与条件 | “现在发生了什么？” |
| Observable Layer | 颜色、气泡、烟雾等 | “我看到了什么？” |
| Quantitative/Data View | T/V/n/c/m/P 等 | “内部定量状态是什么？” |
| Persistence/Presentation | 保存、加载、演示 | “如何复现/展示这个世界？” |

**这十二层比“右边药品很多”更能描述 NOBOOK 的成熟度。**

---

# 29. 对 ChemRealm 数据模型的直接推论

为了达到上述成熟度，又不复制黑箱逻辑，ChemRealm 至少需要区分：

```text
ChemicalIdentity
      ↓
MaterialFamily
      ↓
StockPreset
      ↓
CatalogEntry
      ↓ instantiate
MaterialInstance
      ↓ held by
ContainerInventory / Contents
      ↓ interpreted by
Scientific Reality
      ↓
Scientific Process State
      ↓
Observable State
      ↓
Visual State
```

## 29.1 ChemicalIdentity

描述稳定的化学身份、components/species/structure 等，不等于试剂瓶。

## 29.2 MaterialFamily

例如 hydrochloric-acid-aqueous，定义：

- composition model；
- valid concentration/temperature ranges；
- physical property sources；
- supported scientific capabilities；
- observable profiles。

## 29.3 StockPreset

为了高中教学和快速操作，例如：

- 稀盐酸；
- 1 mol/L HCl；
- 浓盐酸；

Preset 是快捷参数组，不是独立科学宇宙。

## 29.4 CatalogEntry

决定用户如何发现它：

- 名称；
- 化学式；
- 别名；
- 搜索标签；
- 分类；
- 图标；
- 常用程度；
- curriculum metadata；
- capability/validation badge。

## 29.5 MaterialInstance

进入世界以后具有具体：

- 数量；
- 浓度/配方；
- T/P；
- 当前容器；
- 当前历史；
- 实际组成状态。

## 29.6 ContainerInventory / Contents

世界守恒和拓扑的实体，不应继续依赖“最初是哪瓶药”作为科学真理。

---

# 30. 对 ChemRealm UI 的直接推论

## 30.1 Catalog Drawer

应该回答“我能拿什么”，并支持：

- text/formula/alias/pinyin；
- solid/liquid/gas/apparatus；
- elements/components/ions；
- curriculum/common use；
- recent/favorite；
- scenario recommended；
- validation/capability status。

## 30.2 Spawn / Quick Preset

拖出来时可直接用教学常用 preset，避免每次填参数。

## 30.3 Property Editor

用于改变**可配置初始/操作参数**，例如：

- stock concentration；
- initial volume；
- apparatus size；
- user-controlled setup values。

参数一旦允许修改，必须有明确因果语义：

> 要么真正改变 Scientific/Observable world；要么明确标记为 presentation-only。

## 30.4 Runtime Inspector

只读/解释当前实际状态，不等于 Property Editor。

## 30.5 Reaction / Process Feed

显示当前世界的重要化学过程，但它是 Scientific Reality 的 projection。

## 30.6 World Inspector

用于环境条件、全局时间、分支、世界级状态与诊断。

---

# 31. 内容生产必须升级成“工业流水线”

如果目标是 NOBOOK 级 Catalog 密度，同时还要求 ChemRealm 的 provenance / validity / scientific validation，那么靠 agent 手改 JSON 会失控。

未来应该建立内部 **Chemical Content Production Pipeline**，它是 supporting tooling，不是第五个 runtime core。

理想流程：

```text
Author Chemical Identity
      ↓
Author Material Family
      ↓
Attach property data + provenance
      ↓
Define stock presets
      ↓
Attach scientific capability requirements
      ↓
Attach observable profiles
      ↓
Attach search/curriculum metadata
      ↓
Attach assets
      ↓
Generate reference fixtures
      ↓
Generate compatibility/combination tests
      ↓
Schema + provenance + domain validation
      ↓
Visual regression
      ↓
Catalog publish
```

## 31.1 未来应有 Material Authoring Studio

当内容进入百量级以后，内部工具应该能让作者查看：

```text
Material family
aliases
formula/components
phase
concentration range
stock presets
density/property model
observable model
scientific adapters
provenance
validation status
known unsupported combinations
```

并自动：

- 校验 units；
- 校验 provenance；
- 校验 model coverage；
- 生成 schema artifacts；
- 生成基础 fixtures；
- 提示 orphan references；
- 跑 visual snapshots；
- 跑 cross-combination smoke tests。

---

# 32. 成熟度指标不能再只看“有几个实验”

建议 ChemRealm 以后同时跟踪：

## Catalog 指标

- `chemical_identity_count`
- `material_family_count`
- `stock_preset_count`
- `catalog_entry_count`
- `apparatus_family_count`
- `apparatus_spec_count`

## Scientific coverage

- `validated_domain_count`
- `verified_material_domain_pairs`
- `supported_component_count`
- `supported_phase_count`
- `cross_model_fixture_count`

## World affordance

- `parameterizable_material_ratio`
- `inspectable_container_ratio`
- `continuing_product_coverage`
- `supported_interaction_types`
- `observable_profile_coverage`

## Quality

- `verified_catalog_ratio`
- `known_unsupported_combinations`
- `reference_case_count`
- `visual_regression_coverage`
- `provenance_completeness`

这些数字比“我们也有 300 种药”有意义得多。

---

# 33. “丰富度”必须进入产品质量，而不能永远被当作后期填充

原 ChemRealm GOAL 对科学底座、event sourcing、可视化质量、ACE 的要求非常强，但对下面这件事表达不足：

> **成熟 Chemical World 必须让用户在第一次进入时就感到“这个世界有很多东西可以拿、可以改、可以组合、可以观察”。**

这不是肤浅的 UI KPI。

Catalog abundance 本身就是 world affordance。

因此成熟阶段必须达到：

- 高密度器材与材料；
- 合理规格与常用 preset；
- 强搜索与分类；
- 参数化实例；
- 自由组合；
- 状态可检查；
- 过程可见；
- 产物继续存在；
- 多种可观察反馈；
- 科学能力状态透明。

但早期仍然不应为了数字虚增大量 fake content。

正确路线是：

> **先建可扩展内容管线与可信能力域，再逐步把 Catalog 铺到成熟密度。**

---

# 34. 对 ChemRealm 与 NOBOOK 的重新定位

## 34.1 NOBOOK 已经证明的强项

| 维度 | NOBOOK |
|---|---|
| Catalog breadth | 极强，长期百量级 |
| Apparatus breadth | 极强，多规格、特殊器材 |
| Search/taxonomy | 成熟 |
| Parameterization | 强，至少浓度/用量等 |
| Interaction | 强 |
| Runtime state visibility | 强 |
| Reaction feed | 强 |
| Observable richness | 强 |
| Scenario library | 极强 |
| Long-term content maintenance | 十年以上积累 |
| Mobile/teacher UI differentiation | 已形成 |

## 34.2 公开资料无法证明 NOBOOK 已经做到的东西

| 维度 | 公开证据状态 |
|---|---|
| 可审计统一 Scientific Reality | 未证明 |
| model validity / OOD 语义 | 未证明 |
| provenance first-class | 未证明 |
| independent solver validation | 未证明 |
| deterministic replay | 未证明 |
| branch/fork/time travel | 未证明 |
| reaction feed 与科学状态严格分层 | 未证明 |
| 用户可检查 residual/model/version | 未证明 |

## 34.3 ChemRealm 的终局不能只是“科学更正确的 NOBOOK”

真正目标应该是：

> **NOBOOK 级的内容密度、交互、状态可读性与实验室丰富感**
> **+ ChemRealm 的 Scientific Reality、模型适用域、provenance、可验证性、event replay、branch/counterfactual、ACE。**

任何一边缺失都不是真正终局。

---

# 35. 对当前开发顺序的影响

这份研究不意味着现在应该停止 M4，开始录 300 个药品。

恰恰相反：当前 M4 的科学合同必须继续完成，因为后面几百种材料都会依赖这些基础约束。

但它意味着 acid-base vertical slice 在科学闭环之后，不能长期停留在：

```text
solver input
→ pH number
→ graph
```

第一条真正“像成熟实验世界”的 vertical slice 应尽早验证：

```text
Catalog
→ find reagent/apparatus
→ spawn into world
→ choose/edit meaningful parameter
→ pour/transfer/interact
→ world state changes
→ inspect vessel state
→ watch live process/reaction representation
→ observe visual consequence
→ graph / micro / symbolic projection
→ undo/replay
→ branch and compare
```

如果这条链不成立，ChemRealm 很容易发展成一个后端非常漂亮的化学计算器，而不是 Chemical World。

---

# 36. 更深一层：真正的世界状态绝不是“容器里有哪些药品”

前面的 UI / Catalog / Inspector 调研解决了一个问题：成熟产品如何让用户感受到“这真的是一个实验室”。

继续往下追，会出现更根本的问题：

> **如果右侧 Inspector 真的要持续告诉用户“容器里现在有什么、正在发生什么”，那么 Scientific Reality 不能只保存材料名和匹配到的方程式。**

至少下列状态会改变“下一秒能发生什么”：

- 相态；
- 真实 species / component distribution；
- 溶剂与介质；
- 温度、压强；
- 是否密闭、有无 headspace；
- 容器/导管/盐桥/电极拓扑；
- 加料顺序与历史；
- 搅拌、接触、混合、扩散条件；
- 固体表面积与表面状态；
- 催化剂/钝化状态；
- 已生成中间体、副产物与残余物；
- 当前每个过程的速率/通量；
- 数值上是否已经低于有意义的存在阈值。

因此，一个开放 Chemical World 的核心循环应该更接近：

```text
World State
    ↓
Which phases/interfaces/topologies exist?
    ↓
Which processes are scientifically accessible?
    ↓
Equilibrium + kinetics + transport + energy + electrochemistry ...
    ↓
State evolution
    ↓
New processes become accessible / inaccessible
    ↓
Observable + Inspector + Reaction/Process Feed
```

而不是：

```text
Material names
    ↓
search reaction database
    ↓
choose equation
    ↓
run it to completion
```

这一步是从“NOBOOK-class 产品完整度”走向 ChemRealm 自己 Scientific Reality 的真正分水岭。

---

# 37. 必须再次钉死：教学模式只能解释世界，不能修改世界

这一点来自本轮用户纠正，应视为比“教学模式更简单”强得多的约束。

ChemRealm 可以有：

- Sandbox；
- Guided Learning；
- Challenge/Exam；
- Teacher Presentation；
- Counterfactual Compare；
- Expert Inspection。

但这些模式只能改变：

- 信息显示深度；
- 提示；
- 问题；
- 高亮；
- 哪些量默认折叠；
- 对课本近似的解释；
- 允许用户操作的 UI policy。

它们**不能改变 underlying chemistry**。

例如酸性 KMnO4 / Fe2+ / Cl- 共存时，教学层可以解释：

> “高中题常近似认为 Fe2+ 优先被氧化，因为在当前条件和题目精度下该通道占主导。”

但绝不能在教学模式中实现成：

```text
while Fe2+ > 0:
    disable chloride oxidation
```

然后到了 sandbox 又换另一套化学。

正确关系是：

```text
same Scientific Reality
        ↓
Sandbox: show consequences directly
Teaching: + explain textbook approximation
Challenge: hide some state, ask learner to infer
Expert: expose fluxes/models/validity
```

**There is no pedagogical chemistry engine. There is only the Chemical World.**

---

# 38. 相态决定可达性：Na2CO3(s) + CaCl2(s) 是极好的架构测试

用户给出的例子非常重要：把碳酸钠固体和氯化钙固体一起倒进普通容器，在常温普通条件下，不能直接把它们当作水溶液中的 Ca2+ 与 CO3^2- 结算沉淀。

幼稚实现会写：

```text
Na2CO3 present
CaCl2 present
→ lookup: CaCO3 precipitation
→ white precipitate
```

正确的世界首先应该看到：

```text
solid phase A: Na2CO3(s)
solid phase B: CaCl2(s)
no bulk aqueous phase
```

此时“水相离子沉淀”通道并没有满足必要前提。

倒水之后，才依次出现：

```text
water phase created
→ salts dissolve at their supported rates/equilibria
→ aqueous species appear
→ speciation changes
→ ion activity product may exceed precipitation condition
→ CaCO3 solid becomes thermodynamically/kinetically accessible
```

这说明成熟 runtime 至少需要区分：

- **chemical identity exists**；
- **reactive species exists in the required phase**；
- **interface/contact exists**；
- **process is accessible**；
- **process is thermodynamically favorable**；
- **process is kinetically relevant**。

不能把这些压缩成“方程式有没有”。

同时也不能反向写死“两个固体永不反应”。高温固相反应、机械化学、界面扩散等又是另一套模型域。因此更准确的语义是：

> **在当前模型、相态、条件与拓扑下，没有可达的已支持反应通道。**

而不是“化学上绝不可能”。

---

# 39. NOBOOK 自己的资源已经暴露“加料顺序/历史”不可忽略

NOBOOK 官方“碘仿反应”资源是一个非常强的例子：

- 先向 I2-KI 中加入有机物，再加 NaOH，能获得预期反应；
- 如果先加 NaOH，体系中的氧化性碘物种会进一步转化，现象可能明显变弱；
- 乙酸乙酯在温度过高时会先碱性水解，生成乙醇，而乙醇又能进入后续碘仿反应。

官方资源：
https://hx.nobook.com/console/templates/resource/2904_ab21301197228dc6f8115a7079e4264d/

这个例子同时证明三个世界原则：

1. **最终“药品名字集合”相同，不代表当前科学状态相同。**
2. **加料顺序会改变中间 species，从而改变后续 reaction network。**
3. **上一步产物会自动成为下一步反应物。**

因此 event sourcing 对 ChemRealm 的价值远不只是 undo/redo。

在某些化学体系中：

> **history is scientific state.**

这也意味着“导入一个最终 composition snapshot”和“重放真实操作历史”有时可能对应不同的动力学/表面/拓扑状态；架构必须知道自己承诺的是哪一种语义。

---

# 40. Topology is Scientific State：盐桥、电路、密闭、导管都不是 UI 装饰

NOBOOK 官方锌铜原电池资源明确要求盐桥和导线连接；取出盐桥后，电流计回零：
https://hx.nobook.com/console/templates/resource/2498_f77ac90f0cd906aec7a5cfbf1b1a9e02

物质几乎没有变，但可达过程改变了。

因此：

```text
Zn + CuSO4 + ZnSO4 + Cu
```

不是完整 scientific state。

还需要：

```text
electronic path
ionic path
which electrode touches which phase
salt bridge present?
switch open/closed?
```

同理，NOBOOK 的氨喷泉、空气中氧气含量测定、铁锈蚀压力变化等资源又证明：

- open / sealed；
- headspace；
- 导管连接；
- 止水夹；
- 气体吸收/消耗；

都会影响压力和后续宏观现象。

官方资源：

- 氨喷泉：https://hx.nobook.com/console/templates/resource/2971_c985f3bd60ab3d96b85bef2de32646c8
- 空气中氧气含量：https://hx.nobook.com/console/templates/resource/460_21aad64f4fe6aff318e62276e627546a
- 铁的锈蚀：https://hx.nobook.com/console/templates/resource/3539_5da01ea2-c1e3-4aee-adf7-0e821e4b1df7

由此得到的架构结论是：

> **Container state 必须包含 topology / boundary condition，而不仅是 contents。**

---

# 41. “主反应先发生”不是 Scientific Reality 的一般规则

用户给出的第二个例子更深：酸性环境中同时存在 KMnO4、Fe2+、Cl-。

高中解题常会把它压缩成“还原性强的先反应”。这种叙述可以作为一定条件和精度下的教学近似，但不能变成 Chemical World 的调度器。

IUPAC 对 simultaneous / parallel reactions 的定义本身就包含“多个物质竞争共同反应物”的情况：
https://goldbook.iupac.org/terms/view/S05680

现代 kinetics engine 的通用结构也不是“排序后执行”。Cantera 的 Kinetics 层直接计算：

- forward rates of progress；
- reverse rates of progress；
- net rates of progress；
- 每个 species 的 creation / destruction / net production rates。

文档：
https://www.cantera.org/dev/python/kinetics.html

因此更合理的数学语义是：

```text
r1(t) = MnO4-/Fe2+ channel
r2(t) = MnO4-/Cl- channel
r3(t) = chlorine-species/Fe2+ channel
...
```

共同通过 stoichiometric matrix 改变 state：

```text
dn/dt = N · r
```

当 `r1 >> r2` 时，可以说“R1 主导”；不能因此令 `r2 = 0`，除非一个明确、经验证的 reduced model 就是这样近似的。

这与教学模式的关系应该是：

```text
Scientific Reality: all supported non-negligible channels evolve
Pedagogical projection: explain why one channel dominates / why textbook neglects another
```

而不是两套 chemistry。

---

# 42. 副产物会回头改变主网络：Cl2 / Fe2+ 只是一个代表

继续用户例子：如果 Cl- 的副氧化产生了含氯氧化性 species，它们不应该被 renderer 直接当成“已经生成、就此结束”的气体。

世界必须重新评估：

- 它是否留在水相；
- 是否发生水相 speciation；
- 是否继续氧化 Fe2+；
- 是否向 headspace 转移；
- 是否逸出；
- 是否与其他组分继续反应。

因此 reaction graph 是动态重建的：

```text
state changes
→ new species / phase appears
→ accessibility graph changes
→ new processes start
→ those processes modify state again
```

IUPAC 的 composite mechanism 定义明确包含：

- parallel/simultaneous；
- opposing；
- consecutive；
- feedback。

https://goldbook.iupac.org/terms/view/C01210

所以 ChemRealm 的核心抽象应当是 **process network**，不是“一个主方程式 + 若干装饰副反应”。

---

# 43. 平衡与动力学必须分层：equilibrium is not history

这是另一个极容易伪造“看起来科学”的地方。

如果 equilibrium solver 算出最终：

```text
A = ...
B = ...
solid phase = ...
```

它并没有自动告诉我们：

- 哪条反应先发生；
- 过了多少毫秒；
- 有没有 transient intermediate；
- 沉淀何时 nucleate；
- 气体何时开始冒泡；
- 哪个路径贡献了多少 cumulative extent。

PHREEQC 的成熟设计非常有参考价值：它允许 equilibrium assemblage 与 KINETICS 同时存在；kinetic rate 被按时间积分，而每个动力学增量又会重新做 equilibrium calculation。

- KINETICS：https://water.usgs.gov/water-resources/software/PHREEQC/documentation/phreeqc3-html/phreeqc3-24.htm
- Fe(II) oxidation example：https://water.usgs.gov/water-resources/software/PHREEQC/documentation/phreeqc3-html/phreeqc3-71.htm

因此 ChemRealm 长期更合理的结构是：

```text
fast / constrained equilibrium layer
+
explicit kinetic processes
+
phase / transport / energy coupling
```

而不是“一个 solver 负责一切”。

UI 上同样要区分：

- equilibrium shift；
- explicit kinetic reaction flux；
- phase transfer；
- transport flux；
- pedagogical equation。

不能把它们都叫“正在发生的反应”。

---

# 44. Physical chemistry quantities 必须真正耦合

NOBOOK 自己已经通过大量实验给用户建立了这种期待：

- 氨溶于水 → 压强下降 → 喷泉；
- O2 被消耗 → 压强下降 → 水进入集气瓶；
- 铁锈蚀耗氧 → 压强变化；
- NaOH 潮解 → 吸水、逐渐溶解；
- Ba(OH)2 + H2SO4 → species 数量变化 → 电导率先降后升；
- 明矾 → Al(OH)3 胶体 → 吸附/絮凝/沉降。

相关官方资源：

- NaOH 潮解：https://hx.nobook.com/console/templates/resource/376_8c74c71d868bde02559727da2a0505de
- 稀硫酸与 Ba(OH)2：https://hx.nobook.com/console/templates/resource/2970_a9a8409001161922f67ebb5c98f837b4
- 明矾净水：https://hx.nobook.com/console/templates/resource/2697_5fc76c609304d71d3bbd58759f7b14b1

ChemRealm 因此不能把 Inspector 的：

```text
mass
amount
volume
concentration
T
P
```

当成六个互不相关的文本字段。

它们必须来源于同一 scientific state，并在模型支持范围内互相反馈。

这也是为什么 NOBOOK 的 Inspector 值得研究：**一旦产品敢把这些量同时摆给用户，它就隐含承诺这些量彼此不应该自相矛盾。**

---

# 45. 还需要系统发掘的 process families

从 NOBOOK 的资源库和更一般的 scientific-runtime 需求继续向外推，可以整理出一套“世界完整度”问题族。它们不是要求第一版全部实现，而是防止架构只围绕水溶液方程式生长。

## 45.1 Dissolution / precipitation / crystallization

不能只有“固体存在/不存在”。需要考虑：

- 溶解平衡；
- 溶解速率；
- 表面积；
- supersaturation；
- nucleation/induction；
- crystal growth；
- redissolution；
- complexation 造成的沉淀再溶解。

NOBOOK 的 Cl- 检验资源已经表现“Ag2CO3 先沉淀，酸加入后又消失/转化并放气”：
https://hx.nobook.com/console/templates/resource/347_6f0f3e3db01a5ff28e0bb121f56f48a0/

## 45.2 Colloid / suspension / adsorption / settling

Al(OH)3 胶体不是普通“沉淀 amount”。至少产品层会涉及：

- turbidity；
- adsorption；
- flocculation；
- settling。

## 45.3 Gas generation / dissolution / headspace / escape

“生成多少气体”不能等价于“已经从容器逸出多少气体”。至少应区分：

- dissolved species；
- dissolved molecular gas；
- bubble phase；
- headspace gas；
- vented/escaped amount。

PHREEQC 的 GAS_PHASE 本身就把 fixed pressure / fixed volume multicomponent gas phase 与 aqueous phase equilibrium 分开：
https://water.usgs.gov/water-resources/software/PHREEQC/documentation/phreeqc3-html/phreeqc3-17.htm

## 45.4 Mixing / diffusion / local concentration

“同一容器”不代表瞬间 perfect mixing。

滴加高浓度试剂时，局部区域可能先形成：

- local precipitation；
- local complexation；
- local redox；
- local pH excursion。

第一代可以明确采用 well-mixed assumption，但必须把它当作**模型假设**而不是世界真理。

PHREEQC 甚至提供 transport/diffusion 模型：
https://water.usgs.gov/water-resources/software/PHREEQC/documentation/phreeqc3-html/phreeqc3-56.htm

## 45.5 Heat / temperature feedback

反应放热或吸热会反过来改变：

- rate constants；
- equilibrium；
- solubility；
- gas pressure；
- vapor pressure；
- phase state。

## 45.6 Surface state / particle morphology / passivation

同样是 Fe 或 Al：

- powder；
- wire；
- plate；
- oxide-coated；
- freshly polished；
- passivated；

可能表现完全不同。

因此 `amount` 远远不够表达所有 solid MaterialInstance。

## 45.7 Catalyst state

催化剂不是简单 `rate *= 2`。成熟体系会遇到：

- catalyst amount；
- surface area；
- poisoning；
- deactivation；
- temperature dependence。

## 45.8 Electrochemistry

“电势强弱表”不能替代：

- circuit topology；
- ionic path；
- partial currents；
- overpotential；
- electrode area；
- mass transport。

## 45.9 Environmental reservoir

开放容器中的空气不能永远是背景图。

NOBOOK 的 NaOH 潮解、铁锈蚀已经在教学内容上体现：

- H2O from air；
- O2 from air；
- pressure consequence。

长期还可能需要：

- humidity；
- ambient O2/CO2；
- ventilation；
- evaporation。

---

# 46. Reaction Feed 应升级为 Process Feed / Causal Feed

NOBOOK 已经证明“用户想知道正在发生什么”。ChemRealm 不应该丢掉这一产品优势，但要把科学语义做得更严格。

建议内部不是：

```text
currentReaction = "Fe2+ + MnO4- ..."
```

而是：

```text
activeProcesses[]
- process id
- type: equilibrium / kinetic / phase-transfer / transport / thermal / electrochemical ...
- rate / flux / state-change metric where meaningful
- cumulative extent where uniquely defined
- confidence / model
- visibility classification
```

Representation Engine 再投影成：

```text
主要过程
少量副过程
正在建立平衡
气体正在逸出
沉淀正在形成
温度正在上升
```

高级 Inspector 可以进一步显示：

```text
R1 net rate
R2 net rate
gas-transfer flux
heat generation rate
saturation index
...
```

教学模式则可以在这个真实 Process Feed 上增加：

> “为什么课本把 R2 忽略？”

这完全符合“同一世界，多种 projection”。

---

# 47. 容器信息栏必须有“物质存在阈值”，但绝不能只有一个 magic epsilon

用户提出了一个非常实际、而且必须尽早设计的问题：

> 如果一个物质被反应消耗后，浮点数里还残留 `1e-30 mol`、`1e-20 mol` 一类数值，右侧信息栏会出现“物质永远不消失”。

这是一个真实的 Scientific UX 问题。

但是简单写：

```text
if n < 1e-16 mol:
    delete species
```

仍然不够安全，因为“数值上当作零”“科学世界认定该 inventory 不存在”“普通 UI 不显示”“observable 看不见”其实是四五件不同的事。

## 47.1 参考科学软件也明确区分不同 tolerance

PHREEQC 的 `KNOBS` 明确区分：

- `convergence_tolerance`：判断方程组是否收敛；
- `tolerance`：优化求解器认为一个数等于零的尺度。

其文档指出，后者在多数计算机/模拟中可处于约 `1e-12 ~ 1e-15` 的数量级，但这是**数值求解器语义**，并不是“ChemRealm 容器里低于多少 mol 就应该删除”。

https://water.usgs.gov/water-resources/software/PHREEQC/documentation/phreeqc3-html/phreeqc3-25.htm

PHREEQC 还明确提到 very small concentration 会引入 roundoff / scaling 问题；历史文档讨论过约 `1e-15 molal` 附近的数值尺度问题。这进一步说明不能随意把一个数字推广到所有量纲和世界尺度。

Cantera ReactorNet 也有 relative / absolute integration tolerance，当前文档默认 scalar absolute tolerance 可到 `1e-15` 量级：
https://www.cantera.org/dev/python/zerodim.html

SUNDIALS/CVODE 的建议更直接：当某个状态量衰减到接近零时，纯相对误差控制会失去意义，absolute tolerance 应设置到“再小就属于 noise / 不感兴趣”的尺度；不同变量有不同 noise level 时，应使用 vector absolute tolerances。

https://sundials.readthedocs.io/en/v6.1.1/cvode/Usage/

这些成熟工具共同支持一个结论：

> **不存在一个可以同时承担 solver、world、UI、observable 全部语义的 universal epsilon。**

## 47.2 ChemRealm 至少需要五类阈值

建议架构上区分：

### A. Solver numerical tolerance

求解器内部：

- convergence；
- integration error；
- optimization “zero”；
- Newton residual 等。

这是 model/solver 的数值参数。

### B. World semantic-zero / retention threshold

回答：

> 一个显式的 reagent inventory、phase amount、kinetic reactant amount 低到什么程度后，可以在 authoritative world state 中规范化成 0？

这是用户提出“物质要真的消失”的核心层。

### C. Process activity threshold

回答：

> 一个 flux/rate 小到什么程度后，Process Feed 不再把它标为 active？

注意：这不一定意味着 Scientific Reality 不计算它。

### D. Inspector display threshold

回答：

> 普通右侧信息栏什么时候不再显示一个 trace quantity？

高级/科学 Inspector 可以选择显示更多 trace state。

### E. Observable threshold

回答：

> 多小的变化用户在视觉/声音模型中已经无法观察？

例如极微量气体生成 ≠ 一定应该产生肉眼可见气泡。

## 47.3 “不存在”还要区分 derived species 和 conserved inventory

这是特别重要的一层。

在 equilibrium model 里，某些 species 的量可能永远是极小但非零的数学平衡结果。它们通常不应该成为“容器物质列表”里的独立 MaterialInstance。

更合理的是：

```text
Container conserved/components
    ↓ equilibrium solve
Derived species distribution
```

普通 Inspector 可以只显示有意义的 components/materials/major species；Scientific Inspector 才显示 trace species。

而一个显式加入的 reagent / explicit kinetic inventory 如果被消耗到 semantic-zero，则可以在完成守恒 reconcile 后 canonicalize 到 0，从普通 inventory 移除。

这样既满足“物质不要永生”，又不会因为 UI 清理把 equilibrium chemistry 砍坏。

## 47.4 阈值必须确定性、版本化、有 hysteresis

如果：

```text
show if n > 1e-X
hide if n < 1e-X
```

而数值在阈值附近来回跳，UI 会闪烁。

因此 display/process activation 可能需要 hysteresis：

```text
hidden -> visible only if n > epsilon_on
visible -> hidden only if n < epsilon_off
where epsilon_on > epsilon_off
```

世界 semantic-zero 则应在稳定的 canonicalization boundary 上执行，并参与 replay/hash 规范。

## 47.5 阈值不能破坏守恒

任何 pruning/canonicalization 必须验证：

- elemental balance；
- charge/accounting policy；
- phase totals；
- deterministic replay；
- migration compatibility。

如果把 `1e-16 mol` 直接删除会导致多个小项长期累积成可观误差，那么策略就是错的。

可能需要：

- 把残余折回 conserved component ledger；
- 只删除 derived cache，不删除 conserved total；
- 对不同 quantity 使用不同尺度；
- 采用 absolute + relative criterion；
- 对 repeated pruning 做累计误差审计。

## 47.6 现在不应该写死 `10^-16 mol`

用户明确说这个数字只是随口举例，这是正确态度。

最终阈值应该通过：

- 模型数值精度；
- double/long-double/WASM 数值行为；
- 典型容器量级；
- 最小实验可见量级；
- reference solver sensitivity；
- replay determinism；
- conservation error budget；

共同定标。

因此 GOAL 只规定：

> **必须存在显式的 numerical-existence policy，不能让 numerical ghost 永生；具体阈值由后续 spec + evidence 定。**

---

# 48. Inspector 与 Process Runtime 应该互相校验

如果用户点开容器右侧信息栏看到：

```text
Fe2+     0.0000...
Fe3+     ...
Cl-      ...
Cl2      ...
T        ...
P        ...
```

而下面 Process Feed 写：

```text
Fe2+ oxidation complete
```

这两者不能互相打脸。

因此 Runtime Inspector 不能只是 UI query；它应该成为 Scientific Reality 的一个**公开审计面**。

建议每个可检查量都能追到：

```text
world authoritative state
or
scientific derived state
or
observable derived state
```

而不是“这个数字是 UI 自己算的”。

可以进一步建立 invariants：

- Process Feed 说 consumed → inventory 应随之变化；
- phase disappears → Inspector 不应仍显示其 bulk phase；
- gas escapes → headspace/escaped ledger 应一致；
- semantic-zero → normal inspector 不再出现；
- trace derived species → expert view 可出现，normal view 可隐藏；
- reaction heat → temperature trace 必须有一致来源。

这会让 Inspector 本身变成非常强的自动测试入口。

---

# 49. World Completeness Matrix：以后不再靠“想到一个特殊例子补一个 if”

前面所有问题可以抽象成一张完整度矩阵：

| 世界维度 | 幼稚实现 | ChemRealm 成熟语义 |
|---|---|---|
| Composition | 看药品名 | components + species + inventories |
| Phase | 固体也按离子反应 | explicit phases + phase accessibility |
| Topology | 同容器自动反应 | contact/interface/connections/boundaries |
| History | 最终成分相同即同状态 | event-derived chemical/surface state |
| Order | 加料顺序无意义 | temporal accessibility/network change |
| Competition | 强弱排序 if/else | simultaneous supported fluxes |
| Consecutive chemistry | 产物是终点 | network regenerates dynamically |
| Equilibrium | 终态冒充过程 | equilibrium distinct from kinetic history |
| Temperature | 用户设定数字 | energy-coupled state variable |
| Pressure | 读数装饰 | gas/headspace/topology coupled state |
| Gas | 生成即逸出 | dissolved/bubble/headspace/escaped |
| Precipitate | Q>Ksp 瞬间完成 | stability + possible kinetics/nucleation |
| Colloid | 全都叫固体 | colloid/suspension/adsorption/settling |
| Surface | Fe 就是 Fe | area/coating/passivation/history |
| Catalyst | 固定倍速 | pathway + catalyst state where modeled |
| Mixing | 瞬间均匀 | declared mixing/transport model |
| Electrochemistry | 电势排序 | circuit + ionic path + currents + transport |
| Environment | 空气是背景 | open-system reservoirs/fluxes |
| Observable | substance→effect | scientific state → observable model |
| Numerical presence | >0 永远存在 | explicit semantic-zero/display policy |
| Inspector | 静态原料信息 | live audit projection of world state |
| Teaching | 简化世界 | same world + pedagogical explanation |

这张矩阵应该长期成为 architecture / scenario / model review 的检查表。

---

# 50. 对 NOBOOK 的重新评价：它最深的价值是逼我们看见“运行态实验 UI”

继续调研以后，NOBOOK 最值得 ChemRealm 学的并不是某一个 reaction rule，而是它已经让用户形成了一组非常高的产品预期：

> 拖进来的东西会活；容器内部有状态；量会变；温度和压强会变；反应信息会更新；产物会留下；装置连接会影响结果；浓度/取用量不是纯标签；错误操作会有后果；用户可以一直继续玩。

公开资料仍然不能证明 NOBOOK 的底层对所有这些场景都有统一、严格、可审计的 scientific solver。

因此 ChemRealm 的策略不是复制它的未知实现，而是：

1. **接受这些 UX expectation 已经被成熟产品验证；**
2. **把它们重新建立在更严格、可验证的 Scientific Reality 上；**
3. **对目前无法定量正确模拟的部分明确 OOD / qualitative / empirical confidence，而不是假装万能。**

---

# 51. 结合当前本机开发工具：这套目标并非只能停留在架构幻想

用户提供的《开发工具清单(8).txt》显示，当前 Windows 工作站已经具备非常完整的多语言、科学验证、原生性能与浏览器测试工具链。

这里不建议把具体版本写进项目宪法；版本会变化。真正有价值的是**能力映射**。

## 51.1 TypeScript / Node / browser stack

适合：

- schema / contract；
- World Runtime；
- Catalog / Inspector / Process Feed；
- deterministic serialization；
- browser UI；
- web-worker / WASM integration；
- unit/integration tests。

当前已经有 Node、pnpm、TypeScript、bun 等，不需要为了“科学”把整个产品换栈。

## 51.2 Python

适合：

- scientific oracle/reference harness；
- PHREEQC/Cantera 等 external solver adapters 的离线验证；
- 数据清洗与 provenance；
- parameter fitting；
- tolerance sweep；
- Monte Carlo / sensitivity analysis；
- regression fixture 生成。

多 Python 版本 + uv 允许给不同科学依赖隔离环境，而不是污染全局。

## 51.3 Rust / C / C++ / WASM

当前已有 Rust、MSVC、GCC、Clang、CMake、Ninja。

这意味着如果未来 profiling 证明：

- reaction-network integration；
- sparse linear algebra；
- heavy speciation；
- geometry/particle computation；

在 TS/WebAssembly 边界上成为瓶颈，可以把**经过验证的 kernel**下沉 Rust/C++。

但原则应当是：

> **profile first, native later.**

不能因为工具齐全就提前重写。

## 51.4 CUDA / RTX 4090

GPU 可以用于：

- massive parameter sweeps；
- offline fitting；
- large batch validation；
- future parallel scientific workloads if truly suitable。

但单个交互式小容器的 stiff ODE/DAE 并不天然适合 GPU。CUDA 不是“科学更强”的象征。

## 51.5 Docker / WSL2

非常适合固定：

- external solver version；
- scientific database version；
- compiler/runtime；
- validation environment。

这能延续 M4 已经建立的“solver/database identity”思想。

## 51.6 SQLite / PostgreSQL

ChemRealm 仍然是 local-first。

- IndexedDB/SQLite 类工具适合本地 catalog、authoring data、fixtures、diagnostic packages；
- PostgreSQL 已安装，不代表项目现在需要服务器数据库。

## 51.7 Chrome / agent-browser / FFmpeg

可以形成非常强的 UI evidence pipeline：

```text
spawn world
→ manipulate apparatus
→ inspect container
→ capture state
→ compare visual baseline
→ record interaction video
```

NOBOOK 的优势大量来自“世界活着”的感知，所以 visual/interaction regression 必须像 scientific regression 一样认真。

## 51.8 CodeQL / clang-tidy / multiple compilers / actionlint

Process Runtime 后期一旦引入 native/WASM、复杂 state machine 和大量 serialization，静态分析与多编译器测试价值会显著增加。

## 51.9 工具链最终原则

最合理的长期分工不是“选一个最强语言”，而是：

```text
TS/Web → product/world/UI contracts
Python → scientific validation/oracles/data
Rust/C++ → only proven hot kernels/adapters
Docker/WSL → reproducibility
Chrome/agent-browser/FFmpeg → interaction evidence
CodeQL/compilers → engineering verification
```

这已经足够支持当前 GOAL，不需要为了未来可能存在的复杂 process runtime 先搭过度分布式基础设施。

---

# 52. 修订后的 GOAL 应长期锁定的原则

基于 NOBOOK 调研、用户实际观察，以及本轮 process-runtime 深挖，以下原则已适合进入项目宪法：

1. **One scientific truth layer.** 教学模式只能解释/投影，不能改变 underlying chemistry。
2. **Material abundance is a product requirement.** 成熟产品必须 materially abundant。
3. **CatalogEntry is not WorldState.** 模板、预设、实例、内容物、科学状态分层。
4. **Parameterization must have causal meaning.** 可编辑浓度/量/T/P 不能是假按钮。
5. **World evolves from processes, not equation lookup.** 方程式不是 state mutation authority。
6. **Phase/topology/history determine accessibility.** “药品都在”不代表反应路径存在。
7. **Competing processes are simultaneous by default.** 不能一般性用强弱顺序 if/else。
8. **Products continue in the world.** 产物/中间体会重新参与网络。
9. **Equilibrium is not history.** 没有 kinetics 就不能编造时间路径。
10. **Physical quantities are causally coupled.** m/n/V/c/T/P/phase/headspace 不是独立读数。
11. **State must be inspectable.** Inspector 是 world 的审计投影。
12. **Process must be visible but not become truth.** Reaction Feed 应来自 process state。
13. **Numerical existence needs explicit semantics.** 不能让 ghost substances 永生，也不能用 UI epsilon 破坏科学状态。
14. **Thresholds are layered.** solver/world/process/display/observable 阈值分离。
15. **Consequence before judgement.** 物理/化学后果先于教学评分。
16. **Free combination creates validation obligation.** 能拖在一起不等于已经科学支持。
17. **World feedback quality is product quality.** 气泡、烟雾、沉淀、破损、声音等不能永远留在 polish backlog。
18. **Content production is engineering.** 百量级 Catalog 必须有 authoring/provenance/regression pipeline。
19. **One World does not mean one UI.** 教师、学生、演示、移动、无机、有机、电化学允许不同 projection。
20. **Tooling follows evidence.** Python/native/GPU 都是实现与验证工具，不是 scientific authority。

---

# 53. 来源索引与证据说明

以下来源分成 NOBOOK 产品证据与 Scientific Runtime 参考。NOBOOK 来源用于回答“成熟产品做了什么/用户期待什么”；科学软件/IUPAC 来源用于回答“ChemRealm 若想做得更真实，底层应遵循什么”。两类证据不能混为一谈。

## A. NOBOOK 当前官方与开放平台

### A1. 当前官网

https://www.nobook.com/index.html

支持：当前化学仍宣传速率、化学平衡、压强等系统。营销用语不能自动等同学术 solver。

### A2. 当前化学资源库

https://hx.nobook.com/

支持：教材/章节/知识点/资源类型、精品实验和长期内容密度。

### A3. 当前公开化学编辑器

https://hx.nobook.com/chemical/new?moduleId=9

支持：右侧 Catalog、分类、器材长尾。

### A4. 开放平台实验 API

https://open.nobook.com/docs/2.0/tutorial-integration/experimental-integration/phy-or-chem-integration/

支持：编辑器/播放器、`getData`/`setData` JSON scene、右侧器材库等。

### A5. UI 组件

https://open.nobook.com/docs/2.0/tutorial-integration/experimental-integration/phy-or-chem-integration/CustomUI

支持：`rightToolbarVisible`、`settingsMenuVisible`、`infoVisible`、底栏等独立 surface；有/无器材库时 info layout 不同。

## B. NOBOOK 历史官方与规模

### B1. 化学产品介绍

https://nobook-doc-cdn.nobook.com/chem/NB%E5%8C%96%E5%AD%A6%E5%AE%9E%E9%AA%8C%E4%BA%A7%E5%93%81%E7%AE%80%E4%BB%8B.html

支持：历史器材/药品规模、液体浓度设置、实时反应数据等。

### B2. 化学实验界面与功能

https://nobook-doc-cdn.nobook.com/chem/NB%E5%8C%96%E5%AD%A6%E5%AE%9E%E9%AA%8C%E7%95%8C%E9%9D%A2%E5%8F%8A%E7%9B%B8%E5%BA%94%E5%8A%9F%E8%83%BD%E7%89%B9%E6%80%A7%E8%AF%B4%E6%98%8E.html

支持：编辑/演示、Catalog 检索、器材属性、器材信息、场景信息。

### B3. 历史规模宣传

https://www.nobook.com/view/410

支持：历史 112 器材、253 药品、150 经典实验等口径。

## C. NOBOOK 采购规格与应用证据

### C1. 2025 明确 NOBOOK / 北京乐步的采购技术规格

政府采购公开文件。

支持：百量级器材/药品、固液气/元素离子检索、精确取用、热力学/压强、方程式/T/V/n/c/m 数据追踪等。

### C2. 2019 学校采购公开镜像

https://www.bidcenter.com.cn/newscontent-73037429-4.html

支持：历史 122 器材、279 药品等口径，说明数字随版本/套餐变化。

### C3. 乙醇消去教学应用

https://jiqunzhihui.org.cn/m/view.php?aid=13076

支持：条件/温度/时间变化时反应展示变化，用量与剩余量等应用记录。

## D. NOBOOK “世界状态依赖”代表资源

### D1. 碘仿反应——顺序/温度/连续反应

https://hx.nobook.com/console/templates/resource/2904_ab21301197228dc6f8115a7079e4264d/

### D2. 锌铜原电池——salt bridge/topology

https://hx.nobook.com/console/templates/resource/2498_f77ac90f0cd906aec7a5cfbf1b1a9e02

### D3. 氨喷泉——气液吸收/压强

https://hx.nobook.com/console/templates/resource/2971_c985f3bd60ab3d96b85bef2de32646c8

### D4. 空气中氧气含量——耗气/压强/进水

https://hx.nobook.com/console/templates/resource/460_21aad64f4fe6aff318e62276e627546a

### D5. 铁锈蚀——环境反应/长期压力变化

https://hx.nobook.com/console/templates/resource/3539_5da01ea2-c1e3-4aee-adf7-0e821e4b1df7

### D6. Cl- 检验——沉淀/酸溶/放气/干扰

https://hx.nobook.com/console/templates/resource/347_6f0f3e3db01a5ff28e0bb121f56f48a0/

### D7. NaOH 潮解——环境水分/溶解/放热

https://hx.nobook.com/console/templates/resource/376_8c74c71d868bde02559727da2a0505de

### D8. Ba(OH)2 + H2SO4——电导率实时 observable

https://hx.nobook.com/console/templates/resource/2970_a9a8409001161922f67ebb5c98f837b4

### D9. 明矾净水——胶体/吸附/沉降

https://hx.nobook.com/console/templates/resource/2697_5fc76c609304d71d3bbd58759f7b14b1

## E. Scientific Runtime 参考

### E1. IUPAC simultaneous reactions

https://goldbook.iupac.org/terms/view/S05680

支持：多个竞争过程可以同时消耗共同 reactant。

### E2. IUPAC composite mechanism

https://goldbook.iupac.org/terms/view/C01210

支持：parallel / opposing / consecutive / feedback 等机制类别。

### E3. Cantera kinetics

https://www.cantera.org/dev/python/kinetics.html

支持：rates of progress、species creation/destruction/net production 等 reaction-network 语义。

### E4. PHREEQC KINETICS

https://water.usgs.gov/water-resources/software/PHREEQC/documentation/phreeqc3-html/phreeqc3-24.htm

支持：显式 kinetic rate、Runge-Kutta / stiff solver、integration tolerance。

### E5. PHREEQC gas phase

https://water.usgs.gov/water-resources/software/PHREEQC/documentation/phreeqc3-html/phreeqc3-17.htm

支持：multicomponent gas phase 与 aqueous/solid/surface 等平衡。

### E6. PHREEQC transport

https://water.usgs.gov/water-resources/software/PHREEQC/documentation/phreeqc3-html/phreeqc3-56.htm

支持：transport/diffusion 与 chemistry 联合建模思路。

### E7. PHREEQC numerical KNOBS

https://water.usgs.gov/water-resources/software/PHREEQC/documentation/phreeqc3-html/phreeqc3-25.htm

支持：convergence tolerance 与 numerical zero tolerance 是不同语义；小数值会带来 scaling/roundoff 问题。

### E8. Cantera ReactorNet absolute/relative tolerance

https://www.cantera.org/dev/python/zerodim.html

支持：ODE integration 使用独立相对/绝对容差。

### E9. SUNDIALS/CVODE tolerance guidance

https://sundials.readthedocs.io/en/v6.1.1/cvode/Usage/

支持：接近零的状态需要 absolute tolerance，且不同变量可以有不同 noise floor。

## F. 本机实现能力来源

用户提供：`开发工具清单(8).txt`（2026-09-08 修订）。

当前能力包括现代 TypeScript/Node、多个 Python、Rust、MSVC/GCC/Clang、CUDA、CMake/Ninja、Docker/WSL2、SQLite/PostgreSQL、Chrome、agent-browser、FFmpeg、CodeQL 等。

本文只把它们映射为可行的 implementation/validation roles；具体版本不属于 ChemRealm 的长期产品宪法。

---

# 54. 最终结论

几轮 NOBOOK 调研之后，问题已经从“它有多少药品”逐层深化：

```text
药品很多
↓
Catalog 很成熟
↓
拖出来的是 stateful instance
↓
容器状态能 inspect
↓
过程/反应实时反馈
↓
相态、拓扑、温度、压强、历史决定过程能否发生
↓
多个过程会同时竞争、连续、反馈
↓
数值世界还必须定义什么叫“已经不存在”
```

因此 ChemRealm 的终局不能只是：

> “做一个更科学的虚拟实验 UI。”

更准确的是：

> **构建一个高密度、可操作、可检查的 Chemical World；这个世界由相态、拓扑、历史与条件决定可达过程，由热力学/动力学/输运/能量等模型共同推进，并把真实状态以渐进式 Inspector、Process Feed 和 Observable 投影给用户。教学只解释这个世界，不改写它。**

NOBOOK 已经证明：

- 丰富 Catalog 很重要；
- world objects 必须“活”；
- state legibility 很重要；
- 用户想看到实时数据与正在发生的过程；
- 长期产品需要庞大的内容工业。

ChemRealm 必须进一步解决 NOBOOK 公开资料没有证明解决的部分：

- 可审计 Scientific Reality；
- phase/topology/history-aware process accessibility；
- simultaneous competing processes；
- equilibrium/kinetics/transport 分层；
- explicit model validity；
- provenance；
- deterministic replay/branch；
- numerical existence semantics；
- independent scientific validation。

真正值得追求的不是“右侧比 NOBOOK 多几个按钮”。

而是：

> **用户可以像在成熟虚拟实验室里一样自由地拿、倒、加热、连接、混合、观察；与此同时，每个可见结果都尽可能来自一个可说明、可验证、可追溯、不会被教学模式偷偷改写的科学世界。**

---

# 55. 2026-09-13 外部证据更新：从产品印象到可执行设计

本节是在完成全文重读后，针对公开网页、官方 API、课程标准和虚拟实验教育研究做的补充核对。它仍然是研究附录，不是新的 API、SPEC 或 ADR。

## 55.1 NOBOOK 官方资料现在能直接证明什么

当前 NOBOOK 官网仍把化学产品公开描述为包含速率、化学平衡和压强三个系统，并同时展示教师课堂、学生自主学习、学校使用和跨学科产品入口。这些页面证明了 NOBOOK 的产品定位和营销表面；“26000+ 所学校”等数字属于厂商自述，不应被当作独立市场审计数据。

NOBOOK 开放平台 2.0 的 API 文档提供了比宣传页更有价值的证据。它明确把以下能力作为可配置的独立接口：

```text
iframe / SDK integration
        ↓
config
├─ topToolbarVisible
├─ leftToolbarVisible
├─ rightToolbarVisible
├─ bottomToolbarVisible
├─ settingsMenuVisible
├─ saveButtonVisible
├─ playerToolBarVisible
└─ infoVisible

getData() / setData()
        ↓
serialized scene JSON

switchModule()
├─ inorganic chemistry
├─ organic chemistry
└─ electrochemistry
```

它还提供场景截图、保存状态通知、播放/停止和场景清空等接口。由此可以高置信确认：

1. 编辑器、播放器、器材库、设置、信息区不是一个不可分割的 UI；
2. 场景数据是一个可被外部系统保存和重新注入的对象；
3. 无机、有机、电化学至少在产品入口层存在不同模块；
4. 截图和嵌入集成已经被当作产品能力，而不是开发者临时调试工具。

但这仍然不能证明：

- 场景 JSON 就是 event log；
- `getData()` 能重建每一个中间状态；
- 所有方程式、数据字段和视觉现象来自同一个守恒科学状态；
- 内部存在统一、公开、可审计的热力学/动力学求解器。

因此，本文前面关于“surface 分离”和“scene document”的判断得到加强；关于 NOBOOK 内部 Scientific Reality 的谨慎边界必须保留。

## 55.2 对 ChemRealm UI 的新结论：surface 分离不是审美偏好，而是外部可观察的成熟模式

NOBOOK API 的 `rightToolbarVisible`、`settingsMenuVisible`、`infoVisible` 和 `playerToolBarVisible` 被单独配置，说明成熟虚拟实验产品并不是把所有功能都堆在一个侧栏里。尤其是信息区还分别区分“有器材库的编辑器”和“无器材库的播放器”布局。

这给 ChemRealm 一个比“做一个漂亮 sidebar”更严格的设计约束：

```text
Catalog / Resource discovery
    “我能拿什么？进入哪个实验？”

Setup / Property editing
    “我准备怎样配置这个对象？”

World interaction
    “我现在对这个对象做什么？”

Entity / World inspection
    “它现在是什么状态？”

Process / Data projection
    “这个状态怎样变化？证据是什么？”

Presentation / Persistence
    “怎样讲给别人看？怎样保存并继续？”
```

这些 surface 可以在同一页面组合，但不能因为共享一块屏幕就共享同一个状态责任。特别是：

- Property Editor 读写的是允许用户设置的参数；
- Inspector 读的是当前实例和世界状态；
- Process Feed 读的是科学过程投影；
- Catalog 读的是可实例化模板和能力信息；
- Presentation 读的是可复现的世界，而不是重新执行一段动画脚本。

这也解释了为什么“右侧待选区很丰富”只是入口，而不是 NOBOOK 类产品的全部护城河。

## 55.3 课程标准补充：ChemRealm 的 Correct / Visible / Thinkable 与高中化学核心素养存在直接对应

教育部发布的《JY/T 0655—2025》继续把高中化学活动目标与五个核心素养方向联系起来：

```text
宏观辨识与微观探析
变化观念与平衡思想
证据推理与模型认知
科学探究与创新意识
科学态度与社会责任
```

其中，变化观念与平衡思想强调动态分析、条件、限度和速率；证据推理与模型认知强调基于证据提出、检验和修正模型；科学探究强调从问题和假设出发设计方案并进行实验探究。

这不是把课程标准当作 UI 功能清单，而是给 ChemRealm 的产品目标提供了一个外部锚点：

| ChemRealm 目标 | 课程能力映射 | 产品含义 |
|---|---|---|
| Correct | 变化观念、模型认知 | 结果要来自声明清楚的科学模型 |
| Visible | 宏观/微观结合、证据推理 | 现象、状态、数据和模型之间可追踪 |
| Thinkable | 科学探究、创新意识 | 用户能提出假设、改变条件、观察后果、修正解释 |

因此，NOBOOK 式的可操作世界和 ChemRealm 的可审计科学世界并不是两个互相竞争的方向。前者提供探究的操作空间，后者保证探究结果不被脚本和教学答案偷偷替换。

## 55.4 教育研究的约束：交互本身不会自动产生学习

虚拟化学实验的系统综述显示，虚拟实验相对于被动的讲授、文本或视频媒介，通常具有积极的学习效果；但与真实动手实验相比，结果更接近“相当或混合”，不能据此声称虚拟实验普遍替代实体实验。研究还指出，已有工作多数集中于中学阶段，但对科学过程技能、长期迁移和统一评估的证据仍不足。

针对中学教师使用虚拟化学实验的案例研究表明，虚拟实验可以缓解真实课堂中设备、时间和现象可见性方面的限制，但有效的课堂使用仍然依赖明确的引导探究，而不是把软件交给学生后让他们漫无目的地点击。

PhET 的公开研究方法提供了更具体的工程启示：每个模拟会经过以学习目标为起点的设计迭代，并通过学生 think-aloud 访谈研究界面、表示和交互；其公开设计原则包括鼓励探究、允许交互、让不可见对象可见、使用多重表示、提供隐性引导和即时因果反馈。PhET 也明确区分模拟对概念理解的优势与实体实验对设备操作技能的不可替代部分。

对 ChemRealm 的直接结论是：

```text
漂亮资产
  ≠ 可玩

可玩
  ≠ 可探究

可探究
  ≠ 已学会
```

一个 release-quality 的教学场景至少应能让用户经历：

```text
预测
  → 操作
  → 观察宏观后果
  → 检查定量/微观状态
  → 解释差异
  → 改变条件
  → 比较或迁移
```

ACE 可以在这个链条上提供支持和判断，但不能通过把结果预先写死来制造“正确学习”。

## 55.5 “NOBOOK-like”应拆成四个可验收的产品结果

把 NOBOOK 作为强学习对象时，不能只问“画得像不像”。更可执行的拆分是：

### A. Affordance density

用户能否快速发现可用的材料、器材、规格、预设和操作。指标不应只统计数量，还应包括：

- 意图到首次成功实例化的时间；
- 中文名、化学式、别名、元素/离子语义检索成功率；
- 常用预设、最近使用和深度搜索之间的切换成本；
- 能力状态是否可理解，而不是把未验证组合伪装成可用。

### B. Causal legibility

用户改变浓度、量、温度、拓扑或操作方式后，能否看见与之对应的世界后果。这里的验收不是“有动画”，而是：

```text
parameter change
    → scientific/world state change
    → observable change
    → inspector/process explanation
```

如果中间链条断裂，视觉就只是装饰。

### C. State legibility

用户能否回答“这个容器现在是什么”，并在需要时从默认层进入定量、科学、审计层。状态栏、Inspector、Process Feed 和图表必须来自相容的 projection，而不是各自重新猜一次。

### D. Recoverability

用户能否安全地试错、撤销、回放、分支、比较和继续实验。虚拟实验的价值之一就是允许反复操作，但只有当错误后果是可解释、可恢复、可重现时，这种自由才会转化成探究价值。

这四项比“器材数量”“动画数量”更接近产品成熟度。

## 55.6 对 Agent 美术生产的具体加严：交付物必须同时通过三层验收

公开资料不能证明 NOBOOK 的内部素材流水线，因此 ChemRealm 不应声称自己复刻了它的生产方法。但 NOBOOK 的 surface 结构和成熟虚拟实验研究共同说明：素材不能脱离交互、教学目标和运行态单独验收。

未来 Agent 生成一件器材或材料资产时，最低应拆成三层：

### 第一层：视觉完整度

- master 资产比例、透视、材质、光照和轮廓统一；
- 状态变体能表达空/满、倾斜、破损、连接、加热或其他适用状态；
- 缩略图、画布图和 Inspector 图使用同一视觉母版派生；
- 不出现 prototype label、随机颜色或与 ChemRealm 视觉标准冲突的局部风格。

### 第二层：交互语义完整度

- parts、ports、grabbable region、snap region、fluid region 和 collision geometry 明确；
- 可进行的操作由 capability 声明，而不是由图片名称推断；
- 可访问名称、键盘/触控替代路径和最小交互目标存在；
- interaction geometry 与 visual geometry 可以不同，但必须有可追踪关系。

### 第三层：世界因果完整度

- 倒入、连接、加热、封闭、破裂等状态变化能映射到 World/Observable contract；
- 液体、气泡、沉淀、烟雾、颜色和声音等效果有明确来源；
- 资产不会自己决定化学反应或伪造科学状态；
- deterministic fixture 中的状态、截图和交互结果可复现。

因此 Agent 的任务提示不应只是：

> “画一只好看的滴定管。”

而应更接近：

> “生成一套符合 apparatus standard 的滴定管资产包，包含几何母版、可见状态、液体区域、活塞/尖端部件、抓取与连接端口、操作能力、访问名称、来源/许可记录、确定性预览和运行态 fixture；所有视觉状态必须由允许的 observable state 驱动。”

这里的“资产包”才是可规模化的生产单位。单张 PNG 只能是其中一个派生结果。

## 55.7 内容规模的正确增长顺序

重新核对 NOBOOK 的当前官方产品表面、开放 API 和教育研究后，我认为 ChemRealm 不应采用以下顺序：

```text
先生成几百张图
→ 再想它们怎样搜索、实例化和交互
→ 最后补科学与教学
```

更可靠的顺序是：

```text
1. 定义一个小而真实的 material/apparatus ontology
2. 建立 Catalog / search / instance / inspector 的最短链
3. 建立一套可复用的 asset package 和 visual fixture
4. 用少量器材贯通 transfer / process / observable / replay
5. 让每个新增内容进入 provenance、capability、reference、visual QA 流水线
6. 再按课程价值和组合覆盖扩大 Catalog
```

早期少不构成问题，早期没有“内容生产能力”和“状态可读性”才构成问题。成熟度的关键不是尽快达到某个药品数字，而是新增第 N 个对象时不再发明第 N 套页面、交互和科学例外。

## 55.8 更新后的证据边界表

| 命题 | 当前证据状态 | ChemRealm 可采取的行动 |
|---|---|---|
| NOBOOK 有独立的编辑器/播放器/信息区/器材库 surface | 官方开放平台 API 直接证明 | 采用多 projection，不做万能侧栏 |
| NOBOOK 支持场景 JSON 保存与恢复 | 官方 `getData` / `setData` 直接证明 | ChemRealm 继续坚持 event log、hash 和 replay，但不把二者混为一谈 |
| NOBOOK 化学有多模块入口 | 官方 API 的 module ID 直接证明 | 允许无机、有机、电化学使用不同 representation |
| 虚拟实验能改善被动媒介下的学习表现 | 系统综述支持，但研究异质性较大 | 设计为主动探究工具，不宣称自动教学 |
| 引导探究和教师编排重要 | 中学案例研究和 PhET 教学资料支持 | ACE/活动设计提供逐步支持和反思，不只发操作任务 |
| NOBOOK 内部有统一可审计科学引擎 | 公开资料不能证明 | 不复制其未知内部逻辑；ChemRealm 自己做 model/provenance/validation |
| 单个漂亮 PNG 足以支撑大 Catalog | 没有证据，且与运行态产品要求冲突 | 把资产包、语义 manifest、fixture 和 QA 作为生产单位 |

## 55.9 对现有文档体系的解释

这一轮外部证据不会把 `GOAL.md` 改写成 NOBOOK 功能清单，也不会把本研究文档中的 manifest 草案直接升级为 TypeScript API。正确的文档层次仍然是：

```text
GOAL.md
    项目宪法：最终要成为怎样的 Chemical World

from-nobook.md
    研究：外部产品证明了什么、推断了什么、不能证明什么

SPEC / ADR / PLAN
    当前阶段真正冻结的接口、决策、计划和验收证据

agent-visual-asset-production.md
    资产生产方法；在正式 representation contract 冻结前保持指导性
```

研究文档中的“应该”是设计推论，不是当前代码已经支持的承诺。尤其是 process runtime、semantic-zero、物相/拓扑、百量级 Catalog 和资产 manifest，都必须在各自阶段通过 SPEC、ADR、实现和证据逐项落地。

---

# 56. 新增来源索引

本节来源用于本次外部证据更新。NOBOOK 官方资料用于确认产品外部能力；教育研究用于确认虚拟实验的学习边界；课程标准用于确认 ChemRealm 的教学目标锚点。它们不能互相替代。

## G. NOBOOK 官方当前资料

### G1. 当前官网

https://www.nobook.com/index.html

支持：当前产品的化学系统宣传、教师/学生/学校场景、产品入口和厂商自述的覆盖规模。覆盖规模应标为 vendor claim。

### G2. 开放平台实验 API

https://open.nobook.com/docs/2.0/tutorial-integration/experimental-integration/phy-or-chem-integration/

支持：iframe/SDK 集成、独立配置项、`getData`、`setData`、`switchModule`、播放/停止、保存通知、截图等。

### G3. 开放平台 UI 组件与样式配置

https://open.nobook.com/docs/2.0/tutorial-integration/experimental-integration/phy-or-chem-integration/CustomUI/

支持：顶部/左右/底部工具栏、器材属性设置、播放器工具条、编辑器/播放器信息区等独立 surface。

### G4. 开放平台资源版本列表

https://open.nobook.com/docs/2.0/tutorial-integration/resource-list-download/

支持：公开 SDK/资源版本选择和资源下载/对接入口；版本列表会变化，不能把当前列表当作 ChemRealm 的依赖版本。

### G5. 学生端操作手册

https://imgcdn.nobook.com/files/NOBOOK化学实验加试学生端%20使用手册.pdf

支持：历史学生端中选择、移动、旋转、连接、取用、倾斜、读数、报告、练习/考试等外部操作证据；属于历史一手资料，不能据此断言 2026 客户端每个细节不变。

## H. 课程与虚拟实验教育研究

### H1. JY/T 0655—2025

https://www.moe.gov.cn/srcsite/A06/s3732/202507/W020250701322477393561.pdf

支持：高中化学活动目标和“宏观辨识与微观探析、变化观念与平衡思想、证据推理与模型认知、科学探究与创新意识、科学态度与社会责任”五个核心素养方向。

### H2. Virtual chemical laboratories: A systematic literature review of research, technologies and instructional design

https://www.sciencedirect.com/science/article/pii/S2666557321000240

支持：虚拟化学实验相对于被动媒介的学习潜力、与动手实验比较时的混合结果，以及技术和教学设计必须同时考察的结论。

### H3. Enhancing the Student Experiment Experience: Visible Scientific Inquiry through a Virtual Chemistry Laboratory

https://eric.ed.gov/?id=EJ1039288

支持：中学教师使用虚拟化学实验开展显性引导探究的案例，以及虚拟实验对实验探究组织的帮助与限制。

### H4. An exploratory study of blending the virtual world and the laboratory experience in secondary chemistry classrooms

https://www.sciencedirect.com/science/article/abs/pii/S0360131518300563

支持：虚拟环境与真实实验结合、微观现象解释、实时反馈和教师连接在中学化学课堂中的产品启示。

### H5. PhET Research and Development

https://phet.colorado.edu/en/research

支持：以学习目标为起点的设计迭代、学生 think-aloud 访谈、模拟器设计和使用研究，以及模拟与实体实验能力的边界。

### H6. PhET Simulation Goals and Design Principles

https://phet.colorado.edu/publications/tech-award-2011-resources/PhET_TechAwards_Application.pdf

支持：动态反馈、让不可见对象可见、多重表示、交互、隐性引导、直观界面和开放探究等设计原则。

### H7. Teaching with PhET

https://phet.colorado.edu/en/teaching-resources/activities-design

支持：主动学习、活动设计、适度支架、教师编排和 productive struggle 的教学边界。

---

# 57. 研究更新后的最终判断

重新深读本文件并补充外部证据后，原来的结论应当进一步精确成一句话：

> **ChemRealm 要学习 NOBOOK 已经被用户和教学场景验证的“世界感”，但不能把 NOBOOK 的功能表面误认为科学证明；要学习它如何组织 surface、对象、目录、信息密度和过程反馈，同时用自己的 Scientific Reality、provenance、validity、replay 和证据体系重新实现这些体验。**

对美术生产，最重要的变化是：

> **Agent 交付的不是图，而是可进入 Chemical World 的视觉—几何—交互—状态—证据资产包。**

对产品路线，最重要的变化是：

> **先打通“发现 → 实例化 → 配置 → 操作 → 后果 → 检查 → 解释 → 回放”的闭环，再扩充内容规模；先建立资产和内容工业，再追求百量级 Catalog。**

对教学，最重要的变化是：

> **自由探索必须和引导探究、反思、比较和迁移结合；一个学生点过所有按钮，不等于他形成了可迁移的化学模型。**

---

# 58. M6 混合资产管线与 GOAL 完全体的可运行性复核

本节是 2026-09-16 对当前 M6 混合器材资产规范的复核。问题不是“高分辨率图片能不能显示”，而是：

> **同一件原创器材资产，能否在未来完整 GOAL 中同时服务资源库、场景编辑、实验运行、运行态检查、读数、保存/回放、分支、ACE 和不同渲染后端，而不产生第二套世界真相？**

结论是：**可以，且混合资产包比 SVG-only 方案更适合这个终局；但它只证明资产边界可扩展，不代表这些后续产品表面已经实现。**

## 58.1 截至本轮核对的公开 NOBOOK 证据

本轮重点复核了 NOBOOK 当前官网、开放平台 2.0、UI 配置文档、历史化学界面说明、学生端手册、公开资源列表和教育装备标准。

官方开放平台直接公开了以下外部能力：

| 公开能力 | 证据 | 对 ChemRealm 的含义 |
|---|---|---|
| iframe/SDK 集成与跨窗口通信 | [NOBOOK 实验 API](https://open.nobook.com/docs/2.0/tutorial-integration/experimental-integration/phy-or-chem-integration/) | 外部壳层、实验运行时和内部场景数据可以分层；ChemRealm 不需要依赖该 SDK |
| 编辑器/播放器、顶部/左右/底部工具栏、设置、器材库、信息区可分别配置 | [UI 组件与样式配置](https://open.nobook.com/docs/2.0/tutorial-integration/experimental-integration/phy-or-chem-integration/CustomUI) | Catalog、配置、运行、Inspector 不应被做成一个不可拆的巨型面板 |
| getData/setData、play/stop、保存通知、截图 | [实验 API](https://open.nobook.com/docs/2.0/tutorial-integration/experimental-integration/phy-or-chem-integration/) | 场景文档、运行态、导出和呈现是不同边界；ChemRealm 仍坚持 event log 不等同于场景 JSON |
| 化学资源/实验有持续的资源库和模块入口 | [NOBOOK 化学资源页](https://www.nobook.com/nb_huaxue_ziyuan.html)、[开放平台资源版本列表](https://open.nobook.com/docs/2.0/tutorial-integration/resource-list-download/) | 资产必须支持 catalog、版本、变体、缩略图和可复现加载，而不是只交一张图 |
| 选择、移动、旋转、连接、取用、倾斜、读数、报告和练习/考试等学生端操作 | [NOBOOK 化学界面说明](https://nobook-doc-cdn.nobook.com/chem/NB化学实验界面及相应功能特性说明.html)、[学生端使用手册](https://imgcdn.nobook.com/files/NOBOOK化学实验加试学生端%20使用手册.pdf) | parts、ports、capabilities、抓取/连接区和量测区必须是资产包可寻址语义 |
| 高中器材族与玻璃仪器标准被纳入教学装备配置 | [教育部 JY/T 0655—2025](https://www.moe.gov.cn/srcsite/A06/s3732/202507/W020250701322477393561.pdf) | 规格变体、器材家族和结构辨识应从标准/厂家资料建立，不能用一个缩放函数代替 |
| 当前产品宣传 3D/自由交互/实验资源 | [NOBOOK 开放平台](https://open.nobook.com/)、[NOBOOK 化学产品介绍](https://www.nobook.com/nb_huaxue_ziyuan.html) | 2D/2.5D/3D 是表示后端选择，不应改变器材 identity 或科学状态；营销表述不证明内部科学正确性 |

这些资料能证明 NOBOOK 的产品表面和用户期待，不能证明其内部素材格式、资产生产流程、event sourcing、回放算法或统一热力学求解器。本文不从公开页面推断这些未知内容。

## 58.2 GOAL 完全体运行矩阵

当前 M6 规范的 asset package、VolumeProfileSnapshot、ScientificFrame 和 ObservableModel 可以按下表承接后续目标：

| GOAL 完全体能力 | 资产包提供什么 | 真正的运行时 owner | 是否方便落地 |
|---|---|---|---|
| 资源库/Catalog | assetId、family、variant、容量、标签、缩略图、格式、许可和来源 | Representation/content tooling | 是；M6 只冻结包形状，Catalog UI 仍待后续 |
| 场景编辑与装配 | parts、ports、anchors、regions、capabilities、抓取/吸附区、拆卸关系 | Representation + World command boundary | 是；图片不持有命令，部件身份可复用 |
| 演示/播放器 | 同一包的静态 body、动态层和 presentation policy | Observable/Representation | 是；演示不是第二套 asset |
| 运行态 Inspector | 可读名称、部件身份、profile/export identity、frame-bound 数值 | World/Science projections + Observable | 是；不能从像素猜质量、浓度或 pH |
| 读数/量测 | profile、刻度、meniscus/read region、精度和量测语义 | World/Science boundary + Observable | 是；量测读 profile/状态，不依赖 OCR |
| 保存、回放、分支、比较 | genesis-owned profile/export identity、hash、可恢复资源和事件边界 | World Runtime/persistence | 是；完整 import/export 仍需 M8 等阶段实现 |
| 液体、沉淀、气泡、热、连接反馈 | mask、layer slot、状态标签和观察策略的承载位 | Scientific Reality + Observable policy | 是；资产不决定何时发生效果 |
| ACE 练习、报告、考试 | 稳定动作目标、能力 ID、可观测状态和截图/报告锚点 | ACE + projection | 是；资产只提供观察与交互表面，不推断学习 |
| 桌面、平板、移动 | deliberate LOD、可缩放命中区、访问名称、替代操作和 viewport QA | Representation Engine | 是；需按视口逐件验收 |
| 2D、WebGL、Pixi、Canvas、未来 3D | backend-neutral manifest、纹理/遮罩、profile、frame、ObservableModel | Renderer backend adapter | 是；后端可以变，identity 和 truth 不能变 |
| Rust/C++/WASM 优化 | 明确 adapter、版本和 fixture-equivalent output | 对应的科学/世界/表示 owner | 是；只在 profiling 后引入，不能形成第二科学权威 |

因此，混合资产包并非只适合“放一张高质量图片”。它同时提供：

```
visual body
    + structured masks/geometry
    + semantic parts/ports/capabilities
    + frozen profile/calibration identity
    + dynamic-state slots
    + source/license/export evidence
```

这组边界可以让同一件器材在 Catalog、编辑器、播放器、Inspector、读数、截图和未来 ACE 中重复使用，同时避免把每一种模式复制成一套图片和一套化学逻辑。

## 58.3 为什么它比旧 SVG-only 路线更适合终局

旧路线把“可检查”几乎等同于“所有像素必须是 SVG path”。这会诱导团队为了满足文件格式而牺牲真正的玻璃材质、局部折射、器材特定曲线和美术定稿。

混合路线把职责拆开：

1. authored raster body 负责经过审查的视觉细节；
2. mask/path/structured geometry 负责液体裁切、命中区、测量区和需要稳定寻址的结构；
3. semantic manifest 负责器材身份、规格、部件、端口、能力、来源和许可；
4. VolumeProfileSnapshot 负责可回放的体积—高度关系；
5. Observable/RenderState 负责液体、颜色、读数、选中、连接和其他状态投影。

因此它同时满足“视觉目标达到或超过成熟虚拟实验产品”和“科学/世界状态不能藏进 renderer”这两个看似冲突、实际上属于不同层的问题。

## 58.4 运行方便性的硬条件

“方便运行”不是把文件丢进 assets 目录后能显示，而是下面的链条不需要返工：

```
CatalogEntry
    → instantiate variant
    → World command/event
    → committed WorldState
    → ScientificFrame
    → ObservableModel
    → backend RenderState
```

要保持这条链稳定，必须满足：

- 资产是 content-addressed 或能被 genesis 恢复，不能只有会漂移的 geometryRef；
- 一个规格变体有自己的 manifest、source record、export hash 和 QA，不靠改 label 伪装；
- detachable part 是 first-class identity，attach/detach 是 command/event；
- liquid、meniscus、indicator palette、burette reading 和 measurement guide 都来自 frame/policy；
- editor/player/ACE 可以换布局，但不能换 scientific meaning；
- Pixi/Canvas/WebGL/WASM 只接收 ObservableModel/RuntimeAssetBundle，不能重新求解 chemistry；
- 本地运行不依赖 NOBOOK iframe、远程 SDK、账户或服务器 scene service；
- 任何缺失、hash mismatch、格式不支持或 profile 不可恢复都必须 typed fail，而不是静默换 generic apparatus。

这意味着后续 GOAL 完全体无需推翻当前资产包；需要增加的是：

1. Catalog/registry 和搜索；
2. World commands 与 attach/detach/transfer/tilt 等 domain transitions；
3. production composition；
4. inspector/process/measurement projections；
5. ACE evidence 与报告；
6. 更完整的资产族和真实截图验收。

这些是功能和内容增长，不是资产身份/真相边界的重写。

## 58.5 最终判定

截至本轮：

| 判定 | 结果 |
|---|---|
| M6 混合资产包是否能支撑 GOAL 完全体 | **架构上可以** |
| 是否能达到 NOBOOK 级别的可操作密度 | **可以作为目标，但必须用逐件 Gold Master 和运行态截图证明** |
| 是否已经实现 Catalog/编辑器/播放器/Inspector/ACE | **没有；它们属于后续阶段** |
| 是否需要依赖 NOBOOK 运行时 | **不需要，也不允许** |
| 是否需要把所有视觉内容做成纯 SVG | **不需要，且当前不应如此要求** |
| 是否允许单张 PNG 直接成为生产资产 | **不允许；必须是完整资产包的一部分** |
| 是否允许未来引入 Rust/C++/WASM | **允许，但必须保持显式 adapter、同一 fixture 输出和可回退 JS 路径** |

所以当前 M6 规范可以继续作为 GOAL 完全体的视觉/运行时资产底座。它的真实缺口不是格式兼容性，而是尚未完成第一件 Gold Master、production composition 和后续场景/交互证据。M6 仍应保持 S2 visual NO-GO，不能因为这次可运行性复核就提前宣称产品闭环。
