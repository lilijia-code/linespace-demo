# LINESPACE Collaborative Poetry 功能设计方案

## 1. 设计目标

LINESPACE 不应只是“诗歌版社交媒体”，而应是一个用社交媒体形态承载创作支持的诗歌协作平台。

核心设计判断：

- 诗歌创作不是全程协作，而是选择性开放。作者需要决定何时开放、向谁开放、开放到什么程度。
- 平台需要在交互逻辑上明确区分两类协作关系：`Facilitated Writing` 和 `Co-creative Writing`。其中 `turn-taking` 只是 Co-creative Writing 的一种实现形式，不应等同于整个 co-creative mode。
- 社交媒体形态用于降低参与门槛：feed、thread、comment、tag、group、challenge、activity、profile、badge、history。
- 平台不是鼓励泛社交表达，而是借用社交媒体形态组织诗歌创作、反馈和发布。
- 创作支持是功能核心：反馈契约、版本记忆、贡献追踪、署名选择、lock-in、发布输出。
- AI 只做整理、解释、提示和草稿建议，不应自动替作者决定作品内容。

## 2. 从研究洞察得到的设计约束

### 2.1 作者主权

访谈显示，多数作者愿意接收建议，但不希望他人直接改写其情感方向、主题意义或个人声音。因此：

- 所有他人输入默认进入“评论 / 建议 / 候选行”，不能自动进入正文。
- 作者或共创协议指定的编辑者拥有最终采纳权。
- UI 必须把“suggested by reader”和“accepted into poem”区分开。
- 对情绪、主题、意义的建议应以 close reading 的方式呈现，而不是命令式修改。

### 2.2 选择性开放

作者需要在私密草稿、可信小组、挑战频道、公开发布之间切换。因此平台需要至少 5 个可见性层级：

- `Private Note`：只有自己可见，用于灵感、碎片、草稿。
- `Invited Only`：只给被邀请的人看或参与。
- `Group Only`：只在某个 genre / publication / track group 内可见。
- `Challenge Public`：在挑战频道内公开，外部 feed 可选择展示摘要。
- `Public Finished Form`：作为作品发布到全站 feed / profile。

### 2.3 两种协作逻辑：Facilitated Writing 与 Co-creative Writing

Formative findings 显示，参与者并没有把所有围绕诗歌的互动都理解为同一种“协作”。更关键的边界是：他人的输入发生在作品周围，还是进入作品内部。

`Facilitated Writing`：

- 核心定义：他人作为读者、反馈者或建议者参与作品周围的讨论，主作者保留最终文本控制权。
- 他人输入形式：评论、鼓励、close reading、主题解释、技术性修改建议、候选诗行。
- 进入正文机制：所有他人输入默认是 suggestion / candidate，必须经过作者 accept / edit / ignore 才能进入 poem version。
- 决策权：作者或作者指定的 editor 拥有最终采纳权、lock-in 权和发布权。
- 署名逻辑：`primary author + helpers / acknowledgements`。被采纳建议可进入 Contribution Log，但不自动变成共同作者。
- 适合场景：私密草稿向可信读者开放、group feedback、投稿前修改、final version 前的 close reading。

`Co-creative Writing`：

- 核心定义：参与者事先同意共同拥有一段创作过程，社会参与进入作品内部；多人可以贡献正文、结构、标题、顺序或版本决策。
- 他人输入形式：共同写行、共同改写、共同排序、共同决定版本、共同封装和发布。
- 进入正文机制：由共创契约定义，可以是主持人采纳、轮流追加、投票通过、共同编辑、或编辑小组整理。
- 决策权：不是单一作者默认拥有，而是由 co-creation contract 规定，例如 host / rotating editor / majority vote / all co-authors consent。
- 署名逻辑：`co-authors / collective name / group pseudonym / anonymous collective`，并需要 contributor consent。
- 适合场景：挑战中的共同创作、多人即兴、诗歌接龙、共同改稿、围绕 fragment 的共同扩写。

`Turn-taking` 不是第三种 mode，也不等于 Co-creative Writing。它只是 Co-creative Writing 的一种 interaction pattern：参与者按顺序追加诗行或段落。Co-creative Writing 还可以通过 group chat brainstorm、host-curated co-writing、parallel branch merging、pair writing、shared editing room 等方式实现。

#### 2.3.1 是否需要在 App 中显式展示这两种 mode？

从 CHI / HCI 审稿视角看，这两种 mode 最好作为设计理论和交互约束，而不是强迫用户在 Create 第一屏理解的抽象分类。

推荐做法：

- 在论文和设计文档中明确提出两种 collaboration logic，因为它们解释了控制权、许可、贡献和署名为什么需要不同设计。
- 在系统内部保留 `mode` 字段，用于决定 workbench、权限、history、attribution、lock-in 和 AI 行为。
- 在用户界面中优先呈现用户能理解的创作入口和工作流，例如 `Start private draft`、`Ask for feedback`、`Start group discussion`、`Start co-writing room`、`Start relay thread`、`Join challenge`。
- 可以在高级设置或 workbench badge 中显示轻量标签：`Author-led` / `Co-writing`，而不是让用户先在 `Facilitated Writing` 和 `Co-creative Writing` 两个学术概念之间做选择。
- Create 页面不应同时堆叠 `creation type` 和 `collaboration mode` 两套相互交叉的选择。更好的设计是：先选择创作意图，再根据意图渐进式显示 contract。

推荐的 Create 信息架构：

1. `What are you starting?`：Fragment / Draft for feedback / Group discussion / Challenge response / Co-writing room / Relay thread / Final version。
2. `Who can participate?`：Private / Invited people / Group / Challenge / Public。
3. `What can others do?`：Comment / Suggest lines / Edit with permission / Add to shared text / Vote or lock。
4. `How should credit work?`：Named author / Pen name / Anonymous / Helpers / Co-authors / Collective name。

这样，`Facilitated Writing` 与 `Co-creative Writing` 仍然指导产品逻辑，但用户看到的是更自然的 social media 创作动作。

### 2.4 贡献追踪和署名

贡献不是单一等级，而是一个谱系：

- `Encouragement`：点赞、短评、收藏。
- `Interpretation`：读者解释、主题理解、情绪反馈。
- `Revision Help`：用词、节奏、结构、格律、排版建议。
- `Line Contribution`：贡献可进入正文的诗行。
- `Co-authoring`：参与结构、顺序、最终版本决策。

每种贡献需要对应可见的 credit、badge 或私密记录。

### 2.5 作品感和发布

诗歌发布不仅是文本发布，也包含视觉形式。因此 final version 需要：

- 排版、留白、封面图、GIF / image background。
- locked snapshot，保留版本时间和贡献记录。
- 可下载 PDF 或 image card。
- 在 feed 中呈现为更完整的“finished form”，而不是普通帖子。

## 3. 产品信息架构建议

基于现有 demo，建议保留当前导航的简单性，但升级页面含义：

| 当前页面     | 建议升级方向                     | 说明                                                                  |
| -------- | -------------------------- | ------------------------------------------------------------------- |
| Home     | Discovery Feed             | 展示 public finished forms、活跃挑战、公开碎片、精选 group threads                 |
| Streams  | Spaces                     | 改成 Groups / Challenges / Fragment Commons / Stream Map 的集合入口        |
| Create   | Create / Start             | 创建 fragment、draft、feedback post、challenge response、co-writing room、relay thread |
| Activity | Inbox                      | 邀请、轮到你写、评论、贡献被采纳、badge、lock-in 通知                                   |
| Profile  | Portfolio / Memory Hub     | 作品、草稿、贡献、badge、saved fragments、Memoryline、published PDFs             |
| Detail   | Workbench                  | 单个作品的创作工作台，按模式显示不同协作工具                                              |
| Quote    | Branch / Remix             | 从某个 fragment / line / poem 派生自己的版本                                  |
| History  | Work Evolution             | 单个作品的版本记忆、演化时间线、采纳记录、署名状态                                           |

新增或重命名的核心入口：

- `Groups`：按体裁、刊物、课程、track、社群组织创作。
- `Challenges`：限定主题 / 标签 / 形式的创作挑战频道。
- `Fragments`：共同的诗歌碎片空间，用于灵感碰撞和素材保存。

## 4. 核心对象设计

后续开发可以在现有 `Post`、`Comment`、`Suggestion` 基础上扩展。

### 4.1 Space / Group

用于承载稳定社群。

字段建议：

```ts
type Space = {
  id: string;
  name: string;
  kind: "genre" | "publication" | "track" | "course" | "private_circle";
  description: string;
  visibility: "public" | "request_to_join" | "private";
  tags: string[];
  members: SpaceMember[];
  rules: string[];
  channels: Channel[];
};

type SpaceMember = {
  userId: string;
  role: "member" | "moderator" | "curator" | "owner";
  badges: string[];
};
```

设计要点：

- group 不是单纯聊天室，而是有共同审美、体裁或发表目标的可信反馈圈。
- group 内可以有多个 channel，例如 `draft-feedback`、`co-writing-room`、`relay-thread`、`submissions`、`fragments`。
- group 应支持 moderator / curator，帮助维护高质量反馈。

### 4.2 Channel / Challenge

用于限定主题和组织共同创作。

```ts
type Channel = {
  id: string;
  spaceId?: string;
  title: string;
  kind: "discussion" | "challenge" | "co_writing" | "relay" | "fragment_pool";
  prompt?: string;
  tags: string[];
  deadline?: string;
  defaultCollaborationMode: "facilitated" | "co_creative";
  defaultCoCreativePattern?: "group_chat_brainstorm" | "turn_taking_relay" | "host_curated" | "shared_editing";
  visibility: "group" | "public";
  status: "open" | "reviewing" | "locked" | "archived";
};
```

挑战频道需要显示：

- 主题 prompt。
- 可用标签。
- 推荐形式，如 sonnet、free verse、one-line relay、image-text poem。
- 参与方式：group chat brainstorm 或 thread relay。
- 截止时间和最终展示方式。

### 4.3 Work / Post

现有 `Post` 应升级为可承载不同创作模式的 `Work`。

```ts
type Work = {
  id: string;
  collaborationMode: "facilitated" | "co_creative";
  coCreativePattern?: "group_chat_brainstorm" | "turn_taking_relay" | "host_curated" | "shared_editing" | "parallel_branch_merge";
  kind: "fragment" | "draft" | "thread" | "final";
  ownerId: string;
  authorIds: string[];
  spaceId?: string;
  channelId?: string;
  sourceFragmentId?: string;
  sourceWorkId?: string;
  stage: "private_note" | "open_feedback" | "in_progress" | "locked" | "published";
  visibility: "private" | "invited" | "group" | "challenge" | "public";
  feedbackContract: FeedbackContract;
  attributionPolicy: AttributionPolicy;
  lockState: LockState;
  currentVersionId: string;
  tags: string[];
};

type AttributionPolicy = {
  defaultStyle: "primary_author_helpers" | "coauthors" | "collective_name" | "anonymous_collective";
  requiresContributorConsent: boolean;
  collectiveName?: string;
};
```

设计解释：

- `collaborationMode` 只回答一个问题：他人的参与是围绕作品提供反馈，还是进入作品内部共同拥有创作过程？
- `coCreativePattern` 只在 `collaborationMode === "co_creative"` 时出现，用于说明具体组织方式。
- `turn_taking_relay` 是 pattern，不是 mode。后续可以继续增加 shared editing room、host-curated co-writing、pair writing，而不必改动整体模式定义。
- UI 可以把 `facilitated` 显示成 `Author-led feedback`，把 `co_creative` 显示成 `Co-writing`；不要强迫新用户理解研究术语。

### 4.4 Fragment

碎片空间是你的初步想法里最有潜力的一层。它连接私密灵感、社交碰撞和后续共创。

```ts
type Fragment = {
  id: string;
  text: string;
  creatorId?: string;
  anonymous: boolean;
  visibility: "private" | "group" | "public";
  tags: string[];
  mood?: string;
  source?: "manual" | "from_comment" | "from_poem_line";
  savedBy: string[];
  inspiredWorks: string[];
  allowInvite: boolean;
  allowRemix: boolean;
};
```

碎片的关键动作：

- `Save to notes`：先收藏，回到自己的私密创作。
- `Invite creator`：邀请碎片提供者一起创作或完善。
- `Start group chat`：围绕碎片做非线性讨论。
- `Start relay thread`：围绕碎片做接龙式创作。
- `Branch alone`：保留来源，自己创作一个版本。

### 4.5 Contribution

贡献记录用于 badge、署名、history 和 originality proof。

```ts
type Contribution = {
  id: string;
  workId: string;
  contributorId?: string;
  anonymous: boolean;
  type: "comment" | "interpretation" | "revision" | "line" | "structure" | "curation";
  sourceId: string;
  status: "suggested" | "accepted" | "locked" | "credited" | "declined";
  attributionPreference: "public_credit" | "private_thanks" | "anonymous" | "decline_credit";
  verifiedBy?: string;
  createdAt: string;
};
```

### 4.6 VersionEvent

用于替代当前简化的 History。

```ts
type VersionEvent = {
  id: string;
  workId: string;
  actorId: string;
  type:
    | "created"
    | "draft_saved"
    | "version_named"
    | "commented"
    | "suggestion_generated"
    | "suggestion_accepted"
    | "line_added"
    | "line_reordered"
    | "line_locked"
    | "branch_created"
    | "version_locked"
    | "attribution_updated"
    | "design_saved"
    | "design_locked"
    | "published"
    | "jpg_exported"
    | "pdf_exported";
  payload: Record<string, unknown>;
  createdAt: string;
};
```

### 4.7 VersionSnapshot / WorkMemory

`VersionEvent` 记录发生了什么，`VersionSnapshot` 保存某个时间点的作品状态。两者要分开：事件适合做 timeline，snapshot 适合做回看、比较、恢复和导出。

```ts
type VersionSnapshot = {
  id: string;
  workId: string;
  parentVersionId?: string;
  label: string;
  stage: "private_draft" | "shared_prototype" | "candidate" | "locked" | "published";
  createdBy: string;
  createdAt: string;
  saveReason: "manual" | "autosave" | "before_feedback" | "after_accepting_feedback" | "before_lock" | "branch";
  visibility: "private" | "invited" | "group" | "challenge" | "public";
  title?: string;
  lines: string[];
  changeSummary: string;
  sourceEventIds: string[];
  sourceContributionIds: string[];
  lockState: LockState;
};

type WorkMemory = {
  id: string;
  userId: string;
  workId: string;
  role: "author" | "co_author" | "line_contributor" | "comment_helper" | "reader" | "curator";
  memoryType: "owned_work" | "participated_work" | "saved_fragment" | "published_record";
  lastTouchedAt: string;
  pinned: boolean;
  privateNote?: string;
};
```

## 5. 三条核心工作流

### 5.1 工作流 A：Group 内讨论和反馈支持

适用场景：

- 作者有一段草稿，需要可信圈子给建议。
- group 按体裁、刊物、课堂、track 或审美方向组织。
- 目标是保护作者主权，同时获得高质量反馈。

用户路径：

1. 用户进入 `Groups`，选择一个 group，例如 `Modern Free Verse` 或 `Campus Literary Journal`。
2. 用户点击 `Start from draft`。
3. 系统将该入口默认为 `Author-led feedback / Facilitated Writing`，不需要用户先理解抽象 mode。
4. 设置可见性为 `Group Only` 或 `Invited Only`。
5. 选择反馈契约：
   - `Encouragement only`
   - `Close reading`
   - `Line-level revision`
   - `Imagery / rhythm suggestions`
   - `Allow possible lines`
6. group 成员以评论形式反馈。
7. AI 将评论整理为 `Possible lines`、`Reader themes`、`Tone feedback`、`Revision hints`。
8. 作者逐条 accept / edit / ignore。
9. 作者进入 edit poem，调整顺序和文字。
10. 作者 lock-in 一个版本。
11. 作者选择发布为 group-only final 或 public finished form。

关键 UI：

- Workbench 左侧是作品卡片和版本状态。
- 右侧是 comments / AI organized suggestions。
- 顶部显示 feedback contract，提醒读者该给什么类型反馈。
- 每条建议显示来源评论、贡献者和是否已采纳。

需要开发的功能：

- Create 页面将 `Ask for feedback`、`Post to group for feedback` 等入口映射到 `collaborationMode: "facilitated"`。
- Comment 输入框旁新增 feedback type。
- Detail 页面显示 author tool，而不只在 Profile Comments 显示。
- suggestion accepted 后生成 Contribution 和 VersionEvent。
- Final Version 支持 lock-in。

### 5.2 工作流 B：Challenge 中发起共创

适用场景：

- 某个 channel 限定主题、标签、体裁或发表目标。
- 参与者可以选择 group-chat brainstorm、host-curated co-writing、shared editing 或 thread relay。
- 目标是明确“这是共创”，避免混淆作者边界。

用户路径：

1. 用户进入 `Challenges`。
2. 看到挑战卡片：主题、标签、截止时间、参与人数、活跃 threads。
3. 点击 `Join challenge`。
4. 选择参与形式：
   - `Group chat brainstorm`：多人讨论、收集意象和方向，由 host 或小组编辑整理进入候选正文。
   - `Host-curated co-writing`：多人提交句子、标题、结构建议，host 按共创契约采纳并保留共同署名。
   - `Shared editing room`：少数共同作者直接编辑同一个版本，每次修改进入 version log。
   - `Turn-taking relay`：每次一个人追加一行或一段，这是 co-creative writing 的一种具体 pattern。
5. 若选择 co-creative pathway，创建者设置规则：
   - 每人每轮一行 / 两行。
   - 是否固定顺序。
   - 是否允许 pass。
   - 每轮时间限制。
   - 谁能 lock-in：host / rotating editor / majority vote。
   - 署名规则：everybody / group pseudonym / anonymous collective。
6. 参与者根据 pattern 进行写作：聊天、提交候选行、共同编辑，或按顺序添加 line。
7. 每一项贡献可以被 `proposed`、`accepted`、`revised`、`locked`。
8. 达成 final 后生成 collective finished form。
9. 发布时展示贡献链和共同署名。

几种 Co-creative pattern 的区别：

| 维度 | Group chat brainstorm | Host-curated co-writing | Shared editing room | Turn-taking relay |
| --- | --- | --- | --- | --- |
| 输入方式 | 非线性讨论 | 多人提交候选文本 | 少数共同作者直接编辑 | 顺序追加 |
| 是否进入正文 | 需要 host / editor 采纳 | 需要 host 按契约采纳 | 直接进入 version log | 默认成为候选正文 |
| 作者权 | host 或小组编辑 | host + contributors | co-authors 共同决定 | 共创协议决定 |
| 适合阶段 | 想法、意象、方向 | 汇集句子和结构 | 少数人深度共写 | 诗行接龙、共同完成 |
| UI 类比 | group chat + pinned ideas | submission board + editor picks | shared document | social media thread |

需要开发的功能：

- Streams / Spaces 页面新增 Challenge cards。
- Detail 页面根据 `collaborationMode` 先分为 facilitated / co-creative，再根据 `coCreativePattern` 显示不同工具。
- 新增 `TurnComposer`：显示轮到谁、剩余时间、pass、submit line。
- 新增 `TurnRulePanel`：展示创作契约。
- 新增 `CoWritingRoom`：支持 group brainstorm、候选行提交、pinned ideas、host 采纳。
- 新增 `CollectiveAttributionPanel`：选择共同署名方式。

### 5.3 工作流 C：共同诗歌碎片空间

适用场景：

- 用户有一句诗、一个意象、一段文梗、一个匿名树洞片段。
- 其他人被激发灵感，但还没准备好公开创作。
- 碎片可以成为 group discussion、challenge thread 或个人创作的源头。

用户路径：

1. 用户进入 `Fragments`。
2. 可以发布一个 fragment：
   - private
   - group-only
   - public anonymous
   - public credited
3. 其他人看到 fragment 后有五种动作：
   - `Save`：收藏到个人 notes。
   - `Invite`：邀请原提供者共创。
   - `Start chat`：围绕碎片开 group-chat brainstorm。
   - `Start thread`：围绕碎片开 relay thread；它通常是 co-creative writing 的 turn-taking pattern。
   - `Branch alone`：自己创作，保留来源。
4. 如果 fragment 被采纳进作品，系统记录 Contribution。
5. 发布 finished form 时可选择：
   - credit fragment creator
   - anonymous source
   - inspired by public fragment
   - private thanks only

需要开发的功能：

- 新增 Fragment Card。
- Create 页面支持 `Create fragment`。
- Home feed 可展示高活跃 fragment。
- Profile 新增 Saved Fragments / Inspired Works。
- History 中显示 source fragment。

## 6. Feedback Contract 设计

创建作品时，作者必须选择希望收到的反馈类型。这样可以把评论区从普通社交互动转化为创作支持。

```ts
type FeedbackContract = {
  allowEncouragement: boolean;
  allowCloseReading: boolean;
  allowTechnicalRevision: boolean;
  allowPossibleLines: boolean;
  allowCoCreationInvite: boolean;
  blockedFeedback: string[];
};
```

UI 文案建议：

- `I only want encouragement right now.`
- `Tell me what emotion or image you read from it.`
- `Help me revise wording, rhythm, or structure.`
- `You may suggest possible lines, but I decide what enters the poem.`
- `I am open to co-writing invitations.`

评论输入框可以根据契约动态变化：

- 如果只允许 close reading，placeholder 显示 `What image, emotion, or theme do you read here?`
- 如果允许 possible lines，显示 `Suggest a line or continuation.`
- 如果允许 technical revision，显示 `Point to wording, rhythm, structure, or clarity.`

## 7. Lock-in 机制

老师明确提到需要 lock-in。它应成为版本和署名的核心节点。

Lock-in 的含义：

- 锁定某个版本的正文、顺序、署名和贡献记录。
- 锁定后不能直接覆盖，只能创建新 version / branch。
- 锁定版本可以发布、导出 PDF、进入 profile portfolio。
- 锁定动作会生成 timestamp，用于原创证明和 contribution history。

状态建议：

```ts
type LockState = {
  status: "unlocked" | "soft_locked" | "locked" | "published";
  lockedBy?: string;
  lockedAt?: string;
  canBranch: boolean;
};
```

MVP 可以先做：

- `Lock version` 按钮。
- locked 后禁止 edit 当前 version。
- 提供 `Create branch from locked version`。
- History 中记录 locked event。

## 8. Badge / Verification 机制

Badge 不只是游戏化，而是帮助用户判断谁给过高质量贡献。

建议 badge：

- `Close Reader`：多次提供被作者标记有帮助的解读。
- `Line Contributor`：贡献的诗行被采纳。
- `Revision Helper`：修改建议被采纳。
- `Co-author`：参与被 lock-in 的 co-creative final version，不限于 turn-taking。
- `Curator`：发起高质量 challenge 或整理 group。
- `Verified Contributor`：贡献被 lock-in 版本记录。

贡献者可选择是否公开展示 badge。

## 9. Attribution 设计

发布 final version 时出现 attribution step。

Facilitated Writing 默认：

- `Written by Lili`
- `With suggestions from @Lin, @Jia`
- 可选择隐藏 helpers 或改为 private thanks。

Co-creative Writing 默认：

- `Written by Lili, Lin, Jia`
- 或 `By Moon Channel Collective`
- 或 `Anonymous collective`

每位贡献者应有 attribution preference：

- public credit
- private thanks
- anonymous
- decline credit

## 10. Memoryline：版本记忆与作品演化时间线

### 10.1 模块定位和命名

推荐把这个模块命名为 `Memoryline`，中文可叫“创作记忆线”。它比 `History` 更适合，因为研究洞察里真正缺失的不是普通操作日志，而是“我曾经怎么想、谁给过什么建议、哪一次修改改变了作品、哪个版本最后被封存”的连续记忆。

备选名称：

- `Memoryline`：推荐。兼顾 memory 和 timeline，适合产品化。
- `Work Evolution`：适合单个作品页面标题，强调作品演化。
- `Version Memory`：适合系统能力或设置项，偏功能性。
- `Draft Archive`：只覆盖草稿，不够完整。
- `Contribution Trail`：适合贡献者视角，但不能覆盖作者的私密版本。

信息架构建议：

- `Profile > Memory`：个人记忆中心，展示“我拥有 / 我参与 / 我保存 / 我发布”的作品演化记录。
- `Detail > Evolution`：单个作品的演化时间线，替代当前简化 History。
- `Create / Edit > Draft Memory`：编辑时的轻量抽屉，只显示当前作品的草稿快照、命名版本和恢复入口。
- `Activity` 只做通知入口，不承担长期归档；点击通知后跳到对应 Memoryline 节点。

### 10.2 设计依据

Formative study 显示，参与者把早期灵感和草稿视为高度私密、脆弱的阶段；他们通常只在初稿完成、需要专业判断、准备投稿/发布、或明确进入共创活动时才让别人参与。同时，创作工具链散落在备忘录、纸本、WPS、截图、社交媒体和私聊中，导致草稿理由、反馈来源、修改过程和贡献记录容易丢失。

因此 Memoryline 要同时满足四个目标：

- 保存私密草稿和公开版本，不默认把草稿社交化。
- 把评论、建议、接龙行、采纳动作和版本变化连接起来。
- 帮助作者回忆“为什么这样改”，而不只是看到“什么时候改”。
- 让贡献者在 Profile 中看到自己参与过的作品如何继续演化，但只显示其有权限看到的部分。

### 10.3 分层界面设计

不要在同一个页面里同时显示全部 timeline、正文、diff、评论、贡献者、权限和发布状态。Memoryline 应采用逐层进入：

第一层：`Profile > Memory`

- 目标：回答“我参与过哪些作品，它们现在发展到哪一步？”
- UI：列表或卡片，不显示完整时间线。
- 卡片内容：作品标题 / 首行、我的角色、最近事件、当前 stage、lock 状态、贡献数、是否有私密草稿。
- 筛选：`Owned`、`Co-authored`、`Helped`、`Saved fragments`、`Published`、`Private drafts`。
- 主操作：`Open evolution`、`Continue draft`、`View my contribution`、`Pin memory`。

第二层：`Work Evolution Overview`

- 目标：回答“这首诗是如何一步步形成的？”
- UI：单列垂直 timeline；桌面端可更宽，但仍保持单主线，不做左右分栏信息墙。
- Timeline 节点按阶段分组：`Private start`、`Feedback opened`、`Co-writing`、`Lock-in`、`Publication`。
- 每个节点只显示事件标题、actor、时间、影响摘要和 1 个主要按钮。
- 节点类型：draft saved、comment received、suggestion accepted、line added、line locked、branch created、version locked、design exported。
- 点击节点进入第三层，不在 overview 展开长正文。

第三层：`Version Snapshot Detail`

- 目标：回答“这个版本具体是什么样、和上一个版本差在哪？”
- 内容：版本正文、版本标签、保存理由、可见性、来源事件、来源贡献、lock 状态。
- 可选视图：`Read version`、`Changes`、`Sources`、`Actions` 四个 tab。
- Actions：`Name version`、`Restore as new branch`、`Compare with previous`、`Lock version`、`Package / Export`。
- 私密草稿默认只对作者可见；如果版本来自共创空间，需要显示协作契约和署名状态。

第四层：`Contribution Source Detail`

- 目标：回答“这个版本变化来自谁的哪条输入？”
- 内容：原评论、原接龙行、fragment 来源、AI 整理结果、作者采纳/编辑记录。
- 对 facilitated writing：强调“作者采纳了哪些建议”。
- 对 co-creative writing：强调“哪位参与者贡献了正文、结构或版本决策”。
- 对贡献者本人：展示 `accepted` / `locked` / `credited` 状态和 attribution preference。

### 10.4 版本类型和保存规则

版本不应只有 final version。建议支持以下 snapshot 类型：

- `Auto draft`：系统自动保存，仅作者可见，避免写作中断丢失。
- `Named draft`：作者手动命名，例如 “before workshop”、“after Lin comments”。
- `Shared prototype`：作者开放给 group / invited readers 的可反馈版本。
- `Candidate version`：共创中暂时被 host 或 group 采纳但未 lock 的版本。
- `Locked version`：正文、顺序、贡献和署名被封存，不能直接覆盖。
- `Published form`：和排版、封面、导出记录绑定的发布版本。
- `Branch version`：从 fragment、locked version 或他人作品派生出的独立分支。

保存触发：

- 用户点击 `Save draft snapshot`。
- 用户准备公开请求反馈前，系统建议保存 `before feedback`。
- 用户 accept / edit 一条 suggestion 后，系统生成 `after accepting feedback`。
- turn-taking 中每次 line locked 后生成 snapshot。
- 发布或导出前必须生成 `before lock` snapshot。

隐私规则：

- 草稿默认 private，不出现在 Home feed。
- Profile 的 `Memory` tab 里，作者能看到私密草稿；其他人只能看到公开或共享给自己的节点。
- 贡献者可以看到自己贡献相关的状态变化，但不能自动看到作者的完整私密草稿链。
- 如果作品进入 group / challenge，需要在节点上显示可见性来源，例如 `Visible in Modern Haiku group`。

### 10.5 两种协作模式下的差异

Facilitated Writing：

- Timeline 主线属于作者。
- 评论、AI suggestion、revision suggestion 是来源事件。
- 只有作者 accept / edit / ignore 后，建议才进入版本记忆。
- Snapshot detail 中显示 `Author decision`：accepted as-is、accepted with edits、ignored、saved for later。

Co-creative Turn-taking Writing：

- Timeline 主线属于共同作品。
- 每次 turn、line lock、host decision、vote / consent 都是事件。
- Snapshot detail 中显示 turn sequence 和参与者署名状态。
- 如果是 relay thread，timeline 可以按 “turn 1 / turn 2 / turn 3” 标记；如果是 shared editing，则按 “edit session / version lock” 标记。

### 10.6 视觉和交互原则

- 主界面只显示一条清晰路径，不做左右双栏 diff 大屏。
- 用阶段分组降低认知负担：Draft、Feedback、Co-writing、Lock、Publish。
- 用状态色而非大面积装饰：private draft 用灰，open feedback 用蓝，accepted contribution 用绿，locked / published 用红色印章感。
- 每个 timeline 节点只保留一个主动作，更多内容进入详情页。
- 移动端固定为单列 timeline，节点之间留足间距；版本正文进入单独 detail。
- 允许用户给版本加私人 note，例如 “这一版保留原来的悲伤感，不要再改得太顺滑”。

### 10.7 最小实现范围

P1 阶段建议先做：

- Profile 新增 `Memory` tab。
- Detail / History 改为 `Work Evolution` 页面。
- 新增 `VersionSnapshot` mock data。
- 新增 `WorkMemory` mock data，用于个人记忆中心。
- 新增 `Save draft snapshot`、`Name version`、`Restore as new branch` 前端状态变化。
- Timeline overview 点击进入 snapshot detail。
- 不做复杂 diff 算法，先用 `changeSummary` 和 added / removed line mock 展示。
- 不接后端，所有数据继续存在 React state / mock data。

## 11. AI 功能和提示词边界

AI 应作为创作协调器，而不是作者。

### 11.1 评论分类

现有 `classifyReaderResponse()` 是关键词正则，后续可替换为 LLM JSON 分类。

输出结构：

```json
{
  "kind": "poetic_continuation | emotional_feedback | theme_interpretation | revision_suggestion | casual_response",
  "suggestionGroup": "Possible lines | Reader themes | Tone feedback | Revision hints | none",
  "suggestionText": "string",
  "confidence": 0.0,
  "needsAuthorDecision": true
}
```

提示词原则：

- 不要替作者决定是否采纳。
- 不要重写成“更好”的诗，除非用户明确请求 revision draft。
- 保留原评论者意图。
- 标注可能误读或过度解释的部分。

### 11.2 Co-creative 协调

AI 可以：

- 总结 co-writing room / relay thread 当前意象、节奏、主题。
- 提醒参与者当前共创契约和自己的角色。
- 给出 3 个 possible next directions。
- 检查新行或新修改是否和前文冲突。

AI 不应：

- 自动替参与者写下一行、改写正文或提交修改。
- 自动更改署名。
- 自动 lock-in 版本。

### 11.3 Publication Assistant

AI 可以在 final stage 提供：

- 标题建议。
- 视觉风格建议。
- PDF / card layout 方案。
- 简短作品说明。

## 12. Publication Studio：Create 部分新增作品封装

访谈里“作品感”非常重要：诗歌不是普通文字帖，作者常常会通过截图、排版、图片、封面、纸张质感来确认作品已经完成。因此 Create 不应止步于“输入文本并发布”，而应形成一条从 `write` 到 `package` 到 `lock/export` 的完成路径。

建议把 Create / Final Version 流程拆成三步：

1. `Write`：输入诗歌文本、设置协作模式、反馈契约、可见性。
2. `Package`：把文本封装成明信片、诗页、诗集页或社交媒体 finished form。
3. `Lock & Export`：确认 final version，锁定版本，导出 PDF / JPG 到本地。

### 12.1 两种封装模式

#### 模式 A：自由美工编辑 Studio

适合用户已经有明确审美，想自己调整作品呈现。

核心功能：

- 文本编辑：字体、字号、字重、行高、字距、对齐、颜色、透明度。
- 版式编辑：文本框位置、宽度、内边距、旋转角度、分栏、诗行间距。
- 背景编辑：背景纸张、纯色、渐变、照片、GIF 静帧、纹理纸。
- 拼贴编辑：贴纸、印章、胶带、便签、撕纸边、日期戳、署名章。
- 画布规格：postcard、square social card、A4 poetry sheet、chapbook page、phone story。
- 安全边距：导出时显示 bleed / safe area，防止文字贴边。
- 版本快照：每次保存 layout 都生成一个 design snapshot，可和 poem version 绑定。

自由编辑的目标不是做复杂设计软件，而是提供“刚好够诗歌作者完成作品感”的轻量工具。MVP 中不需要拖拽库也可以先做：左侧控制面板 + 右侧实时预览，位置用 slider / stepper 调整。

#### 模式 B：固定模板一键套版

适合用户只想输入诗歌，快速得到漂亮成品。

模板建议：

| 模板名 | 适合内容 | 视觉方向 | 输出规格 |
| --- | --- | --- | --- |
| `Quiet Postcard` | 短诗 / 单行 fragment | 留白、纸张纹理、细边框、角落署名 | postcard / JPG |
| `Notebook Screenshot` | 私密草稿 / unsent feeling | 横线纸、备忘录感、手写注释贴纸 | square / story |
| `Little Journal Page` | final version / 投稿展示 | 诗集内页、页码、标题、贡献说明 | A4 / PDF |
| `Collage Memory` | 图文诗 / cyber nostalgia | 照片底、半透明文本块、胶带/贴纸 | square / JPG |
| `Collective Broadside` | co-creative final / relay / shared editing | 多作者署名、贡献边栏、lock-in stamp | A4 / PDF |
| `Fragment Card` | 公共碎片 / 灵感卡片 | 大字短句、标签、小型来源说明 | postcard / JPG |

模板交互：

1. 用户选择一个 template。
2. 系统自动填入 poem text、title、author、contributors、tags、lock timestamp。
3. 用户只改少量参数：主色、纸张、字体、是否显示贡献、是否显示来源 fragment。
4. Preview 实时变化。
5. 用户点击 `Lock final design` 后，模板配置和 poem version 一起进入 History。

### 12.2 Publication Studio 页面结构

可以作为 Create 的第三步，也可以作为 locked final version 的独立页面。

推荐 UI：

- 顶部：`Write / Package / Lock & Export` stepper。
- 左栏：`Mode`，在 `Free Studio` 和 `Templates` 之间切换。
- 中间：实时画布 preview。
- 右栏：属性面板。
- 底部：`Save design draft`、`Lock final design`、`Export JPG`、`Export PDF`。

属性面板分组：

- `Canvas`：size、orientation、background、paper texture。
- `Text`：font family、font size、line height、color、align、position。
- `Decor`：stickers、tape、stamp、date mark、border。
- `Credits`：author display、helpers、co-authors、anonymous source、contribution note。
- `Export`：format、quality、include margins、filename。

### 12.3 数据模型建议

```ts
type DesignMode = "free_studio" | "template";

type CanvasSize = "postcard" | "square" | "story" | "a4" | "chapbook";

type DesignTemplate = {
  id: string;
  name: string;
  description: string;
  bestFor: "fragment" | "draft" | "final" | "co_creative" | "turn_taking_relay";
  canvasSize: CanvasSize;
  previewTheme: "quiet" | "notebook" | "journal" | "collage" | "collective";
  defaultStyle: PublicationDesignStyle;
};

type PublicationDesign = {
  id: string;
  workId: string;
  versionId: string;
  mode: DesignMode;
  templateId?: string;
  locked: boolean;
  lockedAt?: string;
  style: PublicationDesignStyle;
  createdAt: string;
  updatedAt: string;
};

type PublicationDesignStyle = {
  canvasSize: CanvasSize;
  background: {
    kind: "solid" | "gradient" | "paper" | "image";
    value: string;
    texture?: "plain" | "linen" | "notebook" | "rice_paper" | "newsprint";
  };
  text: {
    fontFamily: "serif" | "sans" | "mono" | "handwritten";
    fontSize: number;
    lineHeight: number;
    color: string;
    align: "left" | "center" | "right";
    x: number;
    y: number;
    width: number;
  };
  decor: {
    border: boolean;
    stickerIds: string[];
    stamp?: "locked" | "final" | "collective" | "fragment";
    showDate: boolean;
  };
  credits: {
    showAuthor: boolean;
    showContributors: boolean;
    showSourceFragment: boolean;
    attributionText: string;
  };
};

type ExportRecord = {
  id: string;
  workId: string;
  designId: string;
  format: "pdf" | "jpg";
  filename: string;
  exportedAt: string;
};
```

### 12.4 导出功能设计

导出应发生在用户确认 final version 之后。

流程：

1. 用户完成诗歌文本。
2. 用户进入 Package。
3. 用户选择自由编辑或模板。
4. 用户点击 `Lock final design`。
5. 系统记录 `version_locked` 和 `design_locked` event。
6. 用户选择 `Export JPG` 或 `Export PDF`。
7. 浏览器在本地下载文件。
8. History 记录 `jpg_exported` 或 `pdf_exported`。

实现建议：

- JPG：使用 `html-to-image` 或 `dom-to-image-more` 把 preview DOM 转为 image，再触发下载。
- PDF：使用 `jspdf`，把 canvas image 放入 PDF 页面。
- MVP 可先导出当前 preview，不接后端、不上传文件。
- 如果暂时不能安装依赖，可以先实现 `window.print()` / browser print-to-PDF fallback 和 SVG data URL JPG mock，但最终建议用 `html-to-image + jspdf`。

### 12.5 素材策略

MVP 不需要联网下载素材。可以先用代码生成素材：

- 背景纸：CSS radial-gradient / linear-gradient / subtle noise。
- 横线纸：repeating-linear-gradient。
- 胶带：半透明 CSS rectangle + rotate。
- 贴纸：内置 SVG / emoji-like shape，但界面上保持克制。
- 印章：CSS border + uppercase text，例如 `LOCKED VERSION`、`FINAL`、`COLLECTIVE`。
- 纸张边缘：box-shadow、border、outline、pseudo-element。

如果后续需要更真实的素材，再联网寻找：

- paper texture：Unsplash / Wikimedia Commons / ambientCG 的可商用纹理。
- sticker / collage：OpenMoji、Twemoji、Noun Project 或自制 SVG。
- 字体：Google Fonts 中适合 poetry 的 serif / mono / handwritten 字体。

为了研究 demo 稳定，建议先不要依赖外部图片资产。外部素材容易带来加载失败、版权说明和导出跨域污染 canvas 的问题。

### 12.6 AI / 提示词辅助

Publication Assistant 可以帮助用户从诗歌内容生成视觉方向，但仍然不直接替用户锁定最终设计。

AI 输出 JSON：

```json
{
  "recommendedTemplateId": "quiet-postcard",
  "reason": "The poem is short, intimate, and fragment-like.",
  "visualMood": "private, soft, archival",
  "palette": ["#111111", "#f7f1e7", "#001eff"],
  "fontSuggestion": "serif",
  "layoutNotes": ["large margins", "small source note", "avoid busy stickers"],
  "exportSuggestion": "jpg"
}
```

提示词原则：

- 根据诗歌长度、语气、协作模式和 attribution 选择模板。
- 不要生成与作品情绪冲突的装饰。
- 对 co-creative final version，优先保留贡献者、共创契约和 lock timestamp；如果是 turn-taking relay，再额外保留 turn sequence。
- 对 private fragment，优先保护隐私，默认隐藏真实作者。

## 13. 现有 demo 到目标方案的改造清单

### 13.1 数据层

当前问题：

- `postsSeed`、`commentsSeed`、`suggestionsSeed` 全部写在 `App.tsx`。
- `poemLines` 是全局状态，不按 post 存储，容易串作品。
- 没有 Space、Channel、Fragment、Contribution、VersionEvent。

建议改造：

- 新建 `src/data/mockData.ts`。
- 新建 `src/types.ts`。
- 将 `poemLines` 移入 post/work version 结构。
- 增加 mock spaces、channels、fragments、contributions、versionEvents。

### 13.2 页面层

短期不必引入完整路由，可继续用 `view` 状态，但应扩展 view：

```ts
type View =
  | "home"
  | "spaces"
  | "create"
  | "activity"
  | "profile"
  | "detail"
  | "quote"
  | "history"
  | "memory"
  | "versionDetail";
```

`StreamsPage` 可先重命名或改造成 `SpacesPage`，内部包含 tabs：

- `Groups`
- `Challenges`
- `Fragments`
- `Map`

### 13.3 Create 页面

Create 页面不要把 `creation type` 和 `collaboration mode` 并列堆叠成两套选择。它们不是同一层级：creation type 是用户任务，collaboration mode 是系统推导出的协作边界。

推荐改成三段渐进式配置：

第一步：`What are you starting?`

- `fragment`：支持facilitated也支持co-create，这是帖子的形式，具体是哪种mode取决于后续操作
- `Draft for feedback`：默认 `facilitated`，允许评论、close reading、候选行，但作者保留采纳权。
- `Group discussion`：这里需要联动group里的操作，用于 group 内讨论某个话题或转发某个 post。
- `Challenge response`：根据用户下一步选择，可以是 `facilitated`，也可以是 `co_creative`。
- `Co-writing room`：默认 `co_creative`，pattern 可为 brainstorm / host-curated / shared editing。
- `Relay thread`：默认 `co_creative` + `turn_taking_relay`。
- `Final version`：继承原作品 mode，进入 lock / package / export。

第二步：`How can others participate?`

- 对 facilitated work 显示：comment、close reading、revision suggestion、possible lines、co-writing invite。
- 对 co-creative work 显示：submit candidate lines、edit shared text、add turn、vote / consent、lock rule。
- 不建议让普通用户直接选择 `Facilitated Writing` / `Co-creative Writing` 作为第一步；可以在卡片底部用 badge 显示 `Author-led` 或 `Co-writing`；选择中两者形式之后推荐mode。

第三步：`Contract`

- visibility：public / private / 选择自己所在的 group / 选择具体可见的人 / 选择具体不可见的人。
- feedback contract：允许评论、转发、建议诗行、邀请共创。
- co-creation contract：仅当 `co_creative` 时显示，设置 host、editor、turn order、vote rule、lock rule。
- attribution policy：匿名 / 非匿名 / 新笔名 / 多人署名 / group pseudonym / anonymous collective。

UI 目标：用户是在选择“我要做什么”和“别人可以怎么参与”，而不是在回答研究术语题。


### 13.4 Detail / Workbench 页面

根据 `collaborationMode` 和 `coCreativePattern` 分流：

Facilitated Writing 显示：

- 原作品 / 当前版本。
- 评论和 AI organized suggestions。
- accept / edit / ignore。
- edit poem。
- lock version。

Co-creative Writing 显示通用工具：

- co-creation contract。
- participant roles。
- contribution board。
- candidate text / accepted text 的区分。
- collective attribution。

如果 `coCreativePattern === "turn_taking_relay"`，额外显示：

- thread line sequence。
- turn queue。
- submit next line。
- pass / invite next。
- lock line。

### 13.5 Home feed

Feed 需要更像 social media，但内容仍是创作支持。

推荐卡片类型：

- `Finished Form Card`
- `Open Draft Looking for Feedback`
- `Active Challenge`
- `Fragment that inspired works`
- `Co-writing room in progress`
- `Turn-taking relay in progress`

每张卡片显示：

- mode badge：优先显示 `Author-led` / `Co-writing`，必要时再显示 `Relay`、`Shared edit` 等 pattern。
- visibility badge。
- stage badge。
- contribution count。
- lock status。
- primary action，例如 comment、continue、save fragment、join challenge。

## 14. MVP 开发优先级

### P0：必须先做

- 统一品牌为 LINESPACE，更新 README 和 title。
- 把 `App.tsx` 拆分为 types、mockData、components、pages。
- 重构 Create：用 `What are you starting?` 入口替代显式 mode selector，并在内部映射 `facilitated` / `co_creative` / `coCreativePattern`。
- 新增 Spaces 页面 tabs：Groups、Challenges、Fragments、Map。
- 新增 Fragment Card 和 Fragment 创建入口。
- Detail 页面补齐 author tools，让 AI suggestions 可在作品详情中处理。
- 将 poemLines 改为按 work/post 存储。
- 新增 lock-in 状态和按钮。

### P1：核心体验增强

- Challenge 创建和 join flow。
- Co-writing room / Candidate contribution board。
- Turn queue / Submit next line，作为 relay pattern 的增强功能。
- Contribution log。
- Attribution step。
- Badge display。
- Saved fragments。
- Profile 新增 Memory tab，展示 owned / participated / saved / published memories。
- Detail / History 升级为 Work Evolution timeline。
- VersionSnapshot detail：read version / changes / sources / actions。
- Save draft snapshot、Name version、Restore as new branch 的前端状态变化。
- Finished form card。
- Publication Studio：自由美工编辑 + 固定模板套版。
- Lock final design 后导出 JPG / PDF 到本地。

### P2：研究展示和完成度

- PDF / image export mock。
- GIF / generated image background。
- 更丰富的纸张、贴纸、拼贴、印章素材库。
- 高级 diff、版本对照和跨作品 memory map。
- Moderation / report。
- Group roles。
- AI prompt integration mock。

## 15. 给 Codex 的实现提示词：重构 Create 与协作模式边界

```text
你是全球顶级的人机交互专家、产品设计师和 React/Tailwind app 开发专家。

请基于 linespace-demo 当前 React/Vite/Tailwind demo 和 co-creative-turn-taking-design.md，优化 Create / Workbench 中 facilitated writing 与 co-creative writing 的设计边界。

核心设计原则：
1. 不要把 co-creative writing 等同于 turn-taking。Turn-taking relay 只是 co-creative writing 的一种 interaction pattern。
2. Facilitated Writing 与 Co-creative Writing 是系统内部的 collaboration logic，用来决定权限、工作台、贡献记录、署名和 lock-in，而不是必须在 Create 第一屏显式要求用户选择的学术概念。
3. 用户界面应优先呈现用户任务和工作流：我要保存碎片、请求反馈、发起小组讨论、回应挑战、创建共写房间、创建接龙线程、发布 final version。
4. Create 页面不要同时并列显示 creation type 和 collaboration mode。改成渐进式配置：
   - Step 1: What are you starting?
   - Step 2: How can others participate?
   - Step 3: Contract
   - Step 4: Package / Lock & Export，如果是 final flow。
5. 系统内部仍保留字段：
   - collaborationMode: "facilitated" | "co_creative"
   - coCreativePattern?: "group_chat_brainstorm" | "host_curated" | "shared_editing" | "turn_taking_relay" | "parallel_branch_merge"

请实现以下修改：
1. 更新 src/types.ts：
   - 将 Post.mode 或相关 mode 字段语义调整为 collaborationMode。
   - 新增 coCreativePattern 可选字段。
   - 保留对现有 mock 的兼容，避免大面积破坏现有页面。
2. 重构 CreatePage：
   - 删除顶部并列的 creation type + collaboration mode 选择布局。
   - 改为 “What are you starting?” 卡片组：
     - fragment
     - Draft for feedback -> facilitated
     - Group discussion -> facilitated
     - Challenge response -> 用户可继续选 author-led response 或 co-writing
     - Co-writing room -> co_creative + group_chat_brainstorm / host_curated / shared_editing
     - Relay thread -> co_creative + turn_taking_relay
     - Final version -> 继承原 work 的 mode 或默认为 facilitated
   - 第二段根据选择显示 “How can others participate?”：
     - facilitated: comment, close reading, revision suggestion, possible lines, invite to co-write
     - co_creative: submit candidate lines, edit shared text, add turn, vote/consent, lock rule
   - 第三段保留 visibility、feedback contract、attribution policy，但根据 facilitated / co_creative 动态调整文案和默认值。
   - UI badge 用 `Author-led` / `Co-writing`，pattern 作为次级 badge，如 `Relay`、`Shared edit`、`Host curated`。
3. 重构 DetailPage / Workbench：
   - 先按 collaborationMode 分流：
     - facilitated: comments + AI organized suggestions + accept/edit/ignore + author lock version
     - co_creative: co-creation contract + participant roles + contribution board + collective attribution
   - 再按 coCreativePattern 显示具体工具：
     - turn_taking_relay: line sequence + turn queue + submit next line + pass + lock line
     - group_chat_brainstorm / host_curated: pinned ideas + candidate lines + host accept/edit/decline
     - shared_editing: version log + direct edits mock UI
4. 更新 Spaces / Challenges：
   - Challenge join flow 不要只有 group brainstorm 和 turn-taking。
   - 增加 Co-writing room 入口，并把 Turn-taking relay 标为一种 relay pattern。
5. 更新 Profile / Feed badge：
   - 使用 Author-led / Co-writing 作为主 badge。
   - 如果是 co_creative，再显示 pattern badge。
6. 不接真实后端，继续用 mock data + React state。
7. 保持现有 LINESPACE 高对比蓝/红、圆角卡片、社交媒体 feed 风格。
8. 保持移动端可读，不要使用固定四列导致小屏挤压。

验收标准：
- 用户打开 Create 时，不再需要先理解 facilitated / co-creative 术语，而是选择自然的创作入口。
- 系统仍能清楚地区分 author-led feedback 与 co-writing 的权限、贡献和署名边界。
- Co-writing 不再被设计成只有 turn-taking；turn-taking relay 只是 coCreativePattern 之一。
- Detail workbench 能根据 facilitated / co_creative / pattern 展示不同工具。
- History / Contribution / Attribution 的含义与新的模式边界一致。
```

## 16. 给 Codex 的实现提示词：Memoryline 与版本记忆

```text
你是全球顶级的人机交互专家、产品设计师和 React/Vite/Tailwind app 开发专家。

请基于 linespace-demo 当前 React/Vite/Tailwind demo 和 co-creative-turn-taking-design.md，实现 “Memoryline / 创作记忆线” 模块，用于保存不同版本，特别是 private drafts，并可视化呈现一个作品随时间演化的过程，以及用户参与过的创作作品如何继续发展。

核心设计原则：
1. 不要把所有信息堆在同一个左右分栏大屏里。请采用分层导航：
   - Profile > Memory：个人记忆中心，只显示作品级卡片和筛选。
   - Work Evolution：单个作品的时间线 overview。
   - Version Snapshot Detail：单个版本详情，含正文、变化摘要、来源贡献和操作。
   - Contribution Source Detail：需要时再查看原评论 / 原接龙行 / 原 fragment 来源。
2. Memoryline 不等于普通操作日志。它要帮助用户回忆：我保存过哪些草稿、为什么修改、谁的输入被采纳、哪个版本被 lock、哪个版本被发布。
3. Private draft 默认只对作者可见；贡献者只能看到与自己贡献相关且有权限的演化节点。
4. Facilitated Writing 和 Co-creative Writing 的时间线表达不同：
   - facilitated：作者主线 + comments / suggestions / author decisions。
   - co_creative：共同作品主线 + turns / line locks / host decisions / attribution。
5. 保持现有 LINESPACE 视觉风格：高对比蓝/红、圆角卡片、清晰 badge、社交媒体 feed 气质；移动端保持单列可读。

请实现以下内容：

1. 更新 src/types.ts：
   - 新增 VersionSnapshot：
     - id, workId, parentVersionId?, label, stage, createdBy, createdAt, saveReason, visibility, title?, lines, changeSummary, sourceEventIds, sourceContributionIds, lockState。
   - 新增 WorkMemory：
     - id, userId, workId, role, memoryType, lastTouchedAt, pinned, privateNote?。
   - 扩展 VersionEvent.type：
     - draft_saved, version_named, branch_created, line_locked, attribution_updated 等。
   - 如果已有 Contribution / LockState / VersionEvent，请复用并保持兼容。

2. 更新 src/data/mockData.ts：
   - 为至少 4 个作品创建 VersionSnapshot mock：
     - 一个 private draft 链。
     - 一个 author-led feedback 后形成 locked version 的作品。
     - 一个 turn-taking relay 的共同作品。
     - 一个从 fragment branch 出来的版本。
   - 创建 WorkMemory mock，使 Profile 可以展示：
     - Owned works。
     - Co-authored works。
     - Helped / contributed works。
     - Saved fragments。
     - Published records。
   - 每个 timeline 节点要有清楚的 changeSummary，方便 UI 不做复杂 diff 也能讲清演化。

3. 新增或重构 Profile 的 Memory tab：
   - 在 Profile tabs 中增加 `Memory`。
   - 显示 Memory cards，而不是完整 timeline。
   - 支持筛选：All, Owned, Co-authored, Helped, Saved, Published, Private drafts。
   - 每张卡展示：作品标题或首行、我的角色、当前 stage、最近事件、lock 状态、贡献数、是否有 private draft。
   - 点击 `Open evolution` 进入该作品的 Work Evolution view。

4. 重构 HistoryPage 为 Work Evolution view：
   - 使用 VersionEvent + VersionSnapshot 真实 mock 数据展示单列 timeline。
   - 按阶段分组：Private start, Feedback opened, Co-writing, Lock-in, Publication。
   - 每个节点显示：事件类型 icon、标题、actor、timestamp、changeSummary、版本 stage badge。
   - 点击节点或 snapshot card 进入 Version Snapshot Detail。
   - 不要做左右双栏大屏；overview 只保留摘要。

5. 新增 Version Snapshot Detail view：
   - 顶部显示版本 label、stage、visibility、createdAt、lock 状态。
   - 使用 tabs：Read version, Changes, Sources, Actions。
   - Read version：展示诗行。
   - Changes：展示 changeSummary 和简单 added / removed / reordered mock。
   - Sources：展示关联 comments / suggestions / contributions / fragment。
   - Actions：实现前端状态变化：
     - Name version。
     - Save draft snapshot。
     - Restore as new branch。
     - Lock version。
   - 这些动作要生成新的 VersionEvent，并更新相关 VersionSnapshot / WorkMemory state。

6. 在 Create / Edit / Detail 的编辑区域增加轻量入口：
   - `Save draft snapshot` 按钮。
   - `Open Memoryline` 按钮。
   - 保存 draft 时不要发布到 feed，只进入当前用户 private memory。

7. 响应式要求：
   - Profile Memory cards 在桌面为 2-3 列，移动端 1 列。
   - Work Evolution timeline 移动端必须为单列。
   - Version detail 的 tabs 在窄屏可横向滚动或换行，但文字不能溢出。

8. 不接真实后端，不新增复杂依赖，继续使用 mock data + React state。
9. 保持 TypeScript 类型清晰，避免 any 泛滥。
10. 运行 npm run build，修复 TypeScript / Vite 编译错误。

验收标准：
- Profile 里能看到个人参与的创作记忆，而不只是自己发布的作品。
- 单个作品能看到按时间演化的 timeline，且节点来自真实 VersionEvent mock。
- 用户能保存 private draft snapshot，并在不公开的情况下回到该版本。
- 用户能从某个版本 restore as new branch，不覆盖 locked version。
- Facilitated 和 turn-taking / co-creative 作品的 timeline 文案与事件类型不同。
- 移动端不出现固定四列挤压，timeline 和 version detail 可阅读。
```
