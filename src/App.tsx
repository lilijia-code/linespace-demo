import {
  Bookmark,
  Check,
  Heart,
  MessageCircle,
  PenLine,
  Quote,
  Repeat2,
  Search,
  Send,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { FormEvent, ReactNode, useMemo, useRef, useState } from "react";

type View = "home" | "streams" | "create" | "activity" | "profile" | "detail" | "quote" | "history";
type Stage = "Started from" | "Poem so far" | "Final Version";
type SuggestionGroup = "Possible lines" | "Reader themes" | "Tone feedback" | "Revision hints";

type Author = {
  name: string;
  handle: string;
  avatar: string;
};

type Post = {
  id: string;
  author: Author;
  stage: Stage;
  source?: string;
  visibility: "public" | "private";
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
};

type Comment = {
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

type Suggestion = {
  id: string;
  commentId: string;
  group: SuggestionGroup;
  text: string;
  status: "open" | "editing" | "ignored" | "added";
};

type PoemLine = {
  id: string;
  text: string;
  by: string;
};

type EditablePoemLine = {
  id: string;
  text: string;
  by: string;
};

type SearchProps = {
  searchInput: string;
  setSearchInput: (value: string) => void;
  runSearch: () => void;
};

type CreateSettings = {
  publicPost: boolean;
  allowComments: boolean;
  allowReplies: boolean;
  allowQuote: boolean;
  allowBuild: boolean;
  allowLike: boolean;
  showHistory: boolean;
};

const lili: Author = { name: "Lili lee", handle: "@lili", avatar: "Lili" };
const lin: Author = { name: "Lin", handle: "@linwrites", avatar: "Ac" };
const ro: Author = { name: "Ro", handle: "@Tomy", avatar: "Bc" };
const jia: Author = { name: "Jia", handle: "@jia.afterimage", avatar: "Bc" };
const alex: Author = { name: "Alex", handle: "@alex.verse", avatar: "Bc" };
const aria: Author = { name: "Aria", handle: "@aria.notes", avatar: "Ar" };
const mia: Author = { name: "Mia", handle: "@miathinks", avatar: "Mi" };

const postsSeed: Post[] = [
  {
    id: "p1",
    author: lili,
    stage: "Poem so far",
    source: undefined,
    visibility: "public",
    body: "I dreamed that AI remembered a city I had never visited.",
    lines: [
      "I dreamed that AI remembered a city I had never visited.",
      "The rain there knew my name.",
      "But the windows refused to open.",
      "So I stood at the street corner, pretending I had once left.",
    ],
    tags: ["#AI_memory", "#cyber_nostalgia", "#micro_poetry"],
    color: "photo",
    repliesOpen: true,
    allowReplies: true,
    allowBuild: true,
    quoteAllowed: true,
    allowLike: true,
    showHistory: true,
    invited: ["@Ray", "@Zhihan"],
    likes: 128,
    comments: 2,
    quotes: 2,
    saves: 2,
    liked: false,
    saved: false,
    contributors: 3,
    imagePreset: "city",
  },
  {
    id: "p2",
    author: { ...lili, avatar: "Aa" },
    stage: "Final Version",
    source: undefined,
    visibility: "public",
    body: "My phone keeps all the versions of myself I once deleted.",
    lines: [
      "My phone keeps all the versions of myself I once deleted.",
      "The album still kept an afternoon that failed to upload,",
      "and there is a version of me in my notes",
      "that learned goodbye before I did.",
      "Every time I cleared storage,",
      "I accidentally deleted part of my feelings.",
    ],
    tags: ["#AI_memory", "#cyber_nostalgia", "#micro_poetry"],
    color: "red",
    repliesOpen: true,
    allowReplies: true,
    allowBuild: true,
    quoteAllowed: true,
    allowLike: true,
    showHistory: true,
    invited: [],
    likes: 128,
    comments: 0,
    quotes: 2,
    saves: 2,
    liked: false,
    saved: false,
    contributors: 5,
  },
  {
    id: "p3",
    author: lili,
    stage: "Started from",
    source: "Based on Maya's line",
    visibility: "public",
    body: "My phone keeps all the versions of myself I once deleted.",
    lines: ["My phone keeps all the versions of myself I once deleted."],
    tags: ["#phone", "#myself"],
    color: "blue",
    repliesOpen: true,
    allowReplies: true,
    allowBuild: true,
    quoteAllowed: true,
    allowLike: true,
    showHistory: true,
    invited: [],
    likes: 128,
    comments: 3,
    quotes: 2,
    saves: 2,
    liked: false,
    saved: false,
    contributors: 1,
    imagePreset: "moon",
  },
  {
    id: "p4",
    author: lili,
    stage: "Started from",
    source: "Based on Ro's line",
    visibility: "public",
    body: "The moon looked like a loading icon above the apartment blocks.",
    lines: ["The moon looked like a loading icon above the apartment blocks."],
    tags: ["#Moon", "#night"],
    color: "moon",
    repliesOpen: true,
    allowReplies: true,
    allowBuild: false,
    quoteAllowed: false,
    allowLike: true,
    showHistory: true,
    invited: [],
    likes: 128,
    comments: 0,
    quotes: 2,
    saves: 2,
    liked: false,
    saved: false,
    contributors: 1,
    imagePreset: "roses",
  },
  {
    id: "p5",
    author: lili,
    stage: "Started from",
    source: undefined,
    visibility: "public",
    body: "I saved an unsaid sentence in my drafts.",
    lines: ["I saved an unsaid sentence in my drafts."],
    tags: ["#AI_memory", "#cyber_nostalgia", "#micro_poetry"],
    color: "moon",
    repliesOpen: true,
    allowReplies: true,
    allowBuild: true,
    quoteAllowed: true,
    allowLike: true,
    showHistory: true,
    invited: ["@Amy"],
    likes: 128,
    comments: 3,
    quotes: 2,
    saves: 2,
    liked: false,
    saved: false,
    contributors: 1,
    imagePreset: "stars",
  },
];

const commentsSeed: Comment[] = [
  { id: "c1", postId: "p1", author: lin, text: "The rain there knew my name.", kind: "poetic continuation", likes: 43, replies: 25, quotes: 12, liked: true },
  { id: "c2", postId: "p1", author: jia, text: "It feels like a city remembering someone who has not arrived yet.", kind: "theme interpretation", likes: 31, replies: 12, quotes: 7, liked: false },
  { id: "c3", postId: "p3", author: lin, text: "The album still kept an afternoon that failed to upload.", kind: "poetic continuation", likes: 43, replies: 25, quotes: 43, liked: true },
  { id: "c4", postId: "p3", author: alex, text: "This feels very bitter, like someone trying to erase themselves but failing.", kind: "emotional feedback", likes: 38, replies: 14, quotes: 9, liked: false },
  { id: "c5", postId: "p3", author: ro, text: "Maybe make the tone colder and less sentimental.", kind: "revision suggestion", likes: 27, replies: 8, quotes: 7, liked: false },
  { id: "c6", postId: "p5", author: mia, text: "This is so real.", kind: "casual response", likes: 22, replies: 6, quotes: 2, liked: false },
  { id: "c7", postId: "p5", author: aria, text: "I folded the sentence back into my drafts before morning.", kind: "poetic continuation", likes: 46, replies: 18, quotes: 15, liked: false },
  { id: "c8", postId: "p5", author: alex, text: "It has a private, unsent feeling, almost like self-archive.", kind: "theme interpretation", likes: 19, replies: 5, quotes: 3, liked: false },
];

const suggestionsSeed: Suggestion[] = [
  { id: "s1", commentId: "c1", group: "Possible lines", text: "The rain there knew my name.", status: "open" },
  { id: "s2", commentId: "c2", group: "Reader themes", text: "a city remembering someone who has not arrived yet", status: "open" },
  { id: "s3", commentId: "c3", group: "Possible lines", text: "The album still kept an afternoon that failed to upload.", status: "open" },
  { id: "s4", commentId: "c4", group: "Tone feedback", text: "More bitter, with a feeling of failed erasure.", status: "open" },
  { id: "s5", commentId: "c5", group: "Revision hints", text: "Make the speaker sound colder and less sentimental.", status: "open" },
  { id: "s6", commentId: "c7", group: "Possible lines", text: "I folded the sentence back into my drafts before morning.", status: "open" },
  { id: "s7", commentId: "c8", group: "Reader themes", text: "private, unsent feeling and self-archive", status: "open" },
];

const navItems: { label: string; view: View }[] = [
  { label: "Home", view: "home" },
  { label: "Streams", view: "streams" },
  { label: "Create", view: "create" },
  { label: "Activity", view: "activity" },
  { label: "Profile", view: "profile" },
];

function classifyReaderResponse(text: string): { kind: string; group?: SuggestionGroup; suggestion?: string } {
  const normalized = text.toLowerCase();
  if (/\b(maybe|revise|revision|make|tone|colder|less|more|try|change|edit)\b/.test(normalized)) {
    return { kind: "revision suggestion", group: "Revision hints", suggestion: text };
  }
  if (/\b(feels|feeling|bitter|sad|tender|uncanny|lonely|emotional|hurts|real)\b/.test(normalized)) {
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

export default function App() {
  const [view, setView] = useState<View>("home");
  const [posts, setPosts] = useState<Post[]>(postsSeed);
  const [activePostId, setActivePostId] = useState("p1");
  const [comments, setComments] = useState<Comment[]>(commentsSeed);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(suggestionsSeed);
  const [poemLines, setPoemLines] = useState<PoemLine[]>(postsSeed[0].lines.map((text, index) => ({ id: `l${index}`, text, by: index === 0 ? "Original post" : "Added from reader comments" })));
  const [createDraft, setCreateDraft] = useState("I dreamed that AI remembered a city I had never visited.");
  const [createTags, setCreateTags] = useState<string[]>(["#AI_memory", "#micro_poetry"]);
  const [tagDraft, setTagDraft] = useState("");
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [commentDraft, setCommentDraft] = useState("");
  const [quoteDraft, setQuoteDraft] = useState("I saved a version of myself inside the photo I never posted.");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [profileTab, setProfileTab] = useState("Posts");
  const [settings, setSettings] = useState<CreateSettings>({
    publicPost: false,
    allowComments: true,
    allowReplies: true,
    allowQuote: false,
    allowBuild: false,
    allowLike: false,
    showHistory: false,
  });

  const activePost = posts.find((post) => post.id === activePostId) ?? posts[0];
  const publicPosts = useMemo(() => posts.filter((post) => post.visibility === "public"), [posts]);
  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return publicPosts;
    return publicPosts.filter((post) =>
      [
        post.body,
        post.stage,
        post.author.name,
        post.author.handle,
        ...post.lines,
        ...post.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [publicPosts, searchQuery]);
  const activeComments = useMemo(() => comments.filter((comment) => comment.postId === activePost.id), [comments, activePost.id]);
  const activeSuggestions = useMemo(() => {
    const ids = new Set(activeComments.map((comment) => comment.id));
    return suggestions.filter((suggestion) => ids.has(suggestion.commentId));
  }, [suggestions, activeComments]);
  const activeSuggestionCount = countOpenSuggestions(activeComments, suggestions);
  const suggestionByComment = useMemo(() => {
    const map = new Map<string, Suggestion[]>();
    suggestions.forEach((suggestion) => {
      if (suggestion.status === "ignored" || suggestion.status === "added") return;
      map.set(suggestion.commentId, [...(map.get(suggestion.commentId) ?? []), suggestion]);
    });
    return map;
  }, [suggestions]);
  const publishFinalVersion = (postId: string) => {
    updatePost(postId, (post) => ({ ...post, stage: "Final Version", showHistory: true }));
  };

  const navigate = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const runSearch = () => {
    setSearchQuery(searchInput.trim());
    setView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
  };

  const openPost = (id: string) => {
    setActivePostId(id);
    navigate("detail");
  };

  const openQuote = (id: string) => {
    const target = posts.find((post) => post.id === id);
    if (!target?.quoteAllowed) return;
    setActivePostId(id);
    navigate("quote");
  };

  const updatePost = (id: string, updater: (post: Post) => Post) => {
    setPosts((current) => current.map((post) => (post.id === id ? updater(post) : post)));
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
    const next: Comment = { id: `c${Date.now()}`, postId, author: lili, text, kind: aiResult.kind, likes: 0, replies: 0, quotes: 0, liked: false };
    setComments((current) => [next, ...current]);
    if (targetPost?.allowBuild && aiResult.group && aiResult.suggestion) {
      const group = aiResult.group;
      const suggestionText = aiResult.suggestion;
      setSuggestions((current) => [{ id: `s${Date.now()}`, commentId: next.id, group, text: suggestionText, status: "open" }, ...current]);
    }
    updatePost(postId, (post) => ({ ...post, comments: post.comments + 1 }));
    setCommentDraft("");
  };

  const addSuggestionToPoem = (suggestion: Suggestion) => {
    const source = comments.find((comment) => comment.id === suggestion.commentId);
    const sourceName = source?.author.name.split(" ")[0] ?? "reader";
    const targetPostId = source?.postId ?? activePost.id;
    if (!poemLines.some((line) => line.text === suggestion.text)) {
      const action = suggestion.status === "editing" ? "Edited" : "Added";
      setPoemLines((current) => [...current, { id: `l${Date.now()}`, text: suggestion.text, by: `${action} from ${sourceName}'s comment` }]);
      updatePost(targetPostId, (post) => ({
        ...post,
        stage: "Poem so far",
        lines: post.lines.includes(suggestion.text) ? post.lines : [...post.lines, suggestion.text],
        contributors: post.contributors + 1,
      }));
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

  const publishPost = (event: FormEvent) => {
    event.preventDefault();
    const text = createDraft.trim();
    if (!text) return;
    const next: Post = {
      id: `p${Date.now()}`,
      author: lili,
      stage: "Started from",
      source: undefined,
      visibility: settings.publicPost ? "public" : "private",
      body: text,
      lines: [text],
      tags: createTags.length > 0 ? createTags : ["#poem"],
      color: backgroundImage ? "photo" : settings.publicPost ? "blue" : "red",
      imageUrl: backgroundImage || undefined,
      repliesOpen: settings.allowComments || settings.allowReplies,
      allowReplies: settings.allowReplies,
      allowBuild: settings.allowBuild,
      quoteAllowed: settings.allowQuote,
      allowLike: settings.allowLike || settings.publicPost,
      showHistory: settings.showHistory,
      invited: [],
      likes: 0,
      comments: 0,
      quotes: 0,
      saves: 0,
      liked: false,
      saved: false,
      contributors: 1,
    };
    setPosts((current) => [next, ...current]);
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
    setPoemLines((current) => [...current, { id: `l${Date.now()}`, text, by: "Added from your quote version" }]);
    navigate("detail");
  };

  const saveAuthorVersion = (postId: string, lines: EditablePoemLine[]) => {
    const cleaned = lines.map((line) => line.text.trim()).filter(Boolean);
    if (!cleaned.length) return;
    updatePost(postId, (post) => ({
      ...post,
      stage: "Poem so far",
      body: cleaned[0],
      lines: cleaned,
      contributors: Math.max(post.contributors, new Set(lines.map((line) => line.by)).size),
    }));
    setPoemLines(lines.map((line, index) => ({ id: line.id, text: line.text, by: index === 0 ? "Original post" : line.by })));
  };

  const publishQuoteVersion = (lines: EditablePoemLine[]) => {
    const cleaned = lines.map((line) => line.text.trim()).filter(Boolean);
    if (!cleaned.length) return;
    const next: Post = {
      id: `p${Date.now()}`,
      author: lili,
      stage: "Started from",
      source: `Based on ${activePost.author.name.split(" ")[0]}'s line`,
      visibility: "public",
      body: cleaned[0],
      lines: cleaned,
      tags: ["#quote_version", "#based_on_Lili"],
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
    };
    updatePost(activePost.id, (post) => ({ ...post, quotes: post.quotes + 1 }));
    setPosts((current) => [next, ...current]);
    setActivePostId(next.id);
    setProfileTab("Quotes");
    navigate("profile");
  };

  return (
    <div className="min-h-screen bg-white text-[#111]">
      <main className="grid min-h-screen grid-cols-[180px_minmax(0,1fr)]">
        <SideTabs view={view} navigate={navigate} />
        <section className="mx-auto w-full max-w-[1260px] px-6 pb-12 pt-12">
          {view === "home" && <HomePage posts={filteredPosts} searchQuery={searchQuery} clearSearch={clearSearch} openPost={openPost} openQuote={openQuote} toggleLike={toggleLike} toggleSave={toggleSave} navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />}
          {view === "streams" && <StreamsPage posts={filteredPosts} comments={comments} openPost={openPost} navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />}
          {view === "create" && <CreatePage draft={createDraft} setDraft={setCreateDraft} createTags={createTags} setCreateTags={setCreateTags} tagDraft={tagDraft} setTagDraft={setTagDraft} backgroundImage={backgroundImage} setBackgroundImage={setBackgroundImage} settings={settings} setSettings={setSettings} publishPost={publishPost} />}
          {view === "activity" && <ActivityPage openPost={() => openPost("p1")} navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />}
          {view === "profile" && (
            <ProfilePage
              posts={posts}
              tab={profileTab}
              setTab={setProfileTab}
              comments={comments}
              suggestionsByComment={suggestionByComment}
              commentDraft={commentDraft}
              activeSuggestionCount={0}
              setCommentDraft={setCommentDraft}
              addComment={(event) => addCommentToPost("p5", event)}
              likeComment={likeComment}
              addSuggestionToPoem={addSuggestionToPoem}
              editSuggestion={editSuggestion}
              updateSuggestion={updateSuggestion}
              ignoreSuggestion={ignoreSuggestion}
              saveAuthorVersion={saveAuthorVersion}
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
              poemLines={poemLines}
              commentDraft={commentDraft}
              activeSuggestionCount={activeSuggestionCount}
              setCommentDraft={setCommentDraft}
              addComment={(event) => addCommentToPost(activePost.id, event)}
              likeComment={likeComment}
              addSuggestionToPoem={addSuggestionToPoem}
              editSuggestion={editSuggestion}
              updateSuggestion={updateSuggestion}
              ignoreSuggestion={ignoreSuggestion}
              toggleLike={toggleLike}
              toggleSave={toggleSave}
              publishFinalVersion={publishFinalVersion}
              navigate={navigate}
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              runSearch={runSearch}
            />
          )}
          {view === "quote" && <QuotePage post={activePost} draft={quoteDraft} setDraft={setQuoteDraft} publishQuote={publishQuote} publishQuoteVersion={publishQuoteVersion} navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />}
          {view === "history" && <HistoryPage comments={activeComments} suggestions={activeSuggestions} poemLines={poemLines} navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />}
        </section>
      </main>
    </div>
  );
}

function SideTabs({ view, navigate }: { view: View; navigate: (view: View) => void }) {
  return (
    <aside className="sticky top-0 h-screen px-7 py-16">
      <nav className="grid gap-[64px]">
        {navItems.map((item) => {
          const active = item.view === view || (view === "detail" && item.view === "home");
          return (
            <button
              key={item.view}
              onClick={() => navigate(item.view)}
              className={`w-max font-mono text-[26px] font-black tracking-tight ${active ? "text-[#001eff]" : item.view === "create" ? "text-[#ff1f1f]" : "text-black"}`}
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
    <header className="mb-10 grid grid-cols-[190px_minmax(0,1fr)_52px_52px] items-center gap-7">
      <button onClick={() => navigate("home")} className="text-left">
        <h1 className="font-mono text-[36px] font-black leading-none tracking-tight text-[#001eff]">LINESPACE</h1>
        <p className="mt-1 text-sm font-black">write together, line by line</p>
      </button>
      {showSearch ? (
        <label className="relative block">
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
            className="h-11 w-full rounded-full border-0 bg-[#efefef] pl-9 pr-5 text-sm outline-none transition focus:ring-2 focus:ring-[#001eff]/25"
            placeholder="#search poem, people, line..."
          />
        </label>
      ) : (
        <div />
      )}
      <button type="button" onClick={() => submitSearch()} className="grid h-10 w-10 place-items-center rounded-full bg-[#001eff] text-white transition hover:scale-105">
        <Search size={21} />
      </button>
      <button onClick={() => navigate("profile")} className="grid h-10 w-10 place-items-center rounded-full bg-[#001eff] font-mono text-sm text-white">Lili</button>
    </header>
  );
}

function HomePage({
  posts,
  searchQuery,
  clearSearch,
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
  searchQuery: string;
  clearSearch: () => void;
  openPost: (id: string) => void;
  openQuote: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  navigate: (view: View) => void;
} & SearchProps) {
  return (
    <div>
      <BrandBar navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />
      <h2 className="mb-5 font-mono text-[28px] font-black">Streams</h2>
      {searchQuery && (
        <div className="mb-5 flex items-center gap-3">
          <span className="rounded-full bg-[#eef0ff] px-4 py-2 text-sm font-black text-[#001eff]">
            Search: {searchQuery} · {posts.length} result{posts.length === 1 ? "" : "s"}
          </span>
          <button onClick={clearSearch} className="rounded-full border-2 border-[#001eff] px-4 py-1.5 text-sm font-black text-[#001eff]">
            clear
          </button>
        </div>
      )}
      {posts.length > 0 ? (
        <MasonryGrid posts={posts.concat(posts.slice(1, 4))} openPost={openPost} openQuote={openQuote} toggleLike={toggleLike} toggleSave={toggleSave} />
      ) : (
        <div className="rounded-[24px] border-2 border-[#001eff] p-8 text-xl font-black text-[#001eff]">
          No matching poems yet. Try another word, tag, or poet.
        </div>
      )}
    </div>
  );
}

function StreamsPage({ posts, comments, openPost, navigate, searchInput, setSearchInput, runSearch }: { posts: Post[]; comments: Comment[]; openPost: (id: string) => void; navigate: (view: View) => void } & SearchProps) {
  const [streamView, setStreamView] = useState<"Map View" | "Chain View" | "List View">("Map View");
  const [selectedNodeId, setSelectedNodeId] = useState(posts[0]?.id ?? "");
  const selectedPost = posts.find((post) => post.id === selectedNodeId) ?? posts[0];
  const clusters = ["#AI_memory", "#cyber_nostalgia", "#rain_archive", "#city_poems", "#self_archive", "#micro_poetry"];
  const firstPost = posts[0];
  const firstComments = comments.filter((comment) => comment.postId === firstPost?.id);
  const mapNodes = [
    { id: firstPost?.id ?? "p1", label: "Poem Starter", kind: "starter", x: 46, y: 42, size: 82, post: firstPost, text: firstPost?.body },
    { id: firstComments[0]?.id ?? "comment-a", label: "Comment", kind: "comment", x: 24, y: 26, size: 36, post: firstPost, text: firstComments[0]?.text ?? "A reader left a possible next line." },
    { id: firstComments[1]?.id ?? "comment-b", label: "Comment", kind: "comment", x: 28, y: 64, size: 30, post: firstPost, text: firstComments[1]?.text ?? "A reader interpreted the mood." },
    { id: "reply-a", label: "Reply", kind: "reply", x: 16, y: 50, size: 24, post: firstPost, text: "Reply thread: maybe the city is only a saved draft." },
    { id: posts[2]?.id ?? "quote-a", label: "Quote", kind: "quote", x: 72, y: 24, size: 50, post: posts[2] ?? firstPost, text: posts[2]?.body },
    { id: posts[4]?.id ?? "quote-b", label: "Quote", kind: "quote", x: 78, y: 58, size: 42, post: posts[4] ?? firstPost, text: posts[4]?.body },
    { id: "saved-a", label: "Saved", kind: "saved", x: 63, y: 43, size: 32, post: firstPost, text: "Saved for later inspiration." },
    { id: posts.find((post) => post.stage === "Final Version")?.id ?? "final", label: "Final Version", kind: "final", x: 58, y: 76, size: 58, post: posts.find((post) => post.stage === "Final Version") ?? firstPost, text: posts.find((post) => post.stage === "Final Version")?.body },
  ];
  const selectedNode = mapNodes.find((node) => node.id === selectedNodeId) ?? mapNodes[0];
  const previewPost = selectedNode?.post ?? selectedPost;

  return (
    <div>
      <BrandBar navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />
      <div className="mb-6 flex items-end justify-between gap-6">
        <div>
          <h2 className="font-mono text-[36px] font-black text-[#001eff]">Streams</h2>
          <p className="mt-1 text-lg font-black">Poem Map</p>
        </div>
        <div className="flex gap-3">
          {["Map View", "Chain View", "List View"].map((view) => (
            <button key={view} onClick={() => setStreamView(view as "Map View" | "Chain View" | "List View")} className={`rounded-full px-5 py-2 text-sm font-black ${streamView === view ? "bg-[#001eff] text-white" : "bg-[#eef0ff] text-[#001eff]"}`}>{view}</button>
          ))}
        </div>
      </div>
      <div className="mb-6 flex flex-wrap gap-3">
        {["Latest", "Most active", "Most quoted", "Final versions"].map((filter, index) => (
          <button key={filter} className={`rounded-full px-5 py-2 text-sm font-black ${index === 0 ? "bg-[#001eff] text-white" : "bg-[#eef0ff] text-[#001eff]"}`}>{filter}</button>
        ))}
      </div>

      {streamView === "Map View" && (
        <div className="grid grid-cols-[210px_minmax(0,1fr)_310px] gap-5">
          <aside className="grid content-start gap-3">
            <p className="font-mono text-[24px] font-black">tag clusters</p>
            {clusters.map((tag, index) => (
              <button key={tag} onClick={() => setSelectedNodeId(mapNodes[index % mapNodes.length].id)} className="rounded-[20px] border-2 border-[#001eff] px-4 py-3 text-left text-sm font-black text-[#001eff]">
                {tag}
              </button>
            ))}
          </aside>
          <section className="relative min-h-[560px] overflow-hidden rounded-[30px] border-2 border-[#001eff] bg-[#f8f9ff]">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M46 42 C35 31, 30 28, 24 26" stroke="#001eff" strokeWidth="0.45" fill="none" opacity="0.45" />
              <path d="M46 42 C34 51, 32 58, 28 64" stroke="#001eff" strokeWidth="0.45" fill="none" opacity="0.45" />
              <path d="M24 26 C18 34, 17 42, 16 50" stroke="#aeb2d3" strokeWidth="0.35" fill="none" opacity="0.6" />
              <path d="M46 42 C58 31, 64 26, 72 24" stroke="#001eff" strokeWidth="0.55" fill="none" opacity="0.55" />
              <path d="M46 42 C60 48, 70 54, 78 58" stroke="#001eff" strokeWidth="0.55" fill="none" opacity="0.55" />
              <path d="M46 42 C52 40, 58 41, 63 43" stroke="#ff4b4f" strokeWidth="0.35" fill="none" opacity="0.55" />
              <path d="M46 42 C50 56, 54 66, 58 76" stroke="#ff4b4f" strokeWidth="0.65" fill="none" opacity="0.7" />
            </svg>
            {mapNodes.map((node) => (
              <button
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                title={`${node.label}: ${node.post?.body ?? "reader response"}`}
                className={`absolute grid place-items-center text-center text-[10px] font-black leading-tight transition hover:scale-105 ${streamNodeClass(node.kind, node.id === selectedNodeId)}`}
                style={{ left: `${node.x}%`, top: `${node.y}%`, width: node.size, height: node.size, transform: "translate(-50%, -50%)" }}
              >
                <span>{node.label}</span>
                {node.post?.saved && <Star size={14} className="absolute -right-1 -top-1 fill-current text-[#ff4b4f]" />}
              </button>
            ))}
          </section>
          <aside className="rounded-[26px] border-2 border-[#001eff] p-5">
            <span className={`rounded-full px-4 py-1 text-sm font-black ${selectedNode.kind === "final" ? "bg-[#ff4b4f] text-white" : "bg-[#001eff] text-white"}`}>{selectedNode.label}</span>
            <p className="mt-5 text-xl font-black leading-tight">{selectedNode.text || previewPost?.body}</p>
            <p className="mt-3 text-sm font-bold text-[#777]">{previewPost?.author.name} · {previewPost?.tags[0]}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm font-black">
              <span>{previewPost?.likes ?? 0} likes</span>
              <span>{selectedNode.kind === "comment" || selectedNode.kind === "reply" ? "reader response" : `${previewPost?.comments ?? 0} comments`}</span>
              <span>{previewPost?.quotes ?? 0} quotes</span>
              <span>{previewPost?.saved ? "saved" : "not saved"}</span>
            </div>
            <div className="mt-6 grid gap-3">
              <button onClick={() => previewPost && openPost(previewPost.id)} className="rounded-full bg-[#001eff] px-5 py-3 font-black text-white">Open post</button>
              <button className="rounded-full border-2 border-[#001eff] px-5 py-3 font-black text-[#001eff]">Quote</button>
              <button className="rounded-full border-2 border-[#001eff] px-5 py-3 font-black text-[#001eff]">View history</button>
            </div>
          </aside>
        </div>
      )}

      {streamView === "Chain View" && (
        <section className="rounded-[30px] border-2 border-[#001eff] p-6">
          {["Poem Starter", "Comment", "Reply", "Quote", "Added to poem", "Final Version"].map((step, index) => (
            <div key={step} className="flex items-center gap-4 border-b border-[#d9ddff] py-4 last:border-b-0">
              <span className={`grid h-10 w-10 place-items-center rounded-full font-black text-white ${step === "Final Version" ? "bg-[#ff4b4f]" : "bg-[#001eff]"}`}>{index + 1}</span>
              <span className="text-xl font-black">{step}</span>
              <span className="text-sm font-bold text-[#777]">{posts[index % posts.length]?.body}</span>
            </div>
          ))}
        </section>
      )}

      {streamView === "List View" && <MasonryGrid posts={posts.slice(0, 8)} openPost={openPost} openQuote={() => undefined} toggleLike={() => undefined} toggleSave={() => undefined} compact />}
    </div>
  );
}

function streamNodeClass(kind: string, active: boolean) {
  const base = active ? "ring-4 ring-[#001eff]/25 " : "";
  if (kind === "final") return `${base}rounded-full border-2 border-[#ff4b4f] bg-[#ff4b4f] text-white`;
  if (kind === "quote") return `${base}rounded-[18px] border-2 border-[#001eff] bg-white text-[#001eff]`;
  if (kind === "reply") return `${base}rounded-full border-2 border-[#aeb2d3] bg-white text-[#777]`;
  if (kind === "saved") return `${base}rounded-[12px] border-2 border-[#ff4b4f] bg-[#fff1f1] text-[#ff4b4f]`;
  if (kind === "comment") return `${base}rounded-full border-2 border-[#aeb2d3] bg-[#eef0ff] text-[#001eff]`;
  return `${base}rounded-full border-2 border-[#001eff] bg-[#001eff] text-white`;
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
}) {
  const { draft, setDraft, createTags, setCreateTags, tagDraft, setTagDraft, backgroundImage, setBackgroundImage, settings, setSettings, publishPost } = props;
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
  const removeTag = (tag: string) => {
    setCreateTags(createTags.filter((item) => item !== tag));
  };
  const uploadBackground = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBackgroundImage(String(reader.result));
    reader.readAsDataURL(file);
  };
  const row = (key: keyof CreateSettings, label: string) => (
    <button type="button" onClick={() => update(key)} className="flex h-[48px] items-center justify-between rounded-xl border border-[#ded7cd] px-3 text-left text-[18px]">
      {label}
      <span className={`grid h-4 w-4 place-items-center rounded border border-[#001eff] ${settings[key] ? "bg-[#001eff]" : "bg-white"}`}>
        {settings[key] && <Check size={12} className="text-white" />}
      </span>
    </button>
  );
  return (
    <form onSubmit={publishPost} className="max-w-[1074px] pt-1">
      <h1 className="font-mono text-[38px] font-black leading-none text-[#001eff]">Create post</h1>
      <p className="mt-2 text-base font-black">Post a line, a short poem, or anything you want.</p>
      <textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="mt-4 h-[210px] w-full resize-none rounded-2xl border border-[#b7c4d5] p-7 text-[28px] outline-none" />
      <div className="mt-7 rounded-2xl border border-[#d7d7d7] px-5 py-4">
        <div className="flex items-center gap-4">
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
          <button type="button" onClick={addTag} className="h-[48px] rounded-full bg-[#001eff] px-7 text-[18px] font-black text-white">
            Add tag
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {createTags.map((tag) => (
            <button key={tag} type="button" onClick={() => removeTag(tag)} className="rounded-full border-2 border-[#001eff] px-4 py-2 text-sm font-black text-[#001eff]">
              {tag} ×
            </button>
          ))}
        </div>
      </div>
      <label className="mt-7 flex h-[66px] w-[523px] cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-[#bdbdbd] text-[28px] font-black text-[#888]">
        {backgroundImage ? (
          <span className="flex h-full w-full items-center justify-center bg-cover bg-center text-white [text-shadow:0_1px_8px_rgba(0,0,0,.55)]" style={{ backgroundImage: `linear-gradient(rgba(0,30,255,.38),rgba(0,0,80,.52)),url(${backgroundImage})` }}>
            pic background selected
          </span>
        ) : (
          "pic background"
        )}
        <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadBackground(event.target.files?.[0])} />
      </label>
      <div className="mt-7 grid grid-cols-2 gap-6">
        <button type="button" onClick={() => setSettings({ ...settings, publicPost: false })} className={`h-[66px] rounded-xl border text-[27px] font-black ${!settings.publicPost ? "border-[#ff414f] bg-[#fff4f6] text-[#222]" : "border-[#bdbdbd] text-[#888]"}`}>Private Draft</button>
        <button type="button" onClick={() => setSettings({ ...settings, publicPost: true })} className={`h-[66px] rounded-xl border text-[27px] font-black ${settings.publicPost ? "border-[#001eff] bg-[#eef0ff] text-black" : "border-[#bdbdbd] text-[#888]"}`}>Public Post</button>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4">
        {row("allowComments", "Allow comments")}
        {settings.publicPost && row("allowReplies", "Allow replies")}
        {row("allowQuote", "Allow quote / repost")}
        {settings.publicPost && row("allowBuild", "Allow others to build")}
        {row("showHistory", "Show history")}
        {!settings.publicPost && row("allowLike", "Allow like")}
      </div>
      <p className="mt-6 rounded-2xl bg-[#eef0ff] px-5 py-4 text-base font-black text-[#001eff]">
        You decide what enters the poem. Comments and AI suggestions will not be added automatically.
      </p>
      <button className="mt-8 h-[58px] w-full rounded-2xl bg-[#f43f5e] text-[32px] font-black text-white">{settings.publicPost ? "Publish" : "Save Draft"}</button>
    </form>
  );
}

function ProfilePage({
  posts,
  tab,
  setTab,
  comments,
  suggestionsByComment,
  commentDraft,
  activeSuggestionCount,
  setCommentDraft,
  addComment,
  likeComment,
  addSuggestionToPoem,
  editSuggestion,
  updateSuggestion,
  ignoreSuggestion,
  saveAuthorVersion,
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
  tab: string;
  setTab: (tab: string) => void;
  comments: Comment[];
  suggestionsByComment: Map<string, Suggestion[]>;
  commentDraft: string;
  activeSuggestionCount: number;
  setCommentDraft: (value: string) => void;
  addComment: (event: FormEvent) => void;
  likeComment: (id: string) => void;
  addSuggestionToPoem: (suggestion: Suggestion) => void;
  editSuggestion: (suggestion: Suggestion) => void;
  updateSuggestion: (id: string, text: string) => void;
  ignoreSuggestion: (id: string) => void;
  saveAuthorVersion: (postId: string, lines: EditablePoemLine[]) => void;
  openPost: (id: string) => void;
  openQuote: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  navigate: (view: View) => void;
} & SearchProps) {
  const tabs = ["Posts", "Comments", "Quotes", "Final Versions", "Saved"];
  const filtered =
    tab === "Saved"
      ? posts.filter((post) => post.saved)
      : tab === "Final Versions"
        ? posts.filter((post) => post.stage === "Final Version")
        : tab === "Quotes"
          ? posts.filter((post) => post.tags.includes("#quote_version"))
          : posts.filter((post) => !post.tags.includes("#quote_version"));
  const focusPost = posts.find((post) => post.id === "p5") ?? posts[0];
  const focusComments = comments.filter((comment) => comment.postId === focusPost.id);
  const focusSuggestionCount = countOpenSuggestions(focusComments, Array.from(suggestionsByComment.values()).flat());
  return (
    <div>
      <BrandBar navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />
      <ProfileHeader />
      <div className="mb-12 flex gap-7">
        {tabs.map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`h-[46px] min-w-[156px] rounded-full px-7 text-[22px] font-black text-white ${tab === item ? "bg-[#001eff]" : "bg-[#aeb2d3]"}`}>{item}</button>
        ))}
      </div>
      {tab === "Comments" ? (
        <ProfileCommentsView
          post={focusPost}
          comments={focusComments}
          suggestionsByComment={suggestionsByComment}
          commentDraft={commentDraft}
          activeSuggestionCount={focusSuggestionCount}
          setCommentDraft={setCommentDraft}
          addComment={addComment}
          likeComment={likeComment}
          addSuggestionToPoem={addSuggestionToPoem}
          editSuggestion={editSuggestion}
          updateSuggestion={updateSuggestion}
          ignoreSuggestion={ignoreSuggestion}
          saveAuthorVersion={saveAuthorVersion}
          setTab={setTab}
          openQuote={openQuote}
          toggleLike={toggleLike}
          toggleSave={toggleSave}
          navigate={navigate}
        />
      ) : (
        <MasonryGrid posts={filtered.slice(0, 8)} openPost={openPost} openQuote={openQuote} toggleLike={toggleLike} toggleSave={toggleSave} compact />
      )}
    </div>
  );
}

function ProfileCommentsView(props: {
  post: Post;
  comments: Comment[];
  suggestionsByComment: Map<string, Suggestion[]>;
  commentDraft: string;
  activeSuggestionCount: number;
  setCommentDraft: (value: string) => void;
  addComment: (event: FormEvent) => void;
  likeComment: (id: string) => void;
  addSuggestionToPoem: (suggestion: Suggestion) => void;
  editSuggestion: (suggestion: Suggestion) => void;
  updateSuggestion: (id: string, text: string) => void;
  ignoreSuggestion: (id: string) => void;
  saveAuthorVersion: (postId: string, lines: EditablePoemLine[]) => void;
  setTab: (tab: string) => void;
  openQuote: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  navigate: (view: View) => void;
}) {
  const {
    post,
    comments,
    suggestionsByComment,
    commentDraft,
    activeSuggestionCount,
    setCommentDraft,
    addComment,
    likeComment,
    addSuggestionToPoem,
    editSuggestion,
    updateSuggestion,
    ignoreSuggestion,
    saveAuthorVersion,
    setTab,
    openQuote,
    toggleLike,
    toggleSave,
    navigate,
  } = props;
  const [showEditor, setShowEditor] = useState(false);
  const editorLines: EditablePoemLine[] = [
    ...post.lines.map((line, index) => ({ id: `${post.id}-line-${index}`, text: line, by: index === 0 ? `Started by ${post.author.name.split(" ")[0]}` : "From poem so far" })),
    ...comments
      .filter((comment) => comment.kind === "poetic continuation")
      .slice(0, 2)
      .map((comment) => ({ id: `from-${comment.id}`, text: comment.text, by: `Pinned from ${comment.author.name}'s comment` })),
  ];

  return (
    <section>
      <button onClick={() => setTab("Posts")} className="mb-9 flex items-center gap-4 font-mono text-[27px] font-black">
        {"<"} back
      </button>
      <div className="grid max-w-[900px] grid-cols-[325px_minmax(0,555px)] gap-5">
        <div>
          <PoemCard post={post} openPost={() => undefined} openQuote={openQuote} toggleLike={toggleLike} toggleSave={toggleSave} compact forcePoem />
          <div className="rounded-b-[20px] border-2 border-t-0 border-[#001eff] px-5 py-3">
            <div className="flex gap-3">
              <span className="rounded-full border border-[#bdbdbd] px-4 py-1 text-xs">Lili</span>
              <span className="rounded-full border border-[#bdbdbd] px-4 py-1 text-xs">Amy</span>
            </div>
            <button onClick={() => setShowEditor((current) => !current)} className="mt-4 w-full rounded-full bg-[#001eff] px-4 py-2 text-sm font-black text-white">
              {showEditor ? "Close edit poem" : "Edit poem"}
            </button>
          </div>
        </div>
        <section className="rounded-t-[18px] bg-gradient-to-b from-[#c6dbff] to-white p-4">
          <h1 className="mb-5 text-[21px] font-black text-[#001eff]">{comments.length} comments</h1>
          <form onSubmit={addComment} className="mb-9 flex items-center gap-4">
            <Avatar author={lili} />
            <input value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} className="h-[46px] min-w-0 flex-1 rounded-full bg-white px-8 text-sm outline-none" placeholder="write your line, or just comments" />
            <button className="h-[46px] rounded-full bg-[#001eff] px-6 font-black text-white">comments</button>
          </form>
          <div className="grid gap-6">
            {comments.map((comment) => (
              <CommentRow key={comment.id} comment={comment} suggestions={suggestionsByComment.get(comment.id) ?? []} showAuthorTools likeComment={likeComment} addSuggestionToPoem={addSuggestionToPoem} editSuggestion={editSuggestion} updateSuggestion={updateSuggestion} ignoreSuggestion={ignoreSuggestion} navigate={navigate} />
            ))}
          </div>
        </section>
      </div>
      {showEditor && (
        <EditPoemPanel
          title="Edit poem"
          subtitle="Review reader lines, adjust the order, then save the version."
          badge="Author"
          lines={editorLines}
          primaryAction="Save version"
          secondaryAction="View history"
          onPrimary={(nextLines) => saveAuthorVersion(post.id, nextLines)}
          onSecondary={() => navigate("history")}
        />
      )}
    </section>
  );
}

function ProfileHeader() {
  return (
    <header className="mb-12 grid grid-cols-[380px_1fr] items-center">
      <div className="flex items-center gap-6">
        <div className="grid h-[68px] w-[68px] place-items-center rounded-full bg-[#001eff] text-[26px] text-white">Lili</div>
        <div>
          <h1 className="font-mono text-[28px] font-black">Lili lee</h1>
          <p className="text-[22px] font-bold text-[#999]">Just do it.</p>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_1px_1fr_1px_1fr] items-center text-center">
        <ProfileStat value="121" label="followers" />
        <div className="h-14 bg-black" />
        <ProfileStat value="100" label="Following" />
        <div className="h-14 bg-black" />
        <ProfileStat value="10" label="Posts" />
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
  const columns = [0, 1, 2, 3].map((column) => posts.filter((_, index) => index % 4 === column));
  return (
    <div className="grid grid-cols-4 items-start gap-5 pr-4">
      {columns.map((columnPosts, columnIndex) => (
        <div key={columnIndex} className="grid gap-5">
          {columnPosts.map((post, index) => (
            <PoemCard
              key={`${post.id}-${columnIndex}-${index}`}
              post={post}
              openPost={openPost}
              openQuote={openQuote}
              toggleLike={toggleLike}
              toggleSave={toggleSave}
              compact={compact}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function ActivityPage({ openPost, navigate, searchInput, setSearchInput, runSearch }: { openPost: () => void; navigate: (view: View) => void } & SearchProps) {
  const items = [
    "Lin replied to your post",
    "Jia quoted your line",
    "Ro mentioned you",
    "Alex invited you to continue writing",
    "A comment was added to your poem",
    "Mia published a final version based on your line",
    "Aria liked your comment",
    "Someone saved your poem for later inspiration",
  ];
  return (
    <div>
      <BrandBar navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />
      <h1 className="mb-8 font-mono text-[42px] font-black text-[#001eff]">Activity</h1>
      <div className="grid max-w-[900px] gap-5">
        {items.map((item) => (
          <button key={item} onClick={openPost} className="flex items-center gap-5 rounded-[22px] border-2 border-[#001eff] p-5 text-left">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#969dff] text-xl text-white">Ac</span>
            <span className="text-2xl font-bold">{item}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailPage(props: {
  post: Post;
  comments: Comment[];
  suggestionsByComment: Map<string, Suggestion[]>;
  poemLines: PoemLine[];
  commentDraft: string;
  activeSuggestionCount: number;
  setCommentDraft: (value: string) => void;
  addComment: (event: FormEvent) => void;
  likeComment: (id: string) => void;
  addSuggestionToPoem: (suggestion: Suggestion) => void;
  editSuggestion: (suggestion: Suggestion) => void;
  updateSuggestion: (id: string, text: string) => void;
  ignoreSuggestion: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  publishFinalVersion: (postId: string) => void;
  navigate: (view: View) => void;
} & SearchProps) {
  const { post, comments, suggestionsByComment, poemLines, commentDraft, activeSuggestionCount, setCommentDraft, addComment, likeComment, addSuggestionToPoem, editSuggestion, updateSuggestion, ignoreSuggestion, toggleLike, toggleSave, publishFinalVersion, navigate, searchInput, setSearchInput, runSearch } = props;
  return (
    <div>
      <BrandBar showSearch navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />
      <button onClick={() => navigate("home")} className="mb-5 flex items-center gap-4 font-mono text-[27px] font-black">{"<"} back to home</button>
      <div className="grid grid-cols-[325px_555px] gap-5">
        <section>
          <PoemCard post={post} openPost={() => undefined} openQuote={() => (post.quoteAllowed ? navigate("quote") : undefined)} toggleLike={toggleLike} toggleSave={toggleSave} forcePoem />
          <div className="mt-8 grid gap-3">
            <p className="text-[22px] font-black text-[#001eff]">Author action</p>
            {post.showHistory && <button onClick={() => navigate("history")} className="rounded-full border-2 border-[#001eff] px-5 py-2 text-left font-black text-[#001eff]">View history</button>}
            <button onClick={() => publishFinalVersion(post.id)} className="rounded-full bg-[#001eff] px-5 py-2 text-left font-black text-white">Publish final version</button>
          </div>
        </section>
        <section className="rounded-t-[18px] bg-gradient-to-b from-[#c6dbff] to-white p-4">
          <h1 className="mb-5 text-[21px] font-black text-[#001eff]">{comments.length} comments</h1>
          <form onSubmit={addComment} className="mb-9 flex items-center gap-4">
            <Avatar author={lili} />
            <input disabled={!post.repliesOpen} value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} className="h-[46px] min-w-0 flex-1 rounded-full bg-white px-8 text-sm outline-none disabled:opacity-60" placeholder={post.repliesOpen ? "write your line, or just comments" : "comments closed"} />
            <button disabled={!post.repliesOpen} className="h-[46px] rounded-full bg-[#001eff] px-6 font-black text-white disabled:bg-[#aeb2d3]">comments</button>
          </form>
          <div className="grid gap-6">
            {comments.map((comment) => (
              <CommentRow key={comment.id} comment={comment} suggestions={suggestionsByComment.get(comment.id) ?? []} likeComment={likeComment} addSuggestionToPoem={addSuggestionToPoem} editSuggestion={editSuggestion} updateSuggestion={updateSuggestion} ignoreSuggestion={ignoreSuggestion} navigate={navigate} />
            ))}
          </div>
        </section>
      </div>
    </div>
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
      <div className="grid grid-cols-[44px_1fr_190px] items-center gap-4">
        <Avatar author={comment.author} muted />
        <div><span className="text-[21px]">{comment.author.name}</span><span className="ml-1 text-[16px] text-[#888]">{comment.author.handle}</span></div>
        <span className={`justify-self-end whitespace-nowrap rounded-full px-4 py-2 text-xs font-black ${kind.className}`}>{kind.label}</span>
      </div>
      <p className="ml-[60px] mt-2 text-[17px]">{comment.text}</p>
      <div className="ml-[56px] mt-6 flex gap-3">
        <Metric active={comment.liked} onClick={() => likeComment(comment.id)} icon={<Heart size={16} fill={comment.liked ? "currentColor" : "none"} />} value={comment.likes} />
        <Metric onClick={() => undefined} icon={<MessageCircle size={16} />} value={comment.replies} />
        <Metric onClick={() => navigate("quote")} icon={<Quote size={16} />} value={comment.quotes} />
      </div>
      {showAuthorTools && suggestions.length > 0 && (
        <div className="ml-[56px] mt-3 grid gap-2">
          <p className="text-xs font-black text-[#737783]">AI organizes reader responses. You decide what enters the poem.</p>
          {suggestions.map((suggestion) => (
            <AISuggestion key={suggestion.id} suggestion={suggestion} addSuggestionToPoem={addSuggestionToPoem} editSuggestion={editSuggestion} updateSuggestion={updateSuggestion} ignoreSuggestion={ignoreSuggestion} />
          ))}
        </div>
      )}
    </article>
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
  const updateLine = (id: string, text: string) => {
    setLocalLines((current) => current.map((line) => (line.id === id ? { ...line, text } : line)));
  };
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
    const drafted = [
      cleaned[1] ?? cleaned[0],
      cleaned[0],
      cleaned[2] ?? "but the windows refused to open.",
      "My childhood was backed up in a city I never reached.",
      "Every streetlight blinked like an old notification.",
      "It said: welcome back.",
      "I said: but I never left.",
      cleaned[1] ?? "The rain there knew my name.",
    ];
    setPublishedLines(drafted);
  };
  const saveCurrentPreview = () => {
    setPublishedLines(localLines.map((line) => line.text.trim()).filter(Boolean));
    onPrimary(localLines);
  };

  return (
    <section className="mt-8 grid grid-cols-[minmax(0,1fr)_330px] gap-5">
      <div className="rounded-[28px] border-2 border-[#e8e0d9] bg-white p-7">
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <h2 className="text-[34px] font-black leading-none">{title}</h2>
            <p className="mt-2 text-[17px] font-bold text-[#737783]">{subtitle}</p>
          </div>
          <span className="rounded-full border border-[#f0d48c] bg-[#fff7df] px-5 py-2 font-black text-[#8a6420]">{badge}</span>
        </div>
        <div className="grid gap-5">
          {localLines.map((line, index) => (
            <article key={line.id} className="rounded-[22px] border-2 border-[#e8e0d9] p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#e8e0d9] font-black text-[#737783]">{index + 1}</span>
                  <span className="truncate rounded-full border-2 border-[#dce2ff] bg-[#eef0ff] px-4 py-2 font-black text-[#3656cc]">{line.by}</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => moveLine(index, -1)} className="rounded-full border-2 border-[#e8e0d9] px-5 py-2 font-black text-[#3b3d45]">Up</button>
                  <button type="button" onClick={() => moveLine(index, 1)} className="rounded-full border-2 border-[#e8e0d9] px-5 py-2 font-black text-[#3b3d45]">Down</button>
                </div>
              </div>
              <textarea
                value={line.text}
                onChange={(event) => updateLine(line.id, event.target.value)}
                className="min-h-[120px] w-full resize-y rounded-[18px] border-2 border-[#e8e0d9] p-5 text-[22px] leading-snug outline-none focus:border-[#001eff]"
              />
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black">Published version</h3>
            <p className="text-base font-bold text-[#737783]">live edit</p>
          </div>
          <span className="rounded-full border border-[#ffb7c4] bg-[#fff3f6] px-4 py-1 font-black text-[#f43f5e]">Open</span>
        </div>
        <div className="mt-5 rounded-[22px] bg-[#17171b] p-6 text-white">
          <p className="mb-6 text-sm font-black tracking-[0.3em] text-white/60">POEM</p>
          <div className="grid gap-5 text-lg font-bold leading-relaxed">
            {publishedLines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {["Alex Rivera", "Maya Chen", "Sam Carter", "Lin Zhou", "Jia Li"].map((name) => (
            <span key={name} className="rounded-full border-2 border-[#e8e0d9] px-4 py-1 text-sm font-black text-[#737783]">{name}</span>
          ))}
        </div>
      </aside>
    </section>
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
        badge="Quote version"
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

function HistoryPage({
  comments,
  suggestions,
  poemLines,
  navigate,
  searchInput,
  setSearchInput,
  runSearch,
}: {
  comments: Comment[];
  suggestions: Suggestion[];
  poemLines: PoemLine[];
  navigate: (view: View) => void;
} & SearchProps) {
  const history = ["Original post", `${comments.length} comments`, `${suggestions.length} suggestions from comments`, ...poemLines.slice(1).map((line) => line.by), "Quote versions", "Final Version"];
  return (
    <div className="max-w-[900px]">
      <BrandBar navigate={navigate} searchInput={searchInput} setSearchInput={setSearchInput} runSearch={runSearch} />
      <button onClick={() => navigate("detail")} className="mb-5 font-mono text-[29px] font-black">{"<"} back</button>
      <h1 className="mb-6 font-mono text-[42px] font-black text-[#001eff]">View history</h1>
      <div className="grid gap-4">
        {history.map((item, index) => (
          <div key={`${item}-${index}`} className="rounded-[22px] border-2 border-[#001eff] p-5 text-xl"><b>{index + 1}.</b> {item}</div>
        ))}
      </div>
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
  const panelLabel = post.stage === "Final Version" ? "Final Version" : "Poem so far";
  const topLabel = post.source ? "Started from" : post.stage === "Final Version" ? "Final Version" : "Poem Starter";
  const borderColor = post.color === "red" ? "border-[#ff4b4f]" : "border-[#001eff]";
  const accentText = post.color === "red" ? "text-[#ff4b4f]" : "text-[#001eff]";
  const imageStyle = cardImageStyle(post);
  return (
    <article className={`mb-5 overflow-hidden rounded-[30px] border-2 ${borderColor} bg-white`}>
      <button
        onClick={() => openPost(post.id)}
        className={`relative block w-full overflow-hidden p-5 text-left ${imageStyle ? "" : cardBackground(post.color)} ${compact ? "min-h-[212px]" : "min-h-[258px]"}`}
        style={imageStyle}
      >
        <div className="flex items-start justify-between">
          <span className={`rounded-full bg-white px-3 py-1.5 text-[17px] font-black leading-none ${accentText}`}>{topLabel}</span>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[13px] font-bold text-[#001eff]">{post.author.avatar}</span>
        </div>
        {post.source && <p className="mt-4 text-[10px] font-black text-white/85">{post.source}</p>}
        <p className="mt-9 max-w-[90%] text-[18px] font-black leading-tight text-white">{post.body}</p>
        <div className="mt-7 flex flex-wrap gap-2">{post.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
        <div className="mt-5 h-px bg-white/85" />
        <div className="mt-4 flex flex-wrap gap-2">
          <SmallBadge>{post.visibility === "public" ? "Public" : "Private Draft"}</SmallBadge>
          <SmallBadge>{post.repliesOpen ? "Replies open" : "Replies closed"}</SmallBadge>
          <SmallBadge>{post.quoteAllowed ? "Quote allowed" : "No Quote"}</SmallBadge>
          {post.invited.length > 0 && <SmallBadge>Invite {post.invited.join(" / ")}</SmallBadge>}
        </div>
      </button>
      {showPoem && (
        <div className={`relative -mt-3 rounded-t-[34px] border-2 ${borderColor} border-x-0 border-b-0 bg-white p-5 pt-8`}>
          <div className="flex justify-between">
            <span className={`whitespace-nowrap rounded-full border-2 px-3 py-1.5 text-[15px] font-black leading-none ${post.stage === "Final Version" ? "border-[#ff4b4f] text-[#ff4b4f]" : "border-[#001eff] text-[#001eff]"}`}>{panelLabel}</span>
            <span className="pt-2 text-[10px] font-black leading-tight text-[#aaa]">From {post.contributors} contributors</span>
          </div>
          <div className="mt-6 grid gap-2">
            {post.lines.map((line, index) => <p key={`${line}-${index}`} className={`text-[15px] leading-tight ${index === 0 ? post.stage === "Final Version" ? "font-black text-[#ff4b4f]" : "font-black text-[#001eff]" : ""}`}>· {line}</p>)}
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
      <ActionButton disabled={!post.allowLike} active={post.liked} danger onClick={() => toggleLike?.(post.id)} icon={<Heart size={12} fill={post.liked ? "currentColor" : "none"} />}>
        {post.likes} likes
      </ActionButton>
      <ActionButton onClick={() => openPost(post.id)} icon={<MessageCircle size={12} />}>
        {post.comments} comments
      </ActionButton>
      <ActionButton disabled={!post.quoteAllowed} onClick={() => openQuote?.(post.id)} icon={<Repeat2 size={12} />}>
        {post.quotes} quotes
      </ActionButton>
      <ActionButton active={post.saved} onClick={() => toggleSave?.(post.id)} icon={<Star size={12} fill={post.saved ? "currentColor" : "none"} />}>
        {post.saves} save
      </ActionButton>
    </div>
  );
}

function ActionButton({
  children,
  icon,
  onClick,
  active = false,
  danger = false,
  disabled = false,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
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

function AISuggestion({ suggestion, addSuggestionToPoem, editSuggestion, updateSuggestion, ignoreSuggestion }: { suggestion: Suggestion; addSuggestionToPoem: (suggestion: Suggestion) => void; editSuggestion: (suggestion: Suggestion) => void; updateSuggestion: (id: string, text: string) => void; ignoreSuggestion: (id: string) => void }) {
  const label = suggestion.group === "Revision hints" ? "Revision suggestion" : suggestion.group;
  return (
    <div className="rounded-[18px] border border-[#ff8a8a] bg-[#fff5f5] px-4 py-3">
      <p className="text-[16px]"><span className="text-[#ff4b4f]">AI</span> {label}</p>
      {suggestion.status === "editing" ? <textarea value={suggestion.text} onChange={(event) => updateSuggestion(suggestion.id, event.target.value)} className="mt-1 min-h-[60px] w-full rounded-xl border border-[#ddd] bg-white p-2 outline-none" /> : <p className="mt-1 text-[16px]">{suggestion.text}</p>}
      <div className="mt-2 flex gap-3">
        <button onClick={() => addSuggestionToPoem(suggestion)} className="rounded-full bg-black px-4 py-1 text-sm font-black text-white">Add to poem</button>
        <button onClick={() => editSuggestion(suggestion)} className="rounded-full bg-white px-4 py-1 text-sm font-black">Edit</button>
        <button onClick={() => ignoreSuggestion(suggestion.id)} className="rounded-full bg-white px-4 py-1 text-sm font-black">Ignore</button>
      </div>
    </div>
  );
}

function Avatar({ author, muted = false }: { author: Author; muted?: boolean }) {
  return <span className={`grid h-10 w-10 place-items-center rounded-full ${muted ? "bg-[#969dff]" : "bg-[#001eff]"} text-white`}>{author.avatar}</span>;
}

function ProfileStat({ value, label }: { value: string; label: string }) {
  return <div><p className="text-[52px] font-black leading-none text-[#001eff]">{value}</p><p className="text-[26px] leading-none">{label}</p></div>;
}

function Metric({ icon, value, onClick, active = false }: { icon: ReactNode; value: number; onClick: () => void; active?: boolean }) {
  return <button onClick={onClick} className={`flex h-[34px] min-w-[65px] items-center justify-center gap-1 rounded-full px-3 font-black text-white ${active ? "bg-[#ff4b4f]" : "bg-[#bdbdbd]"}`}>{icon}{value}</button>;
}

function Tag({ children }: { children: string }) {
  return <span className="rounded-full border border-white px-2 py-0.5 text-[8px] font-bold text-white">{children}</span>;
}

function SmallBadge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white px-2 py-1 text-[8px] font-black text-black">{children}</span>;
}

function cardBackground(color: Post["color"]) {
  if (color === "red") return "bg-[#ff4b4f]";
  return "bg-[#001eff]";
}

function cardImageStyle(post: Post): React.CSSProperties | undefined {
  const image = post.imageUrl || presetImage(post.imagePreset);
  if (!image) return undefined;
  return {
    backgroundImage: `linear-gradient(rgba(0,21,255,.3),rgba(0,21,255,.3)),url(${image})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

function presetImage(preset?: Post["imagePreset"]) {
  if (preset === "city") {
    return "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=80";
  }
  if (preset === "moon") {
    return "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=900&q=80";
  }
  if (preset === "roses") {
    return "https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=900&q=80";
  }
  if (preset === "stars") {
    return "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=900&q=80";
  }
  return undefined;
}
