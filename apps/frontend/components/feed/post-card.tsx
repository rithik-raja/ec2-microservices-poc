import { useState } from "react";
import { MessageCircle } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { CommentForm } from "@/components/feed/comment-form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatTimestamp, userInitial } from "@/lib/format";
import type { PostRecord } from "@/types/api";

export function PostCard({ post }: { post: PostRecord }) {
  const [isCommentFormOpen, setIsCommentFormOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{userInitial(post.username)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium leading-none">{post.username}</div>
            <div className="text-xs text-muted-foreground">{formatTimestamp(post.created_at)}</div>
          </div>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="mb-0">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:hover:text-muted-foreground"
            disabled={!isAuthenticated}
            onClick={() => setIsCommentFormOpen((current) => !current)}
            aria-expanded={isCommentFormOpen}
            aria-label="Toggle comment form"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {post.comments.length} {post.comments.length === 1 ? "comment" : "comments"}
          </button>
        </div>

        <CommentForm postId={post.id} isOpen={isCommentFormOpen} onOpenChange={setIsCommentFormOpen} />

        {post.comments.length > 0 ? <Separator className="mt-2" /> : null}

        <div className="space-y-3">
          {post.comments.map((comment) => (
            <div key={comment.id} className="rounded-md border bg-muted/30 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{comment.username}</span>
                <span>{formatTimestamp(comment.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
