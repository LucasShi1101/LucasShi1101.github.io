---
layout: post
title: "把纯视觉和纯文本模型直接“拼”出多模态能力！NUS 等提出 SAVERA：稀疏对齐 + 视觉证据复用，打破冻结模型跨模态拼装瓶颈"
date: 2026-11-24 15:42:30 +0000
description: "通过稀疏对齐和视觉证据复用，将冻结的视觉模型与语言模型拼接成多模态系统。"
design_theme: savera
paper_short: SAVERA
hero_image: /assets/img/blog/covers/savera.webp
---

> **导读**：把一个**从未见过文本的纯视觉模型（如 DINOv2）**，和一个**从未见过图像的纯文本大语言模型(如 Vicuna)** 直接“拼”在一起——**两边参数全程冻结、不动一根毫毛**，能不能拼出既能看图说话、又能精准问答、还不易产生幻觉的多模态大模型？
>
> 近日，来自**新加坡国立大学（NUS）NEXT++ 研究中心、悉尼大学与新加坡管理大学（SMU）**的研究团队联合提出了全新跨模态拼装框架 **SAVERA**。针对独立预训练视觉与文本模型“直接拼装”时的两大顽疾，SAVERA 创新性地结合**共享稀疏空间双层级对齐（SPARE + BEAM）**与**提示词引导的残差视觉证据复用（PRIVA）**。在全程冻结骨干网络、且**仅用 CC3M 图文对训练接口**的极简设定下，SAVERA 在图像描述（MS-COCO）与视觉问答（COCO-QA、POPE）任务上全面超越主流连接器与几何映射方法，POPE 准确率高达 **82.90%**（领先最强基线 **+8.97%**），真正打通了独立单模态模型“即插即拼”的最后一公里！

## 论文基本信息

* **论文标题**：*SAVERA: Bridging Frozen Vision and Language Models via Sparse Alignment and Visual Evidence Reuse*
* **作者团队**：Jiajun Shen\* (NUS), Chuancheng Shi\* (USYD), Jiayi Lyu (NUS), Yanpeng Sun (SMU), Fei Shen† (NUS), Tat-Seng Chua (NUS)（\*共同第一作者，†通讯作者）
* **所属机构**：新加坡国立大学（National University of Singapore）、NEXT++ 研究中心、悉尼大学（University of Sydney）、新加坡管理大学（Singapore Management University）
* **论文链接**：[arXiv:2611.32828](https://arxiv.org/abs/2611.32828)
* **代码链接**：https://github.com/Jun-Shen04-Jia/SAVERA
* **发布时间**：2026 年 11 月 24 日

![标题]({{ '/assets/img/blog/savera-sparse-alignment/F1.png' | relative_url }})

---

## 一、核心命题：如何把“各训各的”视觉与文本模型直接拼起来？

在多模态大模型的发展中，一个极具吸引力的范式是 **“模块化拼装”**：视觉社区有极强的纯视觉自监督模型（如 DINOv2），NLP 社区有极强的纯文本大语言模型（如 Vicuna/LLaMA）。“柏拉图表征假说”（Platonic Representation Hypothesis）指出，不同模态独立预训练的模型会逐渐收敛到对同一物理世界的相似表征结构——这意味着我们理论上无需耗费巨资从头联合预训练，而是可以**直接将现成的视觉模型与文本模型“拼”在一起，组合出多模态能力**。

但真要把两个**独立预训练、全程冻结**的视觉和文本模型直接拼起来，远没有想象中简单。不同于基于 CLIP（本身就经过海量图文联合预训练）的传统管线，面对纯粹单模态的视觉与文本表征，现有的“拼装接口”主要走两条路，却都陷入了明显瓶颈（图 1）：

1. **可学习连接器（Learned Connector）——“拼上了，但爱胡说”**：如 MiniGPT-4 的线性投影、LLaVA-1.5 的两层 MLP、BLIP-2 的查询重采样（Q-Former）以及 InternVL 的 Pixel-Unshuffle，试图直接把视觉特征映射成语言前缀。然而，单向适配往往只顾着“让 LLM 听得懂”，却在投影中折损了物体、数量、空间位置等原始视觉细节，导致模型高度依赖语言惯性脑补，引发严重的**视觉幻觉（Visual Hallucination）**。
2. **几何映射（Geometric Mapping）——“对齐了，但看不懂动作”**：以正交旋转（Orthogonal Rotation）为代表的方法试图通过保几何变换把视觉空间“转”到文本空间。虽然能恢复粗粒度的全局对应，却难以刻画复杂场景中的细粒度动作、交互关系与多对多语义，极易出现**活动与事件误判（Activity Misinterpretation）**。

![图 1：三类视觉-语言直接拼装接口对比]({{ '/assets/img/blog/savera-sparse-alignment/F2.png' | relative_url }})
*图 2：三类视觉-语言接口范式对比。（a）可学习连接器易引发视觉幻觉；（b）几何映射常导致动作误解；（c）SAVERA 通过共享稀疏跨模态对齐与原始视觉证据复用，将冻结的视觉与文本模型高质量拼装在一起。*

研究团队通过系统性的特征探针实验揭示了一个本质矛盾：**把视觉特征向文本空间适配，虽然让它“更会说话”，却会让原始视觉证据（尤其是空间关系与物体信息）变得更难读取。**

因此，要把文本和视觉真正高保真地“直接拼起来”，必须同时做到两件事：
* **拼得准（细粒度对齐）**：打破全局粗对齐局限，在细粒度语义概念与神经元层级打通视觉与文本的精准对应；
* **拼得真（原始证据复用）**：不能在拼装时把原图信息“洗掉”，而是要让语言模型在回答具体问题时，既能用上适配后的跨模态语义，又能直接回溯并复用原始视觉特征。

---

## 二、方法详解：SAVERA 如何实现视觉与文本的高保真“直接拼装”？

为此，研究团队提出了 **SAVERA**（**S**parse **A**lignment with **V**isual **E**vidence-guided **R**esidual **A**daptation）。整个框架将纯视觉骨干 **DINOv2-L/14** 与纯文本骨干 **Vicuna-7B-v1.5** **全程冻结**，通过三大核心模块构成一套“先统一接口并精细对齐，再按提示词残差回流原图证据”的完整拼装流水线（图 2）。训练分为两阶段：第一阶段联合训练 **SPARE + BEAM**，冻结后再训练 **PRIVA**。

![图 2：SAVERA 整体架构概览]({{ '/assets/img/blog/savera-sparse-alignment/F3.png' | relative_url }})
*图 3：SAVERA 框架总览。SPARE 为原始视觉（Vision）、桥接特征（Bridge）与文本（Text）构建共享稀疏编码空间；BEAM 通过非线性桥接与样本-神经元双层级对齐打通视觉与文本语义；PRIVA 冻结前两模块，根据输入提示词动态融合原始视觉与桥接特征，以残差方式修正送入冻结 LLM 的视觉前缀。*

### 1. SPARE：为视觉和文本打造“同一套稀疏语言坐标系”

独立预训练的视觉特征 $H_V$ 和文本隐状态 $H_T$ 本身处于完全异构的稠密空间，直接硬拼必然水土不服。**SPARE**（Shared-space Projection, Activation Reconstruction, and Encoding）先通过轻量级的模态专属 Stem（$S_V, S_T$）将双模态映射至统一宽度（$d_c = 4096$），随后将**原始视觉（Vision）**、**适配后桥接视觉（Bridge）**与**文本（Text）**三路特征送入**同一个共享软门控稀疏编码器** $E$，展开到 $K = 16,384$ 维的共享稀疏概念空间：

$$
A(U) = \mathrm{RMSNorm}(U)W_E^\top + b_E
$$

$$
E(U) = \sigma\left(\frac{A(U) - \theta}{\tau}\right) \odot \mathrm{softplus}(A(U))
$$

这里 $\theta$ 是可学习的神经元阈值，$\tau$ 为门控温度（在训练前 $70\%$ 步数内由 $1.0$ 对数线性退火至 $0.1$）。相比硬 Top-$K$ 截断，软门控全程可微，配合激活预算（目标激活数 $K_0 = 64$）、二值化与软 $L_0$ 正则（$\mathcal{L}_{sp}$），能够自然分解出细粒度、低冗余的概念特征。

同时，SPARE 为三路特征分别配备独立的线性解码器 $D_V, D_B, D_T$（对应重建损失 $\mathcal{L}_{rec}$）：**编码共享坐标系，解码各保原信息**，既为视觉和文本搭起了通用拼装接口，又防止任一模态在压缩中丢失自身细节。

### 2. BEAM：非线性桥接 + “样本与神经元”双层级咬合对齐

有了共同坐标系，还需要把视觉概念与文本概念真正“对上号”。**BEAM**（Bridge-Text Embedding and Activation Matching）引入一个可学习的非线性 MLP 桥接映射 $M_B$（$16384 \rightarrow 2048 \rightarrow 4096$），将原始视觉稀疏表征 $Z_V$ 转换为语言兼容的桥接表征 $U_B = M_B(Z_V)$、$Z_B = E(U_B)$，并由 $D_B$ 解码得到初始视觉前缀 $X_B = D_B(Z_B)$。

接着，BEAM 在**样本级**和**神经元级**两个互补维度上，将桥接视觉 $Z_B$ 与描述文本 $Z_T^Y$ 进行双向对齐：

* **样本级双向对齐（Sample-level Alignment）**：将池化后的 $Z_B$ 与 $Z_T^Y$ 经共享头投影并做 $l_2$ 归一化，采用双向 SigLIP 风格的 Sigmoid 对比损失（搭配至多 $512$ 条历史脱离梯度负样本的 FIFO 缓存库），拉近全局图文对应：
  $$
  l_{B \rightarrow T} = \mathbb{E}_{i,j}\left[\mathrm{softplus}(-y_{ij} r_{ij})\right], \quad \mathcal{L}_{pair} = \frac{\lambda_{pair}}{2}\left(l_{B \rightarrow T} + l_{T \rightarrow B}\right)
  $$

* **神经元级响应轮廓对齐（Neuron-level Alignment）**：仅有样本级对齐，无法保证第 $k$ 个稀疏神经元在看图和读文时代表同一个概念。为此，BEAM 采样 $q = 512$ 个稀疏神经元，收集它们在跨样本维度（结合至多 $256$ 条历史样本上下文）上的门控前响应矩阵 $R_B, R_T \in \mathbb{R}^{N \times q}$，利用**对称 InfoNCE** 匹配跨模态神经元激活轮廓，并引入 **Barlow Twins 冗余消除正则**，迫使跨模态相关矩阵 $C = \frac{1}{N}\tilde{R}_B^\top \tilde{R}_T$ 趋近单位阵：
  $$
  \mathcal{L}_{profile} = \lambda_{nce}\mathcal{L}_{NCE} + \frac{\lambda_{diag}}{q}\sum_{k}(1 - C_{kk})^2 + \frac{\lambda_{off}}{q^2}\sum_{k \neq j}C_{kj}^2
  $$

第一阶段联合语言建模、重建、稀疏与双层级对齐损失共同优化：
$$
\mathcal{L}_{adapt} = \lambda_{LM}\mathcal{L}_{LM}^B + \mathcal{L}_{rec} + \mathcal{L}_{sp} + \mathcal{L}_{pair} + \mathcal{L}_{profile}
$$

### 3. PRIVA：拼装不丢原图——提示词引导的残差视觉证据复用

SPARE 与 BEAM 冻结后，已经能输出具备良好语言表达能力的桥接前缀 $X_B$。但为了把适配过程中衰减的底层视觉证据“找回来”，**PRIVA**（Prompt-conditioned Residual Integration of Vision and Adapted Features）将**原始视觉 $Z_V$**、**桥接视觉 $Z_B$** 与**用户输入提示词 $Q$ 提取的文本特征 $Z_T^Q$** 三路汇聚（注意：训练与推理均只输入提示词 $Q$，目标答案绝不进入融合路径），独立映射至 $d_f = 512$ 维空间得到 $V, B, T$：

1. **提示词条件逐 Patch/逐通道门控**：以池化提示词 $\overline{T}$ 为条件生成门控 $G$，让原始视觉 $V$ 无损直通，按需调制桥接特征 $B$ 的融合权重：
   $$
   G = \sigma\left(g([V; B; \overline{T}])\right), \quad H_0 = \mathrm{LN}(V + G \odot B)
   $$

2. **空间自注意力 + 提示词交叉注意力**：加入可缩放二维位置编码 $\alpha PE_{2D}$ 后，通过 8 头空间自注意力（$H_S$）建模图像内部空间结构，再以视觉特征为 Query、提示词各 Token 为 Key/Value 执行 8 头交叉注意力（$H_C$），精准按需检索与当前问题相关的视觉证据，最后经 FFN 得到 $H_F$：
   $$
   H_P = H_0 + \alpha PE_{2D}, \quad H_S = \mathrm{LN}(H_P + \mathrm{SA}(H_P))
   $$
   $$
   H_C = \mathrm{LN}(H_S + \mathrm{CA}(H_S, T, T)), \quad H_F = \mathrm{LN}(H_C + \mathrm{FFN}(H_C))
   $$

3. **门控残差修正视觉前缀**：PRIVA 不推翻已经与 LLM 对齐好的桥接前缀 $X_B$，而是以可学习标量 $\gamma$ 控制幅度，预测一个精准的**残差修正项** $\Delta X$：
   $$
   X_F = X_B + \sigma(\gamma)P_F(H_F)
   $$

最终，冻结的 Vicuna 直接接收拼接后的 $[X_F; \mathrm{Embed}(Q)]$ 自回归生成答案。训练时辅以停止梯度答案教师语义对齐（$\mathcal{L}_{sem}$）、施加于 $H_S$ 的 DINOv2 特征保持损失（$\mathcal{L}_{vis}$）及残差幅度约束（$\mathcal{L}_{res}$）：
$$
\mathcal{L}_{PRIVA} = \mathcal{L}_{LM}^F + \lambda_{sem}\mathcal{L}_{sem} + \lambda_{vis}\mathcal{L}_{vis} + \lambda_{res}\mathcal{L}_{res}
$$
所有辅助头在推理阶段全部移除，轻量高效。

---

## 三、实验验证：同台竞技，全面刷新“纯视觉 + 纯文本”拼装上限

为了公平检验不同接口将纯视觉与纯文本模型“直接拼起来”的真实实力，所有对比方法均严格采用完全一致的冻结骨干（**DINOv2-L/14 + Vicuna-7B-v1.5**）与完全一致的训练数据（**仅 CC3M 图文对，零 COCO-QA / POPE 标注微调**），涵盖 6 种代表性连接器与正交几何旋转。

### 1. 主基准定量对比：描述、问答、抗幻觉全线第一

| 拼装方法（均基于冻结 DINOv2-L/14 + Vicuna-7B-v1.5） | CIDEr $\uparrow$ | B-4 $\uparrow$ | $\text{CHAIR}_s$ (%) $\downarrow$ | $\text{CHAIR}_i$ (%) $\downarrow$ | COCO-QA Acc. (%) $\uparrow$ | POPE Acc. (%) $\uparrow$ |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| BLIP-2 (QR-64) | 0.1944 | 0.0873 | 31.60 | 26.47 | 17.16 | 61.95 |
| Honeybee (C-Abstractor Lite) | 0.2303 | 0.1033 | 32.04 | 23.40 | 23.88 | 73.93 |
| BLIP-2 (QR-32) | 0.2627 | 0.1008 | 33.70 | 28.33 | 17.74 | 59.32 |
| MiniGPT-4 (Linear Projector) | 0.2855 | 0.1133 | 21.64 | 16.21 | 21.32 | 61.74 |
| Orthogonal Rotation（正交几何映射） | 0.3546 | 0.1213 | 18.74 | 14.82 | 25.13 | 70.29 |
| LLaVA-1.5 (MLP 2-layer) | 0.4687 | 0.1468 | 11.26 | 8.50 | 33.50 | 66.81 |
| InternVL (Pixel-Unshuffle) | 0.5107 | 0.1522 | 13.84 | 10.67 | 34.14 | 57.22 |
| **SAVERA (Ours)** | **0.5621** | **0.1571** | **9.08** | **8.15** | **36.07** | **82.90** |

**核心结果亮点**：
* **图像描述（MS-COCO Karpathy 5,000 图）**：SAVERA 的 CIDEr 达到 **0.5621**（领先最强基线 InternVL **+0.0514**），BLEU-1 至 BLEU-4 与 ROUGE-L（0.4430）全面领跑；同时将句子级幻觉率 $\text{CHAIR}_s$ 压低至 **9.08%**（较 InternVL 降低 **4.76%**），实例级幻觉率 $\text{CHAIR}_i$ 降至 **8.15%**。
* **零样本视觉问答（COCO-QA）**：在完全未见过任何 QA 训练数据的前提下，SAVERA 取得 **36.07%** 整体准确率（领先 InternVL **+1.93%**），并在 Object（38.15%）、Number（11.03%）、Color（38.62%）、Location（34.41%）四大题型中全部夺冠。
* **物体存在性验证（POPE）**：SAVERA 拿下 **82.90%** 的平均准确率，大幅领先次优基线 Honeybee（73.93%）**+8.97 个百分点**，领先 InternVL（57.22%）高达 **+25.68 个百分点**。无论在 Random（84.27%）、Popular（82.83%）还是最具对抗性的 Adversarial（81.60%）采样策略下均保持绝对优势。

### 2. 逐图胜率与定性效果：不只是平均分高，而是张张稳赢

在 MS-COCO 5,000 张测试图上的逐图 CIDEr 胜负统计（图 7）表明，SAVERA 相对 7 个基线的单图胜率达到 **54.0%–79.9%**（对 InternVL 胜率 54.0%，对 LLaVA-1.5 胜率 57.5%，对正交旋转胜率 70.4%，对 BLIP-2 QR-64 胜率 79.9%），证明性能提升广泛覆盖各类真实场景。

![图 7：MS-COCO 5,000 张测试图上的逐图 CIDEr 胜率对比]({{ '/assets/img/blog/savera-sparse-alignment/F7.png' | relative_url }})

*图 7：MS-COCO Karpathy 测试集上 SAVERA 相对各连接器及正交旋转基线的逐图 CIDEr 胜率分布。*

从定性案例（图 3、图 4）可以直观感受到这种“精准拼装”的威力：
* **看图说话更忠实（图 3）**：面对“电视前的猫”和“床上的吉他”，众多基线接连脑补出“圣诞树”“咖啡杯”“窗外城市天际线”或错判位置；SAVERA 则精准锁定主体与空间关系，杜绝无中生有。
* **看图问答更精准（图 4）**：面对家庭聚会中的“装饰物是什么”和“行李箱颜色”，其他基线要么答非所问、要么错猜黑/紫/棕色，而 SAVERA 均干脆准确地输出 `Cake.` 与 `Blue.`。

![图 3：MS-COCO 图像描述定性对比]({{ '/assets/img/blog/savera-sparse-alignment/F4.png' | relative_url }})
*图 3：MS-COCO 图像描述定性结果对比。SAVERA 生成的描述简洁准确，显著减少物体与场景幻觉。*

![图 4：COCO-QA 视觉问答定性对比]({{ '/assets/img/blog/savera-sparse-alignment/F5.png' | relative_url }})
*图 4：COCO-QA 视觉问答定性结果对比。SAVERA 借助提示词引导的原始视觉证据复用，精准回答目标对象与属性问题。*

---

## 四、硬核机理剖析：揭开“视觉 + 文本”高质量拼装的底层密码

论文不仅给出了优异的端到端指标，还通过诊断探针、全面消融与因果干预，回答了关于跨模态拼装的四个核心科学问题。

### 1. 为什么不能只靠单向映射？——原始视觉证据在适配中显著衰减

团队在相同 MS-COCO 图像上对原始 Vision 表征和适配后 Bridge 表征进行了 5 项标准化探针测试（图 5）。结果无一例外显示**原始 Vision 全面领先 Bridge**：
* **空间关系（Spatial Relations, Bal. Acc.）**：76.13% vs. 65.54%（**+10.59%**）
* **物体识别（Object Recognition, Macro-mAP）**：66.64% vs. 59.78%（**+6.86%**）
* **物体计数（Counting, Bal. Acc.）**：57.41% vs. 52.48%（**+4.93%**）
* **语义近邻（Semantic Neighborhoods, Jaccard@10）**：41.92% vs. 37.37%（**+4.55%**）
* **区域定位（Patch Localization, Point. Acc.）**：90.30% vs. 86.63%（**+3.67%**）

![图 5：适配前后视觉信息可访问性诊断对比]({{ '/assets/img/blog/savera-sparse-alignment/F6.png' | relative_url }})
*图 5：原始 Vision 与适配后 Bridge 表征在五项视觉诊断任务上的可访问性对比，原始视觉在空间关系与物体识别上保留了显著更强的底层证据。*

这直接证实：**语言适配和视觉保真是一对天然互补的能力**，必须在拼装阶段同时引入 Bridge 与原始 Vision。

### 2. 为什么需要非线性桥接 + 双层级对齐？——释放动作语义，拉齐跨模态分布

在关闭 PRIVA 的受控桥接实验中：
* **非线性桥接完胜线性与几何映射**：线性替换 CIDEr 仅 0.3220（$\text{CHAIR}_s$ 23.44%），正交几何映射为 0.3973（17.04%），而 BEAM 的非线性映射飙升至 **0.5009**（13.68%）。在冲浪（+13.3%）、骑自行车（+11.8%）、打棒球（+10.4%）、骑马（+9.4%）四项活动表达率上，非线性适配全面碾压几何映射（图 6）。
* **样本级 + 神经元级对齐缺一不可**：无对齐时 CIDEr 为 0.4624，单加神经元级或样本级分别升至 0.4776 和 0.4848，双管齐下达到 **0.5009**；保留集上的跨模态检索 R@1（$B \rightarrow T$ / $T \rightarrow B$）从 13.2%/12.7% 跃升至 **24.2%/22.5%**，共享神经元的跨模态对角相关性从 0.15 大涨至 **0.56**，非对角冗余相关性从 0.081 降至 **0.041**。

![图 6：不同映射方式在四类活动中的事件提及率对比]({{ '/assets/img/blog/savera-sparse-alignment/FF6.png' | relative_url }})

*图 6：几何映射与非线性桥接映射在四类 COCO 活动上的参考事件提及率对比。*

从 PCA 分布可视化（图 8）中可以清晰看到：未对齐的原始视觉与文本泾渭分明，正交旋转后仍存明显裂隙，其余连接器分布松散；而 **SAVERA 让视觉与文本表征在低维空间中高度紧凑地重合在了一起**。

![图 8：跨模态特征分布 PCA 可视化]({{ '/assets/img/blog/savera-sparse-alignment/F8.png' | relative_url }})
*图 8：未对齐基线、各连接器、正交旋转与 SAVERA 的视觉（橙）与文本（蓝）特征 PCA 分布对比。*

### 3. 核心消融：三大模块与残差设计缺一不可

| 消融变体 | CIDEr $\uparrow$ | B-4 $\uparrow$ | $\text{CHAIR}_s$ (%) $\downarrow$ | $\text{CHAIR}_i$ (%) $\downarrow$ |
| :--- | :---: | :---: | :---: | :---: |
| w/o PRIVA（仅保留 SPARE + BEAM） | 0.5009 | 0.1522 | 13.68 | 10.65 |
| w/o Shared Sparse Encoder（移除共享稀疏编码） | 0.5376 | 0.1556 | 12.16 | 9.78 |
| w/o Vision in PRIVA（融合中移除原始视觉） | 0.5403 | 0.1557 | 11.44 | 9.61 |
| w/o Bridge in PRIVA（融合中移除桥接特征） | 0.5511 | 0.1560 | 10.27 | 9.34 |
| Direct Prefix（放弃残差，直接预测视觉前缀） | 0.5331 | 0.1508 | 13.42 | 11.09 |
| **SAVERA (完整模型)** | **0.5621** | **0.1571** | **9.08** | **8.15** |

值得注意的是，放弃残差修正、改为直接预测前缀（Direct Prefix）会导致 CIDEr 暴跌至 0.5331、$\text{CHAIR}_s$ 反弹至 13.42%，说明**以对齐好的桥接前缀为底座、用残差机制按需注入原图证据**是稳定拼装的关键设计。

### 4. 因果干预实证：精准响应空间区域，可操控单个跨模态神经元

* **原始视觉证据的全局与局部 Patch 干预**：推理时若将原始视觉特征 $Z_V$ 打乱或置零，CIDEr 骤降至 **0.4927 / 0.5141**，$\text{CHAIR}_s$ 飙升至 **14.80% / 12.58%**。更进一步，利用 COCO 边界框在 $24 \times 24$ 网格上做等面积局部扰动：扰动**随机背景区域**几乎无影响（目标提及率 63.44% vs. 原始 65.23%）；而扰动**目标物体区域**会使目标提及率断崖跌至 **45.22%**，空间准确率从 60.21% 跌至 **47.86%**——证明模型确实在看“对的地方”。
* **稀疏概念神经元的定向操控**：利用学到的跨模态关联定向干预仅仅 4 个视觉稀疏神经元（严格保持解码特征余弦相似度 $P=0.95$），即可在实际生成阶段将目标物体提及率提升 **+5.1%**、目标问答准确率提升 **+3.5%**，同时进一步降低 $\text{CHAIR}_s$ **-0.7%**；而随机或打乱关联的神经元干预几乎无效甚至适得其反。

---

## 五、总结与展望

**SAVERA** 为“如何把独立预训练的纯视觉模型和纯文本模型直接拼成多模态大模型”给出了一套兼具理论深度与实证效果的新范式：
1. 用 **SPARE** 建立可微、保真的共享稀疏坐标系，为异构视觉与文本提供通用拼装语言；
2. 用 **BEAM** 结合非线性桥接与样本-神经元双层级对齐，实现细粒度语义与动作表达的精准咬合；
3. 用 **PRIVA** 通过提示词引导的门控注意力与残差修正，让冻结 LLM 在保留语言流畅度的同时，随时复用原始视觉中的精细物体与空间证据。

展望未来，这一“冻结单模态模型直接拼装”的稀疏对齐与证据复用框架，有望进一步延伸至**视频-语言（Video-Language）**、**音频-语言（Audio-Language）**等更广阔的时序与多模态场景，推动通用多模态智能向更加模块化、低成本、可解释的方向演进。

## 引用格式（BibTeX）

```bibtex
@article{shen2026savera,
  title={SAVERA: Bridging Frozen Vision and Language Models via Sparse Alignment and Visual Evidence Reuse},
  author={Shen, Jiajun and Shi, Chuancheng and Lyu, Jiayi and Sun, Yanpeng and Shen, Fei and Chua, Tat-Seng},
  journal={arXiv preprint arXiv:2611.32828},
  year={2026}
}
```
