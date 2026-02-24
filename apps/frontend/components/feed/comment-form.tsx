"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, createComment } from "@/lib/api";

const createCommentSchema = z.object({
  content: z.string().trim().min(1, "Comment cannot be empty.").max(300, "Comment is too long."),
});

export function CommentForm({ postId }: { postId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, session } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof createCommentSchema>>({
    resolver: zodResolver(createCommentSchema),
    defaultValues: { content: "" },
  });

  const commentMutation = useMutation({
    mutationFn: async (values: z.infer<typeof createCommentSchema>) => {
      if (!session?.accessToken) {
        throw new ApiError(401, "You must be authenticated to comment.");
      }
      return createComment({ postId, content: values.content }, session.accessToken);
    },
    onSuccess: () => {
      form.reset();
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Comment added.");
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Failed to create comment.";
      toast.error(message);
    },
  });

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-2">
      {!isOpen ? (
        <Button variant="ghost" size="sm" type="button" onClick={() => setIsOpen(true)}>
          + Comment
        </Button>
      ) : null}

      {isOpen ? (
        <Form {...form}>
          <form className="space-y-2" onSubmit={form.handleSubmit((values) => commentMutation.mutate(values))}>
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea className="min-h-20" maxLength={300} placeholder="Write a comment..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  form.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={commentMutation.isPending}>
                {commentMutation.isPending ? "Adding..." : "Add comment"}
              </Button>
            </div>
          </form>
        </Form>
      ) : null}
    </div>
  );
}
