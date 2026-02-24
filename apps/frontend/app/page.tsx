import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { AuthPanel } from "@/components/auth/auth-panel";
import { CreatePostForm } from "@/components/feed/create-post-form";
import { PostFeed } from "@/components/feed/post-feed";

export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <section className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Simple Threads</h1>
        <p className="text-sm text-muted-foreground">A clean text feed where posts and post-level comments stay focused.</p>
      </section>

      {!apiUrl ? (
        <Alert variant="destructive">
          <AlertTitle>Missing frontend environment variable</AlertTitle>
          <AlertDescription>
            Set <code>NEXT_PUBLIC_API_URL</code> in <code>apps/frontend/.env</code> to connect this app to your backend.
          </AlertDescription>
        </Alert>
      ) : null}

      <AuthPanel />
      <CreatePostForm />
      <PostFeed />
    </main>
  );
}
