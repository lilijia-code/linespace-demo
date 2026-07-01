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
  spacesSeed,
  suggestionsSeed,
  turnTakingContract,
  versionEventsSeed,
} from "./data/mockData";
import type {
  ActionButtonProps,
  Author,
  Channel,
  CollaborationMode,
  Comment,
  Contribution,
  CreateSettings,
  CreationKind,
  EditablePoemLine,
  FeedbackContract,
  Fragment,
  GroupChatMessage,
  GroupTopic,
  GroupTopicType,
  PoemLine,
  Post,
  SearchProps,
  Space,
  Suggestion,
  SuggestionGroup,
  VersionEvent,
  View,
} from "./types";

type SpacesTab = "Groups" | "Challenges" | "Fragments" | "Map";
type FragmentActionName = "save" | "invite" | "chat" | "thread" | "branch";
type ChallengeStartMode = "chat" | "relay";
type TopicComposerMode = GroupTopicType;

const navItems: { label: string; view: View }[] = [
  { label: "Home", view: "home" },
  { label: "Spaces", view: "spaces" },
  { label: "Create", view: "create" },
  { label: "Activity", view: "activity" },
  { label: "Profile", view: "profile" },
];

const creationKinds: CreationKind[] = [
  "Private fragment",
  "Feedback-supported draft",
  "Group post",
  "Challenge response",
  "Turn-taking thread",
  "Final version",
];

const topicModes: { value: TopicComposerMode; label: string; hint: string }[] = [
  { value: "poetry_discussion", label: "Poetry topic", hint: "Discuss image, rhythm, form, or theme." },
  { value: "free_chat", label: "Free chat", hint: "Open conversation for the group." },
  { value: "post_forward", label: "Forward post", hint: "Bring a post into the group for response." },
  { value: "co_creation_call", label: "Co-creation call", hint: "Invite members to branch or write together." },
];

const eventCopy: Record<VersionEvent["type"], string> = {
  created: "Created",
  commented: "Commented",
  suggestion_generated: "AI organized suggestion",
  suggestion_accepted: "Suggestion accepted",
  line_added: "Line added",
  line_locked: "Line locked",
  line_reordered: "Lines reordered",
  version_locked: "Version locked",
  published: "Published",
  pdf_exported: "PDF exported",
  fragment_saved: "Fragment saved",
  branch_created: "Branch created",
};

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
    by: index === 0 ? `Started by ${post.author.name.split(" ")[0]}` : post.mode === "turn_taking" ? "Added in relay" : "Added from reader comments",
    locked: post.lockedLineIds?.includes(`${post.id}-l${index}`) ?? (post.lockState.status === "locked" || post.lockState.status === "published"),
  }));
}

function nowIso() {
  return new Date().toISOString();
}

function extractMentions(text: string) {
  return Array.from(new Set(text.match(/@[A-Za-z0-9_.-]+/g) ?? []));
}

export default function App() {
  const [view, setView] = useState<View>("home");
  const [posts, setPosts] = useState<Post[]>(postsSeed);
  const [comments, setComments] = useState<Comment[]>(commentsSeed);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(suggestionsSeed);
  const [fragments, setFragments] = useState<Fragment[]>(fragmentsSeed);
  const [contributions, setContributions] = useState<Contribution[]>(contributionsSeed);
  const [versionEvents, setVersionEvents] = useState<VersionEvent[]>(versionEventsSeed);
  const [groupTopics, setGroupTopics] = useState<GroupTopic[]>(groupTopicsSeed);
  const [groupMessages, setGroupMessages] = useState<GroupChatMessage[]>(groupChatMessagesSeed);
  const [poemLinesByPost, setPoemLinesByPost] = useState<Record<string, PoemLine[]>>(poemLinesByPostSeed);
  const [activePostId, setActivePostId] = useState(postsSeed[0].id);
  const [spacesTab, setSpacesTab] = useState<SpacesTab>("Groups");
  const [activeSpaceId, setActiveSpaceId] = useState(spacesSeed[0].id);
  const [activeGroupChatSpaceId, setActiveGroupChatSpaceId] = useState(spacesSeed[0].id);
  const [activeGroupTopicId, setActiveGroupTopicId] = useState<string>("topic-cyber-reading");
  const [activeChannelId, setActiveChannelId] = useState(channelsSeed.find((channel) => channel.kind === "challenge" || channel.kind === "turn_taking")?.id ?? channelsSeed[0].id);
  const [spaceNotice, setSpaceNotice] = useState("Choose a group, challenge, or fragment to start a co-creative workflow.");
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
  const [creationKind, setCreationKind] = useState<CreationKind>("Feedback-supported draft");
  const [createMode, setCreateMode] = useState<CollaborationMode>("facilitated");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [settings, setSettings] = useState<CreateSettings>({
    publicPost: false,
    allowComments: true,
    allowReplies: true,
    allowQuote: false,
    allowBuild: true,
    allowLike: false,
    showHistory: true,
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
    const visible = posts.filter((post) => post.visibility !== "private" || post.ownerId === currentUser.id);
    if (!query) return visible;
    return visible.filter((post) =>
      [post.body, post.stage, post.mode, post.kind, post.author.name, post.author.handle, post.lockState.status, ...post.lines, ...post.tags]
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
    if (activeChannel?.kind === "challenge" || activeChannel?.kind === "turn_taking") {
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
    updatePost(postId, (post) => ({
      ...post,
      stage: post.stage === "Started from" ? "Poem so far" : post.stage,
      showHistory: true,
      lockState: { status: "locked", lockedBy: currentUser.id, lockedAt: nowIso(), canBranch: true },
    }));
    setPoemLinesByPost((current) => ({
      ...current,
      [postId]: (current[postId] ?? []).map((line) => ({ ...line, locked: true })),
    }));
    addEvent(postId, "version_locked", { versionId: posts.find((post) => post.id === postId)?.currentVersionId ?? postId, label: "Locked from workbench" });
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

    if (creationKind === "Private fragment") {
      const fragment: Fragment = {
        id: `f${Date.now()}`,
        text,
        creator: currentUser,
        creatorId: currentUser.id,
        anonymous: !settings.publicPost,
        visibility: settings.publicPost ? "public" : "private",
        tags: createTags.length ? createTags : ["#fragment"],
        mood: "new fragment",
        source: "manual",
        savedBy: [currentUser.id],
        inspiredWorks: [],
        allowInvite: settings.allowBuild,
        allowRemix: settings.allowQuote,
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

    const isTurnTaking = createMode === "turn_taking" || creationKind === "Turn-taking thread" || creationKind === "Challenge response";
    const isFinal = creationKind === "Final version";
    const visibility: Post["visibility"] = settings.publicPost ? "public" : creationKind === "Group post" ? "group" : creationKind === "Challenge response" ? "challenge" : "private";
    const next: Post = {
      id: `p${Date.now()}`,
      author: currentUser,
      mode: isTurnTaking ? "turn_taking" : "facilitated",
      kind: isTurnTaking ? "thread" : isFinal ? "final" : "draft",
      ownerId: currentUser.id,
      authorIds: [currentUser.id],
      spaceId: creationKind === "Group post" ? "space-cyber-lyric" : undefined,
      channelId: creationKind === "Challenge response" || creationKind === "Turn-taking thread" ? "channel-moon-relay" : "channel-draft-feedback",
      stage: isFinal ? "Final Version" : "Started from",
      visibility,
      body: text,
      lines: [text],
      tags: createTags.length > 0 ? createTags : ["#poem"],
      color: backgroundImage ? "photo" : isFinal ? "red" : "blue",
      imageUrl: backgroundImage || undefined,
      repliesOpen: settings.allowComments || settings.allowReplies,
      allowReplies: settings.allowReplies,
      allowBuild: isTurnTaking || settings.allowBuild,
      quoteAllowed: settings.allowQuote || isTurnTaking,
      allowLike: settings.allowLike || settings.publicPost,
      showHistory: settings.showHistory || isTurnTaking,
      invited: isTurnTaking ? ["@Lin", "@Jia"] : [],
      likes: 0,
      comments: 0,
      quotes: 0,
      saves: 0,
      liked: false,
      saved: false,
      contributors: 1,
      feedbackContract: isTurnTaking ? turnTakingContract : settings.allowBuild ? defaultFeedbackContract : closeReadingContract,
      attributionPolicy: isTurnTaking ? collectiveAttribution : helperAttribution,
      lockState: isFinal ? { status: "locked", lockedBy: currentUser.id, lockedAt: nowIso(), canBranch: true } : { status: "unlocked", canBranch: true },
      currentVersionId: `v-${Date.now()}`,
      turnQueue: isTurnTaking ? [authors.lin.id, authors.jia.id, currentUser.id] : undefined,
      activeTurnUserId: isTurnTaking ? authors.lin.id : undefined,
      lockedLineIds: [],
    };
    setPosts((current) => [next, ...current]);
    setPoemLinesByPost((current) => ({ ...current, [next.id]: makePoemLines(next) }));
    addEvent(next.id, "created", { text, mode: next.mode, kind: next.kind });
    if (isFinal) addEvent(next.id, "version_locked", { versionId: next.currentVersionId, label: "Created as locked final" });
    setActivePostId(next.id);
    setBackgroundImage("");
    setCreateTags(["#AI_memory", "#micro_poetry"]);
    setTagDraft("");
    navigate("detail");
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
    const isRelay = startMode === "relay";
    const starter = isRelay
      ? channel.prompt ?? "The first line waits for the next turn."
      : `Brainstorm for ${channel.title}: collect images first, then decide what becomes the poem.`;
    const next: Post = {
      id: `p${Date.now()}`,
      author: currentUser,
      mode: isRelay ? "turn_taking" : "facilitated",
      kind: isRelay ? "thread" : "draft",
      ownerId: currentUser.id,
      authorIds: isRelay ? [currentUser.id, authors.jia.id, authors.lin.id] : [currentUser.id],
      spaceId: channel.spaceId,
      channelId: channel.id,
      stage: "Started from",
      source: `Challenge: ${channel.title}`,
      visibility: channel.visibility === "public" ? "challenge" : "group",
      body: starter,
      lines: [starter],
      tags: Array.from(new Set(["#challenge", ...channel.tags])),
      color: isRelay ? "moon" : "photo",
      repliesOpen: true,
      allowReplies: true,
      allowBuild: true,
      quoteAllowed: true,
      allowLike: true,
      showHistory: true,
      invited: isRelay ? [authors.jia.handle, authors.lin.handle] : [authors.lin.handle, authors.jia.handle, authors.maya.handle],
      likes: 0,
      comments: 0,
      quotes: 0,
      saves: 0,
      liked: false,
      saved: false,
      contributors: isRelay ? 3 : 1,
      feedbackContract: isRelay ? turnTakingContract : defaultFeedbackContract,
      attributionPolicy: isRelay ? collectiveAttribution : helperAttribution,
      lockState: { status: "unlocked", canBranch: true },
      currentVersionId: `v-${Date.now()}`,
      turnQueue: isRelay ? [authors.jia.id, authors.lin.id, currentUser.id] : undefined,
      activeTurnUserId: isRelay ? authors.jia.id : undefined,
      lockedLineIds: [],
    };
    setPosts((current) => [next, ...current]);
    setPoemLinesByPost((current) => ({ ...current, [next.id]: makePoemLines(next) }));
    addEvent(next.id, "created", { workflow: isRelay ? "challenge_turn_taking" : "challenge_group_chat", challenge: channel.title, space: space?.name, text: starter });
    setActivePostId(next.id);
    setActiveChannelId(channel.id);
    if (space) setActiveSpaceId(space.id);
    setSpacesTab("Challenges");
    setSpaceNotice(`${channel.title} started as ${isRelay ? "a turn-taking relay" : "a group chat brainstorm"}.`);
    navigate("detail");
  };

  const fragmentAction = (fragmentId: string, action: FragmentActionName) => {
    const fragment = fragments.find((item) => item.id === fragmentId);
    if (!fragment) return;
    if (action === "chat" || action === "thread" || action === "branch") {
      const isThread = action === "thread";
      const isChat = action === "chat";
      const starter = isChat ? `Reading this fragment together: ${fragment.text}` : fragment.text;
      const next: Post = {
        id: `p${Date.now()}`,
        author: currentUser,
        mode: isThread ? "turn_taking" : "facilitated",
        kind: isThread ? "thread" : "draft",
        ownerId: currentUser.id,
        authorIds: isThread ? [currentUser.id, authors.lin.id, authors.jia.id] : [currentUser.id],
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
        contributors: isThread ? 3 : 1,
        feedbackContract: isThread ? turnTakingContract : isChat ? closeReadingContract : defaultFeedbackContract,
        attributionPolicy: isThread ? collectiveAttribution : helperAttribution,
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
        if (action === "invite") return { ...item, invitedBy: Array.from(new Set([...item.invitedBy, currentUser.id])) };
        return { ...item, activeChatCount: item.activeChatCount + 1 };
      }),
    );
    if (action === "save") {
      addEvent(fragmentId, "fragment_saved", { fragmentId, text: fragment.text });
      setSpaceNotice("Fragment saved to your notes.");
    }
    if (action === "invite") setSpaceNotice("Invitation marked. The creator can be pulled into a co-writing flow later.");
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
              publishPost={publishPost}
              creationKind={creationKind}
              setCreationKind={setCreationKind}
              createMode={createMode}
              setCreateMode={setCreateMode}
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
              tab={profileTab}
              setTab={setProfileTab}
              openPost={openPost}
              openQuote={openQuote}
              toggleLike={toggleLike}
              toggleSave={toggleSave}
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
              contributions={activeContributions}
              sourceFragment={fragments.find((fragment) => fragment.id === activePost.sourceFragmentId)}
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
          const active = item.view === view || (view === "detail" && item.view === "home") || (view === "history" && item.view === "home");
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
  fragmentAction: (fragmentId: string, action: FragmentActionName) => void;
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
      {tab === "Groups" && <GroupsPanel spaces={spaces} channels={channels} posts={posts} activeSpaceId={activeSpaceId} setActiveSpaceId={setActiveSpaceId} startGroupDraft={startGroupDraft} openGroupChat={openGroupChat} forwardPostToGroup={forwardPostToGroup} openPost={openPost} />}
      {tab === "Challenges" && (
        <ChallengesPanel
          channels={channels.filter((channel) => channel.kind === "challenge" || channel.kind === "turn_taking")}
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
            <section>
              <h4 className="font-mono text-2xl font-black text-[#001eff]">Group feedback workflow</h4>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <WorkflowStep index="1" title="Name the contract" body="Author chooses encouragement, close reading, line revision, possible lines, or co-writing invite." />
                <WorkflowStep index="2" title="Discuss in context" body="Members comment inside the group, keeping brainstorm material outside the poem." />
                <WorkflowStep index="3" title="Organize signals" body="AI sorts comments into possible lines, themes, tone feedback, and revision hints." />
                <WorkflowStep index="4" title="Author locks" body="The author accepts, edits, ignores, then locks a version with contribution history." />
              </div>
            </section>

            <section>
              <h4 className="font-mono text-2xl font-black text-[#001eff]">Channels</h4>
              <div className="mt-4 grid gap-3">
                {relatedChannels.map((channel) => (
                  <div key={channel.id} className="rounded-[20px] border-2 border-[#e8e0d9] p-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <p className="font-black text-[#001eff]">{channel.title}</p>
                        <p className="mt-1 text-sm font-bold text-[#737783]">{channel.prompt}</p>
                      </div>
                      <button type="button" onClick={() => startGroupDraft(activeSpace.id, channel.id)} className="rounded-full border-2 border-[#001eff] px-5 py-2 text-sm font-black text-[#001eff]">
                        Start feedback draft
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">{channel.tags.map((tag) => <BlueChip key={tag}>{tag}</BlueChip>)}</div>
                  </div>
                ))}
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
            <div className="rounded-[22px] border-2 border-[#001eff] p-4">
              <p className="font-mono text-xl font-black text-[#001eff]">Recent works</p>
              <div className="mt-3 grid gap-2">
                {relatedPosts.slice(0, 3).map((post) => (
                  <div key={post.id} className="rounded-[16px] bg-[#eef0ff] p-3">
                    <button type="button" onClick={() => openPost(post.id)} className="w-full text-left">
                      <p className="text-sm font-black text-[#001eff]">{post.mode === "turn_taking" ? "Turn-taking" : "Facilitated"} · {post.lockState.status}</p>
                      <p className="mt-1 text-sm font-bold">{shorten(post.body, 72)}</p>
                    </button>
                    <button type="button" onClick={() => forwardPostToGroup(activeSpace.id, post.id)} className="mt-3 rounded-full bg-white px-4 py-1.5 text-xs font-black text-[#001eff]">
                      <Repeat2 size={13} className="mr-1 inline" /> Forward to chat
                    </button>
                  </div>
                ))}
                {relatedPosts.length === 0 && <p className="text-sm font-bold text-[#737783]">No works in this group yet.</p>}
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
                    <p className="font-mono text-sm font-black uppercase text-[#001eff]">{channel.defaultMode === "turn_taking" ? "Form-limited relay" : "Theme challenge"}</p>
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
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => joinChallenge(channel.id, "chat")} className="rounded-full bg-[#001eff] px-4 py-2 text-sm font-black text-white">
                  Group chat brainstorm
                </button>
                <button type="button" onClick={() => joinChallenge(channel.id, "relay")} className="rounded-full border-2 border-[#ff4b4f] px-4 py-2 text-sm font-black text-[#ff4b4f]">
                  Turn-taking thread
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

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] bg-[#eef0ff] p-5">
            <p className="font-mono text-xl font-black text-[#001eff]">Group chat brainstorm</p>
            <p className="mt-2 text-sm font-bold leading-relaxed text-[#3b3d45]">Use this when participants need images, direction, and feedback before any line becomes canonical.</p>
            <button type="button" onClick={() => joinChallenge(activeChannel.id, "chat")} className="mt-4 rounded-full bg-[#001eff] px-5 py-2 text-sm font-black text-white">
              Start chat draft
            </button>
          </div>
          <div className="rounded-[22px] bg-[#fff3f6] p-5">
            <p className="font-mono text-xl font-black text-[#ff4b4f]">Turn-taking relay</p>
            <p className="mt-2 text-sm font-bold leading-relaxed text-[#3b3d45]">Use this when each turn adds a line, the queue is visible, and lock-in preserves shared authorship.</p>
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
              <WorkflowStep index="2" title="Choose pathway" body="Brainstorm stays outside the poem; relay lines enter a visible sequence." />
              <WorkflowStep index="3" title="Track turns" body="Queue, pass rules, locked lines, and collective attribution make boundaries explicit." />
              <WorkflowStep index="4" title="Finish together" body="The final form can be locked with a contribution chain and shared credit." />
            </div>
          </div>
          <aside className="rounded-[22px] border-2 border-[#e8e0d9] p-4">
            <p className="font-mono text-xl font-black text-[#001eff]">Active works</p>
            <div className="mt-3 grid gap-2">
              {activePosts.slice(0, 4).map((post) => (
                <button key={post.id} type="button" onClick={() => openPost(post.id)} className="rounded-[16px] bg-[#eef0ff] p-3 text-left">
                  <p className="text-sm font-black text-[#001eff]">{post.mode === "turn_taking" ? "Relay thread" : "Chat brainstorm"}</p>
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

function FragmentsPanel({ fragments, fragmentAction }: { fragments: Fragment[]; fragmentAction: (fragmentId: string, action: FragmentActionName) => void }) {
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
            <path key={post.id} d={`M50 88 C50 ${65 - index * 4}, ${24 + index * 15} ${62 - index * 8}, ${24 + index * 15} ${48 - index * 7}`} stroke={post.mode === "turn_taking" ? "#ff4b4f" : "#001eff"} strokeWidth="0.55" fill="none" opacity="0.55" />
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
            className={`absolute max-w-[190px] text-left font-black leading-tight ${post.mode === "turn_taking" ? "text-[#ff4b4f]" : "text-[#001eff]"}`}
            style={{ left: `${22 + index * 15}%`, top: `${46 - index * 7}%` }}
          >
            <span className="mb-1 inline-grid h-6 w-6 place-items-center rounded-full bg-[#eef0ff] text-[10px]">{post.mode === "turn_taking" ? "T" : "F"}</span>
            <span className="block text-sm">{shorten(post.body, 54)}</span>
          </button>
        ))}
      </section>
      <aside className="rounded-[26px] border-2 border-[#001eff] p-5">
        <p className="font-mono text-2xl font-black text-[#001eff]">Map signals</p>
        <div className="mt-5 grid gap-3 text-sm font-black">
          <span>{posts.filter((post) => post.mode === "turn_taking").length} turn-taking threads</span>
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
  publishPost: (event: FormEvent) => void;
  creationKind: CreationKind;
  setCreationKind: (kind: CreationKind) => void;
  createMode: CollaborationMode;
  setCreateMode: (mode: CollaborationMode) => void;
}) {
  const { draft, setDraft, createTags, setCreateTags, tagDraft, setTagDraft, backgroundImage, setBackgroundImage, settings, setSettings, publishPost, creationKind, setCreationKind, createMode, setCreateMode } = props;
  const update = (key: keyof CreateSettings) => setSettings({ ...settings, [key]: !settings[key] });
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
  const row = (key: keyof CreateSettings, label: string) => (
    <button type="button" onClick={() => update(key)} className="flex h-[48px] items-center justify-between rounded-xl border border-[#ded7cd] px-3 text-left text-[16px] font-bold lg:text-[18px]">
      {label}
      <span className={`grid h-4 w-4 place-items-center rounded border border-[#001eff] ${settings[key] ? "bg-[#001eff]" : "bg-white"}`}>
        {settings[key] && <Check size={12} className="text-white" />}
      </span>
    </button>
  );
  return (
    <form onSubmit={publishPost} className="max-w-[1074px] pt-1">
      <h1 className="font-mono text-[36px] font-black leading-none text-[#001eff] lg:text-[38px]">Create / Start</h1>
      <p className="mt-2 text-base font-black text-[#737783]">Choose whether this is private material, feedback-supported writing, or explicit turn-taking co-creation.</p>

      <section className="mt-6 grid gap-4 rounded-[24px] border-2 border-[#e8e0d9] p-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div>
          <p className="mb-3 font-mono text-lg font-black text-[#001eff]">Creation type</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {creationKinds.map((kind) => (
              <button key={kind} type="button" onClick={() => {
                setCreationKind(kind);
                if (kind === "Turn-taking thread" || kind === "Challenge response") setCreateMode("turn_taking");
                if (kind === "Feedback-supported draft" || kind === "Group post" || kind === "Private fragment") setCreateMode("facilitated");
              }} className={`min-h-[64px] rounded-[16px] border-2 px-4 py-3 text-left text-sm font-black ${creationKind === kind ? "border-[#001eff] bg-[#eef0ff] text-[#001eff]" : "border-[#ded7cd] text-[#444]"}`}>
                {kind}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-3 font-mono text-lg font-black text-[#001eff]">Collaboration mode</p>
          <div className="grid gap-3">
            <ModeButton active={createMode === "facilitated"} title="Facilitated Writing" description="One author keeps final control; readers provide comments, interpretations, and possible lines." onClick={() => setCreateMode("facilitated")} />
            <ModeButton active={createMode === "turn_taking"} title="Co-creative Turn-taking Writing" description="Participants agree to add lines in sequence and share attribution through a visible contract." onClick={() => setCreateMode("turn_taking")} />
          </div>
        </div>
      </section>

      <textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="mt-6 h-[210px] w-full resize-none rounded-2xl border border-[#b7c4d5] p-6 text-[24px] outline-none lg:p-7 lg:text-[28px]" />
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
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <button type="button" onClick={() => setSettings({ ...settings, publicPost: false })} className={`h-[66px] rounded-xl border text-[24px] font-black lg:text-[27px] ${!settings.publicPost ? "border-[#ff414f] bg-[#fff4f6] text-[#222]" : "border-[#bdbdbd] text-[#888]"}`}>Private / Limited</button>
        <button type="button" onClick={() => setSettings({ ...settings, publicPost: true })} className={`h-[66px] rounded-xl border text-[24px] font-black lg:text-[27px] ${settings.publicPost ? "border-[#001eff] bg-[#eef0ff] text-black" : "border-[#bdbdbd] text-[#888]"}`}>Public Post</button>
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {row("allowComments", "Allow comments")}
        {settings.publicPost && row("allowReplies", "Allow replies")}
        {row("allowQuote", "Allow quote / branch")}
        {settings.publicPost && row("allowBuild", "Allow others to build")}
        {row("showHistory", "Show history")}
        {!settings.publicPost && row("allowLike", "Allow like")}
      </div>
      <p className="mt-6 rounded-2xl bg-[#eef0ff] px-5 py-4 text-base font-black text-[#001eff]">
        You decide what enters the poem. Comments and AI suggestions stay outside the poem until accepted or locked.
      </p>
      <button className="mt-8 h-[58px] w-full rounded-2xl bg-[#f43f5e] text-[28px] font-black text-white lg:text-[32px]">
        {creationKind === "Private fragment" ? "Save Fragment" : settings.publicPost ? "Publish / Start" : "Save Draft"}
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
                  <p className="text-sm font-black text-[#001eff]">{post.mode === "turn_taking" ? "Relay" : "Draft"} · {post.stage}</p>
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
          <p className="mt-2 text-xs font-bold text-[#737783]">{post.author.handle} · {post.mode.replace("_", " ")} · {post.tags.slice(0, 3).join(" ")}</p>
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

function ModeButton({ active, title, description, onClick }: { active: boolean; title: string; description: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-[18px] border-2 p-4 text-left ${active ? "border-[#001eff] bg-[#001eff] text-white" : "border-[#d7d7d7] text-[#222]"}`}>
      <span className="block text-lg font-black">{title}</span>
      <span className={`mt-1 block text-sm font-bold ${active ? "text-white/80" : "text-[#737783]"}`}>{description}</span>
    </button>
  );
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
    openHistory,
    navigate,
    searchInput,
    setSearchInput,
    runSearch,
  } = props;
  const locked = post.lockState.status === "locked" || post.lockState.status === "published";
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
            <button type="button" onClick={() => openHistory(post.id)} className="rounded-full border-2 border-[#001eff] px-5 py-2 text-left font-black text-[#001eff]">View history</button>
            <button type="button" onClick={() => lockVersion(post.id)} disabled={locked} className="rounded-full bg-[#001eff] px-5 py-2 text-left font-black text-white disabled:bg-[#aeb2d3]">
              {locked ? "Version locked" : "Lock version"}
            </button>
          </div>
          {(space || channel || sourceFragment) && <OriginPanel post={post} space={space} channel={channel} sourceFragment={sourceFragment} openContext={openContext} />}
        </section>
        {post.mode === "facilitated" ? (
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
        )}
      </div>
      {post.mode === "facilitated" && !locked && (
        <EditPoemPanel
          title="Edit poem"
          subtitle="Review accepted reader lines, adjust the order, then save this version."
          badge="Author control"
          lines={poemLines.map((line) => ({ id: line.id, text: line.text, by: line.by }))}
          primaryAction="Save version"
          secondaryAction="View history"
          onPrimary={(nextLines) => saveAuthorVersion(post.id, nextLines)}
          onSecondary={() => openHistory(post.id)}
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
  let pathway = "Facilitated writing";
  if (post.mode === "turn_taking") pathway = channel?.kind === "challenge" ? "Challenge relay" : "Turn-taking relay";
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
            <p className="mt-1 text-xs text-[#737783]">{channel.kind.replace("_", " ")} · {channel.defaultMode.replace("_", " ")}</p>
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
          <h1 className="text-[21px] font-black text-[#001eff]">Facilitated Writing</h1>
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
            <h1 className="text-[26px] font-black text-[#ff4b4f]">Co-creative Turn-taking</h1>
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
  contributions,
  sourceFragment,
  navigate,
  searchInput,
  setSearchInput,
  runSearch,
}: {
  post: Post;
  events: VersionEvent[];
  contributions: Contribution[];
  sourceFragment?: Fragment;
  navigate: (view: View) => void;
} & SearchProps) {
  const sorted = [...events].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return (
    <div className="max-w-[980px]">
      <BrandBar navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />
      <button type="button" onClick={() => navigate("detail")} className="mb-5 font-mono text-[26px] font-black lg:text-[29px]">{"<"} back</button>
      <h1 className="mb-2 font-mono text-[40px] font-black text-[#001eff] lg:text-[42px]">Version & Contribution Log</h1>
      <p className="mb-6 text-lg font-bold text-[#737783]">{post.body}</p>
      {sourceFragment && (
        <div className="mb-5 rounded-[22px] border-2 border-[#001eff] p-5">
          <p className="font-black text-[#001eff]">Source fragment</p>
          <p className="mt-2 text-xl font-black">{sourceFragment.text}</p>
          <p className="mt-2 text-sm font-bold text-[#737783]">{sourceFragment.anonymous ? "Anonymous source" : `From ${sourceFragment.creator?.name}`}</p>
        </div>
      )}
      <div className="grid gap-4">
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
      <h2 className="mb-4 mt-8 font-mono text-[28px] font-black text-[#001eff]">Contribution records</h2>
      <div className="grid gap-3 sm:grid-cols-2">
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
  tab,
  setTab,
  openPost,
  openQuote,
  toggleLike,
  toggleSave,
  navigate,
  searchInput,
  setSearchInput,
  runSearch,
}: {
  posts: Post[];
  fragments: Fragment[];
  contributions: Contribution[];
  tab: string;
  setTab: (tab: string) => void;
  openPost: (id: string) => void;
  openQuote: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  navigate: (view: View) => void;
} & SearchProps) {
  const tabs = ["Posts", "Quotes", "Final Versions", "Saved", "Fragments", "Contributions"];
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
      {tab === "Fragments" ? (
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
      ) : (
        <MasonryGrid posts={filtered.slice(0, 8)} openPost={openPost} openQuote={openQuote} toggleLike={toggleLike} toggleSave={toggleSave} compact />
      )}
    </div>
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
  const panelLabel = post.stage === "Final Version" ? "Final Version" : post.mode === "turn_taking" ? "Relay so far" : "Poem so far";
  const topLabel = post.mode === "turn_taking" ? "Turn-taking" : post.source ? "Started from" : post.stage === "Final Version" ? "Final Version" : "Poem Starter";
  const borderColor = post.mode === "turn_taking" || post.color === "red" ? "border-[#ff4b4f]" : "border-[#001eff]";
  const accentText = post.mode === "turn_taking" || post.color === "red" ? "text-[#ff4b4f]" : "text-[#001eff]";
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
            <span className={`whitespace-nowrap rounded-full border-2 px-3 py-1.5 text-[15px] font-black leading-none ${post.stage === "Final Version" || post.mode === "turn_taking" ? "border-[#ff4b4f] text-[#ff4b4f]" : "border-[#001eff] text-[#001eff]"}`}>{panelLabel}</span>
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

function FragmentCard({ fragment, fragmentAction }: { fragment: Fragment; fragmentAction: (fragmentId: string, action: FragmentActionName) => void }) {
  const saved = fragment.savedBy.includes(currentUser.id);
  const invited = fragment.invitedBy.includes(currentUser.id);
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
        <button type="button" disabled={!fragment.allowInvite} onClick={() => fragmentAction(fragment.id, "invite")} className="rounded-full bg-[#eef0ff] px-4 py-2 text-sm font-black text-[#001eff] disabled:opacity-35">
          {invited ? "Invited" : "Invite creator"}
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
}: {
  title: string;
  subtitle: string;
  badge: string;
  lines: EditablePoemLine[];
  primaryAction: string;
  secondaryAction?: string;
  onPrimary: (lines: EditablePoemLine[]) => void;
  onSecondary?: () => void;
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
      <BlueChip>{post.mode === "turn_taking" ? "Turn-taking" : "Facilitated"}</BlueChip>
      <BlueChip>{visibilityLabel(post.visibility)}</BlueChip>
      <BlueChip>{post.lockState.status}</BlueChip>
      <BlueChip>{post.attributionPolicy.defaultStyle.split("_").join(" ")}</BlueChip>
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
