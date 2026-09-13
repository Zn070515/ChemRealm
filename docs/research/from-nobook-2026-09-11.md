# FROM NOBOOK

> **Archive:** superseded by the current canonical research note at
> [`from-nobook.md`](from-nobook.md). Retained for historical comparison.

> **ChemRealm 对 NOBOOK 虚拟实验体系的抽象研究基线**
> Research date: 2026-09-11
> Status: **Non-normative research note**
> Purpose: 从 NOBOOK 十余年的产品、交互、仿真和教学实践中提炼可迁移的底层原则；**不是功能抄表，不是对 NOBOOK 内部实现的逆向断言，也不直接修改 ChemRealm 已 Accepted 的 SPEC / ADR / PLAN。**

---

## 0. 为什么研究 NOBOOK

ChemRealm 与 NOBOOK 的关系不应被理解为“做一个更科学的 NOBOOK”，也不应被理解为“把 NOBOOK 已有实验逐个复刻”。

NOBOOK 最值得学习的部分，是它经过长期迭代后形成的三种能力：

1. **让虚拟器材像一个实验世界，而不是一组动画按钮。**
2. **让鼠标/触摸输入足够宽容，使学生表达实验意图，而不是考验像素级操作。**
3. **用统一的视觉与交互语法承载大量器材、药品、装配关系和实验现象。**

ChemRealm 已经在 Scientific Integrity、provenance、event sourcing、core boundary 上采取了比公开 NOBOOK 资料更严格的路线。研究 NOBOOK 的目的，是补上另一个同样决定产品成败的维度：

> **Interaction maturity + visual world feel + apparatus semantics.**

本文件因此只回答四个问题：

- NOBOOK 公开证据能确认它真正做对了什么？
- 哪些表面现象背后其实是同一个更小的抽象？
- 哪些设计原则适合 ChemRealm，哪些不适合？
- 这些原则应在什么阶段进入工程，而不是造成当前阶段的 feature creep？

---

# 1. 证据方法：事实、推断、社区信号必须分层

本文对证据使用四级标签。

| 等级 | 含义 | 典型来源 | 能支持什么 |
|---|---|---|---|
| **A** | 一手/近一手 | NOBOOK 官方手册、开放平台、官方产品页、NOBOOK 早期公司专利、App Store 官方描述 | 产品存在某项能力、公开 API、交互规则、历史设计思想 |
| **B** | 独立专业材料 | 教学论文、学校课例、第三方专利对比、政府采购技术参数 | 实际教学使用方式、外部观察到的行为、产品要求 |
| **C** | 用户/社区信号 | App Store 评论、Bilibili、论坛 | 用户如何“玩”、痛点和边缘行为；**不能证明科学正确性** |
| **D** | 视觉推断 | 截图、视频画面、UI 观察 | 美术/界面风格；**不能证明内部算法** |

贯穿全文的规则：

> **看到一个现象，不等于看到一个引擎；看到一个引擎名称，不等于知道它的科学模型。**

例如，公开资料能够确认 NOBOOK 曾宣称有“压强系统”，也能确认其资源中存在气密性水柱、倒吸等现象；但我们不能据此断言它内部使用何种状态方程、流阻模型或数值积分器。

同理，教学案例确认错误操作能够导致“试管炸裂、液体倒吸”等虚拟后果，但公开证据不能证明每一次炸裂都由实时热应力计算产生，而不是场景规则、经验阈值或预设效果。

这一点对 ChemRealm 极重要：**学习它选择模拟什么，以及如何组织交互；底层科学模型重新独立设计与验证。**

---

# 2. 最核心的结论：NOBOOK 的长期价值是从“流程动画”走向“可运行世界”

NOBOOK 早期媒体材料本身留下了一个很有价值的历史切片。2015 年的一篇报道把有“公式算法引擎”的虚拟实验与“沿唯一正确路径播放的互动流程”明确区分；报道同时指出，当时化学版仍比物理更接近流程展示，因为化学涉及温度、光照等复杂因素。[S01]

之后的官方资料开始明确宣称化学拥有：

- 热力学引擎
- 重力引擎
- 拼装引擎 / 导管引擎
- 粒子引擎
- 化学平衡系统
- 速率系统
- 压强系统

并强调器材/药品可自由组合、流体现象、反应速率、溶解关系等。[S02][S03]

当前 NOBOOK Lab 的官方商店描述又进一步以“1000+ DIY 器材”“8 大自研引擎算法”“自由组合器材、即时观察现象”作为核心卖点。[S04]

这条演化路线的真正意义不是“应该照着做八个引擎”，而是：

> **当一个虚拟实验产品的自由度提高后，实验不能再由 experiment script 决定世界发生什么；必须有更底层的 state + rule/model 来承担组合。**

这与 ChemRealm 的核心方向高度一致：

```text
Authored workflow                      World model
-----------------                    -----------------
步骤 1                               State
步骤 2                               + topology
步骤 3                               + model selection
if wrong -> error                    + process
动画 A                               + observable mapping
                                      ↓
                                    consequence
```

**ChemRealm 应学习的是右边这个转变，不是 NOBOOK 的模块命名。**

---

# 3. NOBOOK 最有分量的架构证据：连接拓扑先于物理求解

NOBOOK 原公司 2014 年申请的专利《具有动态响应的仿真实验系统》提供了目前最清楚的一手架构证据。[S05]

专利描述的核心不是某个实验，而是一条通用运行链：

```text
用户摆放 / 连接器材
        ↓
实时检测器材连接状态
        ↓
构造有效连接 / 路径 / 拓扑
        ↓
计算物理参数与状态
        ↓
分配回器材
        ↓
器材显示对应现象
```

专利的电学实施例进一步明确了：

- 器材有“可接点”；
- 系统遍历连接点和路径；
- 从连接关系形成图；
- 根据图求解电压、电流、电阻；
- 再把参数传回器材显示。

连接候选当时使用碰撞检测发现，包括离散/连续碰撞、包围盒、四叉树或有限器材的遍历检测等。

## 3.1 对 ChemRealm 的提炼

这里真正值得吸收的是：

> **Geometry discovers candidates; semantics decides topology; topology constrains the domain model.**

不要把“碰撞”直接等价为“化学器材已经连接”。

ChemRealm 更合理的抽象是：

```text
Pointer / drag geometry
      ↓
Candidate port discovery
      ↓
Semantic compatibility
(type / orientation / occupancy / insertion / seal)
      ↓
World topology mutation
      ↓
Scientific / physical model
      ↓
Observable consequence
```

这一区分尤其重要，因为“看上去碰到了”和“形成了密闭连接”不是一回事。

例如导管靠近胶塞孔：

- Renderer 可以发现空间接近；
- Interaction 层可以给出 ghost snap；
- World Runtime 才确认 `TubeEndpoint -> StopperHole` 是否兼容、孔是否已占用、插入深度是否足够形成密封；
- 后续 pressure/flow model 才把它视为气路。

**这比“把吸附做漂亮”更重要。吸附只是 semantic topology 的 UI 投影。**

---

# 4. 器材不是图片，而是“有语义部位的实验对象”

NOBOOK 化学实验加试手册把基础操作写得非常清楚：[S06]

- 选择器材；
- 移动器材；
- 旋转普通器材；
- 单独旋转铁夹；
- 拖拽“器材或某一部位”到另一器材的“对应区域”实现组合；
- 从纸堆、试纸、砂纸等整体中“取用”单个；
- 模拟操作又分为：点击整体、点击部位、拖拽整体、拖拽部位、倾倒按钮。

这已经不是简单的 `sprite.onDrag`。

它隐含着一个非常成熟的 apparatus model：

```text
Apparatus
  ├─ whole-object affordances
  ├─ semantic parts
  ├─ operation regions
  ├─ connectable regions
  ├─ adjustable parts
  └─ state-dependent affordances
```

## 4.1 对 ChemRealm 的提炼：Part / Port / Region / Capability

未来器材资产至少应能表达四类不同语义：

### Part

器材的可独立操作部件。

例：

- 分液漏斗活塞
- 铁夹
- 胶头滴管胶帽
- 瓶塞
- 酒精灯灯帽

### Port

可建立拓扑关系的语义接口。

例：

- vessel mouth
- stopper hole
- tube endpoint
- gas outlet
- electrical terminal
- clamp socket

### Region

空间交互区域，但未必形成连接。

例：

- heat target region
- grasp region
- liquid receiving region
- clampable region
- label-facing region

### Capability

对象在当前状态允许的动作。

例：

- `CanPour`
- `CanClamp`
- `CanHeat`
- `CanOpenValve`
- `CanInsertTube`
- `CanMeasureVolume`

这四者不能全部压成碰撞框。

---

# 5. 最值得学习的 UI 原则：模拟“决策”，不要模拟无意义的手部困难

NOBOOK 手册里的“倾倒”操作是一个非常好的产品设计样本。[S06]

它没有要求用户真实模拟一个连续 6-DOF 的手腕动作、精确控制容器倾角和液体自由表面。

流程是：

1. 把盛液体容器拖到目标容器边缘；
2. 系统识别“我要倒液体”的意图；
3. 出现 contextual 倾倒控制；
4. 用户拖动倾倒按钮调节体积。

这实际上做了一个非常合理的信息分解：

```text
实验决策                         手部执行细节
--------                        ------------
倒到哪个容器？      保留         手腕轨迹         简化
倒多少？            保留         精确碰撞         简化
是否沿玻璃棒？      可保留       真实肌肉控制     简化
是否超过容量？      保留         液体 Navier-Stokes 不要求
```

这应该成为 ChemRealm 的交互原则：

> **Preserve scientific/experimental decisions; compress low-value motor difficulty.**

这不是“降低真实性”，而是在区分两种真实：

- **chemical/operational truth**：用户做了什么实验决策；
- **motor fidelity**：用户手指是不是精确落在 3 px 范围内。

对高中化学学习，前者远比后者重要。

---

# 6. Snapping 的真正抽象：Intent Assistance，而不是坐标吸附

NOBOOK 早期电学文档明确写过：导线端拖到接线柱上方，松手后“自动吸附”。[S07]

化学手册则使用更通用的语言：把器材或其部位拖到另一器材“对应区域”即可连接。[S06]

外部研究/专利对 NOBOOK 的一个批评也很有启发：纯鼠标/触摸单通道虽然容易使用，但不能充分表达实验操作意图；更好的交互应结合轨迹、距离、上下文等信息推断 intent。[S08][S09]

ChemRealm 不必因此引入语音、多模态或 AI。更可取的是一个轻量、确定性的 intent score。

例如，对候选 snap port：

\[
S = w_d D + w_\theta A + w_t T + w_o O + w_c C + w_v V
\]

其中：

- \(D\)：距离；
- \(A\)：朝向误差；
- \(T\)：port type compatibility；
- \(O\)：occupancy；
- \(C\)：碰撞/几何可达性；
- \(V\)：pointer velocity / trajectory 是否朝向候选。

这只是 ChemRealm 的**派生设计建议**，不是 NOBOOK 已公开的公式。

## 6.1 必须有 hysteresis

进入 snap 的阈值与离开 snap 的阈值不应相同：

```text
enter < 12 px-equivalent
leave > 20 px-equivalent
```

否则边界附近会出现视觉抖动。

## 6.2 Drag forgiving, commit strict

拖动阶段可以宽容：

- 扩大 hit target；
- 预测意图；
- 显示 ghost；
- 自动对齐角度；
- 提示可连接点。

但松手产生的 World mutation 必须严格：

```text
Preview snap ≠ committed connection
```

World Runtime 需要重新验证 compatibility、occupancy、seal、orientation 等。

这样既获得 NOBOOK 式顺手感，又不允许 Representation 层决定科学拓扑。

---

# 7. 同一个世界，不同模式：NOBOOK 反复证明“模式应该是 policy，不是第二套实验”

NOBOOK 有多组非常清楚的模式分离证据。

## 7.1 编辑 vs 演示

官方化学编辑器文档中，同一个精品实验既可进入“正常编辑模式”，也可进入“演示模式”。演示模式全屏、隐藏器材库和顶部编辑工具，防止授课时误改实验；编辑模式则允许二次修改。[S10]

## 7.2 练习 vs 考试

加试学生端同一实验提供练习模式和考试模式：[S06]

- 练习模式：每一步有提示；
- 考试模式：自由操作、无引导、做错不即时提示，提交后再生成报告和评分。

## 7.3 Open Platform：同一 scene data + 可配置 shell

开放平台公开 `getData()` / `setData()`，实验场景可序列化为 JSON；同时 `config()` 可以独立控制顶栏、左右工具栏、器材库、设置菜单、信息区、保存按钮、player toolbar 等。[S11]

这三组证据共同说明一个很稳定的产品抽象：

```text
Scene / World
      +
Interaction / Presentation Policy
      =
Mode
```

对 ChemRealm，这直接支持已有方向：

- Sandbox
- Guided World
- Presentation View
- Challenge View
- Inspect View

**不要复制 NOBOOK 的模式名；保留“同一 World，不同 policy/projection”的思想。**

---

# 8. 场景序列化是成熟编辑器的基础能力，不是附加功能

NOBOOK 开放平台可以：

- 获取实验 scene JSON；
- 恢复 scene JSON；
- 保存场景数据 + 缩略图；
- 清空；
- 切换模块；
- 暂停/恢复渲染；
- 查询是否需要保存。[S11]

官方旧产品资料还强调实验过程可以保存，下次继续。[S12]

这说明一个实验编辑器若要长期可用，必须把“世界”视为可序列化对象，而不是 DOM/Pixi display tree 的偶然状态。

ChemRealm 已经走得更远：event-sourced World 比单纯 scene snapshot 更强，因为可以提供：

- replay
- undo/redo
- branch
- deterministic bug reproduction
- counterfactual comparison

因此从 NOBOOK 学到的不是“实现 getData/setData”，而是确认：

> **Scene persistence 是实验编辑器的一等语义；renderer tree 永远不能成为唯一状态。**

---

# 9. 物理/化学现象应该从共享 substrate 组合，而不是按现象建模块

用户容易看到 NOBOOK 中的：

- 倒吸
- 喷泉
- 气密性水柱
- 压强差
- 加热
- 沸腾
- 沉淀
- 溶解
- 试管炸裂
- 电极上气泡转移

然后得到一个危险结论：

> “ChemRealm 也应该加一个倒吸系统、一个炸裂系统、一个喷泉系统……”

这正是本研究要避免的。

NOBOOK 官方资源本身已经显示多个表面不同实验共享相同因果骨架：

- 气密性实验：加热后气体逸出，冷却后内压低于外压，水进入导管形成液柱。[S13]
- 测空气氧含量：O₂ 被消耗，容器内压强下降，水倒吸进入集气瓶。[S14]
- 当前资源库把“NaOH + CO₂ 压强差”“气球变化”“喷泉实验”等放在同一长期产品体系里。[S15]
- 原电池实验中，仅改变电极之间是否导线连接，就会改变气泡发生位置并使电流计响应。[S16]

这支持一个更小、更通用的 substrate。

## 9.1 建议的 World substrate（研究层抽象，不是当前实现任务）

### A. Topology / Connectivity

描述：

- 哪些容器连通；
- 哪些导管相连；
- 哪些阀门开/关；
- 哪些连接密封；
- 电极/导线的拓扑；
- apparatus attachments。

### B. Inventory / Phase State

描述：

- 各容器中有哪些物质；
- amount；
- phase；
- liquid volume；
- gas inventory；
- solid deposit。

### C. Energy / Thermal State

描述：

- temperature；
- heat input；
- heat capacity；
- phase-change demand；
- 必要时的 apparatus thermal zones。

### D. Pressure / Flow

描述：

- connected gas volumes；
- pressure；
- conduit flow；
- liquid columns；
- venting / blocked path。

第一代完全不需要 CFD；lumped volumes + one-dimensional conduits 已能生成大量高中现象。

### E. Chemical Process

描述：

- equilibrium；
- kinetics；
- solubility；
- electrochemistry；
- gas absorption/release。

由 Model Dispatcher 选择实际科学模型。

### F. Metastability / Transition Policy

描述那些不能由“平衡状态一到就瞬间出现”的现象：

- nucleation；
- delayed boiling；
- supersaturation；
- precipitation induction；
- metastable state。

### G. Apparatus Integrity / Operating Envelope

描述器材的工作限制：

- pressure envelope；
- thermal shock；
- damage state；
- impact / scratch 等经验修正。

这层可以是有来源的经验模型，而不是伪装成有限元分析。

### H. Observable State

将上述真实状态映射为：

- bubbles
- turbidity
- sediment
- liquid level
- flame
- crack
- gauge reading
- color/transmission

**Renderer 只消费 observable/render state，不决定现象是否发生。**

## 9.2 关键点

一个“倒吸”不应该属于 `SuckBackEngine`。

它是：

```text
sealed topology
+ gas inventory
+ thermal change / gas consumption
+ pressure difference
+ liquid-connected conduit
= backward liquid flow
```

一个“喷泉”也只是其中加入快速气体溶解/反应和更大的 pressure transient。

一个“热玻璃遇冷液体破裂”则是 pressure/flow 事故链继续触发 thermal/integrity 模型。

这才是“提炼”，而不是现象清单。

---

# 10. NOBOOK 对错误操作的真正启示：World consequence 与教学 judgement 分开

独立教学案例明确记载：学生在 NOBOOK 中进行一氧化碳还原氧化铁时，错误操作或步骤混乱会即时出现提示或相应虚拟后果，例如试管炸裂、液体倒吸，学生再分析原因并重做。[S17]

另一篇教学研究把 NOBOOK 用于“试误技能”；值得注意的是，其中部分试误是通过预先录制的视频帮助学生观察违规操作后果，而不是所有后果都一定来自动态引擎。[S18]

因此真正应该提炼的是行为分类：

## 10.1 Impossible action

世界本身不允许。

例：

- 一个 port 已占用却试图插入第二根同类管；
- 转移量超过当前存在的液体；
- 当前对象没有该 capability。

这类由 Command validation 拒绝，不发 WorldEvent。

## 10.2 Physically possible but bad technique

现实中做得到，只是会造成坏结果。

这类**不能因为教学规范而被 UI 拦截**。

应当：

```text
command accepted
→ world state changes
→ consequence occurs
→ ACE / challenge evaluator interprets it
```

否则学生只学会“软件不让我这么点”，没有学到为什么不能这样做。

## 10.3 Pedagogically suboptimal but physically harmless

例如考试评分标准要求某个动作顺序，但世界本身没有灾难性后果。

仍由 World 正常执行，Assessment/Evidence 层记录。

### 核心原则

> **Physics/chemistry decides consequence; pedagogy decides meaning.**

这与 ChemRealm 四 Core 边界天然一致。

---

# 11. NOBOOK 的“实验测评”给 ACE 的启示不是“照着步骤扣分”

NOBOOK 加试系统能够记录实验操作点，练习模式逐步提示，考试模式不提示，提交后按步骤评分并统计错误。[S06][S19]

这说明一个成熟实验平台会把**操作流**与**评价流**分开。

但 ChemRealm 不应直接继承其以考试步骤为中心的模型。

NOBOOK 的测评目标是：

> “这一步是否按考纲规范完成？”

ChemRealm ACE 的长期目标则更大：

> “学生为什么这样做？他激活了什么模型？能否迁移？提示后依赖程度如何？”

因此可继承的只有数据流原则：

```text
WorldEvent
   ↓
Evidence extraction
   ↓
Assessment / Learner model
```

而不是：

```text
World reducer 内置考试步骤
```

这也是 event-sourced World 的额外优势：同一条事件日志将来可以被 Sandbox、Guided、Challenge 以不同方式解释。

---

# 12. NOBOOK 美术真正值得学的是“视觉语法”，不是某个器材画法

从官方界面和当前产品截图可以观察到一条持续多年的风格演进：[S20][S21]

- 深色/中性画布，降低背景噪声；
- 器材保持稳定视角和一致缩放语言；
- 玻璃器材不是照片级 PBR，而是强化轮廓、高光和容积识别；
- 金属、玻璃、液体、火焰等材料有明确类别感；
- 侧边器材库缩略图与画布主体保持一致视觉语言；
- UI chrome 相对克制，把视觉注意力留给器材与现象；
- 微观粒子、方程式、表计等信息层仍能压在玻璃/液体之上保持可读。

这是一种 **semi-realistic educational 2.5D**，其目标不是“最像照片”，而是：

\[
\text{recognizability} + \text{state legibility} + \text{visual consistency}
\]

## 12.1 不追求 photorealism 的原因

过度写实玻璃容易出现：

- 环境反射过强；
- 轮廓消失；
- 液体与背景混淆；
- 小尺寸器材不可辨认；
- 现象（沉淀、气泡、液位）被材质效果吞掉。

ChemRealm 应把“实验状态可读性”高于“材质炫技”。

## 12.2 派生的 Apparatus Asset Contract

NOBOOK 没有公开其内部资产 schema；下列是从其交互能力反推的 ChemRealm 设计建议：

```yaml
ApparatusAsset:
  visual:
    back_layer:
    body:
    front_glass:
    highlights:
    metal_parts:
    shadow:
    selection_mask:

  geometry:
    silhouette:
    hit_shape:
    interior_fluid_region:
    volume_height_profile:   # V(h), h(V)
    collision_shape:

  interaction:
    grab_regions:
    pivots:
    semantic_parts:
    ports:
    action_regions:

  states:
    open_closed:
    valve_state:
    heated_state:
    damage_state:
    assembly_variants:
```

核心原则：

> **Asset ≠ PNG. Asset = visual + geometry + interaction semantics + state variants.**

这很可能是实现 NOBOOK 式“顺手”和一致美术的必要条件之一。

---

# 13. Contextual UI：复杂系统不等于把全部属性永远摊在右侧

NOBOOK 官方手册有一组成熟的 progressive disclosure 设计：[S10]

- 点击器材后出现选中框；
- 属性面板显示在器材附近；
- 点击画布其他位置隐藏；
- 器材库可以整体隐藏；
- 旋转控制只在相关 selection 上出现；
- 编辑和演示模式隐藏不同 UI；
- 设置、场景信息等按需展开。

它实际解决的是：

\[
\text{World complexity} \gg \text{current-task information need}
\]

ChemRealm 更需要这一点，因为 Scientific Core 的信息密度远高于 NOBOOK。

同一个烧杯可以有三层 disclosure：

### Default

- 选中
- 移动
- 旋转
- 删除/撤销

### Inspect

- liquid volume
- temperature
- phase / visible contents
- connected apparatus

### Scientific

- species
- molality
- activity
- ionic strength
- model
- validity
- provenance

**科学信息丰富，不等于默认 UI 应像工程仿真软件。**

---

# 14. “最佳视角 / 重置 / 清空 / 锁画布”是编辑器成熟度指标

NOBOOK 手册长期保留“最佳视角”，当前截图还可以看到 Center canvas、Lock canvas、Magnifier 等画布级动作。[S10][S20]

这些按钮本身很小，但背后的原则重要：

> **任何自由画布都必须有 escape hatch。**

用户一定会：

- 缩放过度；
- 把装置拖出可视区；
- 在讲课时误移动画布；
- 忘记当前 camera 状态。

ChemRealm 未来应明确区分：

```text
Fit Scene       -> 改 camera
Center Selection-> 改 camera
Lock Canvas     -> 改 interaction policy
Reset Camera    -> 改 camera
Reset World     -> 改 World state / log cursor
Clear World     -> 新的 destructive world action
```

特别是：

> **Reset Camera ≠ Reset Experiment.**

这是小功能背后的语义边界。

---

# 15. 资源越多，真正的产品问题就从“有没有”转成“找不找得到”

NOBOOK 化学手册里的器材库已有多种 retrieval path：[S10]

- 模糊搜索；
- 首字母搜索；
- 按反应容器/辅助器材/固液气药品分类；
- 按金属/非金属/带电离子团等物质名称快捷搜索；
- 实验资源按教材、章节、知识点、资源类型筛选。

当前 NOBOOK Lab 宣称 1000+ DIY 器材。[S04]

这说明一个常被忽略的规律：

> **Catalog size is an interaction cost.**

ChemRealm 将来器材/试剂增长后，器材库不能只是“长列表”。但目前不应该提前实现复杂搜索；本研究只记录未来压力：

- type/category search；
- chemistry-aware aliases；
- recent/favorites/local scenario set；
- context-compatible filtering；
- keyboard-first retrieval。

真正成熟的方向可能是：当用户正在拿着一个胶塞时，器材库可以优先显示兼容导管，而不是永远显示 1000 个物体。

---

# 16. 广泛自由组合带来的代价：Combinatorial explosion

社区对 NOBOOK 的使用是非常有价值的压力测试信号，但不能被当成科学证据。

Bilibili 与论坛中大量用户会故意：

- “不管了先加钠”；
- 自己生火；
- 做咖啡；
- 设计非教材装置；
- 制取各种气体；
- 追求爆炸或异常结果。[S22][S23]

App Store 评论同样把“自由发挥”“课本没有的也可以做”作为优势；但也有用户明确指出科学边缘缺陷，例如某些胶体加盐后的行为不正确。[S24]

这个信号不能被翻译成：

> “ChemRealm 也要加入咖啡、加钠、爆炸玩法。”

真正应该提炼的是：

> **当一个世界允许组合，用户必然探索作者没设计过的组合。**

于是测试策略必须从“经典实验通过”升级为：

### Invariant tests

- mass / charge / element conservation；
- no negative amount；
- topology validity；
- unit consistency；
- no exact value outside model domain。

### Property / fuzz tests

- 随机合法操作序列；
- 随机 apparatus topology；
- 极端但合法 quantities；
- undo/replay/branch consistency。

### Cross-domain torture tests

用那些跨系统的操作链测试 World，而不是仅测试单一实验模板。

### Reference-case tests

对 science engine 与权威来源/独立 engine 交叉验证。

NOBOOK 的成功说明“自由”具有极强吸引力；社区 bug 信号则说明自由是**巨大的验证债务**。

---

# 17. 真实化学细节应该成为“抽象压力测试”，不是 roadmap 触发器

倒吸、爆沸、玻璃热震、导管堵塞、回流、溢出等现象很适合检验架构，但不应因为被提到就立刻进入 backlog。

正确用法是问：

> **如果未来要正确表达这类现象，我们现在的抽象是否能够自然承载？**

例如：

## 倒吸

压力测试：Topology + Gas state + Thermal/Chemical process + Flow。

若实现时必须写：

```ts
if (experimentId === "oxygen-prep") suckBack()
```

说明 substrate 失败。

## 爆沸

压力测试：Thermodynamic phase condition 与 Kinetic/Metastability policy 是否分离。

若实现时写：

```ts
if (T > boilingPoint) boiling = true
```

则无法表达 superheating 与 nucleation。

## 玻璃炸裂

压力测试：Apparatus integrity 是否能消费热/压强/冲击状态，而不是 renderer 播事故动画。

但这并不意味着 ChemRealm v0 必须立即实现玻璃 fracture model。

### 研究原则

> **Phenomenon as architecture test, not feature demand.**

这条规则适用于以后所有竞品研究。

---

# 18. NOBOOK 的“重力、倾倒、震荡、混合、搅拌”说明操作系统与科学系统之间需要中间语义

2025 年政府采购中的 NOBOOK 化学虚拟实验技术参数明确要求：药品具有重力效果，并能呈现滚动、倾倒、震荡、混合、搅拌等现象；固体取用可以指定数值、液体可指定倾倒体积；同时要求热力学现象、压强随温度和气体量变化、温度/体积/物质的量/浓度/质量等数据追踪。[S25]

该材料不能证明每个现象的实现算法，但它说明 NOBOOK 产品语义长期覆盖了：

```text
User operation
     ↓
Operational process
     ↓
State change
     ↓
Scientific consequence + visual consequence
```

这提示 ChemRealm 不应该让 raw pointer event 直接触发 chemical solve。

中间需要领域动作：

```text
TiltVessel
TransferLiquid
ShakeVessel
StirContents
OpenValve
InsertTube
ClampApparatus
ApplyHeat
```

这些并不一定都是永久 WorldEvent；最终事件粒度要服从 event-sourcing contract，但**领域语义必须存在**。

---

# 19. NOBOOK 的观测层思维：现象不仅要“发生”，还要“可读”

NOBOOK 公司早期为外部机构开发的 RGB 溶液浓度分析软件有一个很值得注意的细节：由于摄像头颜色受光照影响，软件先做校准再进行浓度分析。[S26]

这不是 NOBOOK 化学实验核心引擎的证明，但它很好地体现一个科学可视化原则：

> **颜色不是天然等于浓度；观测值需要 measurement/observable model。**

ChemRealm 已经有更严格的方向：

```text
Scientific State
      ↓
Observable Model
      ↓
Visual State
      ↓
Renderer
```

可以继续把 NOBOOK 的视觉经验吸收进来，但必须保持这一边界。

例如溶液颜色：

- 有光谱/消光系数数据：可用 Beer–Lambert / spectral model；
- 没有可靠数据：允许经验 visual model，但明确 provenance / confidence；
- Renderer 不根据“Cu²⁺ = blue”硬编码 chemistry。

---

# 20. NOBOOK 的主要弱点也正好说明 ChemRealm 不应该复制什么

## 20.1 不复制 scientific black box

NOBOOK 公开资料会使用“精确数据”“真实现象”“速率系统”“化学平衡系统”等表述，但公开材料没有给出足以审核的：

- thermodynamic standard state；
- activity model；
- database version；
- model applicability；
- uncertainty；
- residual/convergence；
- kinetic model provenance。

因此 NOBOOK 可以作为 interaction benchmark，不能作为 Scientific Core reference implementation。

## 20.2 不复制 step-centric pedagogy

实验测评的“按步骤给分”对中考实验考试很有效，但 ChemRealm ACE 的目标不是训练固定流程，而是 mastery + transfer + independence + calibration。

## 20.3 不复制 cloud/account/privacy 模型

NOBOOK 当前服务有账号、手机号、云资源、测评/班级数据等商业产品需求，其隐私政策也对应收集账号与使用相关数据。[S27]

ChemRealm v0 的 local-first/no-account 是另一种产品约束，不应为了复制其“我的实验/班级管理”破坏隐私基线。

## 20.4 不复制 proprietary assets / scene data / UI pixel design

学习抽象，不复制：

- 器材图片；
- 动画；
- scene JSON；
- 私有代码；
- UI 布局像素；
- 品牌表达。

## 20.5 不把所有“不真实”都归咎于 2D

第三方专利批评 NOBOOK 单通道鼠标/触摸无法完整表达用户意图。[S08][S09]

这不意味着 ChemRealm 应该立刻上 VR、语音或手势追踪。

多数高中实验交互问题可以通过：

- larger semantic hit region；
- intent scoring；
- contextual handles；
- snap ports；
- progressive disclosure；
- keyboard/touch parity；

更低成本地解决。

---

# 21. 一份更精炼的 ChemRealm “FROM NOBOOK”设计原则

以下原则不是 NOBOOK 的原话，而是本研究的最终提炼。

## P1 — World over Workflow

实验模板只是 World 的初始状态/教学投影；不能成为决定世界因果的唯一脚本。

## P2 — Topology is Scientific State

器材连接、密封、阀门、导管、电极关系不是纯 UI；一旦 commit，它们是会改变科学行为的 World state。

## P3 — Geometry proposes, semantics commits

碰撞/距离只发现候选；语义 port/region/capability 决定连接。

## P4 — Preserve decisions, compress dexterity

模拟“倒到哪里、倒多少、是否夹紧、是否开阀”，而不是模拟无教育价值的手指精确轨迹。

## P5 — Forgiving preview, strict world mutation

拖拽阶段帮助用户表达意图；commit 后严格遵守 World contract。

## P6 — One World, many Policies

Sandbox / Guided / Presentation / Challenge 不复制物理世界，只改变 affordance、提示、评价和 UI projection。

## P7 — Consequence before Judgement

物理上可能的坏操作应先让世界产生后果，再由 ACE/assessment 解释；不要用红叉代替自然因果。

## P8 — Shared Substrate, not Phenomenon Engines

现象应由 topology/inventory/energy/flow/process/integrity/observable 组合产生；避免 `SuckBackEngine`、`FountainEngine`、`TubeExplosionEngine` 式架构。

## P9 — Visual legibility over photorealism

美术优先确保器材识别、液位/气泡/沉淀/读数可读，再追求材质真实。

## P10 — Asset carries semantics

器材资产不是贴图；它应能关联 interaction geometry、parts、ports、volume profile、state variants。

## P11 — Every free combination is a test obligation

Sandbox 自由度越高，invariant/property/fuzz/reference testing 越重要。

## P12 — Scientific model must remain inspectable

NOBOOK 的交互成熟度值得学习；ChemRealm 必须额外做到 model/provenance/applicability/uncertainty 可追溯。

---

# 22. 对 ChemRealm 当前阶段的影响：不要因为这份研究扩 M1 范围

当前 ChemRealm 已完成 M0 S3，M1 — Schema and Units 已获授权。

这份研究**不应导致立即重开 Accepted SPEC-0001 或把未来 apparatus/pressure/thermal 功能塞进 M1。**

原因很简单：研究的价值是提前识别长期 architecture pressure，不是让第一 vertical slice 无限膨胀。

## 22.1 M1 当前只需要做到

继续按已批准计划完成：

- units / quantity algebra；
- current World / event / scientific contracts；
- JSON Schema；
- schema versioning/migration；
- current vertical slice 必须的类型安全。

若现有 contract 没有阻止未来扩展 `Part / Port / Region / Capability`，就不要为了 NOBOOK 主动加一整套未使用 schema。

## 22.2 M2 的研究提醒

Event Runtime 设计必须继续保持：

- semantic event，不存 pointer noise；
- renderer 不成为 topology truth；
- future connection/assembly 可以自然成为 domain event；
- replay 可重建 topology 与 canonical state。

## 22.3 M6 / M7 才是 NOBOOK 研究真正进入规范的主要节点

届时应该专门形成：

- Apparatus Interaction ADR / spec；
- visual asset contract；
- hit/snap semantics；
- contextual controls；
- canvas navigation；
- usability evidence。

## 22.4 更后面的 Physical Reality track

压力/导管/沸腾/热震等不是当前 titration slice 的前置依赖。

它们应作为以后 stress cases，用来检验 substrate 是否足够通用；只有真正进入相应 slice 时才冻结模型。

---

# 23. 建议未来专门建立两条验证轨，而不是无限加“实验”

NOBOOK 的经验说明，ChemRealm 的长期验证不应该按实验数量衡量。

## 23.1 Scientific Torture Track

已经规划的：

1. acid/base titration
2. Al³⁺ / OH⁻ hydrolysis + precipitation + amphoterism
3. Fe³⁺ / SCN⁻ complex/color

继续验证 scientific model dispatcher。

## 23.2 Experimental Reality Torture Track

这不是功能 roadmap，而是未来验证 substrate 的代表性压力测试：

1. precise/forgiving liquid transfer
2. heat/cooling observable
3. connected gas topology
4. pressure-driven liquid motion
5. coupled reaction-pressure state
6. metastable phase transition
7. apparatus operating-envelope consequence
8. cross-domain accident chain

通过代表性 torture case 证明抽象，而不是做完 100 个模板后才发现 100 个模板各自有一套 if/else。

---

# 24. NOBOOK 给 ChemRealm 最重要的负面警告：自由世界会暴露“看起来对”的科学 bug

App Store 用户曾直接反馈某些胶体行为与预期不一致；大量版本更新记录也长期以“修复虚拟实验已知问题”为主。[S24][S28]

这不是对 NOBOOK 的苛责，而是自由组合模拟器的必然代价：

\[
N_{materials} \times N_{apparatus} \times N_{operations} \times N_{states}
\]

很快远超人工场景覆盖能力。

这正是 ChemRealm 为什么必须坚持：

- bounded model domain；
- explicit `MODEL_OUT_OF_DOMAIN`；
- conservation invariants；
- independent reference cases；
- replayable bug packages；
- provenance；
- no silent fallback；
- property testing。

NOBOOK 的开放世界证明了产品吸引力；它也证明**开放世界必须由验证工程托底。**

---

# 25. 最终产品定位：不是“NOBOOK + 更准”，而是两种优势的合并

最有价值的目标不是在 UI 上逐个超过 NOBOOK，也不是在 solver 上逐项炫技。

ChemRealm 应形成如下组合：

```text
NOBOOK strongest lessons
------------------------
editor/world mindset
apparatus semantics
forgiving interaction
mature visual grammar
free exploration
mode separation
consequence-oriented experiment feel

                +

ChemRealm constitution
----------------------
one scientific truth
model dispatcher
provenance & applicability
event-sourced replay/branch
scientific / observable separation
ACE learner-belief loop
local-first privacy
strict evidence gates

                ↓

High-trust explorable chemical world
```

一句话概括：

> **从 NOBOOK 学“怎样让人觉得自己真的在做实验”，但由 ChemRealm 自己回答“这个世界为什么这样发生、这个答案在什么条件下可信”。**

---

# 26. 仍未被公开资料回答的问题

以下内容目前**不能**从公开资料可靠确认，未来若要继续研究，应保持 open：

1. NOBOOK 化学当前各“引擎”的真实软件边界与通信方式；
2. 速率系统是否使用通用 rate law、经验模板还是 reaction-specific rules；
3. 化学平衡系统是否使用 concentration、activity 或其他教学近似；
4. 压强系统的状态方程、flow 模型及数值时间步；
5. 粒子引擎是 scientific state、visual particle system 还是两者混合；
6. 试管炸裂等失败后果在多大程度上是动态涌现、经验规则或 authored scenario；
7. 当前 NOBOOK Lab 的 snap/assembly 内部评分算法；
8. 美术资产是否使用 3D master → 2D sprite pipeline，公开资料无法确认；
9. current scene JSON schema；开放 API 只确认它可序列化，并未公开其内部契约；
10. 各类化学数据来源、模型版本和参数 provenance。

在没有进一步一手证据前，**这些都不应写成 NOBOOK 的事实。**

---

# 27. Source inventory

以下链接用于后续复核。等级 A/B/C/D 表示本文件第 1 节定义的证据等级。

### A — NOBOOK 官方 / 原公司一手资料

- **[S01]** NOBOOK，《Nobook 虚拟实验室：一款工具的平台梦》
  https://www.nobook.com/view/302
- **[S02]** NOBOOK，第 73 届教育装备展产品介绍：化学热力学、重力、拼装、粒子、平衡、速率、压强系统
  https://www.nobook.com/view/410
- **[S03]** NOBOOK，“让教学更简单”：热力学、导管、粒子、速率、平衡、流体等
  https://www.nobook.com/view/396
- **[S04]** NOBOOK Lab App Store：1000+ DIY 器材、8 大引擎算法、700+ 实验
  https://apps.apple.com/us/app/nobook-lab/id6742533495
- **[S05]** 原 NOBOOK 公司专利 CN104064088A，《具有动态响应的仿真实验系统》
  https://patents.google.com/patent/CN104064088A/zh
- **[S06]** NOBOOK 化学实验加试学生端使用手册（PDF）
  https://imgcdn.nobook.com/files/NOBOOK%E5%8C%96%E5%AD%A6%E5%AE%9E%E9%AA%8C%E5%8A%A0%E8%AF%95%E5%AD%A6%E7%94%9F%E7%AB%AF%20%E4%BD%BF%E7%94%A8%E6%89%8B%E5%86%8C.pdf
- **[S07]** NOBOOK，电学元器件使用：导线自动吸附
  https://www.nobook.com/view/246
- **[S10]** NOBOOK 化学实验界面及功能特性说明
  https://nobook-doc-cdn.nobook.com/chem/NB%E5%8C%96%E5%AD%A6%E5%AE%9E%E9%AA%8C%E7%95%8C%E9%9D%A2%E5%8F%8A%E7%9B%B8%E5%BA%94%E5%8A%9F%E8%83%BD%E7%89%B9%E6%80%A7%E8%AF%B4%E6%98%8E.html
- **[S11]** NOBOOK Open Platform 2.0，物理/化学实验 API：config/getData/setData
  https://open.nobook.com/docs/2.0/tutorial-integration/experimental-integration/phy-or-chem-integration/
- **[S12]** NOBOOK 物理家庭版：实验步骤实时保存、继续实验（作为平台设计历史证据）
  https://www.nobook.com/view/288
- **[S13]** NOBOOK，“检查装置气密性”资源
  https://hx-dev.nobook.com/console/templates/resource/2128_a8a9fc52373e36aa014ab5d5ec76e810/
- **[S14]** NOBOOK，“测定空气里氧气的含量”资源
  https://hx-dev.nobook.com/console/templates/resource/460_21aad64f4fe6aff318e62276e627546a/
- **[S15]** NOBOOK 初中酸碱资源目录：压强差、气球、喷泉等
  https://hx-dev.nobook.com/console/junior/1-8-50
- **[S16]** NOBOOK，“化学能转化为电能”资源
  https://hx-dev.nobook.com/console/templates/resource/2586_59db588f2d02fa8465039e36904c4d1e
- **[S19]** NOBOOK 实验测评产品页
  https://www.nobook.com/web-exam
- **[S20]** NOBOOK 当前官网
  https://www.nobook.com/index.html
- **[S21]** NOBOOK 化学实验界面概览 / 功能说明
  https://nobook-doc-cdn.nobook.com/chem/NB%E5%8C%96%E5%AD%A6%E5%AE%9E%E9%AA%8C%E7%95%8C%E9%9D%A2%E6%A6%82%E8%A7%88.html
- **[S26]** NOBOOK 原公司与中核研究院 RGB 溶液浓度分析合作案例
  https://www.nobook.com/view/161
- **[S27]** NOBOOK 当前隐私政策
  https://www.nobook.com/legal/privacy/web/index.html
- **[S28]** NOBOOK Lab 当前 App Store 版本历史
  https://apps.apple.com/us/app/nobook-lab/id6742533495

### B — 独立研究 / 教学案例 / 外部技术材料

- **[S08]** 专利 CN111968470B：以 NOBOOK 为例讨论单通道虚拟实验交互对用户意图表达的限制
  https://patents.google.com/patent/CN111968470B/en
- **[S09]** 专利 CN111665941A：多模态语义融合虚拟实验，与 NOBOOK / 真实实验比较
  https://patents.google.com/patent/CN111665941A/zh
- **[S17]** 《虚拟仿真实验在初中化学实验教学中的探索与实践》：错误操作后出现试管炸裂、液体倒吸等虚拟后果
  https://m.thepaper.cn/newsDetail_forward_12570066
- **[S18]** 刘梦鑫等，《NOBOOK虚拟实验室在初中化学教学中的应用与探索》，教育进展 2021
  https://pdf.hanspub.org/ae20210600000_43750494.pdf
- **[S25]** 2025 政府采购技术文件中 NOBOOK 化学软件技术参数：重力、滚动、倾倒、震荡、混合、搅拌、热力学/压强/数据追踪等
  https://www.ccgp-neimenggu.gov.cn/gpx-bid-file/ZF_JGBM_000001/152924/2025/7/22/402881e297e00f8c0198323fc6444d50/gpx-bidconfirm/402881ef984575740198a2e144ef0fd1.pdf?accessCode=184c4114e908393b3302731d01cd11cf
- **补充** 童文昭、王后雄，《NOBOOK虚拟实验在线上实验教学中的应用——以“氯气的实验室制法”为例》
  https://hbzx.cbpt.cnki.net/portal/journal/portal/client/paper/ba44c62ff43a535c7383ca53b8eee287
- **补充** 基于 NOBOOK 的乙醇制乙烯课例：温度、副反应、碎瓷片等
  https://jiqunzhihui.org.cn/m/view.php?aid=13076
- **补充** CN112215178B：外部专利对包括 NOBOOK 在内的虚拟化学实验“实验记录”不足的批评
  https://patents.google.com/patent/CN112215178B/zh

### C — 社区 / 用户信号

- **[S22]** Bilibili NOBOOK 搜索结果：大量自由实验、非教材玩法
  https://search.bilibili.com/all?keyword=nobook%E5%AE%9E%E9%AA%8C
- **[S23]** Bilibili，“不管了先加钠”社区玩法样本
  https://www.bilibili.com/video/BV1AAN3euEB3/
- **[S24]** 中国区 App Store 评分与评论：自由度评价以及实验边缘 bug 反馈
  https://apps.apple.com/cn/app/nb%E5%AE%9E%E9%AA%8C%E5%AE%A4/id1265400377?platform=ipad&see-all=reviews
- **补充** Bilibili 社区文化观察文章
  https://www.bilibili.com/opus/1033267894795894800

### D — Visual observation

- NOBOOK 当前官网产品截图、App Store / 当前客户端截图；仅用于视觉语法观察，不作为内部技术实现证据。

---

# 28. Final takeaway

研究 NOBOOK 最容易犯的错，是列出：

> “它有倒吸，所以我们加倒吸；它有爆炸，所以我们加爆炸；它有吸附，所以我们加吸附。”

真正应留下的是更短的一组基础判断：

1. **世界必须比实验模板更基础。**
2. **器材必须比图片更有语义。**
3. **拓扑必须比碰撞更有权威。**
4. **交互应表达意图，而不是考验像素操作。**
5. **坏操作的后果与教学评价必须分开。**
6. **视觉真实首先是状态可读。**
7. **自由组合的代价必须由验证工程承担。**
8. **竞品证明“什么值得模拟”；ChemRealm 自己证明“怎样才科学地模拟”。**

如果 ChemRealm 最终能做到：

> NOBOOK 级别甚至更好的实验操作顺滑度与视觉世界感，
> 同时保持当前已经冻结的 Scientific Truth、provenance、event sourcing、ACE 与 local-first 纪律，

那么它就不会只是“另一个虚拟实验室”。

它会更接近我们真正想做的东西：

> **一个可以被操作、被解释、被验证、被回放、被分支，而且知道自己何时不可信的 Chemical World。**
