# M4 Evidence Integrity

> **性质：** M4 科学证据工程的研究与测试原则，不替代
> `SPEC-0001`、ADR 或 acceptance matrix。

## 这次审核抽象出的失败模式

科学验证不只需要证明“结果通过”。还必须证明：

1. **验收对象没有被换掉。** 测试编号、文件名和报告行必须仍然对应
   已接受合同中的语义定义。
2. **证据命名空间没有混用。** canonical reference、独立 derivation、外部
   oracle sweep 和 adversarial case 是不同用途，不能复用同一组 ID。
3. **每个 engine 都在验证同一输入。** 独立脚本不能另藏一份 case list；
   报告不能使用与 checked-in fixture 不同的输入。
4. **偏差必须保留方向和上下文。** 通过 tolerance 只说明边界内，没有说明
   两个模型等价，更没有解释 systematic offset。
5. **失败测试必须验证失败语义。** 缺行、错误状态、缺字段、混合符号和
   namespace 错配都必须显式失败，而不是被降级、平均或静默跳过。

## 当前 M4 的证据分层

```text
SPEC-0001 REF-1…REF-10
    canonical contract fixtures
        ↓ independently derived / production-checked

ORACLE-1…ORACLE-10
    PHREEQC cross-engine sweep
        ↓ signed TS − PHREEQC report

ADVERSARIAL-*
    known failure modes, such as dilute weak-acid HH divergence
```

`REF-*` 是 SPEC 的验收身份；`ORACLE-*` 是 PHREEQC 曲线比较身份。一个
namespace 的通过不能替代另一个 namespace 的验收。

## 防回归测试矩阵

| 风险 | 机械防线 |
|---|---|
| REF 编号被重新赋予另一种 chemistry | TS/Python 都对每个 canonical ID 检查具体组分、数量、basis、case 列表与 published anchor |
| ORACLE 被伪装成 REF | manifest 要求 namespace 前缀、集合互斥、目录无 orphan JSON；report 只接受 ORACLE 顺序 |
| derivation 偷藏旧 case list | Python 检查 derivation 从 manifest 读取，并拒绝嵌入 `REF-*` catalog |
| REF-9 的 post-equivalence 输入漂移 | 逐 case 检查 `0.14` 的 post point 与合法的 `0.15` strong-base point 分属不同 case |
| report 缺点或 engine 输出不完整 | comparison 要求完整 ordered rows、OK 状态和 pH/ionic-strength 数值 |
| systematic offset 被误写成已解释 | report 保留 signed summary；mixed-sign fixture 必须得到 mixed classification |
| evidence 文案把 ORACLE 当 REF | M4 acceptance matrix 的 AC-S1/AC-S6 文案测试检查 namespace 分工 |
| 独立测试只验证 happy path | tamper、缺行、失败状态、缺字段、adversarial fixture 均有 negative coverage |

## 维护规则

- 修改 SPEC 的 REF 定义时，必须同时修改 TS/Python semantic contract tests，
  并在 commit 中说明对应 revision。
- 新增 PHREEQC 扫描点使用 `ORACLE-*` 或更具体的 `SWEEP-*`，不得占用
  `REF-*` 身份。
- 生成报告可以来自本地，但必须记录真实 source commit；`ciHardGate` 只有
  hosted pinned-toolchain run 才能设为 `true`。
- `pass: true` 的含义仅限报告中声明的比较与 tolerance；不得把它升级为
  模型等价、科学真值或 M4 S3。
- 任何新的 independent implementation 必须从 canonical fixture/manifest
  读取输入，不能复制另一份隐藏 case catalog。

## 当前边界

这套防线关闭的是“验收对象、命名空间和报告解释漂移”。它不替代 M4 尚未
完成的 AC-S3、AC-S7、AC-S10…AC-S16，也不因此改变 M4 当前的 S2 状态。
