import {
  AtSign,
  Bookmark,
  Check,
  Hash,
  Heart,
  MessageCircle,
  Megaphone,
  Pin,
  PlusCircle,
  Quote,
  Repeat2,
  Reply,
  Search,
  Send,
  Star,
  Users,
  X,
} from "lucide-react";
import { type CSSProperties, type FormEvent, type ReactNode, useMemo, useRef, useState } from "react";
import {
  authors,
  channelsSeed,
  closeReadingContract,
  collectiveAttribution,
  commentsSeed,
  contributionsSeed,
  currentUser,
  defaultFeedbackContract,
  fragmentsSeed,
  groupChatMessagesSeed,
  groupTopicsSeed,
  helperAttribution,
  poemLinesByPostSeed,
  postsSeed,
  publicationTemplatesSeed,
  spacesSeed,
  suggestionsSeed,
  turnTakingContract,
  versionEventsSeed,
  versionSnapshotsSeed,
  workMemoriesSeed,
} from "./data/mockData";
import type {
  ActionButtonProps,
  Author,
  CanvasSize,
  Channel,
  CollaborationMode,
  CoCreativePattern,
  Comment,
  Contribution,
  CreateSettings,
  CreationKind,
  DesignMode,
  DesignTemplate,
  EditablePoemLine,
  ExportRecord,
  FeedbackContract,
  Fragment,
  GroupChatMessage,
  GroupTopic,
  GroupTopicType,
  PoemLine,
  Post,
  PublicationDesign,
  PublicationDesignStyle,
  SearchProps,
  Space,
  Suggestion,
  SuggestionGroup,
  AttributionMode,
  VisibilityMode,
  VersionEvent,
  VersionSnapshot,
  View,
  WorkMemory,
} from "./types";

type SpacesTab = "Groups" | "Challenges" | "Fragments" | "Map";
type FragmentActionName = "save" | "invite" | "chat" | "thread" | "branch";
type ChallengeStartMode = "author_led" | "co_writing" | "relay";
type TopicComposerMode = GroupTopicType;
type MemoryFilter = "All" | "Owned" | "Co-authored" | "Helped" | "Saved" | "Published" | "Private drafts";

const navItems: { label: string; view: View }[] = [
  { label: "Home", view: "home" },
  { label: "Spaces", view: "spaces" },
  { label: "Create", view: "create" },
  { label: "Activity", view: "activity" },
  { label: "Profile", view: "profile" },
];

const createIntentCards: {
  kind: CreationKind;
  title: string;
  description: string;
  collaborationMode: CollaborationMode;
  pattern?: CoCreativePattern;
  badge: string;
}[] = [
  { kind: "Fragment", title: "Fragment", description: "Save a line, image, or spark before it becomes social.", collaborationMode: "facilitated", badge: "Private first" },
  { kind: "Draft for feedback", title: "Draft for feedback", description: "Ask readers for comments, close reading, and possible lines.", collaborationMode: "facilitated", badge: "Author-led" },
  { kind: "Group discussion", title: "Group discussion", description: "Bring a draft or topic into a trusted group conversation.", collaborationMode: "facilitated", badge: "Author-led" },
  { kind: "Challenge response", title: "Challenge response", description: "Respond to a prompt alone or open it into co-writing.", collaborationMode: "facilitated", badge: "Choose path" },
  { kind: "Co-writing room", title: "Co-writing room", description: "Collect candidate lines, pinned ideas, and shared decisions.", collaborationMode: "co_creative", pattern: "host_curated", badge: "Co-writing" },
  { kind: "Relay thread", title: "Relay thread", description: "Use turn order when each participant adds a line or stanza.", collaborationMode: "co_creative", pattern: "turn_taking_relay", badge: "Relay" },
  { kind: "Final version", title: "Final version", description: "Lock, package, and publish a finished form.", collaborationMode: "facilitated", badge: "Lock & export" },
];

const coCreativePatternOptions: { value: CoCreativePattern; label: string; description: string }[] = [
  { value: "group_chat_brainstorm", label: "Group brainstorm", description: "Nonlinear chat, pinned ideas, host decides what enters the poem." },
  { value: "host_curated", label: "Host curated", description: "People submit candidate lines or structures; host accepts with credit." },
  { value: "shared_editing", label: "Shared edit", description: "A small co-author group edits the same version with visible history." },
  { value: "turn_taking_relay", label: "Relay", description: "A visible queue controls who adds the next line." },
  { value: "parallel_branch_merge", label: "Branch merge", description: "Several branches develop in parallel, then selected pieces merge." },
];

const facilitatedParticipation = [
  "Comments",
  "Close reading",
  "Revision suggestions",
  "Possible lines",
  "Invite to co-write",
];

const coCreativeParticipation = [
  "Submit candidate lines",
  "Edit shared text",
  "Add turn",
  "Vote / consent",
  "Lock rule",
];

const topicModes: { value: TopicComposerMode; label: string; hint: string }[] = [
  { value: "poetry_discussion", label: "Poetry topic", hint: "Discuss image, rhythm, form, or theme." },
  { value: "free_chat", label: "Free chat", hint: "Open conversation for the group." },
  { value: "post_forward", label: "Forward post", hint: "Bring a post into the group for response." },
  { value: "co_creation_call", label: "Co-creation call", hint: "Invite members to branch or write together." },
];

const eventCopy: Record<VersionEvent["type"], string> = {
  created: "Created",
  draft_saved: "Draft snapshot saved",
  version_named: "Version named",
  commented: "Commented",
  suggestion_generated: "AI organized suggestion",
  suggestion_accepted: "Suggestion accepted",
  line_added: "Line added",
  line_locked: "Line locked",
  line_reordered: "Lines reordered",
  version_locked: "Version locked",
  published: "Published",
  attribution_updated: "Attribution updated",
  design_saved: "Design draft saved",
  design_locked: "Final design locked",
  jpg_exported: "JPG exported",
  pdf_exported: "PDF exported",
  fragment_saved: "Fragment saved",
  branch_created: "Branch created",
};

const evolutionStages = [
  { id: "private_start", label: "Private start", short: "PR", description: "Drafts and fragments before the work becomes social." },
  { id: "feedback_opened", label: "Feedback opened", short: "FB", description: "Comments, suggestions, and author decisions around the work." },
  { id: "co_writing", label: "Co-writing", short: "CO", description: "Turns, line locks, host decisions, and shared authorship." },
  { id: "lock_in", label: "Lock-in", short: "LK", description: "Versions, lines, and attribution become stable records." },
  { id: "publication", label: "Publication", short: "PB", description: "Final design, export, and public release." },
] as const;

type EvolutionStageId = typeof evolutionStages[number]["id"];

function eventStage(event: VersionEvent, post: Post): EvolutionStageId {
  if (event.type === "draft_saved" || event.type === "fragment_saved" || event.type === "branch_created" || event.type === "created") return "private_start";
  if (event.type === "line_added" || (event.type === "line_locked" && isCoCreativePost(post))) return "co_writing";
  if (event.type === "version_locked" || event.type === "line_locked" || event.type === "version_named" || event.type === "attribution_updated") return "lock_in";
  if (event.type === "published" || event.type === "design_saved" || event.type === "design_locked" || event.type === "jpg_exported" || event.type === "pdf_exported") return "publication";
  return "feedback_opened";
}

function eventIcon(type: VersionEvent["type"]) {
  if (type === "draft_saved") return "DR";
  if (type === "line_added") return "LN";
  if (type === "line_locked" || type === "version_locked") return "LK";
  if (type === "published") return "PB";
  if (type === "branch_created") return "BR";
  if (type === "design_locked" || type === "design_saved") return "DS";
  if (type === "jpg_exported" || type === "pdf_exported") return "EX";
  if (type === "suggestion_accepted") return "AC";
  if (type === "commented") return "CM";
  return "EV";
}

function classifyReaderResponse(text: string): { kind: string; group?: SuggestionGroup; suggestion?: string } {
  const normalized = text.toLowerCase();
  if (/\b(maybe|revise|revision|make|tone|colder|less|more|try|change|edit|structure)\b/.test(normalized)) {
    return { kind: "revision suggestion", group: "Revision hints", suggestion: text };
  }
  if (/\b(feels|feeling|bitter|sad|tender|uncanny|lonely|emotional|hurts|real|quiet)\b/.test(normalized)) {
    return { kind: "emotional feedback", group: "Tone feedback", suggestion: text.replace(/^this feels\s*/i, "Tone: ") };
  }
  if (/\b(theme|about|memory|archive|self-archive|digital|nostalgia|identity|private|unsent)\b/.test(normalized)) {
    return { kind: "theme interpretation", group: "Reader themes", suggestion: text };
  }
  if (normalized.length < 28 || /\b(lol|same|real|love|wow)\b/.test(normalized)) {
    return { kind: "casual response" };
  }
  return { kind: "poetic continuation", group: "Possible lines", suggestion: text };
}

function countOpenSuggestions(comments: Comment[], suggestions: Suggestion[]) {
  const ids = new Set(comments.map((comment) => comment.id));
  return suggestions.filter((item) => ids.has(item.commentId) && (item.status === "open" || item.status === "editing")).length;
}

function makePoemLines(post: Post): PoemLine[] {
  return post.lines.map((text, index) => ({
    id: `${post.id}-l${index}`,
    text,
    by: index === 0 ? `Started by ${post.author.name.split(" ")[0]}` : isRelayPost(post) ? "Added in relay" : isCoCreativePost(post) ? "Added from co-writing room" : "Added from reader comments",
    locked: post.lockedLineIds?.includes(`${post.id}-l${index}`) ?? (post.lockState.status === "locked" || post.lockState.status === "published"),
  }));
}

function nowIso() {
  return new Date().toISOString();
}

function extractMentions(text: string) {
  return Array.from(new Set(text.match(/@[A-Za-z0-9_.-]+/g) ?? []));
}

function getCollaborationMode(post: Post): CollaborationMode {
  return post.collaborationMode ?? (post.mode === "turn_taking" ? "co_creative" : "facilitated");
}

function getCoCreativePattern(post: Post): CoCreativePattern | undefined {
  return post.coCreativePattern ?? (post.mode === "turn_taking" ? "turn_taking_relay" : undefined);
}

function isCoCreativePost(post: Post) {
  return getCollaborationMode(post) === "co_creative";
}

function isRelayPost(post: Post) {
  return getCoCreativePattern(post) === "turn_taking_relay";
}

function collaborationLabel(post: Post) {
  return isCoCreativePost(post) ? "Co-writing" : "Author-led";
}

function patternLabel(pattern?: CoCreativePattern) {
  if (pattern === "group_chat_brainstorm") return "Brainstorm";
  if (pattern === "host_curated") return "Host curated";
  if (pattern === "shared_editing") return "Shared edit";
  if (pattern === "turn_taking_relay") return "Relay";
  if (pattern === "parallel_branch_merge") return "Branch merge";
  return "";
}

function channelModeLabel(channel: Channel) {
  const mode = channel.defaultCollaborationMode ?? (channel.defaultMode === "turn_taking" ? "co_creative" : "facilitated");
  const pattern = channel.defaultCoCreativePattern ?? (channel.defaultMode === "turn_taking" ? "turn_taking_relay" : undefined);
  return mode === "co_creative" ? patternLabel(pattern) || "Co-writing" : "Theme challenge";
}

const canvasSizeMeta: Record<CanvasSize, { label: string; width: number; height: number }> = {
  postcard: { label: "Postcard", width: 1200, height: 800 },
  square: { label: "Social card", width: 1000, height: 1000 },
  story: { label: "Story", width: 900, height: 1600 },
  a4: { label: "Broadside", width: 1240, height: 1754 },
  chapbook: { label: "Chapbook page", width: 900, height: 1200 },
};

const fontStacks: Record<PublicationDesignStyle["fontFamily"], string> = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "Inter, Arial, sans-serif",
  mono: "'Courier New', monospace",
  hand: "'Comic Sans MS', 'Segoe Print', cursive",
};

function makePublicationDesign(params: {
  workId?: string;
  poemText: string;
  authorName: string;
  contributorNames: string[];
  tags: string[];
  template?: DesignTemplate;
  initial?: PublicationDesign;
}): PublicationDesign {
  const { workId, poemText, authorName, contributorNames, tags, template, initial } = params;
  const activeTemplate = template ?? publicationTemplatesSeed[0];
  return {
    id: initial?.id ?? `design-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    workId,
    title: initial?.title ?? shorten(poemText.replace(/\s+/g, " "), 52),
    poemText,
    authorName,
    contributorNames,
    tags,
    mode: initial?.mode ?? "template",
    templateId: initial?.templateId ?? activeTemplate.id,
    canvasSize: initial?.canvasSize ?? activeTemplate.canvasSize,
    style: initial?.style ?? { ...activeTemplate.defaultStyle },
    locked: initial?.locked ?? false,
    lockedAt: initial?.lockedAt,
    updatedAt: nowIso(),
  };
}

function initialPublicationDesigns() {
  const finalPosts = postsSeed.filter((post) => post.stage === "Final Version" || post.lockState.status === "locked");
  return finalPosts.map((post, index): PublicationDesign => {
    const template = publicationTemplatesSeed.find((item) => item.id === (post.id === "p6" ? "template-little-journal-page" : "template-quiet-postcard")) ?? publicationTemplatesSeed[index % publicationTemplatesSeed.length];
    return {
      id: `design-${post.id}`,
      workId: post.id,
      title: shorten(post.body, 52),
      poemText: post.lines.join("\n"),
      authorName: post.attributionName ?? post.author.name,
      contributorNames: post.authorIds
        .map((id) => Object.values(authors).find((author) => author.id === id)?.name)
        .filter((name): name is string => Boolean(name)),
      tags: post.tags,
      mode: "template",
      templateId: template.id,
      canvasSize: template.canvasSize,
      style: { ...template.defaultStyle },
      locked: true,
      lockedAt: post.lockState.lockedAt,
      updatedAt: post.lockState.lockedAt ?? "2026-07-01T09:30:00.000Z",
    };
  });
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const wrapped: string[] = [];
  text.split(/\n+/).forEach((rawLine) => {
    const words = rawLine.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      wrapped.push("");
      return;
    }
    let line = words[0];
    words.slice(1).forEach((word) => {
      const attempt = `${line} ${word}`;
      if (context.measureText(attempt).width <= maxWidth) {
        line = attempt;
      } else {
        wrapped.push(line);
        line = word;
      }
    });
    wrapped.push(line);
  });
  return wrapped;
}

function drawBackground(context: CanvasRenderingContext2D, design: PublicationDesign, width: number, height: number) {
  const { style } = design;
  context.fillStyle = style.paperTone;
  context.fillRect(0, 0, width, height);
  if (style.background === "blueprint") {
    context.fillStyle = style.paperTone || "#001eff";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "rgba(255,255,255,.18)";
    for (let x = 0; x < width; x += 70) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = 0; y < height; y += 70) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
  } else if (style.background === "notebook") {
    context.fillStyle = style.paperTone;
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "rgba(0,30,255,.18)";
    for (let y = 120; y < height - 80; y += 54) {
      context.beginPath();
      context.moveTo(60, y);
      context.lineTo(width - 60, y);
      context.stroke();
    }
    context.strokeStyle = "rgba(255,75,79,.45)";
    context.beginPath();
    context.moveTo(112, 0);
    context.lineTo(112, height);
    context.stroke();
  } else if (style.background === "collage") {
    context.fillStyle = style.paperTone;
    context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(255,255,255,.88)";
    context.fillRect(width * 0.08, height * 0.12, width * 0.62, height * 0.58);
    context.fillStyle = "rgba(255,75,79,.88)";
    context.fillRect(width * 0.54, height * 0.08, width * 0.34, height * 0.16);
    context.fillStyle = "rgba(255,255,255,.38)";
    context.fillRect(width * 0.14, height * 0.76, width * 0.7, height * 0.08);
  } else if (style.background === "dark") {
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#17171b");
    gradient.addColorStop(1, "#00115c");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  } else if (style.background === "rose") {
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, style.paperTone);
    gradient.addColorStop(1, "#ffffff");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  } else {
    context.fillStyle = style.paperTone;
    context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(0,0,0,.035)";
    for (let x = 18; x < width; x += 42) {
      for (let y = 18; y < height; y += 42) {
        context.fillRect(x, y, 2, 2);
      }
    }
  }
}

function drawPublicationDecor(context: CanvasRenderingContext2D, design: PublicationDesign, width: number, height: number) {
  const { style } = design;
  if (style.borderStyle === "thin" || style.borderStyle === "stamp") {
    context.strokeStyle = style.accentColor;
    context.lineWidth = style.borderStyle === "stamp" ? 8 : 4;
    context.strokeRect(30, 30, width - 60, height - 60);
  }
  if (style.borderStyle === "tape") {
    context.fillStyle = "rgba(255,255,255,.62)";
    context.fillRect(width * 0.08, 28, width * 0.22, 42);
    context.fillRect(width * 0.7, height - 70, width * 0.22, 42);
  }
  context.fillStyle = style.accentColor;
  context.strokeStyle = style.accentColor;
  if (style.sticker === "moon") {
    context.beginPath();
    context.arc(width - 120, 120, 46, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = style.paperTone;
    context.beginPath();
    context.arc(width - 100, 105, 42, 0, Math.PI * 2);
    context.fill();
  } else if (style.sticker === "star") {
    context.save();
    context.translate(width - 130, 125);
    context.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const radius = i % 2 === 0 ? 54 : 22;
      const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    context.closePath();
    context.fill();
    context.restore();
  } else if (style.sticker === "flower") {
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6;
      context.beginPath();
      context.arc(width - 130 + Math.cos(angle) * 32, 126 + Math.sin(angle) * 32, 25, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = style.paperTone;
    context.beginPath();
    context.arc(width - 130, 126, 24, 0, Math.PI * 2);
    context.fill();
  } else if (style.sticker === "clip") {
    context.lineWidth = 10;
    context.beginPath();
    context.arc(width - 120, 125, 44, Math.PI * 0.15, Math.PI * 1.85);
    context.stroke();
    context.beginPath();
    context.arc(width - 120, 125, 24, Math.PI * 0.15, Math.PI * 1.85);
    context.stroke();
  } else if (style.sticker === "tape") {
    context.save();
    context.translate(width - 170, 110);
    context.rotate(-0.16);
    context.fillStyle = "rgba(255,255,255,.7)";
    context.fillRect(0, 0, 150, 46);
    context.restore();
  }
  if (style.stamp !== "none") {
    context.save();
    context.translate(width - 176, height - 120);
    context.rotate(-0.14);
    context.strokeStyle = style.accentColor;
    context.lineWidth = 5;
    context.strokeRect(-70, -28, 140, 56);
    context.fillStyle = style.accentColor;
    context.font = "700 24px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(style.stamp.toUpperCase(), 0, 0);
    context.restore();
  }
}

function drawPublicationCanvas(design: PublicationDesign) {
  const size = canvasSizeMeta[design.canvasSize];
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported in this browser.");
  drawBackground(context, design, size.width, size.height);
  drawPublicationDecor(context, design, size.width, size.height);

  const padding = design.style.padding;
  const maxWidth = size.width - padding * 2;
  context.fillStyle = design.style.textColor;
  context.font = `800 ${design.style.fontSize}px ${fontStacks[design.style.fontFamily]}`;
  context.textAlign = design.style.align;
  context.textBaseline = "top";
  const x = design.style.align === "center" ? size.width / 2 : design.style.align === "right" ? size.width - padding : padding;
  const lines = wrapCanvasText(context, design.poemText, maxWidth);
  const lineHeight = design.style.fontSize * design.style.lineHeight;
  const creditsReserve = design.style.showCredits || design.style.showTags ? 130 : 50;
  let y = padding + 28;
  lines.slice(0, Math.floor((size.height - padding * 2 - creditsReserve) / lineHeight)).forEach((line) => {
    context.fillText(line, x, y, maxWidth);
    y += lineHeight;
  });

  context.textAlign = "left";
  if (design.style.showCredits) {
    context.font = `800 25px ${fontStacks.sans}`;
    context.fillStyle = design.style.accentColor;
    context.fillText(`By ${design.authorName}`, padding, size.height - padding - 78);
    if (design.contributorNames.length > 1) {
      context.font = `700 20px ${fontStacks.sans}`;
      context.fillText(`with ${design.contributorNames.slice(1).join(" / ")}`, padding, size.height - padding - 48);
    }
  }
  if (design.style.showTags && design.tags.length > 0) {
    context.font = `700 19px ${fontStacks.mono}`;
    context.fillStyle = design.style.textColor;
    context.fillText(design.tags.slice(0, 4).join("  "), padding, size.height - padding - 18);
  }
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality = 0.92) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export failed."))), type, quality);
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "linespace-poem";
}

function pdfFromJpeg(jpeg: Uint8Array, width: number, height: number) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const pushText = (text: string) => {
    const bytes = encoder.encode(text);
    chunks.push(bytes);
    length += bytes.length;
  };
  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (body: string | Uint8Array) => {
    offsets.push(length);
    pushText(`${offsets.length} 0 obj\n`);
    if (typeof body === "string") pushText(body);
    else pushBytes(body);
    pushText("\nendobj\n");
  };
  const content = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ`;
  pushText("%PDF-1.3\n");
  object("<< /Type /Catalog /Pages 2 0 R >>");
  object("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  object(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets.push(length);
  pushText(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  pushBytes(jpeg);
  pushText("\nendstream\nendobj\n");
  object(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  const xrefStart = length;
  pushText(`xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`);
  offsets.forEach((offset) => pushText(`${String(offset).padStart(10, "0")} 00000 n \n`));
  pushText(`trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);
  const result = new Uint8Array(length);
  let cursor = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, cursor);
    cursor += chunk.length;
  });
  return new Blob([result], { type: "application/pdf" });
}

const publicationExportService = {
  async exportJpg(design: PublicationDesign) {
    const canvas = drawPublicationCanvas(design);
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
    const filename = `${sanitizeFilename(design.title)}.jpg`;
    downloadBlob(blob, filename);
    return filename;
  },
  async exportPdf(design: PublicationDesign) {
    const canvas = drawPublicationCanvas(design);
    const jpegBlob = await canvasToBlob(canvas, "image/jpeg", 0.92);
    const jpeg = new Uint8Array(await jpegBlob.arrayBuffer());
    const blob = pdfFromJpeg(jpeg, canvas.width, canvas.height);
    const filename = `${sanitizeFilename(design.title)}.pdf`;
    downloadBlob(blob, filename);
    return filename;
  },
};

export default function App() {
  const [view, setView] = useState<View>("home");
  const [posts, setPosts] = useState<Post[]>(postsSeed);
  const [comments, setComments] = useState<Comment[]>(commentsSeed);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(suggestionsSeed);
  const [fragments, setFragments] = useState<Fragment[]>(fragmentsSeed);
  const [contributions, setContributions] = useState<Contribution[]>(contributionsSeed);
  const [versionEvents, setVersionEvents] = useState<VersionEvent[]>(versionEventsSeed);
  const [versionSnapshots, setVersionSnapshots] = useState<VersionSnapshot[]>(versionSnapshotsSeed);
  const [workMemories, setWorkMemories] = useState<WorkMemory[]>(workMemoriesSeed);
  const [publicationDesigns, setPublicationDesigns] = useState<PublicationDesign[]>(initialPublicationDesigns);
  const [exportRecords, setExportRecords] = useState<ExportRecord[]>([]);
  const [groupTopics, setGroupTopics] = useState<GroupTopic[]>(groupTopicsSeed);
  const [groupMessages, setGroupMessages] = useState<GroupChatMessage[]>(groupChatMessagesSeed);
  const [poemLinesByPost, setPoemLinesByPost] = useState<Record<string, PoemLine[]>>(poemLinesByPostSeed);
  const [activePostId, setActivePostId] = useState(postsSeed[0].id);
  const [activeSnapshotId, setActiveSnapshotId] = useState(versionSnapshotsSeed[0]?.id ?? "");
  const [spacesTab, setSpacesTab] = useState<SpacesTab>("Groups");
  const [activeSpaceId, setActiveSpaceId] = useState(spacesSeed[0].id);
  const [activeGroupChatSpaceId, setActiveGroupChatSpaceId] = useState(spacesSeed[0].id);
  const [activeGroupTopicId, setActiveGroupTopicId] = useState<string>("topic-cyber-reading");
  const [activeChannelId, setActiveChannelId] = useState(channelsSeed.find((channel) => channel.kind === "challenge" || channel.kind === "turn_taking" || channel.kind === "co_writing" || channel.kind === "relay")?.id ?? channelsSeed[0].id);
  const [spaceNotice, setSpaceNotice] = useState("Choose a group, challenge, or fragment to start a shared writing workflow.");
  const [profileTab, setProfileTab] = useState("Posts");
  const [commentDraft, setCommentDraft] = useState("");
  const [groupChatDraft, setGroupChatDraft] = useState("");
  const [quotedGroupMessageId, setQuotedGroupMessageId] = useState<string | undefined>();
  const [topicTitleDraft, setTopicTitleDraft] = useState("");
  const [topicStarterDraft, setTopicStarterDraft] = useState("");
  const [topicMode, setTopicMode] = useState<TopicComposerMode>("poetry_discussion");
  const [topicPostId, setTopicPostId] = useState(postsSeed[0].id);
  const [turnDraft, setTurnDraft] = useState("");
  const [quoteDraft, setQuoteDraft] = useState("I saved a version of myself inside the photo I never posted.");
  const [createDraft, setCreateDraft] = useState("I dreamed that AI remembered a city I had never visited.");
  const [createTags, setCreateTags] = useState<string[]>(["#AI_memory", "#micro_poetry"]);
  const [tagDraft, setTagDraft] = useState("");
  const [backgroundImage, setBackgroundImage] = useState("");
  const [creationKind, setCreationKind] = useState<CreationKind>("Draft for feedback");
  const [createMode, setCreateMode] = useState<CollaborationMode>("facilitated");
  const [createPattern, setCreatePattern] = useState<CoCreativePattern>("host_curated");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [settings, setSettings] = useState<CreateSettings>({
    publicPost: false,
    visibilityMode: "private",
    selectedGroupId: spacesSeed[0].id,
    visibleUserIds: [],
    hiddenUserIds: [],
    allowComments: true,
    allowForward: false,
    allowReplies: true,
    allowQuote: false,
    allowBuild: true,
    allowLike: false,
    showHistory: true,
    attributionMode: "named",
    penName: "",
    coAuthorIds: [],
  });

  const activePost = posts.find((post) => post.id === activePostId) ?? posts[0];
  const activePoemLines = poemLinesByPost[activePost.id] ?? makePoemLines(activePost);
  const activeComments = useMemo(() => comments.filter((comment) => comment.postId === activePost.id), [comments, activePost.id]);
  const activeSuggestions = useMemo(() => {
    const ids = new Set(activeComments.map((comment) => comment.id));
    return suggestions.filter((suggestion) => ids.has(suggestion.commentId));
  }, [activeComments, suggestions]);
  const activeContributions = useMemo(() => contributions.filter((item) => item.workId === activePost.id), [contributions, activePost.id]);
  const activeEvents = useMemo(() => versionEvents.filter((event) => event.workId === activePost.id), [versionEvents, activePost.id]);
  const activeSnapshots = useMemo(() => versionSnapshots.filter((snapshot) => snapshot.workId === activePost.id), [versionSnapshots, activePost.id]);
  const activeSnapshot = activeSnapshots.find((snapshot) => snapshot.id === activeSnapshotId) ?? activeSnapshots[0];
  const activePublicationDesign = publicationDesigns.find((design) => design.id === activePost.publicationDesignId || design.workId === activePost.id);
  const activeSpace = activePost.spaceId ? spacesSeed.find((space) => space.id === activePost.spaceId) : undefined;
  const activeChannel = activePost.channelId ? channelsSeed.find((channel) => channel.id === activePost.channelId) : undefined;
  const activeSourceFragment = activePost.sourceFragmentId ? fragments.find((fragment) => fragment.id === activePost.sourceFragmentId) : undefined;
  const activeGroupChatSpace = spacesSeed.find((space) => space.id === activeGroupChatSpaceId) ?? spacesSeed[0];
  const activeGroupTopics = useMemo(() => groupTopics.filter((topic) => topic.spaceId === activeGroupChatSpace.id), [groupTopics, activeGroupChatSpace.id]);
  const activeGroupMessages = useMemo(() => groupMessages.filter((message) => message.spaceId === activeGroupChatSpace.id), [groupMessages, activeGroupChatSpace.id]);
  const activeGroupPosts = useMemo(() => posts.filter((post) => post.spaceId === activeGroupChatSpace.id), [posts, activeGroupChatSpace.id]);
  const activeSuggestionCount = countOpenSuggestions(activeComments, suggestions);

  const suggestionByComment = useMemo(() => {
    const map = new Map<string, Suggestion[]>();
    suggestions.forEach((suggestion) => {
      if (suggestion.status === "ignored" || suggestion.status === "added") return;
      map.set(suggestion.commentId, [...(map.get(suggestion.commentId) ?? []), suggestion]);
    });
    return map;
  }, [suggestions]);

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const visible = posts.filter((post) => post.visibility !== "private");
    if (!query) return visible;
    return visible.filter((post) =>
      [post.body, post.stage, getCollaborationMode(post), getCoCreativePattern(post) ?? "", post.kind, post.author.name, post.author.handle, post.lockState.status, ...post.lines, ...post.tags]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [posts, searchQuery]);

  const addEvent = (workId: string, type: VersionEvent["type"], payload: Record<string, unknown>, actor: Author = currentUser) => {
    const event: VersionEvent = {
      id: `event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      workId,
      actorId: actor.id,
      actorName: actor.name,
      type,
      payload,
      createdAt: nowIso(),
    };
    setVersionEvents((current) => [event, ...current]);
    return event;
  };

  const upsertWorkMemory = (memory: WorkMemory) => {
    setWorkMemories((current) => [memory, ...current.filter((item) => item.id !== memory.id)]);
  };

  const createSnapshotFromPost = (
    post: Post,
    options: {
      id?: string;
      parentVersionId?: string;
      label: string;
      saveReason: string;
      visibility?: VersionSnapshot["visibility"];
      sourceEventIds?: string[];
      sourceContributionIds?: string[];
      lockState?: VersionSnapshot["lockState"];
      lines?: string[];
    },
  ): VersionSnapshot => ({
    id: options.id ?? `v-${post.id}-${Date.now()}`,
    workId: post.id,
    parentVersionId: options.parentVersionId ?? post.currentVersionId,
    label: options.label,
    stage: post.stage,
    createdBy: currentUser.id,
    createdAt: nowIso(),
    saveReason: options.saveReason,
    visibility: options.visibility ?? post.visibility,
    title: post.body,
    lines: options.lines ?? (poemLinesByPost[post.id]?.map((line) => line.text) ?? post.lines),
    changeSummary: options.saveReason,
    sourceEventIds: options.sourceEventIds ?? [],
    sourceContributionIds: options.sourceContributionIds ?? [],
    lockState: options.lockState ?? post.lockState,
  });

  const saveDraftSnapshotForPost = (postId: string, reason = "Saved a private draft snapshot from the workbench.") => {
    const post = posts.find((item) => item.id === postId);
    if (!post) return;
    const event = addEvent(post.id, "draft_saved", { text: reason, label: "Private draft snapshot" });
    const snapshot = createSnapshotFromPost(post, {
      parentVersionId: post.currentVersionId,
      label: `Private draft ${versionSnapshots.filter((item) => item.workId === post.id && item.visibility === "private").length + 1}`,
      saveReason: reason,
      visibility: "private",
      sourceEventIds: [event.id],
      sourceContributionIds: contributions.filter((item) => item.workId === post.id && item.contributorId === currentUser.id).map((item) => item.id),
      lockState: { status: "unlocked", canBranch: true },
    });
    setVersionSnapshots((current) => [snapshot, ...current]);
    updatePost(post.id, (currentPost) => ({ ...currentPost, currentVersionId: snapshot.id, showHistory: true }));
    upsertWorkMemory({
      id: `memory-${currentUser.id}-${post.id}-private`,
      userId: currentUser.id,
      workId: post.id,
      role: post.ownerId === currentUser.id ? "owner" : post.authorIds.includes(currentUser.id) ? "co_author" : "helper",
      memoryType: "private_draft",
      lastTouchedAt: snapshot.createdAt,
      pinned: false,
      privateNote: reason,
    });
    setActiveSnapshotId(snapshot.id);
  };

  const saveCreateDraftSnapshot = () => {
    const text = createDraft.trim();
    if (!text) return;
    const postId = `p-memory-${Date.now()}`;
    const snapshotId = `v-${postId}-private`;
    const createdAt = nowIso();
    const nextPost: Post = {
      id: postId,
      author: currentUser,
      mode: createMode === "co_creative" && createPattern === "turn_taking_relay" ? "turn_taking" : "facilitated",
      collaborationMode: createMode,
      coCreativePattern: createMode === "co_creative" ? createPattern : undefined,
      kind: "draft",
      ownerId: currentUser.id,
      authorIds: [currentUser.id],
      stage: "Started from",
      visibility: "private",
      body: text,
      lines: [text],
      tags: createTags.length ? createTags : ["#private_draft"],
      color: "blue",
      repliesOpen: false,
      allowReplies: false,
      allowBuild: false,
      quoteAllowed: false,
      allowLike: false,
      showHistory: true,
      invited: [],
      likes: 0,
      comments: 0,
      quotes: 0,
      saves: 0,
      liked: false,
      saved: true,
      contributors: 1,
      feedbackContract: defaultFeedbackContract,
      attributionPolicy: helperAttribution,
      lockState: { status: "unlocked", canBranch: true },
      currentVersionId: snapshotId,
    };
    const event: VersionEvent = {
      id: `event-${postId}`,
      workId: postId,
      actorId: currentUser.id,
      actorName: currentUser.name,
      type: "draft_saved",
      payload: { versionId: snapshotId, text: "Saved from Create as a private draft snapshot" },
      createdAt,
    };
    const snapshot: VersionSnapshot = {
      id: snapshotId,
      workId: postId,
      label: "Create private draft",
      stage: "Started from",
      createdBy: currentUser.id,
      createdAt,
      saveReason: "Saved from Create without publishing to the feed.",
      visibility: "private",
      title: text,
      lines: [text],
      changeSummary: "Private draft captured from the Create flow. It is visible only in your Memoryline.",
      sourceEventIds: [event.id],
      sourceContributionIds: [],
      lockState: { status: "unlocked", canBranch: true },
    };
    setPosts((current) => [nextPost, ...current]);
    setPoemLinesByPost((current) => ({ ...current, [postId]: [{ id: `${postId}-l0`, text, by: "Private draft" }] }));
    setVersionEvents((current) => [event, ...current]);
    setVersionSnapshots((current) => [snapshot, ...current]);
    upsertWorkMemory({
      id: `memory-${currentUser.id}-${postId}-private`,
      userId: currentUser.id,
      workId: postId,
      role: "owner",
      memoryType: "private_draft",
      lastTouchedAt: createdAt,
      pinned: false,
      privateNote: "Saved from Create before sharing.",
    });
    setActivePostId(postId);
    setActiveSnapshotId(snapshot.id);
    setProfileTab("Memory");
    navigate("profile");
  };

  const openMemoryline = (workId: string) => {
    const post = posts.find((item) => item.id === workId);
    if (!post) {
      if (fragments.some((fragment) => fragment.id === workId)) {
        setSpacesTab("Fragments");
        navigate("spaces");
      }
      return;
    }
    setActivePostId(workId);
    const latest = versionSnapshots
      .filter((snapshot) => snapshot.workId === workId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
    if (latest) setActiveSnapshotId(latest.id);
    navigate("history");
  };

  const openVersionSnapshot = (workId: string, snapshotId: string) => {
    if (!posts.some((post) => post.id === workId)) return;
    setActivePostId(workId);
    setActiveSnapshotId(snapshotId);
    navigate("versionDetail");
  };

  const nameVersionSnapshot = (snapshotId: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const snapshot = versionSnapshots.find((item) => item.id === snapshotId);
    if (!snapshot) return;
    setVersionSnapshots((current) => current.map((item) => (item.id === snapshotId ? { ...item, label: trimmed } : item)));
    addEvent(snapshot.workId, "version_named", { versionId: snapshotId, label: trimmed });
  };

  const lockVersionSnapshot = (snapshotId: string) => {
    const snapshot = versionSnapshots.find((item) => item.id === snapshotId);
    if (!snapshot || snapshot.lockState.status === "locked" || snapshot.lockState.status === "published") return;
    const lockedAt = nowIso();
    const nextLock = { status: "locked", lockedBy: currentUser.id, lockedAt, canBranch: true } as const;
    setVersionSnapshots((current) => current.map((item) => (item.id === snapshotId ? { ...item, lockState: nextLock } : item)));
    updatePost(snapshot.workId, (post) => ({ ...post, lockState: nextLock, currentVersionId: snapshotId, showHistory: true }));
    addEvent(snapshot.workId, "version_locked", { versionId: snapshotId, label: snapshot.label });
  };

  const saveSnapshotCopy = (snapshotId: string) => {
    const source = versionSnapshots.find((item) => item.id === snapshotId);
    const post = source ? posts.find((item) => item.id === source.workId) : undefined;
    if (!source || !post) return;
    const event = addEvent(source.workId, "draft_saved", { versionId: source.id, text: "Saved a private copy from snapshot detail" });
    const copy: VersionSnapshot = {
      ...source,
      id: `v-${source.workId}-copy-${Date.now()}`,
      parentVersionId: source.id,
      label: `${source.label} copy`,
      createdBy: currentUser.id,
      createdAt: event.createdAt,
      saveReason: "Private copy saved from an earlier snapshot.",
      visibility: "private",
      changeSummary: "Saved a private copy so this version can be revisited without changing the public work.",
      sourceEventIds: [event.id],
      lockState: { status: "unlocked", canBranch: true },
    };
    setVersionSnapshots((current) => [copy, ...current]);
    upsertWorkMemory({
      id: `memory-${currentUser.id}-${source.workId}-private`,
      userId: currentUser.id,
      workId: source.workId,
      role: post.ownerId === currentUser.id ? "owner" : "helper",
      memoryType: "private_draft",
      lastTouchedAt: copy.createdAt,
      pinned: false,
      privateNote: copy.saveReason,
    });
    setActiveSnapshotId(copy.id);
  };

  const restoreSnapshotAsBranch = (snapshotId: string) => {
    const source = versionSnapshots.find((item) => item.id === snapshotId);
    const original = source ? posts.find((item) => item.id === source.workId) : undefined;
    if (!source || !original) return;
    const branchId = `p-branch-${Date.now()}`;
    const branchVersionId = `v-${branchId}-1`;
    const createdAt = nowIso();
    const branchPost: Post = {
      ...original,
      id: branchId,
      author: currentUser,
      ownerId: currentUser.id,
      authorIds: [currentUser.id],
      sourceWorkId: original.id,
      stage: "Started from",
      visibility: "private",
      body: source.lines[0] ?? original.body,
      lines: source.lines,
      tags: Array.from(new Set([...original.tags, "#branch", "#private_draft"])),
      repliesOpen: false,
      allowReplies: false,
      allowBuild: false,
      quoteAllowed: false,
      allowLike: false,
      likes: 0,
      comments: 0,
      quotes: 0,
      saves: 0,
      liked: false,
      saved: true,
      contributors: 1,
      lockState: { status: "unlocked", canBranch: true },
      currentVersionId: branchVersionId,
      publicationDesignId: undefined,
      exportRecordIds: undefined,
    };
    const event: VersionEvent = {
      id: `event-${branchId}`,
      workId: original.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      type: "branch_created",
      payload: { versionId: source.id, branchWorkId: branchId, text: "Restored snapshot as a new private branch" },
      createdAt,
    };
    const branchSnapshot: VersionSnapshot = {
      ...source,
      id: branchVersionId,
      workId: branchId,
      parentVersionId: source.id,
      label: `Branch from ${source.label}`,
      createdBy: currentUser.id,
      createdAt,
      saveReason: "Restored as a new private branch. The locked/public source remains unchanged.",
      visibility: "private",
      changeSummary: "New branch created from an earlier snapshot; no locked version was overwritten.",
      sourceEventIds: [event.id],
      sourceContributionIds: source.sourceContributionIds,
      lockState: { status: "unlocked", canBranch: true },
    };
    setPosts((current) => [branchPost, ...current]);
    setPoemLinesByPost((current) => ({
      ...current,
      [branchId]: source.lines.map((text, index) => ({ id: `${branchId}-l${index}`, text, by: index === 0 ? "Restored branch" : "From source snapshot" })),
    }));
    setVersionEvents((current) => [event, ...current]);
    setVersionSnapshots((current) => [branchSnapshot, ...current]);
    upsertWorkMemory({
      id: `memory-${currentUser.id}-${branchId}-private`,
      userId: currentUser.id,
      workId: branchId,
      role: "owner",
      memoryType: "private_draft",
      lastTouchedAt: createdAt,
      pinned: false,
      privateNote: branchSnapshot.saveReason,
    });
    setActivePostId(branchId);
    setActiveSnapshotId(branchVersionId);
    navigate("versionDetail");
  };

  const navigate = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openActiveContext = () => {
    if (activeSourceFragment) {
      setSpacesTab("Fragments");
      navigate("spaces");
      return;
    }
    if (activeChannel?.kind === "challenge" || activeChannel?.kind === "turn_taking" || activeChannel?.kind === "co_writing" || activeChannel?.kind === "relay") {
      setSpacesTab("Challenges");
      setActiveChannelId(activeChannel.id);
      navigate("spaces");
      return;
    }
    if (activeSpace) {
      setSpacesTab("Groups");
      setActiveSpaceId(activeSpace.id);
      navigate("spaces");
      return;
    }
    navigate("home");
  };

  const openGroupChat = (spaceId: string, topicId?: string) => {
    const fallbackTopic = groupTopics.find((topic) => topic.spaceId === spaceId);
    setActiveGroupChatSpaceId(spaceId);
    setActiveSpaceId(spaceId);
    setSpacesTab("Groups");
    setActiveGroupTopicId(topicId ?? fallbackTopic?.id ?? "");
    setQuotedGroupMessageId(undefined);
    navigate("groupChat");
  };

  const addMentionToGroupDraft = (handle: string) => {
    setGroupChatDraft((current) => `${current}${current.trim() ? " " : ""}${handle} `);
  };

  const sendGroupMessage = (event: FormEvent) => {
    event.preventDefault();
    const text = groupChatDraft.trim();
    if (!text) return;
    const next: GroupChatMessage = {
      id: `gm-${Date.now()}`,
      spaceId: activeGroupChatSpace.id,
      topicId: activeGroupTopicId || undefined,
      author: currentUser,
      text,
      createdAt: nowIso(),
      mentions: extractMentions(text),
      quoteMessageId: quotedGroupMessageId,
      reactions: 0,
    };
    setGroupMessages((current) => [...current, next]);
    setGroupChatDraft("");
    setQuotedGroupMessageId(undefined);
  };

  const startGroupTopic = (event: FormEvent) => {
    event.preventDefault();
    const title = topicTitleDraft.trim() || (topicMode === "free_chat" ? "Open chat" : topicMode === "post_forward" ? "Forwarded post discussion" : topicMode === "co_creation_call" ? "Co-creation call" : "Poetry topic");
    const starter = topicStarterDraft.trim() || "Opening this thread for the group.";
    const attachedPostId = topicMode === "post_forward" || topicMode === "co_creation_call" ? topicPostId : undefined;
    const nextTopic: GroupTopic = {
      id: `topic-${Date.now()}`,
      spaceId: activeGroupChatSpace.id,
      title,
      type: topicMode,
      starter,
      createdBy: currentUser,
      createdAt: nowIso(),
      postId: attachedPostId,
      tags: topicMode === "post_forward" ? ["#post_forward", "#group_discussion"] : topicMode === "co_creation_call" ? ["#co_creation", "#call"] : topicMode === "free_chat" ? ["#free_chat"] : ["#poetry_discussion"],
      unread: 0,
      active: true,
    };
    const nextMessage: GroupChatMessage = {
      id: `gm-${Date.now()}-topic`,
      spaceId: activeGroupChatSpace.id,
      topicId: nextTopic.id,
      author: currentUser,
      text: starter,
      createdAt: nowIso(),
      mentions: extractMentions(starter),
      postId: attachedPostId,
      reactions: 0,
    };
    setGroupTopics((current) => [nextTopic, ...current]);
    setGroupMessages((current) => [...current, nextMessage]);
    setActiveGroupTopicId(nextTopic.id);
    setTopicTitleDraft("");
    setTopicStarterDraft("");
    setTopicMode("poetry_discussion");
  };

  const forwardPostToGroup = (spaceId: string, postId: string) => {
    const post = posts.find((item) => item.id === postId);
    if (!post) return;
    const nextTopic: GroupTopic = {
      id: `topic-${Date.now()}`,
      spaceId,
      title: `Discuss: ${shorten(post.body, 48)}`,
      type: "post_forward",
      starter: "Forwarding this post to invite close reading, branching, or a second version.",
      createdBy: currentUser,
      createdAt: nowIso(),
      postId,
      tags: ["#post_forward", "#second_version"],
      unread: 0,
      active: true,
    };
    const nextMessage: GroupChatMessage = {
      id: `gm-${Date.now()}-forward`,
      spaceId,
      topicId: nextTopic.id,
      author: currentUser,
      text: "Forwarding this post here. Who wants to help imagine a second version?",
      createdAt: nowIso(),
      mentions: [],
      postId,
      reactions: 0,
    };
    setGroupTopics((current) => [nextTopic, ...current]);
    setGroupMessages((current) => [...current, nextMessage]);
    openGroupChat(spaceId, nextTopic.id);
  };

  const runSearch = () => {
    setSearchQuery(searchInput.trim());
    navigate("home");
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
  };

  const updatePost = (id: string, updater: (post: Post) => Post) => {
    setPosts((current) => current.map((post) => (post.id === id ? updater(post) : post)));
  };

  const openPost = (id: string) => {
    if (!posts.some((post) => post.id === id)) {
      if (fragments.some((fragment) => fragment.id === id)) {
        setSpacesTab("Fragments");
        navigate("spaces");
      }
      return;
    }
    setActivePostId(id);
    navigate("detail");
  };

  const openQuote = (id: string) => {
    const target = posts.find((post) => post.id === id);
    if (!target?.quoteAllowed) return;
    setActivePostId(id);
    navigate("quote");
  };

  const openHistory = (id: string) => {
    const target = posts.find((post) => post.id === id);
    if (!target?.showHistory) return;
    setActivePostId(id);
    navigate("history");
  };

  const toggleLike = (id: string) => {
    updatePost(id, (post) => (post.allowLike ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) } : post));
  };

  const toggleSave = (id: string) => {
    updatePost(id, (post) => ({ ...post, saved: !post.saved, saves: post.saves + (post.saved ? -1 : 1) }));
  };

  const upsertPublicationDesign = (design: PublicationDesign) => {
    setPublicationDesigns((current) => [design, ...current.filter((item) => item.id !== design.id)]);
  };

  const savePublicationDesign = (design: PublicationDesign) => {
    const updated: PublicationDesign = { ...design, updatedAt: nowIso() };
    upsertPublicationDesign(updated);
    if (updated.workId) {
      updatePost(updated.workId, (post) => ({ ...post, publicationDesignId: updated.id, showHistory: true }));
      addEvent(updated.workId, "design_saved", { designId: updated.id, templateId: updated.templateId, title: updated.title });
    }
  };

  const lockPublicationDesign = (design: PublicationDesign) => {
    const lockedAt = nowIso();
    const updated: PublicationDesign = { ...design, locked: true, lockedAt, updatedAt: lockedAt };
    upsertPublicationDesign(updated);
    if (updated.workId) {
      updatePost(updated.workId, (post) => ({
        ...post,
        kind: "final",
        stage: "Final Version",
        publicationDesignId: updated.id,
        showHistory: true,
        lockState: { status: "locked", lockedBy: currentUser.id, lockedAt, canBranch: true },
      }));
      addEvent(updated.workId, "design_locked", { designId: updated.id, templateId: updated.templateId, canvasSize: updated.canvasSize });
    }
  };

  const recordPublicationExport = (design: PublicationDesign, type: ExportRecord["type"], filename: string) => {
    const record: ExportRecord = {
      id: `export-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      designId: design.id,
      workId: design.workId,
      type,
      filename,
      createdAt: nowIso(),
    };
    setExportRecords((current) => [record, ...current]);
    if (design.workId) {
      updatePost(design.workId, (post) => ({ ...post, exportRecordIds: [record.id, ...(post.exportRecordIds ?? [])], showHistory: true }));
      addEvent(design.workId, type === "jpg" ? "jpg_exported" : "pdf_exported", { designId: design.id, filename });
    }
  };

  const likeComment = (id: string) => {
    setComments((current) => current.map((comment) => (comment.id === id ? { ...comment, liked: !comment.liked, likes: comment.likes + (comment.liked ? -1 : 1) } : comment)));
  };

  const addCommentToPost = (postId: string, event: FormEvent) => {
    event.preventDefault();
    const text = commentDraft.trim();
    if (!text) return;
    const targetPost = posts.find((post) => post.id === postId);
    const aiResult = classifyReaderResponse(text);
    const next: Comment = {
      id: `c${Date.now()}`,
      postId,
      author: currentUser,
      text,
      kind: aiResult.kind,
      likes: 0,
      replies: 0,
      quotes: 0,
      liked: false,
    };
    setComments((current) => [next, ...current]);
    if (targetPost?.allowBuild && aiResult.group && aiResult.suggestion) {
      const suggestion: Suggestion = {
        id: `s${Date.now()}`,
        commentId: next.id,
        group: aiResult.group,
        text: aiResult.suggestion,
        status: "open",
      };
      setSuggestions((current) => [suggestion, ...current]);
      addEvent(postId, "suggestion_generated", { commentId: next.id, group: suggestion.group, text: suggestion.text });
    }
    updatePost(postId, (post) => ({ ...post, comments: post.comments + 1 }));
    addEvent(postId, "commented", { commentId: next.id, text });
    setCommentDraft("");
  };

  const addSuggestionToPoem = (suggestion: Suggestion) => {
    const source = comments.find((comment) => comment.id === suggestion.commentId);
    const sourceName = source?.author.name.split(" ")[0] ?? "reader";
    const targetPostId = source?.postId ?? activePost.id;
    const targetPost = posts.find((post) => post.id === targetPostId);
    if (targetPost?.lockState.status === "locked" || targetPost?.lockState.status === "published") return;

    const existing = poemLinesByPost[targetPostId] ?? [];
    if (!existing.some((line) => line.text === suggestion.text)) {
      const line: PoemLine = {
        id: `${targetPostId}-l${Date.now()}`,
        text: suggestion.text,
        by: `${suggestion.status === "editing" ? "Edited" : "Added"} from ${sourceName}'s comment`,
      };
      setPoemLinesByPost((current) => ({ ...current, [targetPostId]: [...(current[targetPostId] ?? []), line] }));
      updatePost(targetPostId, (post) => ({
        ...post,
        stage: "Poem so far",
        lines: post.lines.includes(suggestion.text) ? post.lines : [...post.lines, suggestion.text],
        contributors: post.contributors + 1,
      }));
      setContributions((current) => [
        {
          id: `contrib-${Date.now()}`,
          workId: targetPostId,
          contributorId: source?.author.id,
          contributorName: source?.author.name ?? "Anonymous reader",
          anonymous: false,
          type: suggestion.group === "Possible lines" ? "line" : suggestion.group === "Revision hints" ? "revision" : "interpretation",
          sourceId: suggestion.commentId,
          status: "accepted",
          attributionPreference: "public_credit",
          verifiedBy: currentUser.id,
          createdAt: nowIso(),
        },
        ...current,
      ]);
      addEvent(targetPostId, "suggestion_accepted", { suggestionId: suggestion.id, text: suggestion.text, sourceComment: suggestion.commentId });
    }
    setSuggestions((current) => current.map((item) => (item.id === suggestion.id ? { ...item, status: "added" } : item)));
  };

  const editSuggestion = (suggestion: Suggestion) => {
    setSuggestions((current) => current.map((item) => (item.id === suggestion.id ? { ...item, status: "editing" } : item)));
  };

  const updateSuggestion = (id: string, text: string) => {
    setSuggestions((current) => current.map((item) => (item.id === id ? { ...item, text } : item)));
  };

  const ignoreSuggestion = (id: string) => {
    setSuggestions((current) => current.map((item) => (item.id === id ? { ...item, status: "ignored" } : item)));
  };

  const lockVersion = (postId: string) => {
    const target = posts.find((post) => post.id === postId);
    if (!target) return;
    const lockedAt = nowIso();
    const lockState = { status: "locked", lockedBy: currentUser.id, lockedAt, canBranch: true } as const;
    updatePost(postId, (post) => ({
      ...post,
      stage: post.stage === "Started from" ? "Poem so far" : post.stage,
      showHistory: true,
      lockState,
    }));
    setPoemLinesByPost((current) => ({
      ...current,
      [postId]: (current[postId] ?? []).map((line) => ({ ...line, locked: true })),
    }));
    const event = addEvent(postId, "version_locked", { versionId: target.currentVersionId, label: "Locked from workbench" });
    const snapshot = createSnapshotFromPost(target, {
      id: target.currentVersionId,
      label: "Locked from workbench",
      saveReason: "The author locked this version from the workbench.",
      sourceEventIds: [event.id],
      sourceContributionIds: contributions.filter((item) => item.workId === postId).map((item) => item.id),
      lockState,
    });
    setVersionSnapshots((current) => [snapshot, ...current.filter((item) => item.id !== snapshot.id)]);
    setActiveSnapshotId(snapshot.id);
  };

  const lockLine = (postId: string, lineId: string) => {
    updatePost(postId, (post) => ({ ...post, lockedLineIds: Array.from(new Set([...(post.lockedLineIds ?? []), lineId])) }));
    setPoemLinesByPost((current) => ({
      ...current,
      [postId]: (current[postId] ?? []).map((line) => (line.id === lineId ? { ...line, locked: true } : line)),
    }));
    addEvent(postId, "line_locked", { lineId });
  };

  const submitTurnLine = (postId: string, event: FormEvent) => {
    event.preventDefault();
    const text = turnDraft.trim();
    const post = posts.find((item) => item.id === postId);
    if (!text || !post || post.lockState.status === "locked" || post.lockState.status === "published") return;
    const activeAuthor = Object.values(authors).find((author) => author.id === post.activeTurnUserId) ?? currentUser;
    const line: PoemLine = {
      id: `${postId}-l${Date.now()}`,
      text,
      by: `Turn from ${activeAuthor.name}`,
    };
    const queue = post.turnQueue && post.turnQueue.length > 0 ? post.turnQueue : [currentUser.id];
    const [, ...rest] = queue;
    const nextQueue = [...rest, queue[0]];
    setPoemLinesByPost((current) => ({ ...current, [postId]: [...(current[postId] ?? []), line] }));
    updatePost(postId, (currentPost) => ({
      ...currentPost,
      lines: [...currentPost.lines, text],
      contributors: Math.max(currentPost.contributors, new Set([...(currentPost.authorIds ?? []), activeAuthor.id]).size),
      authorIds: Array.from(new Set([...currentPost.authorIds, activeAuthor.id])),
      activeTurnUserId: nextQueue[0],
      turnQueue: nextQueue,
    }));
    setContributions((current) => [
      {
        id: `contrib-${Date.now()}`,
        workId: postId,
        contributorId: activeAuthor.id,
        contributorName: activeAuthor.name,
        anonymous: false,
        type: "line",
        sourceId: line.id,
        status: "accepted",
        attributionPreference: "public_credit",
        createdAt: nowIso(),
      },
      ...current,
    ]);
    addEvent(postId, "line_added", { lineId: line.id, text, nextTurnUserId: nextQueue[0] }, activeAuthor);
    setTurnDraft("");
  };

  const saveAuthorVersion = (postId: string, lines: EditablePoemLine[]) => {
    const cleaned = lines.map((line) => ({ ...line, text: line.text.trim() })).filter((line) => line.text);
    if (!cleaned.length) return;
    updatePost(postId, (post) => ({
      ...post,
      stage: "Poem so far",
      body: cleaned[0].text,
      lines: cleaned.map((line) => line.text),
      contributors: Math.max(post.contributors, new Set(cleaned.map((line) => line.by)).size),
    }));
    setPoemLinesByPost((current) => ({
      ...current,
      [postId]: cleaned.map((line, index) => ({ id: line.id, text: line.text, by: index === 0 ? "Original post" : line.by })),
    }));
    addEvent(postId, "line_reordered", { lineCount: cleaned.length });
  };

  const publishPost = (event: FormEvent) => {
    event.preventDefault();
    const text = createDraft.trim();
    if (!text) return;
    const selectedGroup = spacesSeed.find((space) => space.id === settings.selectedGroupId);
    const visibleHandles = settings.visibleUserIds
      .map((id) => Object.values(authors).find((author) => author.id === id)?.handle)
      .filter((handle): handle is string => Boolean(handle));
    const hiddenHandles = settings.hiddenUserIds
      .map((id) => Object.values(authors).find((author) => author.id === id)?.handle)
      .filter((handle): handle is string => Boolean(handle));
    const coAuthors = settings.coAuthorIds
      .map((id) => Object.values(authors).find((author) => author.id === id))
      .filter((author): author is Author => Boolean(author));
    const penName = settings.penName.trim();
    const publishingAuthor: Author = settings.attributionMode === "anonymous"
      ? { id: currentUser.id, name: "Anonymous poet", handle: "@anonymous", avatar: "An" }
      : settings.attributionMode === "pen_name" && penName
        ? { id: currentUser.id, name: penName, handle: `@${penName.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "") || "pen.name"}`, avatar: penName.slice(0, 2).toUpperCase() }
        : currentUser;
    const createAttribution = settings.attributionMode === "anonymous"
      ? { defaultStyle: "anonymous_collective", requiresContributorConsent: true } as const
      : settings.coAuthorIds.length > 0
        ? { defaultStyle: "coauthors", requiresContributorConsent: true, collectiveName: penName || undefined } as const
        : { ...helperAttribution, collectiveName: penName || undefined };

    if (creationKind === "Fragment") {
      const fragment: Fragment = {
        id: `f${Date.now()}`,
        text,
        creator: settings.attributionMode === "anonymous" ? undefined : publishingAuthor,
        creatorId: currentUser.id,
        anonymous: settings.attributionMode === "anonymous",
        visibility: settings.visibilityMode === "public" ? "public" : settings.visibilityMode === "group" ? "group" : "private",
        tags: createTags.length ? createTags : ["#fragment"],
        mood: "new fragment",
        source: "manual",
        savedBy: [currentUser.id],
        inspiredWorks: [],
        allowInvite: settings.allowComments,
        allowRemix: settings.allowForward,
        invitedBy: [],
        activeChatCount: 0,
        activeThreadCount: 0,
        branchCount: 0,
      };
      setFragments((current) => [fragment, ...current]);
      setSpacesTab("Fragments");
      setCreateDraft("");
      navigate("spaces");
      return;
    }

    const isCoCreative = createMode === "co_creative" || creationKind === "Co-writing room" || creationKind === "Relay thread";
    const activePattern: CoCreativePattern | undefined = isCoCreative ? (creationKind === "Relay thread" ? "turn_taking_relay" : createPattern) : undefined;
    const isRelay = activePattern === "turn_taking_relay";
    const isFinal = creationKind === "Final version";
    const draftDesign = publicationDesigns.find((design) => !design.workId && design.poemText.trim() === text);
    const visibility: Post["visibility"] = creationKind === "Challenge response"
      ? "challenge"
      : settings.visibilityMode === "public"
        ? "public"
        : settings.visibilityMode === "group"
          ? "group"
          : settings.visibilityMode === "include_people" || settings.visibilityMode === "exclude_people"
            ? "invited"
            : "private";
    const next: Post = {
      id: `p${Date.now()}`,
      author: publishingAuthor,
      mode: isRelay ? "turn_taking" : "facilitated",
      collaborationMode: isCoCreative ? "co_creative" : "facilitated",
      coCreativePattern: activePattern,
      kind: isCoCreative ? "thread" : isFinal ? "final" : "draft",
      ownerId: currentUser.id,
      authorIds: Array.from(new Set([currentUser.id, ...settings.coAuthorIds])),
      spaceId: visibility === "group" ? selectedGroup?.id : creationKind === "Group discussion" ? settings.selectedGroupId : undefined,
      channelId: creationKind === "Challenge response" || creationKind === "Relay thread" || creationKind === "Co-writing room" ? "channel-moon-relay" : "channel-draft-feedback",
      visibilityGroupId: visibility === "group" ? selectedGroup?.id : undefined,
      visibleUserIds: settings.visibilityMode === "include_people" ? settings.visibleUserIds : undefined,
      hiddenUserIds: settings.visibilityMode === "exclude_people" ? settings.hiddenUserIds : undefined,
      stage: isFinal ? "Final Version" : "Started from",
      visibility,
      body: text,
      lines: [text],
      tags: createTags.length > 0 ? createTags : ["#poem"],
      color: backgroundImage ? "photo" : isFinal ? "red" : "blue",
      imageUrl: backgroundImage || undefined,
      repliesOpen: settings.allowComments,
      allowReplies: settings.allowComments && settings.allowReplies,
      allowBuild: isCoCreative || settings.allowForward,
      quoteAllowed: settings.allowForward || isCoCreative,
      allowLike: settings.allowLike || settings.publicPost,
      showHistory: settings.showHistory || isCoCreative,
      invited: isCoCreative ? ["@Lin", "@Jia", ...coAuthors.map((author) => author.handle)] : settings.visibilityMode === "include_people" ? visibleHandles : settings.visibilityMode === "exclude_people" ? hiddenHandles.map((handle) => `hidden:${handle}`) : coAuthors.map((author) => author.handle),
      likes: 0,
      comments: 0,
      quotes: 0,
      saves: 0,
      liked: false,
      saved: false,
      contributors: Math.max(1, new Set([currentUser.id, ...settings.coAuthorIds]).size),
      feedbackContract: isCoCreative ? turnTakingContract : settings.allowForward ? defaultFeedbackContract : closeReadingContract,
      attributionPolicy: isCoCreative ? collectiveAttribution : createAttribution,
      attributionName: settings.attributionMode === "anonymous" ? "Anonymous" : penName || publishingAuthor.name,
      coAuthorIds: settings.coAuthorIds,
      anonymous: settings.attributionMode === "anonymous",
      publicationDesignId: draftDesign?.id,
      lockState: isFinal ? { status: "locked", lockedBy: currentUser.id, lockedAt: nowIso(), canBranch: true } : { status: "unlocked", canBranch: true },
      currentVersionId: `v-${Date.now()}`,
      turnQueue: isRelay ? [authors.lin.id, authors.jia.id, currentUser.id] : undefined,
      activeTurnUserId: isRelay ? authors.lin.id : undefined,
      lockedLineIds: [],
    };
    setPosts((current) => [next, ...current]);
    setPoemLinesByPost((current) => ({ ...current, [next.id]: makePoemLines(next) }));
    if (draftDesign) {
      const attachedDesign: PublicationDesign = {
        ...draftDesign,
        workId: next.id,
        title: shorten(next.body, 52),
        poemText: next.lines.join("\n"),
        authorName: next.attributionName ?? next.author.name,
        contributorNames: Array.from(new Set([next.author.name, ...coAuthors.map((author) => author.name)])),
        tags: next.tags,
        updatedAt: nowIso(),
      };
      upsertPublicationDesign(attachedDesign);
      addEvent(next.id, attachedDesign.locked ? "design_locked" : "design_saved", { designId: attachedDesign.id, templateId: attachedDesign.templateId, title: attachedDesign.title });
    }
    const createdEvent = addEvent(next.id, visibility === "private" ? "draft_saved" : "created", { versionId: next.currentVersionId, text, collaborationMode: next.collaborationMode ?? getCollaborationMode(next), coCreativePattern: next.coCreativePattern, kind: next.kind });
    if (visibility === "private" || isFinal) {
      const snapshot = createSnapshotFromPost(next, {
        id: next.currentVersionId,
        label: visibility === "private" ? "Create private draft" : "Created final version",
        saveReason: visibility === "private" ? "Saved from Create without publishing to the feed." : "Created and locked as a final version.",
        visibility,
        sourceEventIds: [createdEvent.id],
        lockState: next.lockState,
      });
      setVersionSnapshots((current) => [snapshot, ...current]);
      upsertWorkMemory({
        id: `memory-${currentUser.id}-${next.id}-${visibility === "private" ? "private" : "published"}`,
        userId: currentUser.id,
        workId: next.id,
        role: "owner",
        memoryType: visibility === "private" ? "private_draft" : "published",
        lastTouchedAt: snapshot.createdAt,
        pinned: isFinal,
        privateNote: snapshot.saveReason,
      });
      setActiveSnapshotId(snapshot.id);
    }
    if (isFinal) addEvent(next.id, "version_locked", { versionId: next.currentVersionId, label: "Created as locked final" });
    setActivePostId(next.id);
    setBackgroundImage("");
    setCreateTags(["#AI_memory", "#micro_poetry"]);
    setTagDraft("");
    if (visibility === "private") {
      setProfileTab("Memory");
      navigate("profile");
    } else {
      navigate("detail");
    }
  };

  const publishQuote = (event: FormEvent) => {
    event.preventDefault();
    const text = quoteDraft.trim();
    if (!text) return;
    updatePost(activePost.id, (post) => ({ ...post, quotes: post.quotes + 1 }));
    const line: PoemLine = { id: `${activePost.id}-quote-${Date.now()}`, text, by: "Added from your quick quote" };
    setPoemLinesByPost((current) => ({ ...current, [activePost.id]: [...(current[activePost.id] ?? []), line] }));
    addEvent(activePost.id, "branch_created", { text, type: "quick quote" });
    navigate("detail");
  };

  const publishQuoteVersion = (lines: EditablePoemLine[]) => {
    const cleaned = lines.map((line) => line.text.trim()).filter(Boolean);
    if (!cleaned.length) return;
    const next: Post = {
      id: `p${Date.now()}`,
      author: currentUser,
      mode: "facilitated",
      collaborationMode: "facilitated",
      kind: "draft",
      ownerId: currentUser.id,
      authorIds: [currentUser.id],
      sourceWorkId: activePost.id,
      sourceFragmentId: activePost.sourceFragmentId,
      stage: "Started from",
      source: `Based on ${activePost.author.name.split(" ")[0]}'s line`,
      visibility: "public",
      body: cleaned[0],
      lines: cleaned,
      tags: ["#quote_version", "#branch"],
      color: activePost.color === "red" ? "red" : "photo",
      repliesOpen: true,
      allowReplies: true,
      allowBuild: true,
      quoteAllowed: true,
      allowLike: true,
      showHistory: true,
      invited: [],
      likes: 0,
      comments: 0,
      quotes: 0,
      saves: 0,
      liked: false,
      saved: false,
      contributors: new Set(lines.map((line) => line.by)).size,
      imagePreset: activePost.imagePreset ?? "stars",
      imageUrl: activePost.imageUrl,
      feedbackContract: defaultFeedbackContract,
      attributionPolicy: helperAttribution,
      lockState: { status: "unlocked", canBranch: true },
      currentVersionId: `v-${Date.now()}`,
    };
    updatePost(activePost.id, (post) => ({ ...post, quotes: post.quotes + 1 }));
    setPosts((current) => [next, ...current]);
    setPoemLinesByPost((current) => ({ ...current, [next.id]: makePoemLines(next) }));
    addEvent(activePost.id, "branch_created", { branchId: next.id, body: next.body });
    addEvent(next.id, "created", { sourceWorkId: activePost.id, text: next.body });
    setActivePostId(next.id);
    setProfileTab("Quotes");
    navigate("profile");
  };

  const startGroupDraft = (spaceId: string, channelId?: string) => {
    const space = spacesSeed.find((item) => item.id === spaceId);
    if (!space) return;
    const channel = channelsSeed.find((item) => item.id === channelId) ?? channelsSeed.find((item) => item.id === space.channels[0]);
    const invited = space.members
      .map((member) => Object.values(authors).find((author) => author.id === member.userId)?.handle)
      .filter((handle): handle is string => Boolean(handle) && handle !== currentUser.handle)
      .slice(0, 3);
    const starter = space.kind === "publication"
      ? "I am preparing this draft for a finished form, but the image still needs readers."
      : "I brought this unfinished line to the room and asked the image to stay open.";
    const next: Post = {
      id: `p${Date.now()}`,
      author: currentUser,
      mode: "facilitated",
      collaborationMode: "facilitated",
      kind: "draft",
      ownerId: currentUser.id,
      authorIds: [currentUser.id],
      spaceId: space.id,
      channelId: channel?.id,
      stage: "Started from",
      source: `Started in ${space.name}`,
      visibility: "group",
      body: starter,
      lines: [starter],
      tags: Array.from(new Set([`#${space.kind}`, ...space.tags, ...(channel?.tags ?? [])])),
      color: space.kind === "publication" ? "red" : "blue",
      repliesOpen: true,
      allowReplies: true,
      allowBuild: true,
      quoteAllowed: true,
      allowLike: true,
      showHistory: true,
      invited,
      likes: 0,
      comments: 0,
      quotes: 0,
      saves: 0,
      liked: false,
      saved: false,
      contributors: 1,
      feedbackContract: defaultFeedbackContract,
      attributionPolicy: helperAttribution,
      lockState: { status: "unlocked", canBranch: true },
      currentVersionId: `v-${Date.now()}`,
      lockedLineIds: [],
    };
    setPosts((current) => [next, ...current]);
    setPoemLinesByPost((current) => ({ ...current, [next.id]: makePoemLines(next) }));
    addEvent(next.id, "created", { workflow: "group_feedback", space: space.name, channel: channel?.title, text: starter });
    setActivePostId(next.id);
    setActiveSpaceId(space.id);
    if (channel) setActiveChannelId(channel.id);
    setSpacesTab("Groups");
    setSpaceNotice(`${space.name} opened a facilitated feedback draft. Readers can comment; the author decides what enters the poem.`);
    navigate("detail");
  };

  const joinChallenge = (channelId: string, startMode: ChallengeStartMode) => {
    const channel = channelsSeed.find((item) => item.id === channelId);
    if (!channel) return;
    const space = channel.spaceId ? spacesSeed.find((item) => item.id === channel.spaceId) : undefined;
    const isCoCreative = startMode !== "author_led";
    const isRelay = startMode === "relay";
    const pattern: CoCreativePattern | undefined = isRelay ? "turn_taking_relay" : isCoCreative ? "host_curated" : undefined;
    const starter = isRelay
      ? channel.prompt ?? "The first line waits for the next turn."
      : isCoCreative
        ? `Co-writing room for ${channel.title}: collect candidate lines, pin images, and decide what becomes the poem.`
        : `Author-led response to ${channel.title}: I want close reading before this becomes public.`;
    const next: Post = {
      id: `p${Date.now()}`,
      author: currentUser,
      mode: isRelay ? "turn_taking" : "facilitated",
      collaborationMode: isCoCreative ? "co_creative" : "facilitated",
      coCreativePattern: pattern,
      kind: isCoCreative ? "thread" : "draft",
      ownerId: currentUser.id,
      authorIds: isCoCreative ? [currentUser.id, authors.jia.id, authors.lin.id] : [currentUser.id],
      spaceId: channel.spaceId,
      channelId: channel.id,
      stage: "Started from",
      source: `Challenge: ${channel.title}`,
      visibility: channel.visibility === "public" ? "challenge" : "group",
      body: starter,
      lines: [starter],
      tags: Array.from(new Set([isCoCreative ? "#co_writing" : "#author_led", isRelay ? "#relay" : "#challenge", ...channel.tags])),
      color: isRelay ? "moon" : isCoCreative ? "red" : "photo",
      repliesOpen: true,
      allowReplies: true,
      allowBuild: true,
      quoteAllowed: true,
      allowLike: true,
      showHistory: true,
      invited: isCoCreative ? [authors.jia.handle, authors.lin.handle, authors.maya.handle] : [authors.lin.handle, authors.jia.handle],
      likes: 0,
      comments: 0,
      quotes: 0,
      saves: 0,
      liked: false,
      saved: false,
      contributors: isCoCreative ? 3 : 1,
      feedbackContract: isCoCreative ? turnTakingContract : defaultFeedbackContract,
      attributionPolicy: isCoCreative ? collectiveAttribution : helperAttribution,
      lockState: { status: "unlocked", canBranch: true },
      currentVersionId: `v-${Date.now()}`,
      turnQueue: isRelay ? [authors.jia.id, authors.lin.id, currentUser.id] : undefined,
      activeTurnUserId: isRelay ? authors.jia.id : undefined,
      lockedLineIds: [],
    };
    setPosts((current) => [next, ...current]);
    setPoemLinesByPost((current) => ({ ...current, [next.id]: makePoemLines(next) }));
    addEvent(next.id, "created", { workflow: isRelay ? "challenge_turn_taking_relay" : isCoCreative ? "challenge_co_writing_room" : "challenge_author_led_response", challenge: channel.title, space: space?.name, text: starter });
    setActivePostId(next.id);
    setActiveChannelId(channel.id);
    if (space) setActiveSpaceId(space.id);
    setSpacesTab("Challenges");
    setSpaceNotice(`${channel.title} started as ${isRelay ? "a turn-taking relay pattern" : isCoCreative ? "a co-writing room" : "an author-led response"}.`);
    navigate("detail");
  };

  const fragmentAction = (fragmentId: string, action: FragmentActionName, targetUserId?: string) => {
    const fragment = fragments.find((item) => item.id === fragmentId);
    if (!fragment) return;
    if (action === "chat" || action === "thread" || action === "branch") {
      const isThread = action === "thread";
      const isChat = action === "chat";
      const isFragmentCoCreative = isThread || isChat;
      const starter = isChat ? `Reading this fragment together: ${fragment.text}` : fragment.text;
      const next: Post = {
        id: `p${Date.now()}`,
        author: currentUser,
        mode: isThread ? "turn_taking" : "facilitated",
        collaborationMode: isFragmentCoCreative ? "co_creative" : "facilitated",
        coCreativePattern: isThread ? "turn_taking_relay" : isChat ? "group_chat_brainstorm" : undefined,
        kind: isFragmentCoCreative ? "thread" : "draft",
        ownerId: currentUser.id,
        authorIds: isFragmentCoCreative ? [currentUser.id, authors.lin.id, authors.jia.id] : [currentUser.id],
        channelId: isChat || isThread ? "channel-fragment-pool" : undefined,
        sourceFragmentId: fragment.id,
        stage: "Started from",
        source: isChat ? `Group chat around ${fragment.anonymous ? "anonymous fragment" : fragment.creator?.name ?? "fragment"}` : `Inspired by ${fragment.anonymous ? "anonymous fragment" : fragment.creator?.name ?? "fragment"}`,
        visibility: isChat ? (fragment.visibility === "private" ? "private" : "group") : fragment.visibility === "private" ? "private" : "public",
        body: starter,
        lines: [fragment.text],
        tags: Array.from(new Set([isChat ? "#fragment_chat" : isThread ? "#fragment_relay" : "#fragment_branch", ...fragment.tags])),
        color: isThread ? "moon" : isChat ? "photo" : "blue",
        repliesOpen: true,
        allowReplies: true,
        allowBuild: true,
        quoteAllowed: true,
        allowLike: true,
        showHistory: true,
        invited: isThread ? [authors.lin.handle, authors.jia.handle] : fragment.creator ? [fragment.creator.handle] : [],
        likes: 0,
        comments: 0,
        quotes: 0,
        saves: 0,
        liked: false,
        saved: false,
        contributors: isFragmentCoCreative ? 3 : 1,
        feedbackContract: isFragmentCoCreative ? turnTakingContract : defaultFeedbackContract,
        attributionPolicy: isFragmentCoCreative ? collectiveAttribution : helperAttribution,
        lockState: { status: "unlocked", canBranch: true },
        currentVersionId: `v-${Date.now()}`,
        turnQueue: isThread ? [authors.lin.id, authors.jia.id, currentUser.id] : undefined,
        activeTurnUserId: isThread ? authors.lin.id : undefined,
        lockedLineIds: [],
      };
      setPosts((current) => [next, ...current]);
      setPoemLinesByPost((current) => ({ ...current, [next.id]: makePoemLines(next) }));
      setFragments((current) =>
        current.map((item) =>
          item.id === fragmentId
            ? {
                ...item,
                inspiredWorks: Array.from(new Set([...item.inspiredWorks, next.id])),
                activeThreadCount: item.activeThreadCount + (isThread ? 1 : 0),
                activeChatCount: item.activeChatCount + (isChat ? 1 : 0),
                branchCount: item.branchCount + (action === "branch" ? 1 : 0),
              }
            : item,
        ),
      );
      setContributions((current) => [
        {
          id: `contrib-${Date.now()}`,
          workId: next.id,
          contributorId: fragment.creatorId,
          contributorName: fragment.anonymous ? "Anonymous fragment source" : fragment.creator?.name ?? "Fragment source",
          anonymous: fragment.anonymous,
          type: "curation",
          sourceId: fragment.id,
          status: action === "branch" ? "accepted" : "suggested",
          attributionPreference: fragment.anonymous ? "anonymous" : "public_credit",
          createdAt: nowIso(),
        },
        ...current,
      ]);
      addEvent(next.id, "created", { sourceFragmentId: fragment.id, action, text: fragment.text });
      if (action === "branch") addEvent(next.id, "branch_created", { sourceFragmentId: fragment.id, action });
      setActivePostId(next.id);
      setSpacesTab("Fragments");
      setSpaceNotice(`Fragment action started: ${isChat ? "group chat brainstorm" : isThread ? "turn-taking relay" : "solo branch"}.`);
      navigate("detail");
      return;
    }

    setFragments((current) =>
      current.map((item) => {
        if (item.id !== fragmentId) return item;
        if (action === "save") {
          const saved = item.savedBy.includes(currentUser.id);
          return { ...item, savedBy: saved ? item.savedBy.filter((id) => id !== currentUser.id) : [...item.savedBy, currentUser.id] };
        }
        if (action === "invite") {
          return {
            ...item,
            invitedBy: Array.from(new Set([...item.invitedBy, currentUser.id])),
            invitedUserIds: targetUserId ? Array.from(new Set([...(item.invitedUserIds ?? []), targetUserId])) : item.invitedUserIds,
          };
        }
        return { ...item, activeChatCount: item.activeChatCount + 1 };
      }),
    );
    if (action === "save") {
      addEvent(fragmentId, "fragment_saved", { fragmentId, text: fragment.text });
      setSpaceNotice("Fragment saved to your notes.");
    }
    if (action === "invite") {
      const target = Object.values(authors).find((author) => author.id === targetUserId);
      setSpaceNotice(target ? `Invitation sent to ${target.handle}.` : "Invitation marked. The creator can be pulled into a co-writing flow later.");
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#111]">
      <main className="min-h-screen lg:grid lg:grid-cols-[180px_minmax(0,1fr)]">
        <SideTabs view={view} navigate={navigate} />
        <section className="mx-auto w-full max-w-[1260px] px-4 pb-12 pt-6 sm:px-6 lg:pt-12">
          {view === "home" && (
            <HomePage
              posts={filteredPosts}
              fragments={fragments}
              searchQuery={searchQuery}
              clearSearch={clearSearch}
              openPost={openPost}
              openQuote={openQuote}
              toggleLike={toggleLike}
              toggleSave={toggleSave}
              navigate={navigate}
              setSpacesTab={setSpacesTab}
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              runSearch={runSearch}
            />
          )}
          {view === "spaces" && (
            <SpacesPage
              tab={spacesTab}
              setTab={setSpacesTab}
              spaces={spacesSeed}
              channels={channelsSeed}
              fragments={fragments}
              posts={filteredPosts}
              topics={groupTopics}
              comments={comments}
              activeSpaceId={activeSpaceId}
              setActiveSpaceId={setActiveSpaceId}
              activeChannelId={activeChannelId}
              setActiveChannelId={setActiveChannelId}
              spaceNotice={spaceNotice}
              startGroupDraft={startGroupDraft}
              joinChallenge={joinChallenge}
              openGroupChat={openGroupChat}
              forwardPostToGroup={forwardPostToGroup}
              fragmentAction={fragmentAction}
              openPost={openPost}
              openQuote={openQuote}
              openHistory={openHistory}
              toggleSave={toggleSave}
              navigate={navigate}
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              runSearch={runSearch}
            />
          )}
          {view === "create" && (
            <CreatePage
              draft={createDraft}
              setDraft={setCreateDraft}
              createTags={createTags}
              setCreateTags={setCreateTags}
              tagDraft={tagDraft}
              setTagDraft={setTagDraft}
              backgroundImage={backgroundImage}
              setBackgroundImage={setBackgroundImage}
              settings={settings}
              setSettings={setSettings}
              spaces={spacesSeed}
              publishPost={publishPost}
              creationKind={creationKind}
              setCreationKind={setCreationKind}
              createMode={createMode}
              setCreateMode={setCreateMode}
              createPattern={createPattern}
              setCreatePattern={setCreatePattern}
              publicationTemplates={publicationTemplatesSeed}
              onSaveDesign={savePublicationDesign}
              onLockDesign={lockPublicationDesign}
              onExportDesign={recordPublicationExport}
              onSaveDraftSnapshot={saveCreateDraftSnapshot}
            />
          )}
          {view === "groupChat" && (
            <GroupChatPage
              space={activeGroupChatSpace}
              posts={posts}
              groupPosts={activeGroupPosts}
              topics={activeGroupTopics}
              messages={activeGroupMessages}
              activeTopicId={activeGroupTopicId}
              setActiveTopicId={setActiveGroupTopicId}
              chatDraft={groupChatDraft}
              setChatDraft={setGroupChatDraft}
              quotedMessageId={quotedGroupMessageId}
              setQuotedMessageId={setQuotedGroupMessageId}
              addMention={addMentionToGroupDraft}
              sendMessage={sendGroupMessage}
              topicTitleDraft={topicTitleDraft}
              setTopicTitleDraft={setTopicTitleDraft}
              topicStarterDraft={topicStarterDraft}
              setTopicStarterDraft={setTopicStarterDraft}
              topicMode={topicMode}
              setTopicMode={setTopicMode}
              topicPostId={topicPostId}
              setTopicPostId={setTopicPostId}
              startTopic={startGroupTopic}
              startGroupDraft={startGroupDraft}
              openPost={openPost}
              navigate={navigate}
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              runSearch={runSearch}
            />
          )}
          {view === "activity" && (
            <ActivityPage
              events={versionEvents}
              contributions={contributions}
              openPost={openPost}
              navigate={navigate}
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              runSearch={runSearch}
            />
          )}
          {view === "profile" && (
            <ProfilePage
              posts={posts}
              fragments={fragments}
              contributions={contributions}
              workMemories={workMemories}
              versionSnapshots={versionSnapshots}
              versionEvents={versionEvents}
              publicationDesigns={publicationDesigns}
              exportRecords={exportRecords}
              tab={profileTab}
              setTab={setProfileTab}
              openPost={openPost}
              openQuote={openQuote}
              toggleLike={toggleLike}
              toggleSave={toggleSave}
              openMemoryline={openMemoryline}
              navigate={navigate}
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              runSearch={runSearch}
            />
          )}
          {view === "detail" && (
            <DetailPage
              post={activePost}
              comments={activeComments}
              suggestionsByComment={suggestionByComment}
              poemLines={activePoemLines}
              commentDraft={commentDraft}
              turnDraft={turnDraft}
              activeSuggestionCount={activeSuggestionCount}
              contributions={activeContributions}
              space={activeSpace}
              channel={activeChannel}
              sourceFragment={activeSourceFragment}
              publicationDesign={activePublicationDesign}
              publicationTemplates={publicationTemplatesSeed}
              openContext={openActiveContext}
              setCommentDraft={setCommentDraft}
              setTurnDraft={setTurnDraft}
              addComment={(event) => addCommentToPost(activePost.id, event)}
              submitTurnLine={(event) => submitTurnLine(activePost.id, event)}
              likeComment={likeComment}
              addSuggestionToPoem={addSuggestionToPoem}
              editSuggestion={editSuggestion}
              updateSuggestion={updateSuggestion}
              ignoreSuggestion={ignoreSuggestion}
              toggleLike={toggleLike}
              toggleSave={toggleSave}
              lockVersion={lockVersion}
              lockLine={lockLine}
              saveAuthorVersion={saveAuthorVersion}
              onSaveDesign={savePublicationDesign}
              onLockDesign={lockPublicationDesign}
              onExportDesign={recordPublicationExport}
              onSaveDraftSnapshot={() => saveDraftSnapshotForPost(activePost.id)}
              openMemoryline={openMemoryline}
              openHistory={openHistory}
              navigate={navigate}
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              runSearch={runSearch}
            />
          )}
          {view === "quote" && (
            <QuotePage
              post={activePost}
              draft={quoteDraft}
              setDraft={setQuoteDraft}
              publishQuote={publishQuote}
              publishQuoteVersion={publishQuoteVersion}
              navigate={navigate}
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              runSearch={runSearch}
            />
          )}
          {view === "history" && (
            <HistoryPage
              post={activePost}
              events={activeEvents}
              snapshots={activeSnapshots}
              contributions={activeContributions}
              sourceFragment={fragments.find((fragment) => fragment.id === activePost.sourceFragmentId)}
              openVersionSnapshot={openVersionSnapshot}
              navigate={navigate}
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              runSearch={runSearch}
            />
          )}
          {view === "versionDetail" && activeSnapshot && (
            <VersionSnapshotDetailPage
              post={activePost}
              snapshot={activeSnapshot}
              events={activeEvents}
              contributions={activeContributions}
              comments={activeComments}
              suggestions={activeSuggestions}
              sourceFragment={activeSourceFragment}
              nameVersionSnapshot={nameVersionSnapshot}
              saveSnapshotCopy={saveSnapshotCopy}
              restoreSnapshotAsBranch={restoreSnapshotAsBranch}
              lockVersionSnapshot={lockVersionSnapshot}
              navigate={navigate}
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              runSearch={runSearch}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function SideTabs({ view, navigate }: { view: View; navigate: (view: View) => void }) {
  return (
    <aside className="sticky top-0 z-40 border-b border-[#e8e0d9] bg-white/95 px-4 py-4 backdrop-blur lg:h-screen lg:border-b-0 lg:px-7 lg:py-16">
      <nav className="flex gap-6 overflow-x-auto lg:grid lg:gap-[64px] lg:overflow-visible">
        {navItems.map((item) => {
          const active = item.view === view || ((view === "detail" || view === "history" || view === "versionDetail") && item.view === "home");
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => navigate(item.view)}
              className={`w-max whitespace-nowrap font-mono text-[22px] font-black tracking-tight lg:text-[26px] ${
                active ? "text-[#001eff]" : item.view === "create" ? "text-[#ff1f1f]" : "text-black"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function BrandBar({
  showSearch = true,
  navigate,
  searchInput = "",
  setSearchInput,
  runSearch,
}: {
  showSearch?: boolean;
  navigate: (view: View) => void;
  searchInput?: string;
  setSearchInput?: (value: string) => void;
  runSearch?: () => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const submitSearch = () => {
    if (!searchInput.trim()) {
      searchRef.current?.focus();
      return;
    }
    runSearch?.();
  };

  return (
    <header className="mb-8 grid grid-cols-[1fr_auto_auto] items-center gap-3 lg:mb-10 lg:grid-cols-[190px_minmax(0,1fr)_52px_52px] lg:gap-7">
      <button type="button" onClick={() => navigate("home")} className="text-left">
        <h1 className="font-mono text-[30px] font-black leading-none tracking-tight text-[#001eff] lg:text-[36px]">LINESPACE</h1>
        <p className="mt-1 hidden text-sm font-black sm:block">write together, line by line</p>
      </button>
      {showSearch ? (
        <label className="relative order-4 col-span-3 block lg:order-none lg:col-span-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#737783]" />
          <input
            ref={searchRef}
            value={searchInput}
            onChange={(event) => setSearchInput?.(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitSearch();
              }
            }}
            className="h-11 w-full rounded-full border-0 bg-[#efefef] pl-10 pr-5 text-sm outline-none transition focus:ring-2 focus:ring-[#001eff]/25"
            placeholder="#search poem, people, line..."
          />
        </label>
      ) : (
        <div />
      )}
      <button type="button" onClick={submitSearch} className="grid h-10 w-10 place-items-center rounded-full bg-[#001eff] text-white transition hover:scale-105">
        <Search size={21} />
      </button>
      <button type="button" onClick={() => navigate("profile")} className="grid h-10 w-10 place-items-center rounded-full bg-[#001eff] font-mono text-sm text-white">
        Li
      </button>
    </header>
  );
}

function HomePage({
  posts,
  fragments,
  searchQuery,
  clearSearch,
  openPost,
  openQuote,
  toggleLike,
  toggleSave,
  navigate,
  setSpacesTab,
  searchInput,
  setSearchInput,
  runSearch,
}: {
  posts: Post[];
  fragments: Fragment[];
  searchQuery: string;
  clearSearch: () => void;
  openPost: (id: string) => void;
  openQuote: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  navigate: (view: View) => void;
  setSpacesTab: (tab: SpacesTab) => void;
} & SearchProps) {
  const featuredFragment = fragments[0];
  return (
    <div>
      <BrandBar navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />
      <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h2 className="font-mono text-[30px] font-black text-[#001eff] lg:text-[36px]">Discovery Feed</h2>
          <p className="mt-1 max-w-[720px] text-base font-black text-[#737783]">
            Social-media form, creative-support content: drafts, relays, fragments, and locked finished forms.
          </p>
        </div>
        {featuredFragment && (
          <button
            type="button"
            onClick={() => {
              setSpacesTab("Fragments");
              navigate("spaces");
            }}
            className="rounded-[22px] border-2 border-[#001eff] p-4 text-left"
          >
            <p className="mb-2 flex items-center gap-2 text-sm font-black text-[#001eff]">
              <Hash size={15} /> Fragment Commons
            </p>
            <p className="text-lg font-black leading-tight">{featuredFragment.text}</p>
            <p className="mt-3 text-sm font-bold text-[#737783]">{featuredFragment.savedBy.length} saves · {featuredFragment.branchCount} branches</p>
          </button>
        )}
      </section>
      {searchQuery && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[#eef0ff] px-4 py-2 text-sm font-black text-[#001eff]">
            Search: {searchQuery} · {posts.length} result{posts.length === 1 ? "" : "s"}
          </span>
          <button type="button" onClick={clearSearch} className="rounded-full border-2 border-[#001eff] px-4 py-1.5 text-sm font-black text-[#001eff]">
            clear
          </button>
        </div>
      )}
      {posts.length > 0 ? (
        <MasonryGrid posts={posts} openPost={openPost} openQuote={openQuote} toggleLike={toggleLike} toggleSave={toggleSave} />
      ) : (
        <div className="rounded-[24px] border-2 border-[#001eff] p-8 text-xl font-black text-[#001eff]">No matching poems yet. Try another word, tag, or poet.</div>
      )}
    </div>
  );
}

function SpacesPage({
  tab,
  setTab,
  spaces,
  channels,
  fragments,
  posts,
  topics,
  comments,
  activeSpaceId,
  setActiveSpaceId,
  activeChannelId,
  setActiveChannelId,
  spaceNotice,
  startGroupDraft,
  joinChallenge,
  openGroupChat,
  forwardPostToGroup,
  fragmentAction,
  openPost,
  openQuote,
  openHistory,
  toggleSave,
  navigate,
  searchInput,
  setSearchInput,
  runSearch,
}: {
  tab: SpacesTab;
  setTab: (tab: SpacesTab) => void;
  spaces: Space[];
  channels: Channel[];
  fragments: Fragment[];
  posts: Post[];
  topics: GroupTopic[];
  comments: Comment[];
  activeSpaceId: string;
  setActiveSpaceId: (id: string) => void;
  activeChannelId: string;
  setActiveChannelId: (id: string) => void;
  spaceNotice: string;
  startGroupDraft: (spaceId: string, channelId?: string) => void;
  joinChallenge: (channelId: string, startMode: ChallengeStartMode) => void;
  openGroupChat: (spaceId: string, topicId?: string) => void;
  forwardPostToGroup: (spaceId: string, postId: string) => void;
  fragmentAction: (fragmentId: string, action: FragmentActionName, targetUserId?: string) => void;
  openPost: (id: string) => void;
  openQuote: (id: string) => void;
  openHistory: (id: string) => void;
  toggleSave: (id: string) => void;
  navigate: (view: View) => void;
} & SearchProps) {
  return (
    <div>
      <BrandBar navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />
      <div className="mb-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <h2 className="font-mono text-[36px] font-black text-[#001eff]">Spaces</h2>
          <p className="mt-1 text-lg font-black text-[#737783]">Groups, challenges, fragment commons, and stream map.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {(["Groups", "Challenges", "Fragments", "Map"] as SpacesTab[]).map((item) => (
            <button key={item} type="button" onClick={() => setTab(item)} className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-black ${tab === item ? "bg-[#001eff] text-white" : "bg-[#eef0ff] text-[#001eff]"}`}>
              {item}
            </button>
          ))}
        </div>
      </div>
      {spaceNotice && <div className="mb-5 rounded-[20px] bg-[#eef0ff] px-5 py-4 text-sm font-black text-[#001eff]">{spaceNotice}</div>}
      {tab === "Groups" && <GroupsPanel spaces={spaces} channels={channels} posts={posts} topics={topics} activeSpaceId={activeSpaceId} setActiveSpaceId={setActiveSpaceId} startGroupDraft={startGroupDraft} openGroupChat={openGroupChat} forwardPostToGroup={forwardPostToGroup} openPost={openPost} />}
      {tab === "Challenges" && (
        <ChallengesPanel
          channels={channels.filter((channel) => channel.kind === "challenge" || channel.kind === "turn_taking" || channel.kind === "co_writing" || channel.kind === "relay")}
          posts={posts}
          activeChannelId={activeChannelId}
          setActiveChannelId={setActiveChannelId}
          joinChallenge={joinChallenge}
          openPost={openPost}
        />
      )}
      {tab === "Fragments" && <FragmentsPanel fragments={fragments} fragmentAction={fragmentAction} />}
      {tab === "Map" && <StreamMapPanel posts={posts} comments={comments} openPost={openPost} openQuote={openQuote} openHistory={openHistory} toggleSave={toggleSave} />}
    </div>
  );
}

function GroupsPanel({
  spaces,
  channels,
  posts,
  topics,
  activeSpaceId,
  setActiveSpaceId,
  startGroupDraft,
  openGroupChat,
  forwardPostToGroup,
  openPost,
}: {
  spaces: Space[];
  channels: Channel[];
  posts: Post[];
  topics: GroupTopic[];
  activeSpaceId: string;
  setActiveSpaceId: (id: string) => void;
  startGroupDraft: (spaceId: string, channelId?: string) => void;
  openGroupChat: (spaceId: string, topicId?: string) => void;
  forwardPostToGroup: (spaceId: string, postId: string) => void;
  openPost: (id: string) => void;
}) {
  const activeSpace = spaces.find((space) => space.id === activeSpaceId) ?? spaces[0];
  const relatedChannels = channels.filter((channel) => activeSpace.channels.includes(channel.id));
  const relatedPosts = posts.filter((post) => post.spaceId === activeSpace.id);
  const relatedTopics = topics.filter((topic) => topic.spaceId === activeSpace.id);
  const memberRows = activeSpace.members.map((member) => ({
    ...member,
    author: Object.values(authors).find((author) => author.id === member.userId),
  }));
  const kindLabel: Record<Space["kind"], string> = {
    genre: "Genre room",
    publication: "Publication room",
    track: "Track room",
    course: "Course workshop",
    private_circle: "Community circle",
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="grid content-start gap-3">
        <div className="rounded-[24px] border-2 border-[#001eff] p-4">
          <p className="font-mono text-xl font-black text-[#001eff]">Group types</p>
          <p className="mt-2 text-sm font-bold text-[#737783]">Genre, publication, course, track, and community spaces keep feedback contextual.</p>
        </div>
        {spaces.map((space) => {
          const active = activeSpace.id === space.id;
          return (
            <button key={space.id} type="button" onClick={() => setActiveSpaceId(space.id)} className={`rounded-[22px] border-2 p-4 text-left transition ${active ? "border-[#001eff] bg-[#eef0ff]" : "border-[#e8e0d9] bg-white"}`}>
              <span className="font-mono text-xs font-black uppercase text-[#001eff]">{kindLabel[space.kind]}</span>
              <span className="mt-2 block text-xl font-black leading-tight">{space.name}</span>
              <span className="mt-2 block text-sm font-bold text-[#737783]">{space.members.length} members · {space.visibility.split("_").join(" ")}</span>
            </button>
          );
        })}
      </aside>

      <section className="rounded-[28px] border-2 border-[#001eff] bg-white p-5 lg:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="font-mono text-sm font-black uppercase text-[#001eff]">{kindLabel[activeSpace.kind]}</p>
            <h3 className="mt-2 text-[34px] font-black leading-none lg:text-[42px]">{activeSpace.name}</h3>
            <p className="mt-3 max-w-[720px] text-lg font-bold text-[#737783]">{activeSpace.description}</p>
          </div>
          <button type="button" onClick={() => startGroupDraft(activeSpace.id, relatedChannels[0]?.id)} className="rounded-full bg-[#001eff] px-6 py-3 text-left text-sm font-black text-white">
            Start from draft
          </button>
          <button type="button" onClick={() => openGroupChat(activeSpace.id)} className="rounded-full border-2 border-[#001eff] px-6 py-3 text-left text-sm font-black text-[#001eff]">
            <MessageCircle size={16} className="mr-2 inline" /> Open group chat
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">{activeSpace.tags.map((tag) => <BlueChip key={tag}>{tag}</BlueChip>)}</div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-5">
            <section className="rounded-[24px] border-2 border-[#e8e0d9] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="font-mono text-2xl font-black text-[#001eff]">Recent works</h4>
                <button type="button" onClick={() => startGroupDraft(activeSpace.id, relatedChannels[0]?.id)} className="rounded-full bg-[#001eff] px-5 py-2 text-sm font-black text-white">
                  Start group post
                </button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {relatedPosts.slice(0, 6).map((post) => (
                  <div key={post.id} className="rounded-[18px] bg-[#eef0ff] p-4">
                    <button type="button" onClick={() => openPost(post.id)} className="w-full text-left">
                      <p className="text-xs font-black uppercase text-[#001eff]">{collaborationLabel(post)}{isCoCreativePost(post) ? ` · ${patternLabel(getCoCreativePattern(post))}` : ""} · {post.stage}</p>
                      <p className="mt-2 text-base font-black leading-snug">{shorten(post.body, 92)}</p>
                      <p className="mt-2 text-xs font-bold text-[#737783]">{post.author.handle} · {post.comments} comments · {post.saves} saves</p>
                    </button>
                    <button type="button" onClick={() => forwardPostToGroup(activeSpace.id, post.id)} className="mt-3 rounded-full bg-white px-4 py-1.5 text-xs font-black text-[#001eff]">
                      <Repeat2 size={13} className="mr-1 inline" /> Forward to chat
                    </button>
                  </div>
                ))}
                {relatedPosts.length === 0 && <p className="text-sm font-bold text-[#737783]">No works in this group yet.</p>}
              </div>
            </section>

            <section className="rounded-[24px] border-2 border-[#001eff] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="font-mono text-2xl font-black text-[#001eff]">Recent topics</h4>
                <button type="button" onClick={() => openGroupChat(activeSpace.id)} className="rounded-full border-2 border-[#001eff] px-5 py-2 text-sm font-black text-[#001eff]">
                  Open all chat
                </button>
              </div>
              <div className="mt-4 grid gap-3">
                {relatedTopics.slice(0, 5).map((topic) => (
                  <button key={topic.id} type="button" onClick={() => openGroupChat(activeSpace.id, topic.id)} className="rounded-[18px] bg-[#eef0ff] p-4 text-left">
                    <p className="text-xs font-black uppercase text-[#001eff]">{topicTypeLabel(topic.type)} · {topic.unread} unread</p>
                    <p className="mt-2 text-lg font-black leading-tight">{topic.title}</p>
                    <p className="mt-2 text-sm font-bold text-[#737783]">{shorten(topic.starter, 110)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">{topic.tags.map((tag) => <BlueChip key={tag}>{tag}</BlueChip>)}</div>
                  </button>
                ))}
                {relatedTopics.length === 0 && <p className="text-sm font-bold text-[#737783]">No topics yet. Open group chat to start one.</p>}
              </div>
            </section>
          </div>

          <aside className="grid content-start gap-4">
            <div className="rounded-[22px] bg-[#eef0ff] p-4">
              <p className="font-mono text-xl font-black text-[#001eff]">Group contract</p>
              <div className="mt-3 grid gap-2 text-sm font-bold text-[#3b3d45]">
                {activeSpace.rules.map((rule) => <p key={rule}>- {rule}</p>)}
              </div>
            </div>
            <div className="rounded-[22px] border-2 border-[#e8e0d9] p-4">
              <p className="font-mono text-xl font-black text-[#001eff]">Members</p>
              <div className="mt-3 grid gap-3">
                {memberRows.map((member) => (
                  <div key={member.userId} className="flex items-center gap-3">
                    {member.author && <Avatar author={member.author} muted />}
                    <div className="min-w-0">
                      <p className="truncate font-black">{member.author?.name ?? "Member"}</p>
                      <p className="text-xs font-bold text-[#737783]">{member.role} · {member.badges.join(", ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function ChallengesPanel({
  channels,
  posts,
  activeChannelId,
  setActiveChannelId,
  joinChallenge,
  openPost,
}: {
  channels: Channel[];
  posts: Post[];
  activeChannelId: string;
  setActiveChannelId: (id: string) => void;
  joinChallenge: (channelId: string, startMode: ChallengeStartMode) => void;
  openPost: (id: string) => void;
}) {
  const activeChannel = channels.find((channel) => channel.id === activeChannelId) ?? channels[0];
  const activePosts = posts.filter((post) => post.channelId === activeChannel.id);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <section className="grid content-start gap-4">
        {channels.map((channel) => {
          const relatedPosts = posts.filter((post) => post.channelId === channel.id);
          const active = channel.id === activeChannel.id;
          return (
            <article key={channel.id} className={`rounded-[26px] border-2 p-5 ${active ? "border-[#001eff] bg-[#eef0ff]" : "border-[#e8e0d9] bg-white"}`}>
              <button type="button" onClick={() => setActiveChannelId(channel.id)} className="w-full text-left">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-black uppercase text-[#001eff]">{channelModeLabel(channel)}</p>
                    <h3 className="mt-2 text-2xl font-black leading-tight">{channel.title}</h3>
                  </div>
                  <span className="rounded-full bg-[#001eff] px-3 py-1 text-xs font-black text-white">{channel.status}</span>
                </div>
                <p className="mt-4 text-sm font-bold text-[#3b3d45]">{channel.prompt}</p>
              </button>
              <div className="mt-4 flex flex-wrap gap-2">{channel.tags.map((tag) => <BlueChip key={tag}>{tag}</BlueChip>)}</div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <MetricBlock value={String(channel.participants)} label="people" />
                <MetricBlock value={String(relatedPosts.length)} label="works" />
                <MetricBlock value={channel.deadline ? "due" : "open"} label={channel.deadline ?? "no date"} />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button type="button" onClick={() => joinChallenge(channel.id, "author_led")} className="rounded-full bg-[#001eff] px-4 py-2 text-sm font-black text-white">
                  Author-led
                </button>
                <button type="button" onClick={() => joinChallenge(channel.id, "co_writing")} className="rounded-full border-2 border-[#ff4b4f] px-4 py-2 text-sm font-black text-[#ff4b4f]">
                  Co-writing room
                </button>
                <button type="button" onClick={() => joinChallenge(channel.id, "relay")} className="rounded-full bg-[#ff4b4f] px-4 py-2 text-sm font-black text-white">
                  Relay
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-[28px] border-2 border-[#001eff] bg-white p-5 lg:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="font-mono text-sm font-black uppercase text-[#001eff]">Challenge workspace</p>
            <h3 className="mt-2 text-[34px] font-black leading-none lg:text-[42px]">{activeChannel.title}</h3>
            <p className="mt-3 max-w-[760px] text-lg font-bold text-[#737783]">{activeChannel.prompt}</p>
          </div>
          <span className="rounded-full bg-[#ff4b4f] px-5 py-2 text-sm font-black text-white">{activeChannel.deadline ? `Due ${activeChannel.deadline}` : "Open ended"}</span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[22px] bg-[#eef0ff] p-5">
            <p className="font-mono text-xl font-black text-[#001eff]">Author-led response</p>
            <p className="mt-2 text-sm font-bold leading-relaxed text-[#3b3d45]">Write your own response, invite close reading, and decide which suggestions enter the poem.</p>
            <button type="button" onClick={() => joinChallenge(activeChannel.id, "author_led")} className="mt-4 rounded-full bg-[#001eff] px-5 py-2 text-sm font-black text-white">
              Start response
            </button>
          </div>
          <div className="rounded-[22px] bg-[#fff3f6] p-5">
            <p className="font-mono text-xl font-black text-[#ff4b4f]">Co-writing room</p>
            <p className="mt-2 text-sm font-bold leading-relaxed text-[#3b3d45]">Collect candidate lines, pin ideas, and let a host or editor accept contributions with credit.</p>
            <button type="button" onClick={() => joinChallenge(activeChannel.id, "co_writing")} className="mt-4 rounded-full bg-[#ff4b4f] px-5 py-2 text-sm font-black text-white">
              Open room
            </button>
          </div>
          <div className="rounded-[22px] bg-[#fff3f6] p-5">
            <p className="font-mono text-xl font-black text-[#ff4b4f]">Turn-taking relay</p>
            <p className="mt-2 text-sm font-bold leading-relaxed text-[#3b3d45]">Use the relay pattern only when sequence matters and each turn adds a line.</p>
            <button type="button" onClick={() => joinChallenge(activeChannel.id, "relay")} className="mt-4 rounded-full bg-[#ff4b4f] px-5 py-2 text-sm font-black text-white">
              Start relay thread
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <h4 className="font-mono text-2xl font-black text-[#001eff]">Challenge flow</h4>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <WorkflowStep index="1" title="Join challenge" body="Participants see theme, tags, form, deadline, and active works." />
              <WorkflowStep index="2" title="Choose pathway" body="Author-led work keeps suggestions outside; co-writing moves contributions inside a contract." />
              <WorkflowStep index="3" title="Track pattern" body="Rooms, shared edits, and relays show different tools without changing the authorship boundary." />
              <WorkflowStep index="4" title="Finish with credit" body="The final form can be locked with a contribution chain and shared or helper credit." />
            </div>
          </div>
          <aside className="rounded-[22px] border-2 border-[#e8e0d9] p-4">
            <p className="font-mono text-xl font-black text-[#001eff]">Active works</p>
            <div className="mt-3 grid gap-2">
              {activePosts.slice(0, 4).map((post) => (
                <button key={post.id} type="button" onClick={() => openPost(post.id)} className="rounded-[16px] bg-[#eef0ff] p-3 text-left">
                  <p className="text-sm font-black text-[#001eff]">{collaborationLabel(post)}{isCoCreativePost(post) ? ` · ${patternLabel(getCoCreativePattern(post))}` : ""}</p>
                  <p className="mt-1 text-sm font-bold">{shorten(post.body, 70)}</p>
                </button>
              ))}
              {activePosts.length === 0 && <p className="text-sm font-bold text-[#737783]">No active work yet. Start the first one.</p>}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function FragmentsPanel({ fragments, fragmentAction }: { fragments: Fragment[]; fragmentAction: (fragmentId: string, action: FragmentActionName, targetUserId?: string) => void }) {
  const savedCount = fragments.reduce((sum, fragment) => sum + fragment.savedBy.length, 0);
  const activeWorks = fragments.reduce((sum, fragment) => sum + fragment.activeChatCount + fragment.activeThreadCount + fragment.branchCount, 0);
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section>
        <div className="mb-5 rounded-[26px] border-2 border-[#001eff] p-5">
          <p className="font-mono text-2xl font-black text-[#001eff]">Fragment commons</p>
          <p className="mt-2 text-sm font-bold text-[#737783]">Shared lines, images, and stuck phrases can become saved notes, invitations, group chats, relays, or solo branches.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {fragments.map((fragment) => <FragmentCard key={fragment.id} fragment={fragment} fragmentAction={fragmentAction} />)}
        </div>
      </section>
      <aside className="grid content-start gap-4">
        <div className="rounded-[24px] bg-[#eef0ff] p-5">
          <p className="font-mono text-xl font-black text-[#001eff]">Commons signals</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <MetricBlock value={String(fragments.length)} label="fragments" />
            <MetricBlock value={String(savedCount)} label="saves" />
            <MetricBlock value={String(activeWorks)} label="started" />
            <MetricBlock value={String(fragments.filter((fragment) => fragment.anonymous).length)} label="anonymous" />
          </div>
        </div>
        <div className="rounded-[24px] border-2 border-[#001eff] p-5">
          <p className="font-mono text-xl font-black text-[#001eff]">Fragment workflow</p>
          <div className="mt-4 grid gap-3">
            <WorkflowStep index="1" title="Save" body="Keep a private note without turning it into a poem yet." />
            <WorkflowStep index="2" title="Invite" body="Ask the source contributor to join a co-writing path when credit is allowed." />
            <WorkflowStep index="3" title="Start chat" body="Open a facilitated brainstorm where comments do not enter the poem until accepted." />
            <WorkflowStep index="4" title="Start thread or branch" body="Create a turn-taking relay or a solo branch while preserving source history." />
          </div>
        </div>
      </aside>
    </div>
  );
}

function WorkflowStep({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <div className="rounded-[18px] border-2 border-[#e8e0d9] bg-white p-4">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#001eff] text-sm font-black text-white">{index}</span>
      <p className="mt-3 font-black">{title}</p>
      <p className="mt-1 text-sm font-bold leading-relaxed text-[#737783]">{body}</p>
    </div>
  );
}

function StreamMapPanel({
  posts,
  comments,
  openPost,
  openQuote,
  openHistory,
  toggleSave,
}: {
  posts: Post[];
  comments: Comment[];
  openPost: (id: string) => void;
  openQuote: (id: string) => void;
  openHistory: (id: string) => void;
  toggleSave: (id: string) => void;
}) {
  const topics = useMemo(() => {
    const map = new Map<string, { tag: string; posts: Post[]; likes: number; comments: number }>();
    posts.forEach((post) => {
      post.tags.forEach((tag) => {
        const current = map.get(tag) ?? { tag, posts: [], likes: 0, comments: 0 };
        current.posts.push(post);
        current.likes += post.likes;
        current.comments += post.comments;
        map.set(tag, current);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.likes + b.comments * 3 - (a.likes + a.comments * 3)).slice(0, 6);
  }, [posts]);
  const focus = topics[0];
  const focusPosts = focus?.posts ?? posts.slice(0, 3);
  return (
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
      <aside className="grid content-start gap-3">
        <p className="font-mono text-[24px] font-black">tag clusters</p>
        {topics.map((topic) => (
          <div key={topic.tag} className="rounded-[20px] border-2 border-[#001eff] px-4 py-3">
            <span className="block font-black text-[#001eff]">{topic.tag}</span>
            <span className="mt-1 block text-[11px] font-bold text-[#777]">{topic.posts.length} works · {topic.likes} likes</span>
          </div>
        ))}
      </aside>
      <section className="relative min-h-[460px] overflow-hidden rounded-[30px] border-2 border-[#001eff] bg-white p-5">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {focusPosts.slice(0, 5).map((post, index) => (
            <path key={post.id} d={`M50 88 C50 ${65 - index * 4}, ${24 + index * 15} ${62 - index * 8}, ${24 + index * 15} ${48 - index * 7}`} stroke={isCoCreativePost(post) ? "#ff4b4f" : "#001eff"} strokeWidth="0.55" fill="none" opacity="0.55" />
          ))}
        </svg>
        <div className="absolute left-1/2 top-[82%] -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="font-mono text-3xl font-black text-[#001eff]">{focus?.tag ?? "#AI_memory"}</p>
          <p className="mt-2 text-sm font-black text-[#737783]">topic root</p>
        </div>
        {focusPosts.slice(0, 5).map((post, index) => (
          <button
            key={post.id}
            type="button"
            onClick={() => openPost(post.id)}
            className={`absolute max-w-[190px] text-left font-black leading-tight ${isCoCreativePost(post) ? "text-[#ff4b4f]" : "text-[#001eff]"}`}
            style={{ left: `${22 + index * 15}%`, top: `${46 - index * 7}%` }}
          >
            <span className="mb-1 inline-grid h-6 w-6 place-items-center rounded-full bg-[#eef0ff] text-[10px]">{isCoCreativePost(post) ? "C" : "A"}</span>
            <span className="block text-sm">{shorten(post.body, 54)}</span>
          </button>
        ))}
      </section>
      <aside className="rounded-[26px] border-2 border-[#001eff] p-5">
        <p className="font-mono text-2xl font-black text-[#001eff]">Map signals</p>
        <div className="mt-5 grid gap-3 text-sm font-black">
          <span>{posts.filter((post) => isCoCreativePost(post)).length} co-writing works</span>
          <span>{posts.filter((post) => post.lockState.status === "locked").length} locked versions</span>
          <span>{comments.length} comments feeding suggestions</span>
        </div>
        {focusPosts[0] && (
          <div className="mt-6 grid gap-3">
            <button type="button" onClick={() => openPost(focusPosts[0].id)} className="rounded-full bg-[#001eff] px-5 py-3 font-black text-white">Open strongest branch</button>
            <button type="button" onClick={() => openQuote(focusPosts[0].id)} disabled={!focusPosts[0].quoteAllowed} className="rounded-full border-2 border-[#001eff] px-5 py-3 font-black text-[#001eff] disabled:opacity-35">Quote</button>
            <button type="button" onClick={() => toggleSave(focusPosts[0].id)} className="rounded-full border-2 border-[#001eff] px-5 py-3 font-black text-[#001eff]">{focusPosts[0].saved ? "Saved" : "Save"}</button>
            <button type="button" onClick={() => openHistory(focusPosts[0].id)} className="rounded-full border-2 border-[#001eff] px-5 py-3 font-black text-[#001eff]">View history</button>
          </div>
        )}
      </aside>
    </div>
  );
}

function PublicationStudio({
  workId,
  poemText,
  authorName,
  contributorNames,
  tags,
  templates,
  initialDesign,
  onSaveDesign,
  onLockDesign,
  onExportDesign,
}: {
  workId?: string;
  poemText: string;
  authorName: string;
  contributorNames: string[];
  tags: string[];
  templates: DesignTemplate[];
  initialDesign?: PublicationDesign;
  onSaveDesign: (design: PublicationDesign) => void;
  onLockDesign: (design: PublicationDesign) => void;
  onExportDesign: (design: PublicationDesign, type: ExportRecord["type"], filename: string) => void;
}) {
  const [activeStep, setActiveStep] = useState<"Write" | "Package" | "Lock & Export">(initialDesign?.locked ? "Lock & Export" : "Package");
  const [mode, setMode] = useState<DesignMode>(initialDesign?.mode ?? "template");
  const [status, setStatus] = useState("");
  const [design, setDesign] = useState<PublicationDesign>(() =>
    initialDesign ?? makePublicationDesign({ workId, poemText, authorName, contributorNames, tags, template: templates[0] }),
  );
  const liveDesign: PublicationDesign = {
    ...design,
    workId,
    poemText,
    authorName,
    contributorNames,
    tags,
    mode,
    title: design.title || shorten(poemText.replace(/\s+/g, " "), 52),
  };
  const selectedTemplate = templates.find((template) => template.id === liveDesign.templateId) ?? templates[0];
  const updateStyle = (patch: Partial<PublicationDesignStyle>) => {
    setMode("free_studio");
    setDesign((current) => ({ ...current, mode: "free_studio", style: { ...current.style, ...patch }, updatedAt: nowIso() }));
  };
  const selectTemplate = (template: DesignTemplate) => {
    setMode("template");
    setDesign((current) => ({
      ...current,
      mode: "template",
      templateId: template.id,
      canvasSize: template.canvasSize,
      style: { ...template.defaultStyle },
      updatedAt: nowIso(),
    }));
  };
  const saveDraft = () => {
    onSaveDesign(liveDesign);
    setStatus("Design draft saved");
  };
  const lockDesign = () => {
    const lockedAt = nowIso();
    const locked = { ...liveDesign, locked: true, lockedAt, updatedAt: lockedAt };
    setDesign(locked);
    onLockDesign(locked);
    setActiveStep("Lock & Export");
    setStatus("Final design locked");
  };
  const exportDesign = async (type: ExportRecord["type"]) => {
    setStatus(type === "jpg" ? "Preparing JPG..." : "Preparing PDF...");
    const filename = type === "jpg" ? await publicationExportService.exportJpg(liveDesign) : await publicationExportService.exportPdf(liveDesign);
    onExportDesign(liveDesign, type, filename);
    setStatus(`${filename} downloaded`);
  };

  return (
    <section className="mt-8 rounded-[28px] border-2 border-[#001eff] bg-white p-4 lg:p-5">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="font-mono text-[28px] font-black leading-none text-[#001eff]">Publication Studio</p>
          <p className="mt-2 text-sm font-black text-[#737783]">Package the poem as a finished visual object.</p>
        </div>
        <div className="grid grid-cols-3 overflow-hidden rounded-full border-2 border-[#001eff] text-center text-xs font-black sm:min-w-[390px]">
          {(["Write", "Package", "Lock & Export"] as const).map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setActiveStep(step)}
              className={`px-3 py-3 ${activeStep === step ? "bg-[#001eff] text-white" : "bg-white text-[#001eff]"}`}
            >
              {step}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)_300px] lg:items-start">
        <aside className="order-2 grid gap-4 lg:order-1">
          <div className="rounded-[22px] bg-[#eef0ff] p-3">
            <p className="mb-3 text-sm font-black text-[#001eff]">Mode</p>
            <div className="grid gap-2">
              <button type="button" onClick={() => setMode("free_studio")} className={`rounded-[16px] border-2 px-4 py-3 text-left text-sm font-black ${mode === "free_studio" ? "border-[#001eff] bg-white text-[#001eff]" : "border-transparent bg-[#dfe5ff] text-[#444]"}`}>
                Free Studio
              </button>
              <button type="button" onClick={() => setMode("template")} className={`rounded-[16px] border-2 px-4 py-3 text-left text-sm font-black ${mode === "template" ? "border-[#001eff] bg-white text-[#001eff]" : "border-transparent bg-[#dfe5ff] text-[#444]"}`}>
                Templates
              </button>
            </div>
          </div>
          <div className="rounded-[22px] border-2 border-[#e8e0d9] p-3">
            <p className="mb-3 text-sm font-black text-[#001eff]">Template gallery</p>
            <div className="grid gap-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => selectTemplate(template)}
                  className={`rounded-[18px] border-2 p-3 text-left ${selectedTemplate.id === template.id ? "border-[#001eff] bg-[#eef0ff]" : "border-[#e8e0d9] bg-white"}`}
                >
                  <span className="block text-sm font-black">{template.name}</span>
                  <span className="mt-1 block text-xs font-bold text-[#737783]">{canvasSizeMeta[template.canvasSize].label} / {template.bestFor.replace("_", " ")}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="order-1 lg:order-2">
          <PublicationPreview design={liveDesign} />
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={saveDraft} className="rounded-full border-2 border-[#001eff] px-5 py-3 text-sm font-black text-[#001eff]">Save design draft</button>
            <button type="button" onClick={lockDesign} disabled={liveDesign.locked} className="rounded-full bg-[#ff4b4f] px-5 py-3 text-sm font-black text-white disabled:bg-[#d8a3a7]">
              {liveDesign.locked ? "Final design locked" : "Lock final design"}
            </button>
            <button type="button" onClick={() => exportDesign("jpg")} className="rounded-full bg-[#001eff] px-5 py-3 text-sm font-black text-white">Export JPG</button>
            <button type="button" onClick={() => exportDesign("pdf")} className="rounded-full bg-black px-5 py-3 text-sm font-black text-white">Export PDF</button>
          </div>
          {status && <p className="mt-3 rounded-full bg-[#eef0ff] px-4 py-2 text-sm font-black text-[#001eff]">{status}</p>}
        </div>

        <StyleInspector design={liveDesign} updateStyle={updateStyle} setCanvasSize={(canvasSize) => setDesign((current) => ({ ...current, canvasSize, updatedAt: nowIso() }))} />
      </div>
    </section>
  );
}

function PublicationPreview({ design }: { design: PublicationDesign }) {
  const size = canvasSizeMeta[design.canvasSize];
  const backgroundStyle = publicationPreviewBackground(design.style);
  const textAlign = design.style.align;
  return (
    <div className="rounded-[24px] border-2 border-[#e8e0d9] bg-[#f6f4f1] p-3 lg:p-5">
      <div
        className="relative mx-auto flex w-full max-w-[620px] overflow-hidden rounded-[18px] shadow-[0_18px_45px_rgba(0,0,0,.16)]"
        style={{ aspectRatio: `${size.width} / ${size.height}`, ...backgroundStyle }}
      >
        <div className={`absolute inset-[3.8%] ${design.style.borderStyle === "thin" || design.style.borderStyle === "stamp" ? "border-2" : ""}`} style={{ borderColor: design.style.accentColor }} />
        {design.style.borderStyle === "tape" && (
          <>
            <span className="absolute left-[8%] top-5 h-9 w-[22%] -rotate-3 bg-white/60" />
            <span className="absolute bottom-5 right-[8%] h-9 w-[22%] rotate-3 bg-white/60" />
          </>
        )}
        <Sticker style={design.style} />
        <div className="relative z-10 flex h-full w-full flex-col" style={{ padding: `${Math.max(22, design.style.padding * 0.62)}px` }}>
          <p
            className="whitespace-pre-line font-black leading-tight"
            style={{
              color: design.style.textColor,
              fontFamily: fontStacks[design.style.fontFamily],
              fontSize: Math.max(18, Math.min(34, design.style.fontSize)),
              lineHeight: design.style.lineHeight,
              textAlign,
            }}
          >
            {design.poemText}
          </p>
          <div className="mt-auto">
            {design.style.showCredits && (
              <p className="text-sm font-black" style={{ color: design.style.accentColor, textAlign }}>
                By {design.authorName}{design.contributorNames.length > 1 ? ` / ${design.contributorNames.slice(1).join(" / ")}` : ""}
              </p>
            )}
            {design.style.showTags && design.tags.length > 0 && (
              <p className="mt-2 break-words font-mono text-[11px] font-black" style={{ color: design.style.textColor, textAlign }}>
                {design.tags.slice(0, 5).join("  ")}
              </p>
            )}
          </div>
        </div>
        {design.style.stamp !== "none" && (
          <span
            className="absolute bottom-[7%] right-[7%] -rotate-6 rounded border-2 px-4 py-2 font-mono text-xs font-black uppercase"
            style={{ borderColor: design.style.accentColor, color: design.style.accentColor }}
          >
            {design.style.stamp}
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-black text-[#737783]">
        <span>{size.label}</span>
        <span>{design.mode === "template" ? "Template" : "Free Studio"}</span>
        {design.locked && <span className="text-[#ff4b4f]">Locked</span>}
      </div>
    </div>
  );
}

function StyleInspector({
  design,
  updateStyle,
  setCanvasSize,
}: {
  design: PublicationDesign;
  updateStyle: (patch: Partial<PublicationDesignStyle>) => void;
  setCanvasSize: (size: CanvasSize) => void;
}) {
  const { style } = design;
  return (
    <aside className="order-3 rounded-[22px] border-2 border-[#e8e0d9] p-4">
      <p className="font-mono text-xl font-black text-[#001eff]">Style inspector</p>
      <div className="mt-4 grid gap-4">
        <InspectorSelect label="Canvas" value={design.canvasSize} onChange={(value) => setCanvasSize(value as CanvasSize)} options={Object.entries(canvasSizeMeta).map(([value, meta]) => ({ value, label: meta.label }))} />
        <InspectorSelect label="Font" value={style.fontFamily} onChange={(value) => updateStyle({ fontFamily: value as PublicationDesignStyle["fontFamily"] })} options={[
          { value: "serif", label: "Serif" },
          { value: "sans", label: "Sans" },
          { value: "mono", label: "Mono" },
          { value: "hand", label: "Hand" },
        ]} />
        <InspectorSelect label="Background paper" value={style.background} onChange={(value) => updateStyle({ background: value as PublicationDesignStyle["background"] })} options={[
          { value: "paper", label: "Paper" },
          { value: "notebook", label: "Notebook" },
          { value: "rose", label: "Rose page" },
          { value: "blueprint", label: "Blue grid" },
          { value: "collage", label: "Collage" },
          { value: "dark", label: "Dark" },
        ]} />
        <InspectorSelect label="Alignment" value={style.align} onChange={(value) => updateStyle({ align: value as PublicationDesignStyle["align"] })} options={[
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
        ]} />
        <InspectorSelect label="Sticker" value={style.sticker} onChange={(value) => updateStyle({ sticker: value as PublicationDesignStyle["sticker"] })} options={[
          { value: "none", label: "None" },
          { value: "moon", label: "Moon" },
          { value: "star", label: "Star" },
          { value: "tape", label: "Tape" },
          { value: "flower", label: "Flower" },
          { value: "clip", label: "Clip" },
        ]} />
        <InspectorSelect label="Stamp" value={style.stamp} onChange={(value) => updateStyle({ stamp: value as PublicationDesignStyle["stamp"] })} options={[
          { value: "none", label: "None" },
          { value: "draft", label: "Draft" },
          { value: "locked", label: "Locked" },
          { value: "collective", label: "Collective" },
          { value: "fragment", label: "Fragment" },
        ]} />
        <RangeControl label="Font size" value={style.fontSize} min={18} max={42} onChange={(value) => updateStyle({ fontSize: value })} />
        <RangeControl label="Line height" value={Math.round(style.lineHeight * 100)} min={110} max={170} onChange={(value) => updateStyle({ lineHeight: value / 100 })} />
        <RangeControl label="Padding" value={style.padding} min={30} max={76} onChange={(value) => updateStyle({ padding: value })} />
        <div className="grid grid-cols-3 gap-2">
          <ColorControl label="Text" value={style.textColor} onChange={(value) => updateStyle({ textColor: value })} />
          <ColorControl label="Accent" value={style.accentColor} onChange={(value) => updateStyle({ accentColor: value })} />
          <ColorControl label="Paper" value={style.paperTone} onChange={(value) => updateStyle({ paperTone: value })} />
        </div>
        <label className="flex items-center justify-between gap-3 rounded-[16px] bg-[#eef0ff] px-4 py-3 text-sm font-black text-[#001eff]">
          Credits
          <input type="checkbox" checked={style.showCredits} onChange={(event) => updateStyle({ showCredits: event.target.checked })} />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-[16px] bg-[#eef0ff] px-4 py-3 text-sm font-black text-[#001eff]">
          Tags
          <input type="checkbox" checked={style.showTags} onChange={(event) => updateStyle({ showTags: event.target.checked })} />
        </label>
      </div>
    </aside>
  );
}

function InspectorSelect({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs font-black uppercase text-[#737783]">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-[14px] border-2 border-[#e8e0d9] bg-white px-3 text-sm font-black normal-case text-[#111] outline-none focus:border-[#001eff]">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function RangeControl({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-xs font-black uppercase text-[#737783]">
      <span className="flex items-center justify-between"><span>{label}</span><span>{value}</span></span>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full accent-[#001eff]" />
    </label>
  );
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-center text-[11px] font-black uppercase text-[#737783]">
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full cursor-pointer rounded border-0 bg-transparent p-0" />
      {label}
    </label>
  );
}

function Sticker({ style }: { style: PublicationDesignStyle }) {
  if (style.sticker === "none") return null;
  if (style.sticker === "moon") return <span className="absolute right-[7%] top-[7%] h-16 w-16 rounded-full" style={{ background: style.accentColor, boxShadow: `18px -8px 0 ${style.paperTone}` }} />;
  if (style.sticker === "star") return <span className="absolute right-[7%] top-[7%] text-6xl font-black leading-none" style={{ color: style.accentColor }}>*</span>;
  if (style.sticker === "flower") {
    return (
      <span className="absolute right-[7%] top-[8%] grid h-20 w-20 place-items-center">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <span key={index} className="absolute h-8 w-8 rounded-full" style={{ background: style.accentColor, transform: `rotate(${index * 60}deg) translateY(-22px)` }} />
        ))}
        <span className="relative h-8 w-8 rounded-full" style={{ background: style.paperTone }} />
      </span>
    );
  }
  if (style.sticker === "clip") return <span className="absolute right-[8%] top-[8%] h-20 w-12 rounded-full border-[6px]" style={{ borderColor: style.accentColor }} />;
  return <span className="absolute right-[8%] top-[8%] h-10 w-32 -rotate-6 bg-white/60" />;
}

function publicationPreviewBackground(style: PublicationDesignStyle): CSSProperties {
  if (style.background === "blueprint") {
    return {
      backgroundColor: style.paperTone,
      backgroundImage: "linear-gradient(rgba(255,255,255,.17) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.17) 1px, transparent 1px)",
      backgroundSize: "42px 42px",
    };
  }
  if (style.background === "notebook") {
    return {
      backgroundColor: style.paperTone,
      backgroundImage: "linear-gradient(rgba(0,30,255,.18) 1px, transparent 1px), linear-gradient(90deg, transparent 72px, rgba(255,75,79,.4) 72px, rgba(255,75,79,.4) 74px, transparent 74px)",
      backgroundSize: "100% 34px, 100% 100%",
    };
  }
  if (style.background === "collage") {
    return {
      backgroundColor: style.paperTone,
      backgroundImage: "linear-gradient(135deg, rgba(255,255,255,.82) 0 38%, transparent 38%), linear-gradient(25deg, transparent 0 54%, rgba(255,75,79,.9) 54% 72%, transparent 72%)",
    };
  }
  if (style.background === "dark") {
    return { background: "linear-gradient(135deg, #17171b, #00115c)" };
  }
  if (style.background === "rose") {
    return { background: `linear-gradient(135deg, ${style.paperTone}, #ffffff)` };
  }
  return {
    backgroundColor: style.paperTone,
    backgroundImage: "radial-gradient(rgba(0,0,0,.05) 1px, transparent 1px)",
    backgroundSize: "22px 22px",
  };
}

function CreatePage(props: {
  draft: string;
  setDraft: (value: string) => void;
  createTags: string[];
  setCreateTags: (tags: string[]) => void;
  tagDraft: string;
  setTagDraft: (value: string) => void;
  backgroundImage: string;
  setBackgroundImage: (value: string) => void;
  settings: CreateSettings;
  setSettings: (settings: CreateSettings) => void;
  spaces: Space[];
  publishPost: (event: FormEvent) => void;
  creationKind: CreationKind;
  setCreationKind: (kind: CreationKind) => void;
  createMode: CollaborationMode;
  setCreateMode: (mode: CollaborationMode) => void;
  createPattern: CoCreativePattern;
  setCreatePattern: (pattern: CoCreativePattern) => void;
  publicationTemplates: DesignTemplate[];
  onSaveDesign: (design: PublicationDesign) => void;
  onLockDesign: (design: PublicationDesign) => void;
  onExportDesign: (design: PublicationDesign, type: ExportRecord["type"], filename: string) => void;
  onSaveDraftSnapshot: () => void;
}) {
  const { draft, setDraft, createTags, setCreateTags, tagDraft, setTagDraft, backgroundImage, setBackgroundImage, settings, setSettings, spaces, publishPost, creationKind, setCreationKind, createMode, setCreateMode, createPattern, setCreatePattern, publicationTemplates, onSaveDesign, onLockDesign, onExportDesign, onSaveDraftSnapshot } = props;
  const ownGroups = spaces.filter((space) => space.members.some((member) => member.userId === currentUser.id));
  const allUsers = Object.values(authors).filter((author) => author.id !== currentUser.id);
  const visibilityOptions: { value: VisibilityMode; label: string; description: string }[] = [
    { value: "public", label: "Public", description: "Visible to the public feed." },
    { value: "private", label: "Private", description: "Only saved in your own workspace." },
    { value: "group", label: "Group", description: "Visible inside one selected group." },
    { value: "include_people", label: "Specific people", description: "Only selected people can see it." },
    { value: "exclude_people", label: "Hide from people", description: "Public or group-like, except selected people." },
  ];
  const attributionOptions: { value: AttributionMode; label: string; description: string }[] = [
    { value: "named", label: "Use my name", description: "Publish as your profile identity." },
    { value: "anonymous", label: "Anonymous", description: "Hide your public identity on this work." },
    { value: "pen_name", label: "Pen name", description: "Publish with a new displayed byline." },
  ];
  const setVisibilityMode = (visibilityMode: VisibilityMode) => {
    setSettings({
      ...settings,
      visibilityMode,
      publicPost: visibilityMode === "public" || visibilityMode === "exclude_people",
      selectedGroupId: visibilityMode === "group" ? settings.selectedGroupId ?? ownGroups[0]?.id : settings.selectedGroupId,
    });
  };
  const toggleUser = (key: "visibleUserIds" | "hiddenUserIds" | "coAuthorIds", userId: string) => {
    const values = settings[key];
    setSettings({
      ...settings,
      [key]: values.includes(userId) ? values.filter((id) => id !== userId) : [...values, userId],
    });
  };
  const personPicker = (key: "visibleUserIds" | "hiddenUserIds" | "coAuthorIds") => (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {allUsers.map((author) => {
        const active = settings[key].includes(author.id);
        return (
          <button key={author.id} type="button" onClick={() => toggleUser(key, author.id)} className={`flex items-center gap-3 rounded-[16px] border-2 p-3 text-left ${active ? "border-[#001eff] bg-[#eef0ff]" : "border-[#e8e0d9] bg-white"}`}>
            <Avatar author={author} muted={!active} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-black">{author.name}</span>
              <span className="block truncate text-xs font-bold text-[#737783]">{author.handle}</span>
            </span>
            <span className={`ml-auto grid h-4 w-4 shrink-0 place-items-center rounded border border-[#001eff] ${active ? "bg-[#001eff]" : "bg-white"}`}>
              {active && <Check size={12} className="text-white" />}
            </span>
          </button>
        );
      })}
    </div>
  );
  const normalizeTag = (value: string) => {
    const cleaned = value.trim().replace(/\s+/g, "_");
    if (!cleaned) return "";
    return cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
  };
  const addTag = () => {
    const next = normalizeTag(tagDraft);
    if (!next || createTags.includes(next)) return;
    setCreateTags([...createTags, next]);
    setTagDraft("");
  };
  const removeTag = (tag: string) => setCreateTags(createTags.filter((item) => item !== tag));
  const uploadBackground = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBackgroundImage(String(reader.result));
    reader.readAsDataURL(file);
  };
  const toggleContract = (key: "allowComments" | "allowForward") => setSettings({ ...settings, [key]: !settings[key] });
  const selectedIntent = createIntentCards.find((item) => item.kind === creationKind) ?? createIntentCards[1];
  const chooseIntent = (intent: typeof createIntentCards[number]) => {
    setCreationKind(intent.kind);
    setCreateMode(intent.collaborationMode);
    if (intent.pattern) setCreatePattern(intent.pattern);
    if (intent.kind === "Fragment") setSettings({ ...settings, visibilityMode: "private", publicPost: false });
    if (intent.kind === "Group discussion") setSettings({ ...settings, visibilityMode: "group", selectedGroupId: settings.selectedGroupId ?? ownGroups[0]?.id });
    if (intent.collaborationMode === "co_creative") setSettings({ ...settings, allowComments: true, allowForward: true, showHistory: true, allowLike: true });
  };
  const selectChallengePath = (mode: CollaborationMode, pattern?: CoCreativePattern) => {
    setCreateMode(mode);
    if (pattern) setCreatePattern(pattern);
    if (mode === "co_creative") setSettings({ ...settings, allowComments: true, allowForward: true, showHistory: true });
  };
  const participationItems = createMode === "co_creative" ? coCreativeParticipation : facilitatedParticipation;
  const packageAuthorName = settings.attributionMode === "anonymous"
    ? "Anonymous poet"
    : settings.attributionMode === "pen_name" && settings.penName.trim()
      ? settings.penName.trim()
      : currentUser.name;
  const packageContributors = Array.from(new Set([
    packageAuthorName,
    ...settings.coAuthorIds
      .map((id) => Object.values(authors).find((author) => author.id === id)?.name)
      .filter((name): name is string => Boolean(name)),
  ]));
  return (
    <form onSubmit={publishPost} className="max-w-[1074px] pt-1">
      <h1 className="font-mono text-[36px] font-black leading-none text-[#001eff] lg:text-[38px]">Create / Start</h1>
      <p className="mt-2 text-base font-black text-[#737783]">Choose a natural starting point. LINESPACE turns it into the right feedback, authorship, and lock-in rules.</p>

      <section className="mt-6 rounded-[24px] border-2 border-[#e8e0d9] p-4 lg:p-5">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xl font-black text-[#001eff]">Step 1 · What are you starting?</p>
            <p className="mt-1 text-sm font-bold text-[#737783]">Choose the workflow first. LINESPACE maps it to author-led or co-writing rules behind the scenes.</p>
          </div>
          <span className={`w-max rounded-full px-4 py-2 text-xs font-black text-white ${createMode === "co_creative" ? "bg-[#ff4b4f]" : "bg-[#001eff]"}`}>
            {createMode === "co_creative" ? "Co-writing" : "Author-led"}{createMode === "co_creative" ? ` · ${patternLabel(createPattern)}` : ""}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {createIntentCards.map((intent) => {
            const active = creationKind === intent.kind;
            return (
              <button
                key={intent.kind}
                type="button"
                onClick={() => chooseIntent(intent)}
                className={`min-h-[132px] rounded-[18px] border-2 p-4 text-left transition ${active ? "border-[#001eff] bg-[#eef0ff]" : "border-[#ded7cd] bg-white hover:border-[#001eff]"}`}
              >
                <span className={`mb-3 inline-flex rounded-full px-3 py-1 text-[11px] font-black ${intent.collaborationMode === "co_creative" ? "bg-[#fff3f6] text-[#ff4b4f]" : "bg-[#eef0ff] text-[#001eff]"}`}>{intent.badge}</span>
                <span className="block text-base font-black">{intent.title}</span>
                <span className="mt-2 block text-xs font-bold leading-relaxed text-[#737783]">{intent.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-5 rounded-[24px] border-2 border-[#e8e0d9] p-4 lg:p-5">
        <p className="font-mono text-xl font-black text-[#001eff]">Step 2 · How can others participate?</p>
        <p className="mt-1 text-sm font-bold text-[#737783]">{selectedIntent.title} is configured as {createMode === "co_creative" ? "co-writing" : "author-led"} work{createMode === "co_creative" ? ` with ${patternLabel(createPattern).toLowerCase()} tools` : ""}.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
          <div className={`rounded-[20px] p-4 ${createMode === "co_creative" ? "bg-[#fff3f6]" : "bg-[#eef0ff]"}`}>
            <p className={`text-lg font-black ${createMode === "co_creative" ? "text-[#ff4b4f]" : "text-[#001eff]"}`}>
              {createMode === "co_creative" ? "Co-writing boundary" : "Author-led feedback boundary"}
            </p>
            <p className="mt-2 text-sm font-bold leading-relaxed text-[#3b3d45]">
              {createMode === "co_creative"
                ? "Participants contribute inside the work. The contract defines who can add, edit, accept, vote, and lock."
                : "Readers respond around the work. Suggestions become candidates; the author decides what enters the poem."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {participationItems.map((item) => <BlueChip key={item}>{item}</BlueChip>)}
            </div>
          </div>
          <div className="rounded-[20px] border-2 border-[#e8e0d9] p-4">
            {creationKind === "Challenge response" && (
              <div className="mb-4">
                <p className="mb-3 text-sm font-black text-[#001eff]">Challenge path</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => selectChallengePath("facilitated")} className={`rounded-[16px] border-2 p-3 text-left text-sm font-black ${createMode === "facilitated" ? "border-[#001eff] bg-[#eef0ff] text-[#001eff]" : "border-[#e8e0d9]"}`}>
                    Author-led response
                  </button>
                  <button type="button" onClick={() => selectChallengePath("co_creative", "host_curated")} className={`rounded-[16px] border-2 p-3 text-left text-sm font-black ${createMode === "co_creative" ? "border-[#ff4b4f] bg-[#fff3f6] text-[#ff4b4f]" : "border-[#e8e0d9]"}`}>
                    Open co-writing
                  </button>
                </div>
              </div>
            )}
            {createMode === "co_creative" ? (
              <div>
                <p className="mb-3 text-sm font-black text-[#ff4b4f]">Co-writing pattern</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {coCreativePatternOptions
                    .filter((option) => creationKind === "Relay thread" ? option.value === "turn_taking_relay" : option.value !== "turn_taking_relay" || creationKind === "Challenge response")
                    .map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCreatePattern(option.value)}
                        className={`min-h-[86px] rounded-[16px] border-2 p-3 text-left ${createPattern === option.value ? "border-[#ff4b4f] bg-[#fff3f6]" : "border-[#e8e0d9]"}`}
                      >
                        <span className="block text-sm font-black">{option.label}</span>
                        <span className="mt-1 block text-xs font-bold text-[#737783]">{option.description}</span>
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[16px] bg-[#eef0ff] p-3">
                  <p className="text-sm font-black text-[#001eff]">Suggestion gate</p>
                  <p className="mt-1 text-xs font-bold text-[#737783]">Comments, close readings, and possible lines stay outside the poem until accepted.</p>
                </div>
                <div className="rounded-[16px] bg-[#eef0ff] p-3">
                  <p className="text-sm font-black text-[#001eff]">Author control</p>
                  <p className="mt-1 text-xs font-bold text-[#737783]">Lock-in and publishing remain with the author or named editor.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="mt-6 h-[210px] w-full resize-none rounded-2xl border border-[#b7c4d5] p-6 text-[24px] outline-none lg:p-7 lg:text-[28px]" />
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[18px] bg-[#eef0ff] p-4">
        <p className="min-w-0 flex-1 text-sm font-bold leading-relaxed text-[#3b3d45]">Save the current text as a private Memoryline draft. It will not appear in the public feed.</p>
        <button type="button" onClick={onSaveDraftSnapshot} disabled={!draft.trim()} className="rounded-full border-2 border-[#001eff] bg-white px-5 py-2 text-sm font-black text-[#001eff] disabled:opacity-40">
          Save draft snapshot
        </button>
      </div>
      <div className="mt-7 rounded-2xl border border-[#d7d7d7] px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={tagDraft}
            onChange={(event) => setTagDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTag();
              }
            }}
            className="h-[48px] min-w-0 flex-1 rounded-full bg-[#efefef] px-6 text-[18px] font-bold outline-none"
            placeholder="add hashtag, e.g. #cyber_nostalgia"
          />
          <button type="button" onClick={addTag} className="h-[48px] rounded-full bg-[#001eff] px-7 text-[18px] font-black text-white">Add tag</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {createTags.map((tag) => (
            <button key={tag} type="button" onClick={() => removeTag(tag)} className="rounded-full border-2 border-[#001eff] px-4 py-2 text-sm font-black text-[#001eff]">
              {tag} <X size={13} className="inline" />
            </button>
          ))}
        </div>
      </div>
      <label className="mt-7 flex h-[66px] w-full max-w-[523px] cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-[#bdbdbd] text-[24px] font-black text-[#888] lg:text-[28px]">
        {backgroundImage ? (
          <span className="flex h-full w-full items-center justify-center bg-cover bg-center text-white [text-shadow:0_1px_8px_rgba(0,0,0,.55)]" style={{ backgroundImage: `linear-gradient(rgba(0,30,255,.38),rgba(0,0,80,.52)),url(${backgroundImage})` }}>
            pic background selected
          </span>
        ) : (
          "pic / GIF background"
        )}
        <input type="file" accept="image/*,.gif" className="hidden" onChange={(event) => uploadBackground(event.target.files?.[0])} />
      </label>
      {draft.trim().length > 0 && (
        <PublicationStudio
          poemText={draft}
          authorName={packageAuthorName}
          contributorNames={packageContributors}
          tags={createTags}
          templates={publicationTemplates}
          onSaveDesign={onSaveDesign}
          onLockDesign={onLockDesign}
          onExportDesign={onExportDesign}
        />
      )}
      <section className="mt-7 rounded-[24px] border-2 border-[#e8e0d9] p-5">
        <p className="font-mono text-xl font-black text-[#001eff]">Step 3 · Contract / Visibility</p>
        <p className="mt-1 text-sm font-bold text-[#737783]">{createMode === "co_creative" ? "Set who joins the co-writing process and how visible the shared draft should be." : "Set who can read and respond while the author keeps final control."}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {visibilityOptions.map((option) => (
            <button key={option.value} type="button" onClick={() => setVisibilityMode(option.value)} className={`min-h-[92px] rounded-[16px] border-2 p-3 text-left ${settings.visibilityMode === option.value ? "border-[#001eff] bg-[#eef0ff] text-[#001eff]" : "border-[#ded7cd] text-[#444]"}`}>
              <span className="block text-sm font-black">{option.label}</span>
              <span className="mt-1 block text-xs font-bold text-[#737783]">{option.description}</span>
            </button>
          ))}
        </div>
        {settings.visibilityMode === "group" && (
          <div className="mt-4 rounded-[18px] bg-[#eef0ff] p-4">
            <label className="text-sm font-black text-[#001eff]">Choose group</label>
            <select value={settings.selectedGroupId ?? ownGroups[0]?.id ?? ""} onChange={(event) => setSettings({ ...settings, selectedGroupId: event.target.value })} className="mt-2 h-12 w-full rounded-[14px] border-2 border-white bg-white px-4 font-bold outline-none focus:border-[#001eff]">
              {ownGroups.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
            </select>
          </div>
        )}
        {settings.visibilityMode === "include_people" && (
          <div className="mt-4 rounded-[18px] bg-[#fafafa] p-4">
            <p className="text-sm font-black text-[#001eff]">Visible to selected people</p>
            {personPicker("visibleUserIds")}
          </div>
        )}
        {settings.visibilityMode === "exclude_people" && (
          <div className="mt-4 rounded-[18px] bg-[#fafafa] p-4">
            <p className="text-sm font-black text-[#001eff]">Invisible to selected people</p>
            {personPicker("hiddenUserIds")}
          </div>
        )}
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="rounded-[24px] border-2 border-[#e8e0d9] p-5">
          <p className="font-mono text-xl font-black text-[#001eff]">Feedback contract</p>
          <p className="mt-1 text-xs font-bold text-[#737783]">{createMode === "co_creative" ? "For co-writing, comments are part of coordination; candidate text still needs a clear accept or lock rule." : "For author-led writing, feedback stays suggestive until the author accepts it."}</p>
          <div className="mt-4 grid gap-3">
            <button type="button" onClick={() => toggleContract("allowComments")} className={`flex min-h-[70px] items-center justify-between rounded-[16px] border-2 px-4 py-3 text-left ${settings.allowComments ? "border-[#001eff] bg-[#eef0ff]" : "border-[#ded7cd]"}`}>
              <span><span className="block font-black">Allow comments</span><span className="mt-1 block text-xs font-bold text-[#737783]">Readers can respond; AI can organize feedback.</span></span>
              <span className={`grid h-5 w-5 place-items-center rounded border border-[#001eff] ${settings.allowComments ? "bg-[#001eff]" : "bg-white"}`}>{settings.allowComments && <Check size={14} className="text-white" />}</span>
            </button>
            <button type="button" onClick={() => toggleContract("allowForward")} className={`flex min-h-[70px] items-center justify-between rounded-[16px] border-2 px-4 py-3 text-left ${settings.allowForward ? "border-[#001eff] bg-[#eef0ff]" : "border-[#ded7cd]"}`}>
              <span><span className="block font-black">Allow forwarding / branch</span><span className="mt-1 block text-xs font-bold text-[#737783]">Others may forward, quote, or build from this work.</span></span>
              <span className={`grid h-5 w-5 place-items-center rounded border border-[#001eff] ${settings.allowForward ? "bg-[#001eff]" : "bg-white"}`}>{settings.allowForward && <Check size={14} className="text-white" />}</span>
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border-2 border-[#e8e0d9] p-5">
          <p className="font-mono text-xl font-black text-[#001eff]">Attribution policy</p>
          <p className="mt-1 text-xs font-bold text-[#737783]">{createMode === "co_creative" ? "Co-writing can use multi-signature, collective names, or anonymous collective credit." : "Author-led work can credit helpers without turning them into co-authors."}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {attributionOptions.map((option) => (
              <button key={option.value} type="button" onClick={() => setSettings({ ...settings, attributionMode: option.value })} className={`min-h-[86px] rounded-[16px] border-2 p-3 text-left ${settings.attributionMode === option.value ? "border-[#001eff] bg-[#eef0ff] text-[#001eff]" : "border-[#ded7cd] text-[#444]"}`}>
                <span className="block text-sm font-black">{option.label}</span>
                <span className="mt-1 block text-xs font-bold text-[#737783]">{option.description}</span>
              </button>
            ))}
          </div>
          {settings.attributionMode === "pen_name" && (
            <input value={settings.penName} onChange={(event) => setSettings({ ...settings, penName: event.target.value })} className="mt-4 h-12 w-full rounded-[14px] border-2 border-[#e8e0d9] px-4 font-bold outline-none focus:border-[#001eff]" placeholder="Enter pen name" />
          )}
          <div className="mt-4 rounded-[18px] bg-[#fafafa] p-4">
            <p className="text-sm font-black text-[#001eff]">Co-authors / multi-signature</p>
            <p className="mt-1 text-xs font-bold text-[#737783]">Selected people will be stored as co-authors for this version.</p>
            {personPicker("coAuthorIds")}
          </div>
        </div>
      </section>
      <p className="mt-6 rounded-2xl bg-[#eef0ff] px-5 py-4 text-base font-black text-[#001eff]">
        {createMode === "co_creative" ? "Co-writing means contributors can enter the work through a visible contract. Pattern, credit, and lock rules keep shared authorship legible." : "Author-led feedback means others can help around the poem, while accepted text, lock-in, and publication stay under author control."}
      </p>
      <button className="mt-8 h-[58px] w-full rounded-2xl bg-[#f43f5e] text-[28px] font-black text-white lg:text-[32px]">
        {creationKind === "Fragment" ? "Save Fragment" : settings.visibilityMode === "private" ? "Save Draft" : "Publish / Start"}
      </button>
    </form>
  );
}

function GroupChatPage({
  space,
  posts,
  groupPosts,
  topics,
  messages,
  activeTopicId,
  setActiveTopicId,
  chatDraft,
  setChatDraft,
  quotedMessageId,
  setQuotedMessageId,
  addMention,
  sendMessage,
  topicTitleDraft,
  setTopicTitleDraft,
  topicStarterDraft,
  setTopicStarterDraft,
  topicMode,
  setTopicMode,
  topicPostId,
  setTopicPostId,
  startTopic,
  startGroupDraft,
  openPost,
  navigate,
  searchInput,
  setSearchInput,
  runSearch,
}: {
  space: Space;
  posts: Post[];
  groupPosts: Post[];
  topics: GroupTopic[];
  messages: GroupChatMessage[];
  activeTopicId: string;
  setActiveTopicId: (id: string) => void;
  chatDraft: string;
  setChatDraft: (value: string) => void;
  quotedMessageId?: string;
  setQuotedMessageId: (id: string | undefined) => void;
  addMention: (handle: string) => void;
  sendMessage: (event: FormEvent) => void;
  topicTitleDraft: string;
  setTopicTitleDraft: (value: string) => void;
  topicStarterDraft: string;
  setTopicStarterDraft: (value: string) => void;
  topicMode: TopicComposerMode;
  setTopicMode: (mode: TopicComposerMode) => void;
  topicPostId: string;
  setTopicPostId: (id: string) => void;
  startTopic: (event: FormEvent) => void;
  startGroupDraft: (spaceId: string, channelId?: string) => void;
  openPost: (id: string) => void;
  navigate: (view: View) => void;
} & SearchProps) {
  const memberAuthors = space.members
    .map((member) => ({
      ...member,
      author: Object.values(authors).find((author) => author.id === member.userId),
    }))
    .filter((member) => member.author);
  const messageMap = new Map(messages.map((message) => [message.id, message]));
  const activeTopic = topics.find((topic) => topic.id === activeTopicId);
  const visibleMessages = activeTopicId ? messages.filter((message) => message.topicId === activeTopicId) : messages;
  const selectablePosts = groupPosts.length > 0 ? groupPosts : posts.slice(0, 6);
  const forwardedPosts = selectablePosts.filter((post) => topics.some((topic) => topic.postId === post.id) || messages.some((message) => message.postId === post.id));

  return (
    <div>
      <BrandBar navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />
      <button type="button" onClick={() => navigate("spaces")} className="mb-5 flex items-center gap-4 font-mono text-[24px] font-black lg:text-[27px]">{"<"} back to groups</button>

      <header className="mb-5 rounded-[28px] border-2 border-[#001eff] bg-white p-5 lg:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="font-mono text-sm font-black uppercase text-[#001eff]">{space.kind.replace("_", " ")} group chat</p>
            <h1 className="mt-2 text-[36px] font-black leading-none text-[#001eff] lg:text-[46px]">{space.name}</h1>
            <p className="mt-3 max-w-[760px] text-base font-bold text-[#737783]">{space.description}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
            <MetricBlock value={String(space.members.length)} label="members" />
            <MetricBlock value={String(topics.length)} label="topics" />
            <MetricBlock value={String(messages.length)} label="messages" />
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_310px]">
        <aside className="grid content-start gap-4">
          <section className="rounded-[24px] border-2 border-[#001eff] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-mono text-xl font-black text-[#001eff]">Topic threads</p>
              <Pin size={18} className="text-[#001eff]" />
            </div>
            <button type="button" onClick={() => setActiveTopicId("")} className={`mb-2 w-full rounded-[16px] px-4 py-3 text-left text-sm font-black ${!activeTopicId ? "bg-[#001eff] text-white" : "bg-[#eef0ff] text-[#001eff]"}`}>
              All group chat
            </button>
            <div className="grid gap-2">
              {topics.map((topic) => (
                <button key={topic.id} type="button" onClick={() => setActiveTopicId(topic.id)} className={`rounded-[16px] p-3 text-left ${activeTopicId === topic.id ? "bg-[#001eff] text-white" : "bg-[#eef0ff] text-[#001eff]"}`}>
                  <span className="text-xs font-black uppercase opacity-80">{topicTypeLabel(topic.type)}</span>
                  <span className="mt-1 block text-sm font-black leading-snug">{topic.title}</span>
                  <span className="mt-2 block text-xs font-bold opacity-75">{formatDate(topic.createdAt)} · {topic.unread} unread</span>
                </button>
              ))}
            </div>
          </section>

          <form onSubmit={startTopic} className="rounded-[24px] border-2 border-[#e8e0d9] p-4">
            <p className="font-mono text-xl font-black text-[#001eff]"><PlusCircle size={18} className="mr-1 inline" /> Start topic</p>
            <div className="mt-3 grid gap-2">
              {topicModes.map((mode) => (
                <button key={mode.value} type="button" onClick={() => setTopicMode(mode.value)} className={`rounded-[14px] border-2 px-3 py-2 text-left text-xs font-black ${topicMode === mode.value ? "border-[#001eff] bg-[#eef0ff] text-[#001eff]" : "border-[#e8e0d9] text-[#3b3d45]"}`}>
                  {mode.label}
                  <span className="mt-1 block font-bold text-[#737783]">{mode.hint}</span>
                </button>
              ))}
            </div>
            <input value={topicTitleDraft} onChange={(event) => setTopicTitleDraft(event.target.value)} className="mt-3 h-11 w-full rounded-[14px] border-2 border-[#e8e0d9] px-3 text-sm font-bold outline-none focus:border-[#001eff]" placeholder="topic title" />
            {(topicMode === "post_forward" || topicMode === "co_creation_call") && (
              <select value={topicPostId} onChange={(event) => setTopicPostId(event.target.value)} className="mt-3 h-11 w-full rounded-[14px] border-2 border-[#e8e0d9] bg-white px-3 text-sm font-bold outline-none focus:border-[#001eff]">
                {selectablePosts.map((post) => <option key={post.id} value={post.id}>{shorten(post.body, 54)}</option>)}
              </select>
            )}
            <textarea value={topicStarterDraft} onChange={(event) => setTopicStarterDraft(event.target.value)} className="mt-3 min-h-[92px] w-full resize-y rounded-[14px] border-2 border-[#e8e0d9] p-3 text-sm font-bold outline-none focus:border-[#001eff]" placeholder="first message, prompt, or call for co-creation" />
            <button className="mt-3 w-full rounded-full bg-[#001eff] px-5 py-2.5 text-sm font-black text-white">
              Create topic
            </button>
          </form>
        </aside>

        <section className="min-w-0 rounded-[28px] border-2 border-[#001eff] bg-white p-4 lg:p-5">
          <div className="mb-4 flex flex-col justify-between gap-4 border-b-2 border-[#e8e0d9] pb-4 lg:flex-row lg:items-center">
            <div>
              <p className="font-mono text-sm font-black uppercase text-[#001eff]">{activeTopic ? topicTypeLabel(activeTopic.type) : "Whole group"}</p>
              <h2 className="text-2xl font-black leading-tight">{activeTopic?.title ?? "All group chat"}</h2>
              <p className="mt-1 text-sm font-bold text-[#737783]">{activeTopic?.starter ?? "A shared room for quick feedback, coordination, and casual conversation."}</p>
            </div>
            {activeTopic && (
              <button type="button" onClick={() => startGroupDraft(space.id)} className="rounded-full border-2 border-[#ff4b4f] px-5 py-2 text-sm font-black text-[#ff4b4f]">
                <Megaphone size={15} className="mr-1 inline" /> Start co-writing draft
              </button>
            )}
          </div>

          <div className="grid max-h-[620px] gap-3 overflow-y-auto pr-1">
            {visibleMessages.map((message) => (
              <GroupMessageRow
                key={message.id}
                message={message}
                quote={message.quoteMessageId ? messageMap.get(message.quoteMessageId) : undefined}
                post={message.postId ? posts.find((post) => post.id === message.postId) : undefined}
                setQuotedMessageId={setQuotedMessageId}
                openPost={openPost}
              />
            ))}
            {visibleMessages.length === 0 && (
              <div className="rounded-[22px] bg-[#eef0ff] p-6 text-center font-black text-[#001eff]">No messages in this topic yet.</div>
            )}
          </div>

          <form onSubmit={sendMessage} className="mt-4 rounded-[22px] bg-[#eef0ff] p-3">
            {quotedMessageId && (
              <div className="mb-3 flex items-start justify-between gap-3 rounded-[16px] bg-white p-3 text-sm font-bold">
                <span><Reply size={14} className="mr-1 inline text-[#001eff]" /> Replying to {messageMap.get(quotedMessageId)?.author.name}: {shorten(messageMap.get(quotedMessageId)?.text ?? "", 78)}</span>
                <button type="button" onClick={() => setQuotedMessageId(undefined)} className="font-black text-[#ff4b4f]">Clear</button>
              </div>
            )}
            <div className="mb-3 flex gap-2 overflow-x-auto">
              {memberAuthors.map((member) => member.author && (
                <button key={member.userId} type="button" onClick={() => addMention(member.author!.handle)} className="whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#001eff]">
                  <AtSign size={13} className="mr-1 inline" /> {member.author.handle}
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
              <textarea value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} className="min-h-[72px] resize-y rounded-[18px] border-2 border-white bg-white p-3 text-sm font-bold outline-none focus:border-[#001eff]" placeholder="Message the group, quote a reply, or mention @someone..." />
              <button className="rounded-[18px] bg-[#001eff] px-5 py-3 font-black text-white">
                <Send size={16} className="mr-1 inline" /> Send
              </button>
            </div>
          </form>
        </section>

        <aside className="grid content-start gap-4">
          <section className="rounded-[24px] border-2 border-[#001eff] p-4">
            <p className="font-mono text-xl font-black text-[#001eff]"><Users size={18} className="mr-1 inline" /> Members</p>
            <div className="mt-3 grid gap-3">
              {memberAuthors.map((member) => member.author && (
                <div key={member.userId} className="flex items-center gap-3 rounded-[16px] bg-[#eef0ff] p-3">
                  <Avatar author={member.author} muted />
                  <div className="min-w-0">
                    <p className="truncate font-black">{member.author.name}</p>
                    <p className="text-xs font-bold text-[#737783]">{member.role} · {member.badges.join(", ")}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border-2 border-[#e8e0d9] p-4">
            <p className="font-mono text-xl font-black text-[#001eff]">Forwarded posts</p>
            <div className="mt-3 grid gap-3">
              {(forwardedPosts.length ? forwardedPosts : groupPosts.slice(0, 3)).map((post) => (
                <button key={post.id} type="button" onClick={() => openPost(post.id)} className="rounded-[16px] bg-[#eef0ff] p-3 text-left">
                  <p className="text-sm font-black text-[#001eff]">{collaborationLabel(post)}{isCoCreativePost(post) ? ` · ${patternLabel(getCoCreativePattern(post))}` : ""} · {post.stage}</p>
                  <p className="mt-1 text-sm font-bold">{shorten(post.body, 70)}</p>
                </button>
              ))}
              {groupPosts.length === 0 && <p className="text-sm font-bold text-[#737783]">No group posts yet.</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function GroupMessageRow({
  message,
  quote,
  post,
  setQuotedMessageId,
  openPost,
}: {
  message: GroupChatMessage;
  quote?: GroupChatMessage;
  post?: Post;
  setQuotedMessageId: (id: string | undefined) => void;
  openPost: (id: string) => void;
}) {
  return (
    <article className={`rounded-[22px] border-2 p-4 ${message.author.id === currentUser.id ? "border-[#001eff] bg-[#f7f8ff]" : "border-[#e8e0d9] bg-white"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar author={message.author} muted={message.author.id !== currentUser.id} />
          <div className="min-w-0">
            <p className="truncate font-black">{message.author.name}</p>
            <p className="text-xs font-bold text-[#737783]">{formatDate(message.createdAt)}</p>
          </div>
        </div>
        <button type="button" onClick={() => setQuotedMessageId(message.id)} className="rounded-full bg-[#eef0ff] px-3 py-1 text-xs font-black text-[#001eff]">
          <Reply size={13} className="mr-1 inline" /> Quote
        </button>
      </div>
      {quote && (
        <div className="mt-3 rounded-[16px] border-l-4 border-[#001eff] bg-[#eef0ff] p-3 text-sm font-bold text-[#3b3d45]">
          {quote.author.name}: {shorten(quote.text, 90)}
        </div>
      )}
      <div className="mt-3 text-[17px] font-bold leading-relaxed">
        <HighlightedMentions text={message.text} />
      </div>
      {post && (
        <button type="button" onClick={() => openPost(post.id)} className="mt-4 w-full rounded-[18px] border-2 border-[#001eff] bg-white p-4 text-left">
          <p className="text-xs font-black uppercase text-[#001eff]">Forwarded post</p>
          <p className="mt-1 font-black">{shorten(post.body, 110)}</p>
          <p className="mt-2 text-xs font-bold text-[#737783]">{post.author.handle} · {collaborationLabel(post)}{isCoCreativePost(post) ? ` / ${patternLabel(getCoCreativePattern(post))}` : ""} · {post.tags.slice(0, 3).join(" ")}</p>
        </button>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-[#737783]">
        <span>{message.reactions} reactions</span>
        {message.mentions.map((mention) => <span key={mention} className="text-[#001eff]">{mention}</span>)}
      </div>
    </article>
  );
}

function HighlightedMentions({ text }: { text: string }) {
  const parts = text.split(/(@[A-Za-z0-9_.-]+)/g);
  return (
    <>
      {parts.map((part, index) => part.startsWith("@") ? (
        <span key={`${part}-${index}`} className="rounded-full bg-[#eef0ff] px-1.5 py-0.5 font-black text-[#001eff]">{part}</span>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      ))}
    </>
  );
}

function topicTypeLabel(type: GroupTopicType) {
  const labels: Record<GroupTopicType, string> = {
    poetry_discussion: "Poetry topic",
    free_chat: "Free chat",
    post_forward: "Forwarded post",
    co_creation_call: "Co-creation call",
  };
  return labels[type];
}

function DetailPage(props: {
  post: Post;
  comments: Comment[];
  suggestionsByComment: Map<string, Suggestion[]>;
  poemLines: PoemLine[];
  commentDraft: string;
  turnDraft: string;
  activeSuggestionCount: number;
  contributions: Contribution[];
  space?: Space;
  channel?: Channel;
  sourceFragment?: Fragment;
  publicationDesign?: PublicationDesign;
  publicationTemplates: DesignTemplate[];
  openContext: () => void;
  setCommentDraft: (value: string) => void;
  setTurnDraft: (value: string) => void;
  addComment: (event: FormEvent) => void;
  submitTurnLine: (event: FormEvent) => void;
  likeComment: (id: string) => void;
  addSuggestionToPoem: (suggestion: Suggestion) => void;
  editSuggestion: (suggestion: Suggestion) => void;
  updateSuggestion: (id: string, text: string) => void;
  ignoreSuggestion: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  lockVersion: (postId: string) => void;
  lockLine: (postId: string, lineId: string) => void;
  saveAuthorVersion: (postId: string, lines: EditablePoemLine[]) => void;
  onSaveDesign: (design: PublicationDesign) => void;
  onLockDesign: (design: PublicationDesign) => void;
  onExportDesign: (design: PublicationDesign, type: ExportRecord["type"], filename: string) => void;
  onSaveDraftSnapshot: () => void;
  openMemoryline: (workId: string) => void;
  openHistory: (id: string) => void;
  navigate: (view: View) => void;
} & SearchProps) {
  const {
    post,
    comments,
    suggestionsByComment,
    poemLines,
    commentDraft,
    turnDraft,
    activeSuggestionCount,
    contributions,
    space,
    channel,
    sourceFragment,
    publicationDesign,
    publicationTemplates,
    openContext,
    setCommentDraft,
    setTurnDraft,
    addComment,
    submitTurnLine,
    likeComment,
    addSuggestionToPoem,
    editSuggestion,
    updateSuggestion,
    ignoreSuggestion,
    toggleLike,
    toggleSave,
    lockVersion,
    lockLine,
    saveAuthorVersion,
    onSaveDesign,
    onLockDesign,
    onExportDesign,
    onSaveDraftSnapshot,
    openMemoryline,
    openHistory,
    navigate,
    searchInput,
    setSearchInput,
    runSearch,
  } = props;
  const locked = post.lockState.status === "locked" || post.lockState.status === "published";
  const [showPublicationStudio, setShowPublicationStudio] = useState(false);
  const canPackage = locked || post.stage === "Final Version";
  const detailPoemText = poemLines.length > 0 ? poemLines.map((line) => line.text).join("\n") : post.lines.join("\n");
  const detailContributorNames = Array.from(new Set([
    post.attributionName ?? post.author.name,
    ...post.authorIds
      .map((id) => Object.values(authors).find((author) => author.id === id)?.name)
      .filter((name): name is string => Boolean(name)),
  ]));
  const ensurePublicationDesign = () => {
    const next = publicationDesign ?? makePublicationDesign({
      workId: post.id,
      poemText: detailPoemText,
      authorName: post.attributionName ?? post.author.name,
      contributorNames: detailContributorNames,
      tags: post.tags,
      template: publicationTemplates[0],
    });
    if (!publicationDesign) onSaveDesign(next);
    return next;
  };
  const exportDetailDesign = async (type: ExportRecord["type"]) => {
    const target = ensurePublicationDesign();
    const filename = type === "jpg" ? await publicationExportService.exportJpg(target) : await publicationExportService.exportPdf(target);
    onExportDesign(target, type, filename);
  };
  return (
    <div>
      <BrandBar showSearch navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />
      <button type="button" onClick={space || channel || sourceFragment ? openContext : () => navigate("home")} className="mb-5 flex items-center gap-4 font-mono text-[24px] font-black lg:text-[27px]">
        {"<"} {space || channel || sourceFragment ? "back to space" : "back to home"}
      </button>
      <div className="grid gap-5 lg:grid-cols-[325px_minmax(0,1fr)]">
        <section>
          <PoemCard post={post} openPost={() => undefined} openQuote={() => (post.quoteAllowed ? navigate("quote") : undefined)} toggleLike={toggleLike} toggleSave={toggleSave} forcePoem />
          <div className="mt-5 grid gap-3 rounded-[22px] border-2 border-[#001eff] p-4">
            <p className="text-[22px] font-black text-[#001eff]">Workbench</p>
            <StatusPills post={post} />
            <button type="button" onClick={() => openMemoryline(post.id)} className="rounded-full border-2 border-[#001eff] px-5 py-2 text-left font-black text-[#001eff]">Open Memoryline</button>
            <button type="button" onClick={onSaveDraftSnapshot} disabled={locked} className="rounded-full border-2 border-[#ff4b4f] px-5 py-2 text-left font-black text-[#ff4b4f] disabled:opacity-40">Save draft snapshot</button>
            <button type="button" onClick={() => lockVersion(post.id)} disabled={locked} className="rounded-full bg-[#001eff] px-5 py-2 text-left font-black text-white disabled:bg-[#aeb2d3]">
              {locked ? "Version locked" : "Lock version"}
            </button>
            {canPackage && (
              <div className="grid gap-2 rounded-[18px] bg-[#eef0ff] p-3">
                <button type="button" onClick={() => setShowPublicationStudio((open) => !open)} className="rounded-full bg-[#ff4b4f] px-5 py-2 text-left font-black text-white">
                  {showPublicationStudio ? "Close Publication Studio" : "Open Publication Studio"}
                </button>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <button type="button" onClick={() => exportDetailDesign("jpg")} className="rounded-full border-2 border-[#001eff] px-4 py-2 text-sm font-black text-[#001eff]">Export JPG</button>
                  <button type="button" onClick={() => exportDetailDesign("pdf")} className="rounded-full border-2 border-black px-4 py-2 text-sm font-black text-black">Export PDF</button>
                </div>
              </div>
            )}
          </div>
          {(space || channel || sourceFragment) && <OriginPanel post={post} space={space} channel={channel} sourceFragment={sourceFragment} openContext={openContext} />}
        </section>
        {!isCoCreativePost(post) ? (
          <FacilitatedWorkbench
            post={post}
            comments={comments}
            suggestionsByComment={suggestionsByComment}
            commentDraft={commentDraft}
            activeSuggestionCount={activeSuggestionCount}
            contributions={contributions}
            locked={locked}
            setCommentDraft={setCommentDraft}
            addComment={addComment}
            likeComment={likeComment}
            addSuggestionToPoem={addSuggestionToPoem}
            editSuggestion={editSuggestion}
            updateSuggestion={updateSuggestion}
            ignoreSuggestion={ignoreSuggestion}
            navigate={navigate}
          />
        ) : (
          <CoCreativeWorkbench
            post={post}
            poemLines={poemLines}
            comments={comments}
            commentDraft={commentDraft}
            turnDraft={turnDraft}
            locked={locked}
            setTurnDraft={setTurnDraft}
            setCommentDraft={setCommentDraft}
            submitTurnLine={submitTurnLine}
            addComment={addComment}
            likeComment={likeComment}
            lockLine={lockLine}
            navigate={navigate}
          />
        )}
      </div>
      {!isCoCreativePost(post) && !locked && (
        <EditPoemPanel
          title="Edit poem"
          subtitle="Review accepted reader lines, adjust the order, then save this version."
          badge="Author control"
          lines={poemLines.map((line) => ({ id: line.id, text: line.text, by: line.by }))}
          primaryAction="Save version"
          secondaryAction="Open Memoryline"
          onPrimary={(nextLines) => saveAuthorVersion(post.id, nextLines)}
          onSecondary={() => openMemoryline(post.id)}
          onSaveDraftSnapshot={onSaveDraftSnapshot}
        />
      )}
      {showPublicationStudio && (
        <PublicationStudio
          workId={post.id}
          poemText={detailPoemText}
          authorName={post.attributionName ?? post.author.name}
          contributorNames={detailContributorNames}
          tags={post.tags}
          templates={publicationTemplates}
          initialDesign={publicationDesign}
          onSaveDesign={onSaveDesign}
          onLockDesign={onLockDesign}
          onExportDesign={onExportDesign}
        />
      )}
    </div>
  );
}

function OriginPanel({
  post,
  space,
  channel,
  sourceFragment,
  openContext,
}: {
  post: Post;
  space?: Space;
  channel?: Channel;
  sourceFragment?: Fragment;
  openContext: () => void;
}) {
  let pathway = "Author-led feedback";
  if (isCoCreativePost(post)) pathway = isRelayPost(post) ? (channel?.kind === "challenge" ? "Challenge relay pattern" : "Turn-taking relay pattern") : `Co-writing · ${patternLabel(getCoCreativePattern(post))}`;
  else if (sourceFragment) pathway = "Fragment-based brainstorm";
  else if (space) pathway = "Group feedback";
  return (
    <div className="mt-5 rounded-[22px] border-2 border-[#e8e0d9] p-4">
      <p className="font-mono text-xl font-black text-[#001eff]">Origin / Workflow</p>
      <div className="mt-3 grid gap-3 text-sm font-bold">
        <div className="rounded-[16px] bg-[#eef0ff] p-3">
          <p className="text-xs font-black uppercase text-[#001eff]">Pathway</p>
          <p className="mt-1">{pathway}</p>
        </div>
        {space && (
          <div className="rounded-[16px] border border-[#e8e0d9] p-3">
            <p className="text-xs font-black uppercase text-[#737783]">Group</p>
            <p className="mt-1">{space.name}</p>
            <p className="mt-1 text-xs text-[#737783]">{space.kind.replace("_", " ")} · {space.visibility.split("_").join(" ")}</p>
          </div>
        )}
        {channel && (
          <div className="rounded-[16px] border border-[#e8e0d9] p-3">
            <p className="text-xs font-black uppercase text-[#737783]">Channel</p>
            <p className="mt-1">{channel.title}</p>
            <p className="mt-1 text-xs text-[#737783]">{channel.kind.replace("_", " ")} · {channelModeLabel(channel)}</p>
          </div>
        )}
        {sourceFragment && (
          <div className="rounded-[16px] border border-[#e8e0d9] p-3">
            <p className="text-xs font-black uppercase text-[#737783]">Source fragment</p>
            <p className="mt-1 text-[#001eff]">"{sourceFragment.text}"</p>
            <p className="mt-1 text-xs text-[#737783]">{sourceFragment.anonymous ? "Anonymous source" : sourceFragment.creator?.handle ?? "Credited source"}</p>
          </div>
        )}
      </div>
      <button type="button" onClick={openContext} className="mt-4 rounded-full bg-[#001eff] px-5 py-2 text-sm font-black text-white">
        Open source space
      </button>
    </div>
  );
}

function FacilitatedWorkbench(props: {
  post: Post;
  comments: Comment[];
  suggestionsByComment: Map<string, Suggestion[]>;
  commentDraft: string;
  activeSuggestionCount: number;
  contributions: Contribution[];
  locked: boolean;
  setCommentDraft: (value: string) => void;
  addComment: (event: FormEvent) => void;
  likeComment: (id: string) => void;
  addSuggestionToPoem: (suggestion: Suggestion) => void;
  editSuggestion: (suggestion: Suggestion) => void;
  updateSuggestion: (id: string, text: string) => void;
  ignoreSuggestion: (id: string) => void;
  navigate: (view: View) => void;
}) {
  const { post, comments, suggestionsByComment, commentDraft, activeSuggestionCount, contributions, locked, setCommentDraft, addComment, likeComment, addSuggestionToPoem, editSuggestion, updateSuggestion, ignoreSuggestion, navigate } = props;
  const allSuggestions = comments.flatMap((comment) => suggestionsByComment.get(comment.id) ?? []);
  return (
    <section className="rounded-t-[18px] bg-gradient-to-b from-[#c6dbff] to-white p-4">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[21px] font-black text-[#001eff]">Author-led Workbench</h1>
          <p className="text-sm font-bold text-[#737783]">{activeSuggestionCount} open AI-organized suggestions · {contributions.length} contribution records</p>
        </div>
        <FeedbackContractPills contract={post.feedbackContract} />
      </div>
      {allSuggestions.length > 0 && (
        <div className="mb-6 grid gap-3 rounded-[22px] border-2 border-[#001eff] bg-white p-4">
          <p className="font-black text-[#001eff]">AI organizes reader responses. Author decides what enters the poem.</p>
          {allSuggestions.map((suggestion) => (
            <AISuggestion key={suggestion.id} suggestion={suggestion} disabled={locked} addSuggestionToPoem={addSuggestionToPoem} editSuggestion={editSuggestion} updateSuggestion={updateSuggestion} ignoreSuggestion={ignoreSuggestion} />
          ))}
        </div>
      )}
      <form onSubmit={addComment} className="mb-9 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Avatar author={currentUser} />
        <input disabled={!post.repliesOpen} value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} className="h-[46px] min-w-0 flex-1 rounded-full bg-white px-8 text-sm outline-none disabled:opacity-60" placeholder={post.repliesOpen ? feedbackPlaceholder(post.feedbackContract) : "comments closed"} />
        <button disabled={!post.repliesOpen} className="h-[46px] rounded-full bg-[#001eff] px-6 font-black text-white disabled:bg-[#aeb2d3]">comments</button>
      </form>
      <div className="grid gap-6">
        {comments.map((comment) => (
          <CommentRow key={comment.id} comment={comment} suggestions={suggestionsByComment.get(comment.id) ?? []} showAuthorTools={!locked} likeComment={likeComment} addSuggestionToPoem={addSuggestionToPoem} editSuggestion={editSuggestion} updateSuggestion={updateSuggestion} ignoreSuggestion={ignoreSuggestion} navigate={navigate} />
        ))}
      </div>
    </section>
  );
}

function CoCreativeWorkbench(props: {
  post: Post;
  poemLines: PoemLine[];
  comments: Comment[];
  commentDraft: string;
  turnDraft: string;
  locked: boolean;
  setTurnDraft: (value: string) => void;
  setCommentDraft: (value: string) => void;
  submitTurnLine: (event: FormEvent) => void;
  addComment: (event: FormEvent) => void;
  likeComment: (id: string) => void;
  lockLine: (postId: string, lineId: string) => void;
  navigate: (view: View) => void;
}) {
  const { post, poemLines, comments, commentDraft, turnDraft, locked, setTurnDraft, setCommentDraft, submitTurnLine, addComment, likeComment, lockLine, navigate } = props;
  const pattern = getCoCreativePattern(post) ?? "host_curated";
  const [candidateStatus, setCandidateStatus] = useState<Record<string, "proposed" | "accepted" | "editing" | "declined">>({});
  const [sharedDraftLines, setSharedDraftLines] = useState(poemLines.map((line) => line.text));
  if (pattern === "turn_taking_relay") {
    return (
      <TurnTakingWorkbench
        post={post}
        poemLines={poemLines}
        comments={comments}
        commentDraft={commentDraft}
        turnDraft={turnDraft}
        locked={locked}
        setTurnDraft={setTurnDraft}
        setCommentDraft={setCommentDraft}
        submitTurnLine={submitTurnLine}
        addComment={addComment}
        likeComment={likeComment}
        lockLine={lockLine}
        navigate={navigate}
      />
    );
  }
  const participants = post.authorIds
    .map((id) => Object.values(authors).find((author) => author.id === id))
    .filter((author): author is Author => Boolean(author));
  const candidateLines = comments.length > 0
    ? comments.slice(0, 4).map((comment) => ({ id: comment.id, text: comment.text, author: comment.author }))
    : [
        { id: `${post.id}-candidate-1`, text: "Add one image that everyone can return to.", author: authors.lin },
        { id: `${post.id}-candidate-2`, text: "Keep the final line open enough for another voice.", author: authors.jia },
      ];

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
      <div className="rounded-[26px] border-2 border-[#ff4b4f] bg-white p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-black text-[#ff4b4f]">Co-writing Workbench</h1>
            <p className="mt-1 text-sm font-bold text-[#737783]">{patternLabel(pattern)} pattern · contributions enter through a visible contract.</p>
          </div>
          <span className="rounded-full bg-[#ff4b4f] px-4 py-2 text-sm font-black text-white">{locked ? "locked shared version" : "shared draft"}</span>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-[18px] bg-[#fff3f6] p-4">
            <p className="text-sm font-black text-[#ff4b4f]">Contract</p>
            <p className="mt-2 text-xs font-bold leading-relaxed text-[#737783]">Candidate text can be accepted, revised, declined, or locked by the agreed editor.</p>
          </div>
          <div className="rounded-[18px] bg-[#eef0ff] p-4">
            <p className="text-sm font-black text-[#001eff]">Roles</p>
            <p className="mt-2 text-xs font-bold leading-relaxed text-[#737783]">{participants.length} named participants · host-curated decisions.</p>
          </div>
          <div className="rounded-[18px] bg-[#f7f7f7] p-4">
            <p className="text-sm font-black text-[#111]">Attribution</p>
            <p className="mt-2 text-xs font-bold leading-relaxed text-[#737783]">{post.attributionPolicy.collectiveName ?? "Collective credit"} with consent before publishing.</p>
          </div>
        </div>

        {pattern === "shared_editing" ? (
          <div className="rounded-[22px] border-2 border-[#001eff] bg-[#eef0ff] p-4">
            <p className="mb-3 font-black text-[#001eff]">Shared editing room</p>
            <div className="grid gap-3">
              {sharedDraftLines.map((line, index) => (
                <textarea
                  key={`${post.id}-shared-${index}`}
                  value={line}
                  disabled={locked}
                  onChange={(event) => setSharedDraftLines((current) => current.map((item, lineIndex) => (lineIndex === index ? event.target.value : item)))}
                  className="min-h-[74px] resize-y rounded-[16px] border-2 border-white bg-white p-3 text-base font-bold outline-none focus:border-[#001eff] disabled:opacity-60"
                />
              ))}
            </div>
            <p className="mt-3 text-xs font-bold text-[#737783]">Direct edits are local mock state for now; a future backend should write each edit to VersionEvent.</p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-[22px] border-2 border-[#e8e0d9] p-4">
              <p className="mb-3 font-black text-[#001eff]">Candidate contribution board</p>
              <div className="grid gap-3">
                {candidateLines.map((candidate) => {
                  const status = candidateStatus[candidate.id] ?? "proposed";
                  return (
                    <article key={candidate.id} className="rounded-[18px] bg-[#fafafa] p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-[#eef0ff] px-3 py-1 text-xs font-black text-[#001eff]">{candidate.author.handle}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${status === "accepted" ? "bg-[#001eff] text-white" : status === "declined" ? "bg-[#ded7cd] text-[#737783]" : "bg-[#fff3f6] text-[#ff4b4f]"}`}>{status}</span>
                      </div>
                      <p className="text-base font-black leading-snug">{candidate.text}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" disabled={locked} onClick={() => setCandidateStatus((current) => ({ ...current, [candidate.id]: "accepted" }))} className="rounded-full bg-[#001eff] px-3 py-1 text-xs font-black text-white disabled:opacity-35">Accept</button>
                        <button type="button" disabled={locked} onClick={() => setCandidateStatus((current) => ({ ...current, [candidate.id]: "editing" }))} className="rounded-full border-2 border-[#001eff] px-3 py-1 text-xs font-black text-[#001eff] disabled:opacity-35">Edit</button>
                        <button type="button" disabled={locked} onClick={() => setCandidateStatus((current) => ({ ...current, [candidate.id]: "declined" }))} className="rounded-full border-2 border-[#ded7cd] px-3 py-1 text-xs font-black text-[#737783] disabled:opacity-35">Decline</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
            <aside className="rounded-[22px] bg-[#fff3f6] p-4">
              <p className="font-black text-[#ff4b4f]">Pinned ideas</p>
              <div className="mt-3 grid gap-2">
                {post.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#ff4b4f]">{tag}</span>)}
                <span className="rounded-[14px] bg-white p-3 text-xs font-bold text-[#737783]">Host can pin images, turns, constraints, or favorite candidate lines here.</span>
              </div>
            </aside>
          </div>
        )}

        <form onSubmit={submitTurnLine} className="mt-6 rounded-[22px] bg-[#eef0ff] p-4">
          <label className="mb-3 block font-black text-[#001eff]">{pattern === "shared_editing" ? "Propose a version note" : "Submit candidate text"}</label>
          <textarea value={turnDraft} onChange={(event) => setTurnDraft(event.target.value)} disabled={locked} className="min-h-[100px] w-full resize-y rounded-[18px] border-2 border-white p-4 text-lg font-bold outline-none focus:border-[#001eff] disabled:opacity-60" placeholder="Offer a line, title, image, or structural move..." />
          <button disabled={locked || !turnDraft.trim()} className="mt-3 rounded-full bg-[#001eff] px-6 py-3 font-black text-white disabled:bg-[#aeb2d3]">Submit to shared work</button>
        </form>

        <form onSubmit={addComment} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Avatar author={currentUser} />
          <input value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} className="h-[46px] min-w-0 flex-1 rounded-full bg-[#efefef] px-8 text-sm outline-none" placeholder="coordinate without changing the shared text" />
          <button className="h-[46px] rounded-full bg-[#001eff] px-6 font-black text-white">comment</button>
        </form>
      </div>

      <aside className="rounded-[26px] border-2 border-[#001eff] p-5">
        <p className="font-mono text-2xl font-black text-[#001eff]">Contribution board</p>
        <div className="mt-4 grid gap-3">
          {participants.map((author, index) => (
            <div key={author.id} className="flex items-center gap-3 rounded-[18px] bg-[#eef0ff] p-3">
              <Avatar author={author} muted={index !== 0} />
              <div>
                <p className="font-black">{index === 0 ? "Host / editor" : "Contributor"}</p>
                <p className="text-sm font-bold text-[#737783]">{author.name}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-[20px] bg-[#fff3f6] p-4">
          <p className="font-black text-[#ff4b4f]">Lock rule</p>
          <p className="mt-2 text-sm font-bold leading-relaxed">Host-curated by default. A future implementation can switch this to vote, rotating editor, or all-authors consent.</p>
        </div>
      </aside>
    </section>
  );
}

function TurnTakingWorkbench(props: {
  post: Post;
  poemLines: PoemLine[];
  comments: Comment[];
  commentDraft: string;
  turnDraft: string;
  locked: boolean;
  setTurnDraft: (value: string) => void;
  setCommentDraft: (value: string) => void;
  submitTurnLine: (event: FormEvent) => void;
  addComment: (event: FormEvent) => void;
  likeComment: (id: string) => void;
  lockLine: (postId: string, lineId: string) => void;
  navigate: (view: View) => void;
}) {
  const { post, poemLines, comments, commentDraft, turnDraft, locked, setTurnDraft, setCommentDraft, submitTurnLine, addComment, likeComment, lockLine, navigate } = props;
  const activeTurn = Object.values(authors).find((author) => author.id === post.activeTurnUserId) ?? currentUser;
  const queue = post.turnQueue?.map((id) => Object.values(authors).find((author) => author.id === id)).filter((author): author is Author => Boolean(author)) ?? [activeTurn];
  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="rounded-[26px] border-2 border-[#ff4b4f] bg-white p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-black text-[#ff4b4f]">Co-writing · Relay</h1>
            <p className="mt-1 text-sm font-bold text-[#737783]">Each line keeps attribution. Locked lines become shared record.</p>
          </div>
          <span className="rounded-full bg-[#ff4b4f] px-4 py-2 text-sm font-black text-white">{locked ? "version locked" : `${activeTurn.name}'s turn`}</span>
        </div>
        <div className="grid gap-3">
          {poemLines.map((line, index) => (
            <article key={line.id} className={`rounded-[20px] border-2 p-4 ${line.locked ? "border-[#ff4b4f] bg-[#fff3f6]" : "border-[#e8e0d9]"}`}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#001eff] font-black text-white">{index + 1}</span>
                  <span className="rounded-full bg-[#eef0ff] px-3 py-1 text-xs font-black text-[#001eff]">{line.by}</span>
                </div>
                <button type="button" onClick={() => lockLine(post.id, line.id)} disabled={locked || line.locked} className="rounded-full border-2 border-[#ff4b4f] px-4 py-1 text-sm font-black text-[#ff4b4f] disabled:opacity-35">
                  {line.locked ? "Locked line" : "Lock line"}
                </button>
              </div>
              <p className="text-xl font-black leading-snug">{line.text}</p>
            </article>
          ))}
        </div>
        <form onSubmit={submitTurnLine} className="mt-6 rounded-[22px] bg-[#eef0ff] p-4">
          <label className="mb-3 block font-black text-[#001eff]">Submit next line for {activeTurn.name}</label>
          <textarea value={turnDraft} onChange={(event) => setTurnDraft(event.target.value)} disabled={locked} className="min-h-[110px] w-full resize-y rounded-[18px] border-2 border-white p-4 text-lg font-bold outline-none focus:border-[#001eff] disabled:opacity-60" placeholder="One line, one image, one turn..." />
          <button disabled={locked || !turnDraft.trim()} className="mt-3 rounded-full bg-[#001eff] px-6 py-3 font-black text-white disabled:bg-[#aeb2d3]">Submit next line</button>
        </form>
        <form onSubmit={addComment} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Avatar author={currentUser} />
          <input value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} className="h-[46px] min-w-0 flex-1 rounded-full bg-[#efefef] px-8 text-sm outline-none" placeholder="discuss the relay without entering the poem" />
          <button className="h-[46px] rounded-full bg-[#001eff] px-6 font-black text-white">comment</button>
        </form>
        <div className="mt-6 grid gap-4">
          {comments.map((comment) => <CommentRow key={comment.id} comment={comment} suggestions={[]} likeComment={likeComment} addSuggestionToPoem={() => undefined} editSuggestion={() => undefined} updateSuggestion={() => undefined} ignoreSuggestion={() => undefined} navigate={navigate} />)}
        </div>
      </div>
      <aside className="rounded-[26px] border-2 border-[#001eff] p-5">
        <p className="font-mono text-2xl font-black text-[#001eff]">Turn queue</p>
        <div className="mt-5 grid gap-3">
          {queue.map((author, index) => (
            <div key={`${author.id}-${index}`} className={`flex items-center gap-3 rounded-[18px] p-3 ${index === 0 ? "bg-[#001eff] text-white" : "bg-[#eef0ff] text-[#001eff]"}`}>
              <Avatar author={author} muted={index !== 0} />
              <div>
                <p className="font-black">{index === 0 ? "Now" : `Next ${index}`}</p>
                <p className="text-sm font-bold opacity-80">{author.name}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-[20px] bg-[#fff3f6] p-4">
          <p className="font-black text-[#ff4b4f]">Relay contract</p>
          <p className="mt-2 text-sm font-bold leading-relaxed">One line per turn. Locked lines cannot be edited; new versions branch from the locked record. Attribution defaults to collective credit.</p>
        </div>
      </aside>
    </section>
  );
}

function HistoryPage({
  post,
  events,
  snapshots,
  contributions,
  sourceFragment,
  openVersionSnapshot,
  navigate,
  searchInput,
  setSearchInput,
  runSearch,
}: {
  post: Post;
  events: VersionEvent[];
  snapshots: VersionSnapshot[];
  contributions: Contribution[];
  sourceFragment?: Fragment;
  openVersionSnapshot: (workId: string, snapshotId: string) => void;
  navigate: (view: View) => void;
} & SearchProps) {
  const sorted = [...events].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const grouped = evolutionStages.map((stage) => ({
    ...stage,
    events: sorted.filter((event) => eventStage(event, post) === stage.id),
  })).filter((stage) => stage.events.length > 0);
  const snapshotByEvent = (event: VersionEvent) => {
    const versionId = typeof event.payload.versionId === "string" ? event.payload.versionId : undefined;
    return snapshots.find((snapshot) => snapshot.id === versionId || snapshot.sourceEventIds.includes(event.id));
  };
  return (
    <div className="max-w-[980px]">
      <BrandBar navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />
      <button type="button" onClick={() => navigate("detail")} className="mb-5 font-mono text-[26px] font-black lg:text-[29px]">{"<"} back</button>
      <h1 className="mb-2 font-mono text-[40px] font-black text-[#001eff] lg:text-[42px]">Work Evolution</h1>
      <p className="mb-3 text-lg font-bold text-[#737783]">{post.body}</p>
      <div className="mb-6 flex flex-wrap gap-2">
        <BlueChip>{collaborationLabel(post)}</BlueChip>
        {isCoCreativePost(post) && <BlueChip>{patternLabel(getCoCreativePattern(post))}</BlueChip>}
        <BlueChip>{snapshots.length} snapshots</BlueChip>
        <BlueChip>{contributions.length} contributions</BlueChip>
      </div>
      {sourceFragment && (
        <div className="mb-5 rounded-[22px] border-2 border-[#001eff] p-5">
          <p className="font-black text-[#001eff]">Source fragment</p>
          <p className="mt-2 text-xl font-black">{sourceFragment.text}</p>
          <p className="mt-2 text-sm font-bold text-[#737783]">{sourceFragment.anonymous ? "Anonymous source" : `From ${sourceFragment.creator?.name}`}</p>
        </div>
      )}
      <section className="mb-7 grid gap-3">
        <h2 className="font-mono text-[26px] font-black text-[#001eff]">Version snapshots</h2>
        {snapshots.length === 0 ? (
          <p className="rounded-[20px] bg-[#eef0ff] p-4 text-sm font-black text-[#001eff]">No saved snapshots yet. Use Save draft snapshot from the workbench.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...snapshots].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map((snapshot) => (
              <button key={snapshot.id} type="button" onClick={() => openVersionSnapshot(snapshot.workId, snapshot.id)} className="rounded-[20px] border-2 border-[#e8e0d9] p-4 text-left hover:border-[#001eff]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#001eff] px-3 py-1 text-xs font-black text-white">{snapshot.stage}</span>
                  <BlueChip>{snapshot.visibility}</BlueChip>
                  <BlueChip>{snapshot.lockState.status}</BlueChip>
                </div>
                <p className="mt-3 text-lg font-black">{snapshot.label}</p>
                <p className="mt-2 text-xs font-bold leading-relaxed text-[#737783]">{snapshot.changeSummary}</p>
              </button>
            ))}
          </div>
        )}
      </section>
      <div className="grid gap-7">
        {grouped.map((group) => (
          <section key={group.id}>
            <div className="mb-3 flex items-center gap-3">
              <span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black text-white ${group.id === "co_writing" ? "bg-[#ff4b4f]" : "bg-[#001eff]"}`}>{group.short}</span>
              <div>
                <h2 className="font-mono text-[24px] font-black text-[#001eff]">{group.label}</h2>
                <p className="text-xs font-bold text-[#737783]">{group.description}</p>
              </div>
            </div>
            <div className="grid gap-3 border-l-4 border-[#eef0ff] pl-4">
              {group.events.map((event) => {
                const snapshot = snapshotByEvent(event);
                return (
                  <article key={event.id} className="rounded-[22px] border-2 border-[#e8e0d9] bg-white p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eef0ff] text-xs font-black text-[#001eff]">{eventIcon(event.type)}</span>
                        <div className="min-w-0">
                          <p className="text-lg font-black"><span className="text-[#001eff]">{eventCopy[event.type]}</span> by {event.actorName}</p>
                          <p className="mt-1 text-xs font-bold text-[#737783]">{formatDate(event.createdAt)}</p>
                        </div>
                      </div>
                      {snapshot && <button type="button" onClick={() => openVersionSnapshot(snapshot.workId, snapshot.id)} className="rounded-full border-2 border-[#001eff] px-4 py-2 text-xs font-black text-[#001eff]">Open snapshot</button>}
                    </div>
                    <p className="mt-3 text-sm font-bold leading-relaxed text-[#737783]">{snapshot?.changeSummary ?? payloadSummary(event.payload)}</p>
                    {snapshot && <p className="mt-3 w-max rounded-full bg-[#fff3f6] px-3 py-1 text-xs font-black text-[#ff4b4f]">{snapshot.stage} / {snapshot.lockState.status}</p>}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="hidden">
        {sorted.map((event) => (
          <article key={event.id} className="rounded-[22px] border-2 border-[#001eff] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xl font-black"><span className="text-[#001eff]">{eventCopy[event.type]}</span> by {event.actorName}</p>
              <span className="rounded-full bg-[#eef0ff] px-3 py-1 text-xs font-black text-[#001eff]">{formatDate(event.createdAt)}</span>
            </div>
            <p className="mt-3 text-sm font-bold text-[#737783]">{payloadSummary(event.payload)}</p>
          </article>
        ))}
      </div>
      <h2 className="hidden">Contribution records</h2>
      <div className="hidden">
        {contributions.map((item) => (
          <div key={item.id} className="rounded-[18px] border-2 border-[#e8e0d9] p-4">
            <p className="font-black">{item.anonymous ? "Anonymous contributor" : item.contributorName}</p>
            <p className="text-sm font-bold text-[#737783]">{item.type} · {item.status} · {item.attributionPreference.replace("_", " ")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function VersionSnapshotDetailPage({
  post,
  snapshot,
  events,
  contributions,
  comments,
  suggestions,
  sourceFragment,
  nameVersionSnapshot,
  saveSnapshotCopy,
  restoreSnapshotAsBranch,
  lockVersionSnapshot,
  navigate,
  searchInput,
  setSearchInput,
  runSearch,
}: {
  post: Post;
  snapshot: VersionSnapshot;
  events: VersionEvent[];
  contributions: Contribution[];
  comments: Comment[];
  suggestions: Suggestion[];
  sourceFragment?: Fragment;
  nameVersionSnapshot: (snapshotId: string, label: string) => void;
  saveSnapshotCopy: (snapshotId: string) => void;
  restoreSnapshotAsBranch: (snapshotId: string) => void;
  lockVersionSnapshot: (snapshotId: string) => void;
  navigate: (view: View) => void;
} & SearchProps) {
  const [tab, setTab] = useState<"Read version" | "Changes" | "Sources" | "Actions">("Read version");
  const [nameDraft, setNameDraft] = useState(snapshot.label);
  const linkedEvents = events.filter((event) => snapshot.sourceEventIds.includes(event.id));
  const linkedContributions = contributions.filter((item) => snapshot.sourceContributionIds.includes(item.id));
  const addedLines = snapshot.lines.filter((line) => !post.lines.includes(line));
  const removedLines = post.lines.filter((line) => !snapshot.lines.includes(line));
  const reordered = snapshot.lines.length === post.lines.length && snapshot.lines.some((line, index) => post.lines[index] !== line);
  return (
    <div className="max-w-[980px]">
      <BrandBar navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />
      <button type="button" onClick={() => navigate("history")} className="mb-5 font-mono text-[26px] font-black lg:text-[29px]">{"<"} back to evolution</button>
      <header className="rounded-[28px] border-2 border-[#001eff] bg-white p-5 lg:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="font-mono text-sm font-black uppercase text-[#001eff]">Version Snapshot Detail</p>
            <h1 className="mt-2 text-[34px] font-black leading-none text-[#001eff] lg:text-[44px]">{snapshot.label}</h1>
            <p className="mt-3 max-w-[760px] text-sm font-bold leading-relaxed text-[#737783]">{snapshot.saveReason}</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:max-w-[360px] lg:justify-end">
            <BlueChip>{snapshot.stage}</BlueChip>
            <BlueChip>{snapshot.visibility}</BlueChip>
            <BlueChip>{snapshot.lockState.status}</BlueChip>
            <BlueChip>{formatDate(snapshot.createdAt)}</BlueChip>
          </div>
        </div>
      </header>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {(["Read version", "Changes", "Sources", "Actions"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`min-h-10 whitespace-nowrap rounded-full px-4 text-sm font-black ${tab === item ? "bg-[#001eff] text-white" : "bg-[#eef0ff] text-[#001eff]"}`}>
            {item}
          </button>
        ))}
      </div>
      {tab === "Read version" && (
        <section className="mt-5 rounded-[28px] bg-[#001eff] p-5 text-white lg:p-7">
          <p className="mb-5 font-mono text-sm font-black uppercase text-white/70">{snapshot.title ?? post.body}</p>
          <div className="grid gap-4 text-[22px] font-black leading-snug lg:text-[28px]">
            {snapshot.lines.map((line, index) => <p key={`${snapshot.id}-line-${index}`}>{line}</p>)}
          </div>
        </section>
      )}
      {tab === "Changes" && (
        <section className="mt-5 grid gap-4">
          <div className="rounded-[24px] border-2 border-[#001eff] p-5">
            <p className="font-mono text-xl font-black text-[#001eff]">Change summary</p>
            <p className="mt-3 text-sm font-bold leading-relaxed text-[#737783]">{snapshot.changeSummary}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <ChangeBucket title="Added" items={addedLines.length ? addedLines : ["No added lines in this mock diff."]} />
            <ChangeBucket title="Removed" items={removedLines.length ? removedLines : ["No removed lines in this mock diff."]} />
            <ChangeBucket title="Reordered" items={[reordered ? "Line order differs from the current work." : "No reorder detected."]} />
          </div>
        </section>
      )}
      {tab === "Sources" && (
        <section className="mt-5 grid gap-4">
          {sourceFragment && (
            <SourceCard title="Source fragment" body={sourceFragment.text} meta={sourceFragment.anonymous ? "Anonymous fragment" : sourceFragment.creator?.handle ?? "Fragment source"} />
          )}
          {linkedEvents.map((event) => <SourceCard key={event.id} title={eventCopy[event.type]} body={payloadSummary(event.payload)} meta={`${event.actorName} / ${formatDate(event.createdAt)}`} />)}
          {linkedContributions.map((contribution) => {
            const sourceComment = comments.find((comment) => comment.id === contribution.sourceId);
            const sourceSuggestion = suggestions.find((suggestion) => suggestion.commentId === contribution.sourceId || suggestion.id === contribution.sourceId);
            return (
              <SourceCard
                key={contribution.id}
                title={`${contribution.type} / ${contribution.status}`}
                body={sourceComment?.text ?? sourceSuggestion?.text ?? contribution.sourceId}
                meta={`${contribution.contributorName} / ${contribution.attributionPreference.replace("_", " ")}`}
              />
            );
          })}
          {!sourceFragment && linkedEvents.length === 0 && linkedContributions.length === 0 && <p className="rounded-[20px] bg-[#eef0ff] p-4 text-sm font-black text-[#001eff]">No source details are linked to this snapshot yet.</p>}
        </section>
      )}
      {tab === "Actions" && (
        <section className="mt-5 grid gap-4 rounded-[28px] border-2 border-[#e8e0d9] p-5">
          <div>
            <p className="font-mono text-xl font-black text-[#001eff]">Name version</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} className="h-12 min-w-0 flex-1 rounded-full bg-[#efefef] px-5 font-bold outline-none focus:ring-2 focus:ring-[#001eff]" />
              <button type="button" onClick={() => nameVersionSnapshot(snapshot.id, nameDraft)} className="rounded-full bg-[#001eff] px-6 py-3 font-black text-white">Save name</button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <button type="button" onClick={() => saveSnapshotCopy(snapshot.id)} className="rounded-[18px] border-2 border-[#001eff] p-4 text-left font-black text-[#001eff]">Save draft snapshot<span className="mt-2 block text-xs font-bold text-[#737783]">Create a private copy in Memory.</span></button>
            <button type="button" onClick={() => restoreSnapshotAsBranch(snapshot.id)} className="rounded-[18px] border-2 border-[#ff4b4f] p-4 text-left font-black text-[#ff4b4f]">Restore as new branch<span className="mt-2 block text-xs font-bold text-[#737783]">Never overwrites the locked/public source.</span></button>
            <button type="button" onClick={() => lockVersionSnapshot(snapshot.id)} disabled={snapshot.lockState.status === "locked" || snapshot.lockState.status === "published"} className="rounded-[18px] bg-[#001eff] p-4 text-left font-black text-white disabled:bg-[#aeb2d3]">Lock version<span className="mt-2 block text-xs font-bold text-white/75">Freeze this snapshot as a stable record.</span></button>
          </div>
        </section>
      )}
    </div>
  );
}

function ChangeBucket({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-[22px] border-2 border-[#e8e0d9] p-4">
      <p className="font-mono text-lg font-black text-[#001eff]">{title}</p>
      <div className="mt-3 grid gap-2">
        {items.map((item, index) => <p key={`${title}-${index}`} className="rounded-[14px] bg-[#eef0ff] p-3 text-xs font-bold leading-relaxed text-[#3b3d45]">{item}</p>)}
      </div>
    </article>
  );
}

function SourceCard({ title, body, meta }: { title: string; body: string; meta?: string }) {
  return (
    <article className="rounded-[22px] border-2 border-[#e8e0d9] bg-white p-5">
      <p className="font-black text-[#001eff]">{title}</p>
      <p className="mt-2 text-base font-bold leading-relaxed">{body}</p>
      {meta && <p className="mt-2 text-xs font-black text-[#737783]">{meta}</p>}
    </article>
  );
}

function QuotePage({
  post,
  draft,
  setDraft,
  publishQuote,
  publishQuoteVersion,
  navigate,
  searchInput,
  setSearchInput,
  runSearch,
}: {
  post: Post;
  draft: string;
  setDraft: (value: string) => void;
  publishQuote: (event: FormEvent) => void;
  publishQuoteVersion: (lines: EditablePoemLine[]) => void;
  navigate: (view: View) => void;
} & SearchProps) {
  const quoteLines: EditablePoemLine[] = post.lines.map((line, index) => ({
    id: `quote-${post.id}-${index}`,
    text: index === 0 && draft ? draft : line,
    by: index === 0 ? `Based on ${post.author.name.split(" ")[0]}'s line` : "From original thread",
  }));
  return (
    <div className="max-w-[980px]">
      <BrandBar navigate={navigate} showSearch searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />
      <button type="button" onClick={() => navigate("detail")} className="mb-5 font-mono text-[29px] font-black">{"<"} back</button>
      <div className="rounded-[22px] border-2 border-[#001eff] p-5">
        <p className="font-black text-[#001eff]">Based on {post.author.name.split(" ")[0]}'s line</p>
        <p className="mt-4 font-bold">{post.body}</p>
      </div>
      <EditPoemPanel
        title="Make your version"
        subtitle="Edit the lines like a post, then quote it to your profile."
        badge="Branch version"
        lines={quoteLines}
        primaryAction="Post to profile"
        secondaryAction="Quick quote"
        onPrimary={publishQuoteVersion}
        onSecondary={() => {
          const event = { preventDefault: () => undefined } as FormEvent;
          publishQuote(event);
        }}
      />
      <label className="mt-6 block text-sm font-black text-[#737783]">Quick first line</label>
      <textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="mt-2 h-[90px] w-full rounded-2xl border border-[#b7c4d5] p-5 text-[20px] outline-none" />
    </div>
  );
}

function ActivityPage({
  events,
  contributions,
  openPost,
  navigate,
  searchInput,
  setSearchInput,
  runSearch,
}: {
  events: VersionEvent[];
  contributions: Contribution[];
  openPost: (id: string) => void;
  navigate: (view: View) => void;
} & SearchProps) {
  const items = [...events.slice(0, 6), ...contributions.slice(0, 4).map((item): VersionEvent => ({
    id: `activity-${item.id}`,
    workId: item.workId,
    actorId: item.contributorId ?? "anon",
    actorName: item.contributorName,
    type: item.status === "accepted" ? "suggestion_accepted" : "commented",
    payload: { text: `${item.type} contribution is ${item.status}` },
    createdAt: item.createdAt,
  }))].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return (
    <div>
      <BrandBar navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />
      <h1 className="mb-8 font-mono text-[42px] font-black text-[#001eff]">Inbox</h1>
      <div className="grid max-w-[900px] gap-5">
        {items.map((item) => (
          <button key={item.id} type="button" onClick={() => openPost(item.workId)} className="flex items-center gap-5 rounded-[22px] border-2 border-[#001eff] p-5 text-left">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#969dff] text-xl text-white">{item.actorName.slice(0, 2)}</span>
            <span>
              <span className="block text-xl font-black">{eventCopy[item.type]}</span>
              <span className="text-sm font-bold text-[#737783]">{item.actorName} · {formatDate(item.createdAt)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProfilePage({
  posts,
  fragments,
  contributions,
  workMemories,
  versionSnapshots,
  versionEvents,
  publicationDesigns,
  exportRecords,
  tab,
  setTab,
  openPost,
  openQuote,
  toggleLike,
  toggleSave,
  openMemoryline,
  navigate,
  searchInput,
  setSearchInput,
  runSearch,
}: {
  posts: Post[];
  fragments: Fragment[];
  contributions: Contribution[];
  workMemories: WorkMemory[];
  versionSnapshots: VersionSnapshot[];
  versionEvents: VersionEvent[];
  publicationDesigns: PublicationDesign[];
  exportRecords: ExportRecord[];
  tab: string;
  setTab: (tab: string) => void;
  openPost: (id: string) => void;
  openQuote: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  openMemoryline: (workId: string) => void;
  navigate: (view: View) => void;
} & SearchProps) {
  const tabs = ["Posts", "Memory", "Quotes", "Final Versions", "Saved", "Fragments", "Contributions"];
  const [memoryFilter, setMemoryFilter] = useState<MemoryFilter>("All");
  const filtered =
    tab === "Saved"
      ? posts.filter((post) => post.saved)
      : tab === "Final Versions"
        ? posts.filter((post) => post.stage === "Final Version" || post.lockState.status === "locked")
        : tab === "Quotes"
          ? posts.filter((post) => post.tags.includes("#quote_version") || post.sourceWorkId)
          : posts.filter((post) => !post.sourceWorkId);
  return (
    <div>
      <BrandBar navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />
      <ProfileHeader />
      <div className="mb-8 flex gap-3 overflow-x-auto">
        {tabs.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`h-[44px] whitespace-nowrap rounded-full px-6 text-[18px] font-black text-white ${tab === item ? "bg-[#001eff]" : "bg-[#aeb2d3]"}`}>{item}</button>
        ))}
      </div>
      {tab === "Memory" ? (
        <MemoryTab
          posts={posts}
          fragments={fragments}
          contributions={contributions}
          workMemories={workMemories}
          versionSnapshots={versionSnapshots}
          versionEvents={versionEvents}
          filter={memoryFilter}
          setFilter={setMemoryFilter}
          openMemoryline={openMemoryline}
        />
      ) : tab === "Fragments" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {fragments.filter((fragment) => fragment.savedBy.includes(currentUser.id) || fragment.creatorId === currentUser.id).map((fragment) => (
            <div key={fragment.id} className="rounded-[22px] border-2 border-[#001eff] p-5">
              <p className="text-xl font-black">{fragment.text}</p>
              <p className="mt-3 text-sm font-bold text-[#737783]">{fragment.savedBy.length} saves · {fragment.branchCount} branches</p>
            </div>
          ))}
        </div>
      ) : tab === "Contributions" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {contributions.map((item) => (
            <article key={item.id} className="rounded-[20px] border-2 border-[#e8e0d9] p-5">
              <p className="text-xl font-black">{item.type} · {item.status}</p>
              <p className="mt-2 text-sm font-bold text-[#737783]">{item.contributorName} · {item.attributionPreference.replace("_", " ")}</p>
            </article>
          ))}
        </div>
      ) : tab === "Final Versions" ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.slice(0, 8).map((post) => {
            const design = publicationDesigns.find((item) => item.id === post.publicationDesignId || item.workId === post.id);
            const exportCount = design ? exportRecords.filter((record) => record.designId === design.id).length : 0;
            return design ? (
              <PackagedPreviewCard key={post.id} post={post} design={design} exportCount={exportCount} openPost={openPost} />
            ) : (
              <PoemCard key={post.id} post={post} openPost={openPost} openQuote={openQuote} toggleLike={toggleLike} toggleSave={toggleSave} compact />
            );
          })}
        </div>
      ) : (
        <MasonryGrid posts={filtered.slice(0, 8)} openPost={openPost} openQuote={openQuote} toggleLike={toggleLike} toggleSave={toggleSave} compact />
      )}
    </div>
  );
}

function MemoryTab({
  posts,
  fragments,
  contributions,
  workMemories,
  versionSnapshots,
  versionEvents,
  filter,
  setFilter,
  openMemoryline,
}: {
  posts: Post[];
  fragments: Fragment[];
  contributions: Contribution[];
  workMemories: WorkMemory[];
  versionSnapshots: VersionSnapshot[];
  versionEvents: VersionEvent[];
  filter: MemoryFilter;
  setFilter: (filter: MemoryFilter) => void;
  openMemoryline: (workId: string) => void;
}) {
  const filters: MemoryFilter[] = ["All", "Owned", "Co-authored", "Helped", "Saved", "Published", "Private drafts"];
  const visible = workMemories
    .filter((memory) => memory.userId === currentUser.id)
    .filter((memory) => {
      if (filter === "All") return true;
      if (filter === "Owned") return memory.memoryType === "owned";
      if (filter === "Co-authored") return memory.memoryType === "coauthored";
      if (filter === "Helped") return memory.memoryType === "helped";
      if (filter === "Saved") return memory.memoryType === "saved_fragment";
      if (filter === "Published") return memory.memoryType === "published";
      return memory.memoryType === "private_draft";
    })
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.lastTouchedAt) - Date.parse(a.lastTouchedAt));
  return (
    <section>
      <div className="mb-5 rounded-[26px] border-2 border-[#001eff] bg-white p-5">
        <p className="font-mono text-[30px] font-black text-[#001eff]">Memoryline</p>
        <p className="mt-2 max-w-[780px] text-sm font-bold leading-relaxed text-[#737783]">Your private drafts, locked versions, co-authored works, saved fragments, and contribution trails. Open a work only when you want to inspect its evolution.</p>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {filters.map((item) => (
            <button key={item} type="button" onClick={() => setFilter(item)} className={`h-10 whitespace-nowrap rounded-full px-4 text-sm font-black ${filter === item ? "bg-[#001eff] text-white" : "bg-[#eef0ff] text-[#001eff]"}`}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((memory) => {
          const post = posts.find((item) => item.id === memory.workId);
          const fragment = fragments.find((item) => item.id === memory.workId);
          const snapshots = versionSnapshots.filter((snapshot) => snapshot.workId === memory.workId);
          const latestSnapshot = [...snapshots].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
          const recentEvent = [...versionEvents.filter((event) => event.workId === memory.workId)].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
          const contributionCount = contributions.filter((item) => item.workId === memory.workId).length;
          const hasPrivateDraft = snapshots.some((snapshot) => snapshot.visibility === "private");
          const title = latestSnapshot?.title || post?.body || fragment?.text || "Saved memory";
          const stage = latestSnapshot?.stage ?? post?.stage ?? "Started from";
          const lockState = latestSnapshot?.lockState.status ?? post?.lockState.status ?? "unlocked";
          return (
            <article key={memory.id} className={`rounded-[24px] border-2 bg-white p-5 ${memory.pinned ? "border-[#001eff]" : "border-[#e8e0d9]"}`}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-black text-white ${memory.memoryType === "private_draft" ? "bg-[#ff4b4f]" : "bg-[#001eff]"}`}>{memoryLabel(memory)}</span>
                <BlueChip>{roleLabel(memory.role)}</BlueChip>
                {hasPrivateDraft && <span className="rounded-full bg-[#fff3f6] px-3 py-1 text-xs font-black text-[#ff4b4f]">private draft</span>}
              </div>
              <p className="text-xl font-black leading-snug">{shorten(title, 92)}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MetricBlock value={stage} label="current stage" />
                <MetricBlock value={lockState} label="lock state" />
              </div>
              <p className="mt-4 text-sm font-bold leading-relaxed text-[#737783]">{recentEvent ? `${eventCopy[recentEvent.type]} by ${recentEvent.actorName}` : fragment ? "Saved fragment memory" : "No events yet"}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-black text-[#737783]">{contributionCount} contributions / {snapshots.length} snapshots</span>
                <button type="button" onClick={() => openMemoryline(memory.workId)} className="rounded-full bg-[#001eff] px-4 py-2 text-sm font-black text-white">
                  {post ? "Open evolution" : "Open fragment"}
                </button>
              </div>
              {memory.privateNote && <p className="mt-3 rounded-[16px] bg-[#eef0ff] p-3 text-xs font-bold leading-relaxed text-[#001eff]">{memory.privateNote}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProfileHeader() {
  return (
    <header className="mb-8 grid gap-6 lg:grid-cols-[380px_1fr] lg:items-center">
      <div className="flex items-center gap-6">
        <div className="grid h-[68px] w-[68px] place-items-center rounded-full bg-[#001eff] text-[26px] text-white">Li</div>
        <div>
          <h1 className="font-mono text-[28px] font-black">Lili Lee</h1>
          <p className="text-[22px] font-bold text-[#999]">Just do it, but credit the line.</p>
        </div>
      </div>
      <div className="grid grid-cols-3 items-center text-center">
        <ProfileStat value="121" label="followers" />
        <ProfileStat value="17" label="contribs" />
        <ProfileStat value="10" label="works" />
      </div>
    </header>
  );
}

function PackagedPreviewCard({ post, design, exportCount, openPost }: { post: Post; design: PublicationDesign; exportCount: number; openPost: (id: string) => void }) {
  return (
    <article className="overflow-hidden rounded-[28px] border-2 border-[#001eff] bg-white">
      <button type="button" onClick={() => openPost(post.id)} className="block w-full p-4 text-left">
        <PublicationMiniPreview design={design} />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-black text-[#001eff]">{design.title}</p>
            <p className="mt-1 text-xs font-bold text-[#737783]">{design.locked ? "Locked package" : "Design draft"} / {canvasSizeMeta[design.canvasSize].label}</p>
          </div>
          <span className="rounded-full bg-[#ff4b4f] px-3 py-1 text-xs font-black text-white">{exportCount} exports</span>
        </div>
      </button>
    </article>
  );
}

function PublicationMiniPreview({ design }: { design: PublicationDesign }) {
  const size = canvasSizeMeta[design.canvasSize];
  return (
    <div className="relative overflow-hidden rounded-[18px] border-2 border-[#e8e0d9]" style={{ aspectRatio: `${size.width} / ${size.height}`, ...publicationPreviewBackground(design.style) }}>
      <div className="absolute inset-4 flex flex-col">
        <p className="line-clamp-6 whitespace-pre-line font-black leading-tight" style={{ color: design.style.textColor, fontFamily: fontStacks[design.style.fontFamily], fontSize: 18, textAlign: design.style.align }}>
          {design.poemText}
        </p>
        {design.style.showCredits && <p className="mt-auto text-xs font-black" style={{ color: design.style.accentColor, textAlign: design.style.align }}>By {design.authorName}</p>}
      </div>
      <Sticker style={design.style} />
    </div>
  );
}

function MasonryGrid({
  posts,
  openPost,
  openQuote,
  toggleLike,
  toggleSave,
  compact = false,
}: {
  posts: Post[];
  openPost: (id: string) => void;
  openQuote: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {posts.map((post) => (
        <PoemCard key={post.id} post={post} openPost={openPost} openQuote={openQuote} toggleLike={toggleLike} toggleSave={toggleSave} compact={compact} />
      ))}
    </div>
  );
}

function PoemCard({
  post,
  openPost,
  openQuote,
  toggleLike,
  toggleSave,
  compact = false,
  forcePoem = false,
}: {
  post: Post;
  openPost: (id: string) => void;
  openQuote?: (id: string) => void;
  toggleLike?: (id: string) => void;
  toggleSave?: (id: string) => void;
  compact?: boolean;
  forcePoem?: boolean;
}) {
  const showPoem = forcePoem || post.stage !== "Started from" || post.lines.length > 1;
  const pattern = getCoCreativePattern(post);
  const panelLabel = post.stage === "Final Version" ? "Final Version" : isRelayPost(post) ? "Relay so far" : isCoCreativePost(post) ? "Co-writing so far" : "Poem so far";
  const topLabel = isCoCreativePost(post) ? `Co-writing${pattern ? ` · ${patternLabel(pattern)}` : ""}` : post.source ? "Started from" : post.stage === "Final Version" ? "Final Version" : "Author-led";
  const borderColor = isCoCreativePost(post) || post.color === "red" ? "border-[#ff4b4f]" : "border-[#001eff]";
  const accentText = isCoCreativePost(post) || post.color === "red" ? "text-[#ff4b4f]" : "text-[#001eff]";
  const imageStyle = cardImageStyle(post);
  return (
    <article className={`mb-5 overflow-hidden rounded-[30px] border-2 ${borderColor} bg-white`}>
      <button
        type="button"
        onClick={() => openPost(post.id)}
        className={`relative block w-full overflow-hidden p-5 text-left ${imageStyle ? "" : cardBackground(post.color)} ${compact ? "min-h-[212px]" : "min-h-[258px]"}`}
        style={imageStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <span className={`rounded-full bg-white px-3 py-1.5 text-[15px] font-black leading-none ${accentText}`}>{topLabel}</span>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[13px] font-bold text-[#001eff]">{post.author.avatar}</span>
        </div>
        {post.source && <p className="mt-4 text-[10px] font-black text-white/85">{post.source}</p>}
        <p className="mt-9 max-w-[94%] text-[18px] font-black leading-tight text-white">{post.body}</p>
        <div className="mt-7 flex flex-wrap gap-2">{post.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
        <div className="mt-5 h-px bg-white/85" />
        <div className="mt-4 flex flex-wrap gap-2">
          <SmallBadge>{visibilityLabel(post.visibility)}</SmallBadge>
          <SmallBadge>{post.lockState.status === "locked" ? "Locked" : "Open"}</SmallBadge>
          <SmallBadge>{post.quoteAllowed ? "Quote allowed" : "No Quote"}</SmallBadge>
          {post.invited.length > 0 && <SmallBadge>Invite {post.invited.join(" / ")}</SmallBadge>}
        </div>
      </button>
      {showPoem && (
        <div className={`relative -mt-3 rounded-t-[34px] border-2 ${borderColor} border-x-0 border-b-0 bg-white p-5 pt-8`}>
          <div className="flex justify-between gap-3">
            <span className={`whitespace-nowrap rounded-full border-2 px-3 py-1.5 text-[15px] font-black leading-none ${post.stage === "Final Version" || isCoCreativePost(post) ? "border-[#ff4b4f] text-[#ff4b4f]" : "border-[#001eff] text-[#001eff]"}`}>{panelLabel}</span>
            <span className="pt-2 text-[10px] font-black leading-tight text-[#aaa]">From {post.contributors} contributors</span>
          </div>
          <div className="mt-6 grid gap-2">
            {post.lines.map((line, index) => <p key={`${line}-${index}`} className={`text-[15px] leading-tight ${index === 0 ? post.stage === "Final Version" ? "font-black text-[#ff4b4f]" : "font-black text-[#001eff]" : ""}`}>Line {index + 1}: {line}</p>)}
          </div>
        </div>
      )}
      <ActionStrip post={post} borderColor={borderColor} hasPoem={showPoem} openPost={openPost} openQuote={openQuote} toggleLike={toggleLike} toggleSave={toggleSave} />
    </article>
  );
}

function ActionStrip({
  post,
  borderColor,
  hasPoem,
  openPost,
  openQuote,
  toggleLike,
  toggleSave,
}: {
  post: Post;
  borderColor: string;
  hasPoem: boolean;
  openPost: (id: string) => void;
  openQuote?: (id: string) => void;
  toggleLike?: (id: string) => void;
  toggleSave?: (id: string) => void;
}) {
  return (
    <div className={`grid grid-cols-4 items-center gap-1 rounded-t-[26px] bg-white px-3 py-3 text-[9.5px] ${hasPoem ? `border-t-2 ${borderColor}` : `border-t-2 ${borderColor}`}`}>
      <ActionButton disabled={!post.allowLike} active={post.liked} danger onClick={() => toggleLike?.(post.id)} icon={<Heart size={12} fill={post.liked ? "currentColor" : "none"} />}>{post.likes} likes</ActionButton>
      <ActionButton onClick={() => openPost(post.id)} icon={<MessageCircle size={12} />}>{post.comments} comments</ActionButton>
      <ActionButton disabled={!post.quoteAllowed} onClick={() => openQuote?.(post.id)} icon={<Repeat2 size={12} />}>{post.quotes} quotes</ActionButton>
      <ActionButton active={post.saved} onClick={() => toggleSave?.(post.id)} icon={<Star size={12} fill={post.saved ? "currentColor" : "none"} />}>{post.saves} save</ActionButton>
    </div>
  );
}

function ActionButton({ children, icon, onClick, active = false, danger = false, disabled = false }: ActionButtonProps) {
  const activeClass = danger ? "text-[#ff1f1f]" : "text-[#001eff]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-[26px] items-center justify-center gap-0.5 rounded-full px-0.5 text-center font-medium leading-none transition hover:-translate-y-0.5 hover:text-[#001eff] ${
        active ? activeClass : "text-black"
      } disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:text-black`}
    >
      {icon}
      <span className="whitespace-nowrap">{children}</span>
    </button>
  );
}

function FragmentCard({ fragment, fragmentAction }: { fragment: Fragment; fragmentAction: (fragmentId: string, action: FragmentActionName, targetUserId?: string) => void }) {
  const saved = fragment.savedBy.includes(currentUser.id);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");
  const invitedUsers = new Set(fragment.invitedUserIds ?? []);
  const invitedByMe = fragment.invitedBy.includes(currentUser.id);
  const searchableUsers = Object.values(authors).filter((author) => {
    const query = inviteQuery.trim().toLowerCase();
    if (author.id === currentUser.id) return false;
    if (!query) return true;
    return `${author.name} ${author.handle}`.toLowerCase().includes(query);
  });
  return (
    <article className="rounded-[28px] border-2 border-[#001eff] bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-[#eef0ff] px-4 py-2 text-sm font-black text-[#001eff]">{fragment.visibility} fragment</span>
        <span className="text-sm font-black text-[#737783]">{fragment.anonymous ? "Anonymous" : fragment.creator?.handle ?? "unknown"}</span>
      </div>
      <p className="text-[27px] font-black leading-tight text-[#001eff]">“{fragment.text}”</p>
      <p className="mt-3 text-sm font-bold text-[#737783]">{fragment.mood}</p>
      <div className="mt-4 flex flex-wrap gap-2">{fragment.tags.map((tag) => <BlueChip key={tag}>{tag}</BlueChip>)}</div>
      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <MetricBlock value={String(fragment.savedBy.length)} label="saves" />
        <MetricBlock value={String(fragment.activeChatCount)} label="chats" />
        <MetricBlock value={String(fragment.branchCount + fragment.activeThreadCount)} label="works" />
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => fragmentAction(fragment.id, "save")} className={`rounded-full px-4 py-2 text-sm font-black ${saved ? "bg-[#001eff] text-white" : "bg-[#eef0ff] text-[#001eff]"}`}>
          <Bookmark size={14} className="mr-1 inline" /> {saved ? "Saved" : "Save"}
        </button>
        <button type="button" disabled={!fragment.allowInvite} onClick={() => setInviteOpen((open) => !open)} className="rounded-full bg-[#eef0ff] px-4 py-2 text-sm font-black text-[#001eff] disabled:opacity-35">
          {invitedByMe ? `Invite (${invitedUsers.size})` : "Invite"}
        </button>
        <button type="button" onClick={() => fragmentAction(fragment.id, "chat")} className="rounded-full border-2 border-[#001eff] px-4 py-2 text-sm font-black text-[#001eff]">
          Start chat
        </button>
        <button type="button" onClick={() => fragmentAction(fragment.id, "thread")} className="rounded-full border-2 border-[#ff4b4f] px-4 py-2 text-sm font-black text-[#ff4b4f]">
          Start thread
        </button>
        <button type="button" disabled={!fragment.allowRemix} onClick={() => fragmentAction(fragment.id, "branch")} className="rounded-full bg-black px-4 py-2 text-sm font-black text-white disabled:opacity-35 sm:col-span-2">
          Branch alone
        </button>
      </div>
      {inviteOpen && (
        <div className="mt-4 rounded-[18px] border-2 border-[#e8e0d9] bg-[#fafafa] p-3">
          <input
            value={inviteQuery}
            onChange={(event) => setInviteQuery(event.target.value)}
            className="h-11 w-full rounded-full border-2 border-[#e8e0d9] bg-white px-4 text-sm font-bold outline-none focus:border-[#001eff]"
            placeholder="Search people by name or @handle"
          />
          <div className="mt-3 grid max-h-[220px] gap-2 overflow-y-auto">
            {searchableUsers.map((author) => {
              const selected = invitedUsers.has(author.id);
              return (
                <button
                  key={author.id}
                  type="button"
                  onClick={() => {
                    fragmentAction(fragment.id, "invite", author.id);
                    setInviteQuery("");
                  }}
                  className={`flex items-center justify-between gap-3 rounded-[14px] px-3 py-2 text-left ${selected ? "bg-[#001eff] text-white" : "bg-white text-[#111]"}`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar author={author} muted={!selected} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{author.name}</span>
                      <span className={`block truncate text-xs font-bold ${selected ? "text-white/75" : "text-[#737783]"}`}>{author.handle}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-black">{selected ? "Invited" : "Invite"}</span>
                </button>
              );
            })}
            {searchableUsers.length === 0 && <p className="px-2 py-3 text-sm font-bold text-[#737783]">No matching users.</p>}
          </div>
        </div>
      )}
    </article>
  );
}

function CommentRow(props: {
  comment: Comment;
  suggestions: Suggestion[];
  showAuthorTools?: boolean;
  likeComment: (id: string) => void;
  addSuggestionToPoem: (suggestion: Suggestion) => void;
  editSuggestion: (suggestion: Suggestion) => void;
  updateSuggestion: (id: string, text: string) => void;
  ignoreSuggestion: (id: string) => void;
  navigate: (view: View) => void;
}) {
  const { comment, suggestions, showAuthorTools = false, likeComment, addSuggestionToPoem, editSuggestion, updateSuggestion, ignoreSuggestion, navigate } = props;
  const kind = commentKindMeta(comment.kind);
  return (
    <article className="border-b-2 border-[#868686] pb-5">
      <div className="grid gap-3 sm:grid-cols-[44px_1fr_190px] sm:items-center">
        <Avatar author={comment.author} muted />
        <div><span className="text-[21px]">{comment.author.name}</span><span className="ml-1 text-[16px] text-[#888]">{comment.author.handle}</span></div>
        <span className={`w-max rounded-full px-4 py-2 text-xs font-black sm:justify-self-end ${kind.className}`}>{kind.label}</span>
      </div>
      <p className="mt-2 text-[17px] sm:ml-[60px]">{comment.text}</p>
      <div className="mt-6 flex gap-3 sm:ml-[56px]">
        <Metric active={comment.liked} onClick={() => likeComment(comment.id)} icon={<Heart size={16} fill={comment.liked ? "currentColor" : "none"} />} value={comment.likes} />
        <Metric onClick={() => undefined} icon={<MessageCircle size={16} />} value={comment.replies} />
        <Metric onClick={() => navigate("quote")} icon={<Quote size={16} />} value={comment.quotes} />
      </div>
      {showAuthorTools && suggestions.length > 0 && (
        <div className="mt-3 grid gap-2 sm:ml-[56px]">
          {suggestions.map((suggestion) => (
            <AISuggestion key={suggestion.id} suggestion={suggestion} addSuggestionToPoem={addSuggestionToPoem} editSuggestion={editSuggestion} updateSuggestion={updateSuggestion} ignoreSuggestion={ignoreSuggestion} />
          ))}
        </div>
      )}
    </article>
  );
}

function AISuggestion({
  suggestion,
  addSuggestionToPoem,
  editSuggestion,
  updateSuggestion,
  ignoreSuggestion,
  disabled = false,
}: {
  suggestion: Suggestion;
  addSuggestionToPoem: (suggestion: Suggestion) => void;
  editSuggestion: (suggestion: Suggestion) => void;
  updateSuggestion: (id: string, text: string) => void;
  ignoreSuggestion: (id: string) => void;
  disabled?: boolean;
}) {
  const label = suggestion.group === "Revision hints" ? "Revision suggestion" : suggestion.group;
  return (
    <div className="rounded-[18px] border border-[#ff8a8a] bg-[#fff5f5] px-4 py-3">
      <p className="text-[16px]"><span className="text-[#ff4b4f]">AI</span> {label}</p>
      {suggestion.status === "editing" ? <textarea value={suggestion.text} onChange={(event) => updateSuggestion(suggestion.id, event.target.value)} className="mt-1 min-h-[60px] w-full rounded-xl border border-[#ddd] bg-white p-2 outline-none" /> : <p className="mt-1 text-[16px]">{suggestion.text}</p>}
      <div className="mt-2 flex flex-wrap gap-3">
        <button type="button" disabled={disabled} onClick={() => addSuggestionToPoem(suggestion)} className="rounded-full bg-black px-4 py-1 text-sm font-black text-white disabled:opacity-35">Accept into poem</button>
        <button type="button" disabled={disabled} onClick={() => editSuggestion(suggestion)} className="rounded-full bg-white px-4 py-1 text-sm font-black disabled:opacity-35">Edit</button>
        <button type="button" disabled={disabled} onClick={() => ignoreSuggestion(suggestion.id)} className="rounded-full bg-white px-4 py-1 text-sm font-black disabled:opacity-35">Ignore</button>
      </div>
    </div>
  );
}

function EditPoemPanel({
  title,
  subtitle,
  badge,
  lines,
  primaryAction,
  secondaryAction,
  onPrimary,
  onSecondary,
  onSaveDraftSnapshot,
}: {
  title: string;
  subtitle: string;
  badge: string;
  lines: EditablePoemLine[];
  primaryAction: string;
  secondaryAction?: string;
  onPrimary: (lines: EditablePoemLine[]) => void;
  onSecondary?: () => void;
  onSaveDraftSnapshot?: () => void;
}) {
  const [localLines, setLocalLines] = useState(lines);
  const [publishedLines, setPublishedLines] = useState(lines.map((line) => line.text));
  const updateLine = (id: string, text: string) => setLocalLines((current) => current.map((line) => (line.id === id ? { ...line, text } : line)));
  const moveLine = (index: number, direction: -1 | 1) => {
    setLocalLines((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [line] = next.splice(index, 1);
      next.splice(nextIndex, 0, line);
      return next;
    });
  };
  const aiDraftFinal = () => {
    const cleaned = localLines.map((line) => line.text.trim()).filter(Boolean);
    setPublishedLines([
      cleaned[1] ?? cleaned[0],
      cleaned[0],
      cleaned[2] ?? "but the windows refused to open.",
      "My childhood was backed up in a city I never reached.",
      "Every streetlight blinked like an old notification.",
      "It said: welcome back.",
    ].filter(Boolean));
  };
  const saveCurrentPreview = () => {
    setPublishedLines(localLines.map((line) => line.text.trim()).filter(Boolean));
    onPrimary(localLines);
  };

  return (
    <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div className="rounded-[28px] border-2 border-[#e8e0d9] bg-white p-5 lg:p-7">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-6">
          <div>
            <h2 className="text-[30px] font-black leading-none lg:text-[34px]">{title}</h2>
            <p className="mt-2 text-[17px] font-bold text-[#737783]">{subtitle}</p>
          </div>
          <span className="rounded-full border border-[#f0d48c] bg-[#fff7df] px-5 py-2 font-black text-[#8a6420]">{badge}</span>
        </div>
        <div className="grid gap-5">
          {localLines.map((line, index) => (
            <article key={line.id} className="rounded-[22px] border-2 border-[#e8e0d9] p-5">
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#e8e0d9] font-black text-[#737783]">{index + 1}</span>
                  <span className="truncate rounded-full border-2 border-[#dce2ff] bg-[#eef0ff] px-4 py-2 font-black text-[#3656cc]">{line.by}</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => moveLine(index, -1)} className="rounded-full border-2 border-[#e8e0d9] px-5 py-2 font-black text-[#3b3d45]">Up</button>
                  <button type="button" onClick={() => moveLine(index, 1)} className="rounded-full border-2 border-[#e8e0d9] px-5 py-2 font-black text-[#3b3d45]">Down</button>
                </div>
              </div>
              <textarea value={line.text} onChange={(event) => updateLine(line.id, event.target.value)} className="min-h-[120px] w-full resize-y rounded-[18px] border-2 border-[#e8e0d9] p-5 text-[20px] leading-snug outline-none focus:border-[#001eff] lg:text-[22px]" />
              <p className="mt-2 text-base font-bold text-[#737783]">{line.by}</p>
            </article>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-4">
          <button type="button" onClick={saveCurrentPreview} className="rounded-full bg-[#001eff] px-7 py-3 text-lg font-black text-white">{primaryAction}</button>
          <button type="button" onClick={aiDraftFinal} className="rounded-full bg-black px-7 py-3 text-lg font-black text-white">AI draft final</button>
          {secondaryAction && <button type="button" onClick={onSecondary} className="rounded-full border-2 border-[#001eff] px-7 py-3 text-lg font-black text-[#001eff]">{secondaryAction}</button>}
          {onSaveDraftSnapshot && <button type="button" onClick={onSaveDraftSnapshot} className="rounded-full border-2 border-[#ff4b4f] px-7 py-3 text-lg font-black text-[#ff4b4f]">Save draft snapshot</button>}
        </div>
      </div>
      <aside className="rounded-[28px] border-2 border-[#e8e0d9] bg-white p-5">
        <h3 className="text-2xl font-black">Published preview</h3>
        <div className="mt-5 rounded-[22px] bg-[#17171b] p-6 text-white">
          <p className="mb-6 text-sm font-black tracking-[0.3em] text-white/60">POEM</p>
          <div className="grid gap-5 text-lg font-bold leading-relaxed">{publishedLines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div>
        </div>
      </aside>
    </section>
  );
}

function FeedbackContractPills({ contract }: { contract: FeedbackContract }) {
  const items = [
    contract.allowCloseReading && "Close reading",
    contract.allowTechnicalRevision && "Revision",
    contract.allowPossibleLines && "Possible lines",
    contract.allowCoCreationInvite && "Co-write invite",
  ].filter(Boolean);
  return <div className="flex flex-wrap gap-2">{items.map((item) => <BlueChip key={String(item)}>{String(item)}</BlueChip>)}</div>;
}

function StatusPills({ post }: { post: Post }) {
  return (
    <div className="flex flex-wrap gap-2">
      <BlueChip>{collaborationLabel(post)}</BlueChip>
      {isCoCreativePost(post) && <BlueChip>{patternLabel(getCoCreativePattern(post))}</BlueChip>}
      <BlueChip>{visibilityLabel(post.visibility)}</BlueChip>
      <BlueChip>{post.lockState.status}</BlueChip>
      <BlueChip>{post.anonymous ? "anonymous" : post.attributionName ? `by ${post.attributionName}` : post.attributionPolicy.defaultStyle.split("_").join(" ")}</BlueChip>
      {post.coAuthorIds && post.coAuthorIds.length > 0 && <BlueChip>{post.coAuthorIds.length + 1} signatures</BlueChip>}
      {post.visibleUserIds && post.visibleUserIds.length > 0 && <BlueChip>{post.visibleUserIds.length} visible people</BlueChip>}
      {post.hiddenUserIds && post.hiddenUserIds.length > 0 && <BlueChip>{post.hiddenUserIds.length} hidden people</BlueChip>}
    </div>
  );
}

function commentKindMeta(kind: string) {
  const map: Record<string, { label: string; className: string }> = {
    "poetic continuation": { label: "Poetic continuation", className: "bg-white text-[#001eff]" },
    "emotional feedback": { label: "Emotional feedback", className: "bg-[#fff1f1] text-[#f05252]" },
    "theme interpretation": { label: "Reader theme", className: "bg-[#eef0ff] text-[#001eff]" },
    "revision suggestion": { label: "Revision hint", className: "bg-[#fff6df] text-[#8a5a00]" },
    "casual response": { label: "Casual comment", className: "bg-[#efefef] text-[#777]" },
  };
  return map[kind] ?? { label: "Comment", className: "bg-[#efefef] text-[#777]" };
}

function Avatar({ author, muted = false }: { author: Author; muted?: boolean }) {
  return <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${muted ? "bg-[#969dff]" : "bg-[#001eff]"} text-sm font-black text-white`}>{author.avatar}</span>;
}

function ProfileStat({ value, label }: { value: string; label: string }) {
  return <div><p className="text-[42px] font-black leading-none text-[#001eff] lg:text-[52px]">{value}</p><p className="text-[18px] leading-none lg:text-[22px]">{label}</p></div>;
}

function Metric({ icon, value, onClick, active = false }: { icon: ReactNode; value: number; onClick: () => void; active?: boolean }) {
  return <button type="button" onClick={onClick} className={`flex h-[34px] min-w-[65px] items-center justify-center gap-1 rounded-full px-3 font-black text-white ${active ? "bg-[#ff4b4f]" : "bg-[#bdbdbd]"}`}>{icon}{value}</button>;
}

function MetricBlock({ value, label }: { value: string; label: string }) {
  return <div className="rounded-[16px] bg-[#eef0ff] px-3 py-3"><p className="text-xl font-black text-[#001eff]">{value}</p><p className="text-[11px] font-black text-[#737783]">{label}</p></div>;
}

function Tag({ children }: { children: string }) {
  return <span className="rounded-full border border-white px-2 py-0.5 text-[8px] font-bold text-white">{children}</span>;
}

function SmallBadge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white px-2 py-1 text-[8px] font-black text-black">{children}</span>;
}

function BlueChip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-[#eef0ff] px-3 py-1 text-xs font-black text-[#001eff]">{children}</span>;
}

function cardBackground(color: Post["color"]) {
  if (color === "red") return "bg-[#ff4b4f]";
  if (color === "moon") return "bg-[#17171b]";
  return "bg-[#001eff]";
}

function cardImageStyle(post: Post): CSSProperties | undefined {
  const image = post.imageUrl || presetImage(post.imagePreset);
  if (!image) return undefined;
  return {
    backgroundImage: `linear-gradient(rgba(0,21,255,.3),rgba(0,21,255,.3)),url(${image})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

function presetImage(preset?: Post["imagePreset"]) {
  if (preset === "city") return "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=80";
  if (preset === "moon") return "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=900&q=80";
  if (preset === "roses") return "https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=900&q=80";
  if (preset === "stars") return "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=900&q=80";
  return undefined;
}

function feedbackPlaceholder(contract: FeedbackContract) {
  if (contract.allowPossibleLines) return "suggest a line, or leave close reading";
  if (contract.allowTechnicalRevision) return "point to wording, rhythm, structure, or clarity";
  return "what image, emotion, or theme do you read here?";
}

function visibilityLabel(visibility: Post["visibility"]) {
  if (visibility === "public") return "Public";
  if (visibility === "private") return "Private Draft";
  if (visibility === "invited") return "Invited";
  if (visibility === "group") return "Group Only";
  return "Challenge";
}

function memoryLabel(memory: WorkMemory) {
  if (memory.memoryType === "owned") return "Owned work";
  if (memory.memoryType === "coauthored") return "Co-authored";
  if (memory.memoryType === "helped") return "Helped";
  if (memory.memoryType === "saved_fragment") return "Saved fragment";
  if (memory.memoryType === "published") return "Published";
  return "Private draft";
}

function roleLabel(role: WorkMemory["role"]) {
  if (role === "co_author") return "co-author";
  if (role === "owner") return "owner";
  if (role === "helper") return "helper";
  if (role === "saver") return "saver";
  return "reader";
}

function shorten(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function payloadSummary(payload: Record<string, unknown>) {
  const text = payload.text ?? payload.label ?? payload.body ?? payload.surface ?? payload.type;
  if (typeof text === "string") return text;
  return Object.entries(payload).map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
}
