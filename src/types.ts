import type { FormEvent, ReactNode } from "react";

export type View = "home" | "spaces" | "groupChat" | "create" | "activity" | "profile" | "detail" | "quote" | "history";
export type Stage = "Started from" | "Poem so far" | "Final Version";
export type SuggestionGroup = "Possible lines" | "Reader themes" | "Tone feedback" | "Revision hints";
export type CollaborationMode = "facilitated" | "turn_taking";
export type WorkKind = "fragment" | "draft" | "thread" | "final";
export type CreationKind = "Private fragment" | "Feedback-supported draft" | "Group post" | "Challenge response" | "Turn-taking thread" | "Final version";
export type VisibilityMode = "public" | "private" | "group" | "include_people" | "exclude_people";
export type AttributionMode = "named" | "anonymous" | "pen_name";
export type DesignMode = "free_studio" | "template";
export type CanvasSize = "postcard" | "square" | "story" | "a4" | "chapbook";

export type PublicationDesignStyle = {
  fontFamily: "serif" | "sans" | "mono" | "hand";
  fontSize: number;
  lineHeight: number;
  textColor: string;
  accentColor: string;
  background: "paper" | "blueprint" | "notebook" | "collage" | "dark" | "rose";
  paperTone: string;
  align: "left" | "center" | "right";
  padding: number;
  borderStyle: "none" | "thin" | "stamp" | "tape";
  sticker: "none" | "moon" | "star" | "tape" | "flower" | "clip";
  stamp: "none" | "draft" | "locked" | "collective" | "fragment";
  showCredits: boolean;
  showTags: boolean;
};

export type DesignTemplate = {
  id: string;
  name: string;
  description: string;
  bestFor: "fragment" | "draft" | "final" | "turn_taking";
  canvasSize: CanvasSize;
  previewTheme: "quiet" | "notebook" | "journal" | "collage" | "collective" | "fragment";
  defaultStyle: PublicationDesignStyle;
};

export type PublicationDesign = {
  id: string;
  workId?: string;
  title: string;
  poemText: string;
  authorName: string;
  contributorNames: string[];
  tags: string[];
  mode: DesignMode;
  templateId?: string;
  canvasSize: CanvasSize;
  style: PublicationDesignStyle;
  locked: boolean;
  lockedAt?: string;
  updatedAt: string;
};

export type ExportRecord = {
  id: string;
  designId: string;
  workId?: string;
  type: "jpg" | "pdf";
  filename: string;
  createdAt: string;
};

export type Author = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
};

export type FeedbackContract = {
  allowEncouragement: boolean;
  allowCloseReading: boolean;
  allowTechnicalRevision: boolean;
  allowPossibleLines: boolean;
  allowCoCreationInvite: boolean;
  blockedFeedback: string[];
};

export type AttributionPolicy = {
  defaultStyle: "primary_author_helpers" | "coauthors" | "collective_name" | "anonymous_collective";
  requiresContributorConsent: boolean;
  collectiveName?: string;
};

export type LockState = {
  status: "unlocked" | "soft_locked" | "locked" | "published";
  lockedBy?: string;
  lockedAt?: string;
  canBranch: boolean;
};

export type Post = {
  id: string;
  author: Author;
  mode: CollaborationMode;
  kind: WorkKind;
  ownerId: string;
  authorIds: string[];
  spaceId?: string;
  channelId?: string;
  visibilityGroupId?: string;
  visibleUserIds?: string[];
  hiddenUserIds?: string[];
  sourceFragmentId?: string;
  sourceWorkId?: string;
  stage: Stage;
  source?: string;
  visibility: "public" | "private" | "invited" | "group" | "challenge";
  body: string;
  lines: string[];
  tags: string[];
  color: "blue" | "red" | "photo" | "moon";
  repliesOpen: boolean;
  allowReplies: boolean;
  allowBuild: boolean;
  quoteAllowed: boolean;
  allowLike: boolean;
  showHistory: boolean;
  invited: string[];
  likes: number;
  comments: number;
  quotes: number;
  saves: number;
  liked: boolean;
  saved: boolean;
  contributors: number;
  imageUrl?: string;
  imagePreset?: "city" | "moon" | "roses" | "stars";
  feedbackContract: FeedbackContract;
  attributionPolicy: AttributionPolicy;
  attributionName?: string;
  coAuthorIds?: string[];
  anonymous?: boolean;
  publicationDesignId?: string;
  exportRecordIds?: string[];
  lockState: LockState;
  currentVersionId: string;
  turnQueue?: string[];
  activeTurnUserId?: string;
  lockedLineIds?: string[];
};

export type Comment = {
  id: string;
  postId: string;
  author: Author;
  text: string;
  kind: string;
  likes: number;
  replies: number;
  quotes: number;
  liked: boolean;
};

export type Suggestion = {
  id: string;
  commentId: string;
  group: SuggestionGroup;
  text: string;
  status: "open" | "editing" | "ignored" | "added";
};

export type PoemLine = {
  id: string;
  text: string;
  by: string;
  locked?: boolean;
};

export type EditablePoemLine = {
  id: string;
  text: string;
  by: string;
};

export type SpaceMember = {
  userId: string;
  role: "member" | "moderator" | "curator" | "owner";
  badges: string[];
};

export type Space = {
  id: string;
  name: string;
  kind: "genre" | "publication" | "track" | "course" | "private_circle";
  description: string;
  visibility: "public" | "request_to_join" | "private";
  tags: string[];
  members: SpaceMember[];
  rules: string[];
  channels: string[];
};

export type Channel = {
  id: string;
  spaceId?: string;
  title: string;
  kind: "discussion" | "challenge" | "turn_taking" | "fragment_pool";
  prompt?: string;
  tags: string[];
  deadline?: string;
  defaultMode: CollaborationMode;
  visibility: "group" | "public";
  status: "open" | "reviewing" | "locked" | "archived";
  participants: number;
};

export type GroupTopicType = "poetry_discussion" | "free_chat" | "post_forward" | "co_creation_call";

export type GroupTopic = {
  id: string;
  spaceId: string;
  title: string;
  type: GroupTopicType;
  starter: string;
  createdBy: Author;
  createdAt: string;
  postId?: string;
  tags: string[];
  unread: number;
  active: boolean;
};

export type GroupChatMessage = {
  id: string;
  spaceId: string;
  topicId?: string;
  author: Author;
  text: string;
  createdAt: string;
  mentions: string[];
  quoteMessageId?: string;
  postId?: string;
  reactions: number;
};

export type Fragment = {
  id: string;
  text: string;
  creator?: Author;
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
  invitedBy: string[];
  invitedUserIds?: string[];
  activeChatCount: number;
  activeThreadCount: number;
  branchCount: number;
};

export type Contribution = {
  id: string;
  workId: string;
  contributorId?: string;
  contributorName: string;
  anonymous: boolean;
  type: "comment" | "interpretation" | "revision" | "line" | "structure" | "curation";
  sourceId: string;
  status: "suggested" | "accepted" | "locked" | "credited" | "declined";
  attributionPreference: "public_credit" | "private_thanks" | "anonymous" | "decline_credit";
  verifiedBy?: string;
  createdAt: string;
};

export type VersionEvent = {
  id: string;
  workId: string;
  actorId: string;
  actorName: string;
  type:
    | "created"
    | "commented"
    | "suggestion_generated"
    | "suggestion_accepted"
    | "line_added"
    | "line_locked"
    | "line_reordered"
    | "version_locked"
    | "published"
    | "design_saved"
    | "design_locked"
    | "jpg_exported"
    | "pdf_exported"
    | "fragment_saved"
    | "branch_created";
  payload: Record<string, unknown>;
  createdAt: string;
};

export type SearchProps = {
  searchInput: string;
  setSearchInput: (value: string) => void;
  runSearch: () => void;
};

export type CreateSettings = {
  publicPost: boolean;
  visibilityMode: VisibilityMode;
  selectedGroupId?: string;
  visibleUserIds: string[];
  hiddenUserIds: string[];
  allowComments: boolean;
  allowForward: boolean;
  allowReplies: boolean;
  allowQuote: boolean;
  allowBuild: boolean;
  allowLike: boolean;
  showHistory: boolean;
  attributionMode: AttributionMode;
  penName: string;
  coAuthorIds: string[];
};

export type ActionButtonProps = {
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
};

export type SubmitHandler = (event: FormEvent) => void;
