# M6 浙江化学器材与高保真视觉目标研究

> 文档性质：M6 Representation Engine 的研究输入与资产目录依据，不是
> Scientific Reality、World Runtime 或 ACE 的替代规范。
>
> 研究日期：2026-09-15

## 结论

当前 M6 的 SVG 不能进入高质量产品路径。它的问题不是颜色偏好，而是资产
粒度不足：一套滴定台被画成几条轮廓线，缺少真实玻璃器材应有的口沿、壁厚、
颈部过渡、底部支撑、刻度、活塞/旋塞、夹具、连接件、可拆装关系和不同容量
规格。下一版资产目标是「原创、可审计、参数化、可拆装、可在浙江高中化学
实验语境中复用」；是否达到 NOBOOK 级别必须由最终截图和 owner review 决定，
不能由文档自封。

NOBOOK 的可借鉴对象不是它的素材或闭源化学实现，而是它已经把虚拟实验做成
了一个有器材库、属性/信息区、自由搭建、场景保存和操作反馈的产品表面。官方
资料提到真实实验室器具的丰富目录、自由搭建和动态操作；开放平台则把工具栏、
器材设置、器材信息、场景 JSON 和截图等能力拆成独立接口。这支持 ChemRealm
建立自己的 Catalog / Asset Package / Inspector 分层，但不支持复制 NOBOOK
资产，也不支持把 NOBOOK 的科学正确性当作证据。

## 证据等级与使用规则

| 等级 | 用途 | 例子 |
|---|---|---|
| A | 当前官方法规、标准、考试院文件，确定设计压力 | 浙江省教育考试院、教育部、国家标准信息平台 |
| B | 厂商当前规格，确定尺寸/容量/结构锚点 | DWK/DURAN、Corning/PYREX |
| C | NOBOOK 官方产品/API/历史手册，确定产品表面能力 | NOBOOK 官网、Open Platform |
| D | 视觉参考或线索，不作为科学/标准事实 | 图片搜索、社区截图、零售页 |

厂家尺寸是视觉建模锚点，不是浙江考试的强制尺寸；教学标准列出的器材族是
覆盖压力，不代表所有规格必须在首个 M6 页面同时出现。每一条 catalog entry
必须标注 `sourceClass` 和 `claimScope`，不得把“约尺寸”伪装成国家标准尺寸。

## 浙江选考对资产系统的实际压力

浙江省教育考试院的官方命题说明连续强调四件事：依课标和教材、真实情境、
实践操作/实验设计、跨模块迁移。2024 年 6 月化学命题说明点名物质性质与
实验、产品纯度测定、滴定操作合理排序；2025 年 1 月点名粗盐提纯、实验设计
与评价、真实文献/生产情境；2025 年 6 月点名分离、提纯、制备、检验和实践
操作；2026 年 1 月继续点名溶液配制、酸碱中和滴定、分离提纯与实验条件控制。

这意味着 ChemRealm 不能只做“滴定管 + 锥形瓶”的静态图。首个高质量资产
族应能为后续实验场景提供：

1. 定量器具：酸式/碱式滴定管、容量瓶、移液管、量筒、量杯/烧杯的不同
   容量和刻度等级；
2. 反应与承接器具：锥形瓶、烧杯、试管/大试管、圆底烧瓶、蒸发皿、坩埚、
   集气瓶、洗气瓶等不同口径/容量族；
3. 分离、制备和检验连接件：漏斗、长颈安全漏斗、导管、三通/四通类连接、
   橡胶管、单/双/三孔塞、尾接管、干燥管、冷凝管和夹具；
4. 运行态表达：液面/凹液面、刻度、旋塞、夹持、密封、导管连接、承接位置、
   可见的器材状态，而不是把状态藏在标签里。

### 浙江资料矩阵

| 来源 | 可确定的事实 | 对资产/交互的要求 | 证据边界 |
|---|---|---|---|
| [2024 年 6 月浙江选考命题思路](https://www.zjzs.net/art/2024/6/11/art_31_9715.html) | 依据课标与教材，强调实验、真实情境、性质与操作迁移 | 器材必须能表达实验方法与操作关系，不只做装饰 | 命题说明不是器材尺寸表 |
| [2024 年 6 月试题评析](https://www.zjzs.net/art/2024/6/11/art_31_9716.html) | 涉及物质性质与实验、产品纯度测定、滴定操作排序 | 滴定管、锥形瓶、承接/取样器具需要可区分并可检查顺序 | 具体试题图像需另行引用 |
| [2025 年 1 月命题思路](https://www.zjzs.net/art/2025/1/10/art_31_10737.html) | 粗盐提纯、实验设计、真实研究/生产情境 | 漏斗、烧杯、蒸发/过滤相关器材进入长期目录 | 只说明考查任务，不授权虚构实验结果 |
| [2025 年 1 月试题评析](https://www.zjzs.net/art/2025/1/10/art_31_10738.html) | 实验安全、提纯、实验方案与评价 | 需要可拆的塞、导管、漏斗和安全相关状态 | 不是产品 UI 规范 |
| [2025 年 6 月命题思路](https://www.zjzs.net/art/2025/6/11/art_31_11280.html) | 分离、提纯、制备、检验与实验实践并重 | Catalog 按实验能力和器材族组织，不能只按页面 demo 组织 | 不给出厂商外形 |
| [2026 年 1 月命题思路](https://www.zjzs.net/art/2026/1/9/art_31_11862.html) | 溶液配制、中和滴定、分离提纯、条件控制 | 容量瓶、滴定管、量筒、导管和连接组件要有明确规格 | 不能据此推导所有模型已实现 |

## 器材标准与规格锚点

教育部发布的 [JY/T 0655—2025 普通高中化学教学装备配置标准](https://www.moe.gov.cn/srcsite/A06/s3732/202507/W020250701322477393561.pdf)
替代旧版配置逻辑，把教学装备、实验活动和学科素养目标联系起来；教育部
的 [发布通知](https://www.moe.gov.cn/srcsite/A06/s3732/202507/t20250701_1196103.html)
确认该标准属于最新一批普通高中学科装备标准。标准及其引用的教育行业标准
包含玻璃管/玻璃棒、三通连接管（T/Y/U）、气体洗瓶、长颈安全漏斗、滴管、
滴瓶、尾接管、结晶皿、具支试管、抽滤瓶、试剂瓶、称量瓶和圆底短颈厚口烧瓶
等族。国家标准信息平台也把 [JY/T 0427—2011 三通连接管](https://std.samr.gov.cn/hb/search/stdHBDetailed?id=8B1827F2030ABB19E05397BE0A0AB44A)
列为现行教育行业标准。

实际 catalog 采用“标准族 + 规格锚点 + provenance”三层，不把单一产品页
冒充全行业规范：

| 家族 | 首批规格 | 规格锚点 | 资产策略 |
|---|---|---|---|
| 酸/碱式滴定管 | 25 mL、50 mL、100 mL | [DURAN 25 mL Class AS](https://www.dwk.com/duran-burette-class-as-with-schellbach-stripe-and-ptfe-key-25-ml-243303304) 给出 25 mL、820 mm、0.05 mL 刻度和 ±0.03 mL 容差 | 玻璃管、Schellbach/刻度、旋塞、尖嘴、夹持分别建模；100 mL 是现有 v0 世界兼容规格，需标注来源范围 |
| 锥形瓶 | 100 mL、250 mL、500 mL | [DURAN 250 mL](https://www.dwk.com/duran-erlenmeyer-flask-with-din-thread-without-cap-250-ml-218033604) 给出约 85 mm × 145 mm；[Corning 选择指南](https://www.corning.com/catalog/cls/documents/selection-guides/CLS-GL-001.pdf) 给出多容量族 | 口沿、颈部、肩部、锥体、底环、刻度和可选塞分别是层/部件 |
| 烧杯 | 100 mL、250 mL、500 mL、1000 mL | JY/T 0655 的教学装备族；厂商规格作为比例和壁厚锚点 | 低矮宽口、倒液嘴、刻度和厚底，不能画成没有嘴的圆柱 |
| 容量瓶 | 50 mL、100 mL、250 mL、500 mL | JY/T 0655 的规格族；[DURAN 250 mL Class A](https://www.dwk.com/duran-volumetric-flask-class-a-amber-with-ukas-certificate-250-ml-246743658) 给出 250 mL、约 80 mm × 210 mm、±0.15 mL 和 14/23 塞口 | 单标线、细颈、塞子、底部圆肩是识别要素；不能用锥形瓶代替 |
| 量筒 | 25 mL、50 mL、100 mL、250 mL | [DURAN 100 mL Class A](https://www.dwk.com/na/duran-measuring-cylinder-with-hexagonal-base-class-a-100-ml-213902402) 给出 29 mm × 256 mm、1 mL 刻度；25 mL 页面给出 21 mm × 167 mm、0.5 mL 刻度 | 六角底座、长筒、刻度和倾斜读数都必须进入资产层 |
| 试管/具支试管 | 16 × 150 mm、18 × 180 mm、具支变体 | JY/T 0655 引用 JY/T 0441 等教育行业标准；Fisher 教学目录可作尺寸/成套线索 | 试管口沿、圆底/平底、侧支管和夹持方式分型 |
| 连接组件 | 直管、弯管、U、T、Y、乳胶管；单/双/三孔塞；尾接管 | [JY/T 0427 平台记录](https://std.samr.gov.cn/hb/search/stdHBDetailed?id=8B1827F2030ABB19E05397BE0A0AB44A) 明确 T/Y/U 族；[Fisher 双孔塞](https://www.fishersci.com/shop/products/rubber-stopper-assortment/s67823) 说明锥形、多孔、橡胶材质 | 每个连接件有端口、内径/外径或兼容口径、可拆状态和安全限制 |

### 来源真实性规则

- `reported`：只记录来源明确报告的数值和条件；
- `manufacturer-anchor`：厂商产品规格，仅用于建模比例/尺寸锚点；
- `standard-family`：标准只证明器材族/教学配置，不自动证明具体尺寸；
- `approximate-visual`：为了统一视图而采用的比例近似，必须显式标注；
- `derived`：由来源数据换算得到，必须记录变换，不得把结果写成 source literal。

尤其不能把厂家写的 `1` 改写为 `1.000`，不能把没有给出的压力或精度补成
来源事实；这延续 M4 对 provenance fidelity 的要求。

## NOBOOK 对 ChemRealm 的可借鉴边界

[NOBOOK 化学实验产品介绍](https://www.nobook.com/view/2) 公开描述了试管、
烧杯、铁架台、烧瓶、锥形瓶、集气瓶、漏斗、导管等器具，以及自由搭建和加药
反应；[NOBOOK 开放平台实验 API](https://open.nobook.com/docs/2.0/tutorial-integration/experimental-integration/phy-or-chem-integration/)
把工具栏、器材设置、信息区、场景 JSON、保存和截图能力作为可配置表面；
[UI 组件配置文档](https://open.nobook.com/docs/2.0/tutorial-integration/experimental-integration/phy-or-chem-integration/CustomUI/)
进一步说明器材库、属性设置、播放器和信息面板的分离。由此可以借鉴：

```text
catalog → instantiate → configure → assemble → inspect → observe → save
```

但必须保留 ChemRealm 的三条红线：

1. NOBOOK 的图片、模型、品牌布局和闭源实现不进入仓库；所有 master 由
   ChemRealm 自己绘制，source-record 明确原创；
2. Catalog / geometry 不能决定化学状态，World Runtime 和 Scientific Core
   仍是唯一事实源；
3. M6 只落地 Representation Engine 的资产包和静态 composition，不声称
   已经实现 NOBOOK 的完整交互、教学、音效或化学覆盖。

### NOBOOK product-surface audit and the correct benchmark

The official integration surface exposes independent visibility/configuration
for top, left, right and bottom toolbars, settings, save, player controls,
information and the equipment library. The official chemistry UI material also
distinguishes a construction/editor surface from a cleaner demo/player surface:
the former exposes search, category, equipment properties, zoom and rotation;
the latter prioritizes the experiment stage and hides authoring chrome. This is
useful evidence for **surface separation**, not permission to reproduce the
same toolbar order, panel widths, icon shapes or scene arrangement.

NOBOOK should be treated as a lower-bound product benchmark for clarity,
discoverability, recognizability and feedback density—not as an industrial CAD
or photorealistic rendering target, and not as ChemRealm's design bible. The
ChemRealm target is therefore:

```text
credible physical structure
  + clean, low-saturation material language
  + readable at thumbnail and scene scale
  + reusable parts/ports and detachable relations
  + explicit state/effect overlays
  + measurement-qualified frontal presentation
  + original layout and visual identity
```

The main world may use an orthographic camera with restrained 2.5D depth cues
for rims, walls, rear hardware and ports. Only the separate measurement
presentation is qualified for readings. Catalog, inspector and construction
previews may use bounded 2.5D and must say `non-measurement view`. This avoids
the false choice between a flat engineering diagram and a perspective-heavy
game scene.

The asset production unit is consequently not one PNG/SVG:

```text
master/construction
  → scene LOD
  → preview LOD
  → thumbnail LOD
  → state/effect overlays
  → manifest + parts/ports + profile + provenance + QA
```

The preview and thumbnail retain the silhouette and identity-defining features
(opening/neck, spout/outlet, actuator, side arm, stopper or detachable cue),
but may omit minor graduations, tiny labels, micro seams and noncritical
shadows. They share semantic dimensions and profile identity with the master;
they are not simply the construction artboard scaled down and they are never
measurement evidence.

The visual QA baseline uses four rendered-size classes rather than a fixed
1440-pixel stroke recipe. This follows the general purpose of LOD—reducing
detail and rendering cost for smaller/distant representations—while preserving
ChemRealm's stronger requirement that every LOD remain semantically
recognizable. A dual-background review is required: dark neutral and light
neutral. A black outline on a light background or a white halo on a dark
background is not an acceptable substitute for material contrast.

## 首批资产包的完整性定义

同一种器材不是一个 `assetId` 加一个可变 label，而是：

```text
familyId
└─ specificationId
   ├─ dimensions / capacity / graduation
   ├─ material / accuracy class
   ├─ parts[]
   ├─ ports[]
   ├─ detachable parts selected by `parts[].detachable`
   ├─ stateVariants[]
   ├─ profile/geometry identity
   ├─ provenance[]
   └─ qa evidence
```

首批必须具备：

- ≥3 个滴定管规格；
- ≥3 个锥形瓶规格；
- ≥4 个烧杯规格；
- ≥4 个容量瓶规格；
- ≥4 个量筒规格；
- 直/弯/U/T/Y 导管和乳胶管；
- 单/双/三孔塞；
- 可声明端口兼容性和 `detach` capability；
- 同一视觉家族的透明玻璃、陶瓷/橡胶、金属、液体/刻度状态层。

这不是声称首个页面要同时展示所有器材；它是 M6 资产生产合同，页面首片只
从中选择一个稳定的滴定台 composition。完整目录 UI、拖拽、连接命令和真实
化学过程仍然属于后续阶段。

## 视觉验收目标

目标不是“看起来像实验器材”，而是让受过高中化学训练的人能从轮廓和细节
区分器材用途，并能读出运行态：

- 统一正交/侧立面视图、光源方向、玻璃色温和描边层级；
- 玻璃具有口沿、内壁/外壁高光、底部厚度、液面凹液面和不透明度层；
- 金属架具有底座厚度、立杆、双夹/夹头、旋钮和接触关系；
- 滴定管有 0 起点向下增大的刻度、主/次刻度、旋塞、尖嘴和可读单位；
- 锥形瓶有颈、肩、锥身、底环、口沿和量液层；
- 烧杯有倒液嘴、厚底、刻度线和开放口沿；
- 连接件以可拆卸模块呈现，而非焊死在器材轮廓内；
- 颜色信息始终来自 Observable/OpticalObservation；几何材质色不能冒充
  指示剂化学颜色；
- 窄视口保留 DOM 读数，不以缩小画布掩盖重要状态。
- Gold Master 先覆盖酸式/碱式滴定管、100/250/1000 mL 烧杯和
  100/250/500 mL 锥形瓶；其余器材族在同一构造系统中继续扩展，但不能以
  “目录数量多”替代首批视觉验收。
- 同一器材 geometry 复用 empty/loaded/gas/precipitate/bubble/thermal/optical
  state；现象是 Observable/RenderState 的 overlay，不生成
  `bubbling-beaker.svg` 等按化学现象复制的器材资产。
- 计量读数必须进入 measurement view；滴定管刻度 0 在上、向下递增，凹液面
  读最低点，读数以 mL 和声明精度呈现。剩余液量和滴定管刻度读数不是同一
  个量。

M6 的截图只能称为 candidate capture，达到 NOBOOK 或超过 NOBOOK 的判断
必须由 owner 对四个命名视口逐张审阅；若细节在 tablet/narrow 中不可辨识，
则不是“响应式通过”，而是资产/构图未通过。

## 研究局限与后续

浙江官方文件给出命题压力和实验能力方向，但没有授权复制试题图片或把每年
试卷当器材标准；厂家页面给出产品规格，但不是中国高中教学配置的全部集合；
NOBOOK 页面给出产品表面能力，但不能证明其科学内核。M6 因此只冻结可审计的
资产契约和首批原创视觉层，后续仍需要：

- 按浙江具体题型建立 scenario/asset coverage 矩阵；
- 对高频实验器材做逐件 source review；
- 用真实连接/拆卸操作进入 M7 World command boundary；
- 用截图、可访问 DOM、原创性检查和 owner visual review 形成 S3 证据。

## 研究结论如何转成可验收的资产规则

| 研究观察 | ChemRealm 规则 | 证据形式 |
|---|---|---|
| NOBOOK 将工具栏、器材库、属性/信息区、播放器表面分层 | 允许 `experiment-world`、`measurement`、`catalog-preview`、`inspector`、`construction`、`demo-player` 模式；禁止复制具体布局 | view-mode metadata、截图、原创性审查 |
| 小尺寸器材仍需可识别 | thumbnail LOD 保留开口/颈/嘴/阀/侧管等身份特征；minor/micro detail 可合并 | 32–96 px capture + layer assertion |
| SVG 有逻辑 viewBox/比例保持机制 | viewBox 只管逻辑画布，保留 mm 语义；不得让 SVG 缩放掩盖错误的物理 profile | manifest + profile round-trip |
| 细线抗锯齿会损失可读性 | size-class stroke clamp + 双背景人工 review；重要非文本图形目标至少 3:1 | token QA + contrast record |
| 浙江选考强调实验设计、操作和迁移 | 目录覆盖定量、承接、分离/制备/检验与连接件，首批 Gold Master 先验证代表性家族 | Zhejiang coverage matrix + family comparison sheets |

上述规则仍然不把产品界面或器材外形宣称成国家标准事实。尺寸来源是
`manufacturer-anchor` 或 `reported` 时才可作为尺寸证据；标准只证明标准族或
教学配置；统一视图所需的近似必须标注 `approximate-visual`。

## 文档闭合补充：器材机构、视图与视觉 token

本轮视觉标准把此前容易混淆的六项边界正式写入 M6 文档：

1. 酸式滴定管和碱式滴定管不是同一资产换标签。酸式使用玻璃/PTFE
   旋塞，碱式使用橡胶管、玻璃珠和夹 pinch 区域；两者必须有不同的
   `ApparatusActuator` 与未来 command intent。教学参考可见
   [酸式/碱式滴定管结构与使用说明](https://www.muhn.edu.cn/ecmd/info/1481/14785.htm)，
   但该页面只作结构线索，不替代尺寸或精度来源。
2. 实验/测量视图固定为严格正交侧视；目录、检查器和构造预览可以用有界
   2.5D/轴测视图展示接口和可拆部件，但必须标为非测量视图。
3. 视觉 token 现在以相对描边层级、透明度、高光/阴影范围、材质明度跨度
   和最小文字尺寸约束；黑色粗描边、糖果玻璃、气刷发光、液体溢出、玩具化
   比例、混合光向和无语义装饰连接件列为禁用模式。
4. NOBOOK 只允许学习产品层的可发现性、器材目录、信息分面、组合反馈和
   状态可读性；禁止复制其资产、截图、布局、独特 UI 编排、像素细节或可识别
   的整场景构图。
5. 同族规格的每个几何差异都必须标注 `reported`、`manufacturer-anchor`、
   `standard-family` 或 `approximate-visual`，并能追溯来源或近似理由。QA
   同时使用物理尺度比较表和归一化形状比较表，避免把视觉归一化图误作尺寸证据。
6. 导管、塞、旋塞、夹具和量取动作以部件、端口、hit region、capability 和
   actuator 显式建模；静态 M6 可以只交付契约，不把指针噪声伪装成 World event。

## 运行时可落地性补充

把 NOBOOK 的公开产品表面能力转换成 ChemRealm 的完整 GOAL，关键不是把
所有器材做成同一种 SVG，而是让同一资产在不同投影中可复用：

| 后续 GOAL 能力 | M6 资产包必须提供 |
|---|---|
| 器材库/目录 | family、variant、容量、可访问名称、thumbnail、source/licence |
| 场景编辑/组合 | parts、ports、anchors、capabilities、可拆部件和兼容关系 |
| 实验态/播放器 | scene runtime export、动态液面/现象 overlay、固定 frame identity |
| 检查器/测量 | physical dimensions、graduation semantics、V(h)/h(V)、measurement view |
| 多规格器材 | 独立 variant silhouette、profile identity、规格来源与比较表 |
| 后续 WebGL/Pixi/WASM | backend-neutral manifest、纹理回退、结构化 mask、稳定 Observable 边界 |

因此当前采用分层源文件、高分辨率视觉主体、可选 SVG/path/mask 和运行时
Observable layer 的 hybrid package。它同时满足真实器材的细节表现与后续
交互所需的可寻址结构。single bitmap、embedded-raster SVG 或没有来源记录
的外部 ZIP 只能作为参考/概念输入，不能成为 Gold Master。

这条结论与浙江教学压力是一致的：器材必须支持正确的读数、连接、承接、
配制和操作语义；视觉层不能用漂亮的近似掩盖缺少刻度、旋塞、导管、夹具、
容量差异或可拆关系。

## Sources

### Zhejiang examination and education standards

1. [浙江省教育考试院：2024 年 6 月选考科目命题思路](https://www.zjzs.net/art/2024/6/11/art_31_9715.html)。用于实验情境、教材依标和能力迁移的命题压力；不用于推导器材尺寸。
2. [浙江省教育考试院：2024 年 6 月选考科目试题评析](https://www.zjzs.net/art/2024/6/11/art_31_9716.html)。用于滴定、实验操作和物质性质/实验覆盖线索。
3. [浙江省教育考试院：2025 年 1 月选考科目命题思路](https://www.zjzs.net/art/2025/1/10/art_31_10737.html)。用于粗盐提纯、实验设计和真实情境覆盖线索。
4. [浙江省教育考试院：2025 年 1 月选考科目试题评析](https://www.zjzs.net/art/2025/1/10/art_31_10738.html)。用于实验安全、提纯和方案评价线索。
5. [浙江省教育考试院：2025 年 6 月选考科目命题思路](https://www.zjzs.net/art/2025/6/11/art_31_11280.html)。用于分离、提纯、制备、检验和实践操作覆盖线索。
6. [浙江省教育考试院：2026 年 1 月选考科目命题思路](https://www.zjzs.net/art/2026/1/9/art_31_11862.html)。用于溶液配制、中和滴定、分离提纯和条件控制覆盖线索。
7. [教育部：JY/T 0655—2025 普通高中化学教学装备配置标准（PDF）](https://www.moe.gov.cn/srcsite/A06/s3732/202507/W020250701322477393561.pdf)。用于器材族和教学装备语境；不自动证明具体厂家尺寸。
8. [国家标准信息公共服务平台：JY/T 0427—2011 三通连接管](https://std.samr.gov.cn/hb/search/stdHBDetailed?id=8B1827F2030ABB19E05397BE0A0AB44A)。用于 T/Y/U 连接管族的行业标准线索。

### NOBOOK product-surface references

9. [NOBOOK 化学实验产品页](https://www.nobook.com/view/2)。用于器材库、自由搭建和实验表面能力的产品级参考，不作为 ChemRealm 的素材或科学证据。
10. [NOBOOK 实验 API 集成文档](https://open.nobook.com/docs/2.0/tutorial-integration/experimental-integration/phy-or-chem-integration/)。用于工具栏、器材设置、信息区、场景 JSON 和截图能力的表面分层参考。
11. [NOBOOK 化学实验 UI 配置文档](https://open.nobook.com/docs/2.0/tutorial-integration/experimental-integration/phy-or-chem-integration/CustomUI/)。用于器材库、属性设置、播放器和信息面板的分层线索。
12. [NOBOOK 化学实验学生端历史手册（PDF）](https://imgcdn.nobook.com/files/NOBOOK%E5%8C%96学%E9%AA%8C%E5%AE%9E%E9%AA%8C%E5%8A%A0%E8%AF%95%E5%AD%A6%E7%94%9F%E7%AB%AF%20使用手册.pdf)。仅用于历史产品表面能力交叉参考，不作为实现或资产来源。

### Manufacturer and laboratory-equipment anchors

13. [DWK/DURAN 25 mL Class AS burette](https://www.dwk.com/duran-burette-class-as-with-schellbach-stripe-and-ptfe-key-25-ml-243303304)。用于 25 mL 滴定管、Schellbach 条纹、刻度和结构比例锚点。
14. [DWK/DURAN 250 mL Erlenmeyer flask](https://www.dwk.com/duran-erlenmeyer-flask-with-din-thread-without-cap-250-ml-218033604)。用于锥形瓶尺寸与肩/颈比例锚点。
15. [DWK/DURAN 250 mL Class A volumetric flask](https://www.dwk.com/duran-volumetric-flask-class-a-amber-with-ukas-certificate-250-ml-246743658)。用于容量瓶颈部、瓶肩、塞口和容量族锚点。
16. [DWK/DURAN 100 mL Class A measuring cylinder](https://www.dwk.com/na/duran-measuring-cylinder-with-hexagonal-base-class-a-100-ml-213902402)。用于量筒六角底座、刻度和比例锚点。
17. [DWK/DURAN 25 mL Class B measuring cylinder](https://www.dwk.com/duran-measuring-cylinder-with-hexagonal-base-class-b-25-ml-213961403)。用于小规格量筒的直径、高度和刻度族锚点。
18. [Corning/PYREX laboratory glassware selection guide](https://www.corning.com/catalog/cls/documents/selection-guides/CLS-GL-001.pdf)。用于多容量玻璃器材族和识别特征的交叉参考。
19. [Fisher rubber stopper assortment](https://www.fishersci.com/shop/products/rubber-stopper-assortment/s67823)。用于锥形橡胶塞和多孔塞的结构/材质参考。
20. [国家标准信息公共服务平台：GB/T 12805—2011 玻璃仪器 滴定管](https://std.samr.gov.cn/gb/search/gbDetailed?id=71F772D7FD44D3A7E05397BE0A0AB82A)。用于滴定管标准族/计量语境，不替代具体资产尺寸。
21. [教学实验参考：酸式与碱式滴定管](https://www.muhn.edu.cn/ecmd/info/1481/14785.htm)。用于玻璃旋塞与橡胶管/玻璃珠机构、刻度方向和读数操作线索。
22. [DWK/PYREX 25 mL burette reference](https://www.dwk.com/pyrex-automatic-burette-class-as-schellbach-stripe-with-ptfe-key-and-intermediate-stopcock-25-ml-349604as)。用于 Schellbach 条纹、PTFE 旋塞、容量/刻度和制造商规格锚点。
23. [W3C WCAG 2.2 non-text contrast](https://www.w3.org/WAI/WCAG22/understanding/non-text-contrast.html)。用于有意义非文本图形和控件状态对比度参考。
24. [MDN SVG `viewBox`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/viewBox) 与 [`preserveAspectRatio`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/preserveAspectRatio)。用于 SVG 逻辑坐标和比例保持边界。
25. [MDN SVG `vector-effect`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/vector-effect)。用于 `non-scaling-stroke` 的适用范围判断，不替代尺寸级 token。
26. [Unity Level of Detail guidance](https://docs.unity3d.com/es/2020.2/Manual/LevelOfDetail.html)。用于 LOD 的通用表现/性能 rationale，不作为 ChemRealm 科学或器材事实来源。
