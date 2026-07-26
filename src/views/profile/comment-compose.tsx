import { Send } from "lucide-react";
import { useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { useAutosize } from "@/lib/use-autosize";
import { COMMENT_MAX, type ComposeIssue } from "./text-safety";

const ISSUE_TEXT: Record<Exclude<ComposeIssue, null>, string> = {
  empty: "Say something first",
  url: "Links are not allowed in comments",
  spam: "That looks like spam, try rephrasing",
  "too-long": `Keep it under ${COMMENT_MAX} characters`,
  cooldown: "Slow down a moment before posting again",
};

export function CommentCompose({
  onSubmit,
  sending,
  disabled,
}: {
  onSubmit: (raw: string) => Promise<ComposeIssue>;
  sending: boolean;
  disabled?: boolean;
}) {
  const t = useT();
  const [text, setText] = useState("");
  const [issue, setIssue] = useState<ComposeIssue>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const remaining = COMMENT_MAX - text.length;
  useAutosize(boxRef, text);

  const send = async () => {
    if (sending) return;
    const result = await onSubmit(text);
    setIssue(result);
    if (!result) setText("");
  };

  if (disabled) {
    return (
      <div className="rounded-[10px] border border-dashed border-edge px-4 py-3 text-center text-[13px] text-ink-subtle">
        {t("Sign in to leave a comment")}
      </div>
    );
  }

  return (
    <div className="rounded-[10px] bg-elevated p-2 ring-1 ring-edge-soft focus-within:ring-edge">
      <textarea
        ref={boxRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (issue) setIssue(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
        }}
        rows={1}
        maxLength={COMMENT_MAX + 40}
        placeholder={t("Leave a comment. No links.")}
        className="harbor-scroll min-h-[52px] w-full resize-none bg-transparent px-2 py-1.5 text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink-subtle"
      />
      <div className="flex items-center justify-between gap-3 px-2 pb-1">
        <span className="text-[12px] text-ink-subtle">
          {issue ? <span className="text-danger">{t(ISSUE_TEXT[issue])}</span> : t("{count} left", { count: remaining })}
        </span>
        <button
          onClick={() => void send()}
          disabled={sending || !text.trim()}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-accent px-4 text-[14px] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Send size={20} /> {sending ? t("Posting") : t("Post")}
        </button>
      </div>
    </div>
  );
}
