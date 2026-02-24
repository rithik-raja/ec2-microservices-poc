"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, createPost } from "@/lib/api";

const createPostSchema = z.object({
  content: z.string().trim().min(1, "Post content cannot be empty.").max(500, "Post is too long."),
});

export function CreatePostForm() {
  const queryClient = useQueryClient();
  const { isAuthenticated, session } = useAuth();

  const form = useForm<z.infer<typeof createPostSchema>>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { content: "" },
  });

  const createPostMutation = useMutation({
    mutationFn: async (values: z.infer<typeof createPostSchema>) => {
      if (!session?.accessToken) {
        throw new ApiError(401, "You must be authenticated to create a post.");
      }
      return createPost(values, session.accessToken);
    },
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post created.");
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Failed to create post.";
      toast.error(message);
    },
  });

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Card>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => createPostMutation.mutate(values))}>
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Create Post</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-24" maxLength={500} placeholder="What do you want to share?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={createPostMutation.isPending}>
                {createPostMutation.isPending ? "Posting..." : "Create post"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
