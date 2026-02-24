"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { PostCard } from "@/components/feed/post-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getPosts } from "@/lib/api";
import type { PostRecord } from "@/types/api";

const PAGE_SIZE = 10;

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <Card key={idx}>
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[85%]" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function PostFeed() {
  const [page, setPage] = useState(1);

  const postsQuery = useQuery({
    queryKey: ["posts", page],
    queryFn: () => getPosts(page, PAGE_SIZE),
  });

  const posts = useMemo<PostRecord[]>(() => postsQuery.data?.posts ?? [], [postsQuery.data]);
  const data = postsQuery.data;

  if (postsQuery.isLoading) {
    return <FeedSkeleton />;
  }

  if (postsQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Failed to load feed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t fetch posts. Check your API URL and backend availability.
          </p>
          <Button type="button" variant="outline" onClick={() => postsQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!posts.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No posts yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Be the first to create a post.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      <div className="flex items-center justify-between rounded-md border bg-card p-3">
        <span className="text-sm text-muted-foreground">
          Page {data?.page ?? 1} of {Math.max(1, data?.totalPages ?? 1)}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || postsQuery.isFetching}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= (data?.totalPages ?? 1) || postsQuery.isFetching}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
