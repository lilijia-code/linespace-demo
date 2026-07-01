# LINESPACE Co-creative / Turn-taking Poetry 功能设计方案

## 1. 设计目标

LINESPACE 不应只是“诗歌版社交媒体”，而应是一个用社交媒体形态承载创作支持的诗歌协作平台。

核心设计判断：

- 诗歌创作不是全程协作，而是选择性开放。作者需要决定何时开放、向谁开放、开放到什么程度。
- 平台需要明确区分两种创作模式：`Facilitated Writing` 和 `Co-creative Turn-taking Writing`。
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

### 2.3 两种协作模式

`Facilitated Writing`：

- 一位作者拥有作品。
- 其他人通过评论、close reading、修改建议、候选诗行帮助作品发展。
- 署名形式通常是“作者 + helpers / acknowledgements”。

`Co-creative Turn-taking Writing`：

- 多人事先同意共同创作。
- 每个人可以直接贡献诗行、结构、标题、顺序或版本决策。
- 署名形式可以是并列署名、共同笔名、group name、匿名集体。

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
| Create   | Create / Start             | 创建 fragment、draft、feedback post、challenge thread、turn-taking thread |
| Activity | Inbox                      | 邀请、轮到你写、评论、贡献被采纳、badge、lock-in 通知                                   |
| Profile  | Portfolio                  | 作品、草稿、贡献、badge、saved fragments、published PDFs                       |
| Detail   | Workbench                  | 单个作品的创作工作台，按模式显示不同协作工具                                              |
| Quote    | Branch / Remix             | 从某个 fragment / line / poem 派生自己的版本                                  |
| History  | Version & Contribution Log | 时间线、版本、采纳记录、署名状态                                                    |

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
- group 内可以有多个 channel，例如 `draft-feedback`、`turn-taking`、`submissions`、`fragments`。
- group 应支持 moderator / curator，帮助维护高质量反馈。

### 4.2 Channel / Challenge

用于限定主题和组织共同创作。

```ts
type Channel = {
  id: string;
  spaceId?: string;
  title: string;
  kind: "discussion" | "challenge" | "turn_taking" | "fragment_pool";
  prompt?: string;
  tags: string[];
  deadline?: string;
  defaultMode: "facilitated" | "turn_taking";
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
  mode: "facilitated" | "turn_taking";
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
    | "commented"
    | "suggestion_generated"
    | "suggestion_accepted"
    | "line_added"
    | "line_reordered"
    | "version_locked"
    | "published"
    | "pdf_exported";
  payload: Record<string, unknown>;
  createdAt: string;
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
3. 创建时选择模式 `Facilitated Writing`。
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

- Create 页面新增 mode selector。
- Comment 输入框旁新增 feedback type。
- Detail 页面显示 author tool，而不只在 Profile Comments 显示。
- suggestion accepted 后生成 Contribution 和 VersionEvent。
- Final Version 支持 lock-in。

### 5.2 工作流 B：Challenge 中发起共创

适用场景：

- 某个 channel 限定主题、标签、体裁或发表目标。
- 参与者可以选择 group-chat brainstorm 或 thread relay。
- 目标是明确“这是共创”，避免混淆作者边界。

用户路径：

1. 用户进入 `Challenges`。
2. 看到挑战卡片：主题、标签、截止时间、参与人数、活跃 threads。
3. 点击 `Join challenge`。
4. 选择参与形式：
   - `Group chat brainstorm`：多人讨论，内容默认不进入正文。
   - `Turn-taking thread`：每次一个人追加一行或一段。
5. 若选择 thread relay，创建者设置规则：
   - 每人每轮一行 / 两行。
   - 是否固定顺序。
   - 是否允许 pass。
   - 每轮时间限制。
   - 谁能 lock-in：host / rotating editor / majority vote。
   - 署名规则：everybody / group pseudonym / anonymous collective。
6. 参与者按顺序添加 line。
7. 每一行可以被 `proposed`、`accepted`、`revised`、`locked`。
8. 达成 final 后生成 collective finished form。
9. 发布时展示贡献链和共同署名。

Group chat brainstorm 与 Thread relay 的区别：

| 维度 | Group chat brainstorm | Turn-taking thread |
| --- | --- | --- |
| 输入方式 | 非线性讨论 | 顺序追加 |
| 是否进入正文 | 需要 host 采纳 | 默认成为候选正文 |
| 作者权 | host 或小组编辑 | 共创协议决定 |
| 适合阶段 | 想法、意象、方向 | 诗行接龙、共同完成 |
| UI 类比 | group chat + pinned ideas | social media thread |

需要开发的功能：

- Streams / Spaces 页面新增 Challenge cards。
- Detail 页面根据 `mode === "turn_taking"` 显示 turn queue。
- 新增 `TurnComposer`：显示轮到谁、剩余时间、pass、submit line。
- 新增 `TurnRulePanel`：展示创作契约。
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
   - `Start thread`：围绕碎片开 turn-taking relay。
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
- `Co-author`：参与 turn-taking final version。
- `Curator`：发起高质量 challenge 或整理 group。
- `Verified Contributor`：贡献被 lock-in 版本记录。

贡献者可选择是否公开展示 badge。

## 9. Attribution 设计

发布 final version 时出现 attribution step。

Facilitated Writing 默认：

- `Written by Lili`
- `With suggestions from @Lin, @Jia`
- 可选择隐藏 helpers 或改为 private thanks。

Turn-taking Writing 默认：

- `Written by Lili, Lin, Jia`
- 或 `By Moon Channel Collective`
- 或 `Anonymous collective`

每位贡献者应有 attribution preference：

- public credit
- private thanks
- anonymous
- decline credit

## 10. AI 功能和提示词边界

AI 应作为创作协调器，而不是作者。

### 10.1 评论分类

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

### 10.2 Turn-taking 协调

AI 可以：

- 总结 thread 当前意象、节奏、主题。
- 提醒下一个参与者当前契约。
- 给出 3 个 possible next directions。
- 检查新行是否和前文冲突。

AI 不应：

- 自动替参与者写下一行并提交。
- 自动更改署名。
- 自动 lock-in 版本。

### 10.3 Publication Assistant

AI 可以在 final stage 提供：

- 标题建议。
- 视觉风格建议。
- PDF / card layout 方案。
- 简短作品说明。

## 11. 现有 demo 到目标方案的改造清单

### 11.1 数据层

当前问题：

- `postsSeed`、`commentsSeed`、`suggestionsSeed` 全部写在 `App.tsx`。
- `poemLines` 是全局状态，不按 post 存储，容易串作品。
- 没有 Space、Channel、Fragment、Contribution、VersionEvent。

建议改造：

- 新建 `src/data/mockData.ts`。
- 新建 `src/types.ts`。
- 将 `poemLines` 移入 post/work version 结构。
- 增加 mock spaces、channels、fragments、contributions、versionEvents。

### 11.2 页面层

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
  | "history";
```

`StreamsPage` 可先重命名或改造成 `SpacesPage`，内部包含 tabs：

- `Groups`
- `Challenges`
- `Fragments`
- `Map`

### 11.3 Create 页面

新增第一步：选择创作类型。

选项：

- `Private fragment`
- `Feedback-supported draft`
- `Group post`
- `Challenge response`
- `Turn-taking thread`
- `Final version`

新增第二步：选择 collaboration mode。

- `Facilitated Writing`
- `Co-creative Turn-taking`

新增第三步：设置契约。

- visibility
- feedback contract
- attribution policy
- lock rules
- allowed media: image / GIF

### 11.4 Detail / Workbench 页面

根据 mode 分流：

Facilitated Writing 显示：

- 原作品 / 当前版本。
- 评论和 AI organized suggestions。
- accept / edit / ignore。
- edit poem。
- lock version。

Turn-taking Writing 显示：

- thread line sequence。
- turn queue。
- submit next line。
- pass / invite next。
- lock line。
- collective attribution。

### 11.5 Home feed

Feed 需要更像 social media，但内容仍是创作支持。

推荐卡片类型：

- `Finished Form Card`
- `Open Draft Looking for Feedback`
- `Active Challenge`
- `Fragment that inspired works`
- `Turn-taking thread in progress`

每张卡片显示：

- mode badge。
- visibility badge。
- stage badge。
- contribution count。
- lock status。
- primary action，例如 comment、continue、save fragment、join challenge。

## 12. MVP 开发优先级

### P0：必须先做

- 统一品牌为 LINESPACE，更新 README 和 title。
- 把 `App.tsx` 拆分为 types、mockData、components、pages。
- 新增 mode selector：`Facilitated Writing` / `Co-create Writing`。
- 新增 Spaces 页面 tabs：Groups、Challenges、Fragments、Map。
- 新增 Fragment Card 和 Fragment 创建入口。
- Detail 页面补齐 author tools，让 AI suggestions 可在作品详情中处理。
- 将 poemLines 改为按 work/post 存储。
- 新增 lock-in 状态和按钮。

### P1：核心体验增强

- Challenge 创建和 join flow。
- Turn queue / Submit next line。
- Contribution log。
- Attribution step。
- Badge display。
- Saved fragments。
- Finished form card。

### P2：研究展示和完成度

- PDF / image export mock。
- GIF / generated image background。
- Better history timeline。
- Moderation / report。
- Group roles。
- AI prompt integration mock。

## 13. 给 Codex 的后续实现提示

当需要让 Codex 继续写代码时，可以使用下面的任务描述：

```md
请基于 linespace-demo 当前 React/Vite/Tailwind demo 和 co-creative-turn-taking-design.md，实现 P0 功能：

1. 将 App.tsx 中的类型和 mock 数据拆到 src/types.ts 与 src/data/mockData.ts。
2. 增加 SpacesPage，包含 Groups、Challenges、Fragments、Map 四个 tab。
3. 在 CreatePage 顶部加入创作类型和协作模式选择：
   - Facilitated Writing
   - Co-creative Turn-taking Writing
4. 新增 Fragment 数据模型、mock fragments、FragmentCard，并支持 save / invite / start chat / start thread / branch alone 的前端状态变化。
5. DetailPage 根据 post.mode 展示不同工作台：
   - facilitated: comments + AI suggestions + accept/edit/ignore + lock version
   - turn_taking: line sequence + turn queue + submit next line + lock line
6. 把全局 poemLines 改为按 postId/versionId 存储，避免多个作品串数据。
7. 新增 lockState、Contribution、VersionEvent 的 mock 状态，并在 HistoryPage 中展示真实事件时间线。
8. 保持现有视觉风格，但修复固定四列导致的小屏问题，至少让 feed 和 workbench 在移动端可阅读。
```

实现时不要先接真实后端。先用 mock data 和本地 React state 把完整交互跑通，再抽象 API 层。
