import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  className?: string;
}

export const MessageBubble = ({ role, content, className }: MessageBubbleProps) => {
  const isUser = role === "user";
  
  return (
    <div
      className={cn(
        "flex w-full mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-5 py-3 shadow-sm",
          isUser
            ? "bg-[hsl(var(--chat-bubble-user))] text-[hsl(var(--chat-bubble-user-foreground))]"
            : "bg-[hsl(var(--chat-bubble-assistant))] text-[hsl(var(--chat-bubble-assistant-foreground))] border border-border",
          className
        )}
      >
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
};
