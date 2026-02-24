"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { ApiError, login, signOut, signUp } from "@/lib/api";
import { userInitial } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

const signupSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .max(32, "Username must be 32 characters or less."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(64, "Password must be 64 characters or less."),
});

export function AuthPanel() {
  const { isAuthenticated, isReady, session, setSession, clearSession } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setSession(data);
      loginForm.reset();
      setIsDialogOpen(false);
      toast.success(`Welcome back, ${data.user.username}.`);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Login failed.";
      toast.error(message);
    },
  });

  const signupMutation = useMutation({
    mutationFn: signUp,
    onSuccess: (_, values) => {
      signupForm.reset();
      loginForm.setValue("email", values.email);
      setMode("login");
      toast.success("Signup successful. If verification is enabled, verify your email before login.");
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Signup failed.";
      toast.error(message);
    },
  });

  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSettled: () => {
      clearSession();
    },
    onSuccess: () => {
      toast.success("Signed out.");
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Signout failed.";
      toast.error(message);
    },
  });

  if (!isReady) {
    return (
      <Button type="button" variant="outline" disabled>
        Loading session...
      </Button>
    );
  }

  if (isAuthenticated && session) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" className="h-auto rounded-full p-0">
            <Avatar>
              <AvatarFallback>{userInitial(session.user.username)}</AvatarFallback>
            </Avatar>
            <span className="sr-only">Open account menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="truncate">{session.user.email}</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => signOutMutation.mutate({ accessToken: session.accessToken })}
            disabled={signOutMutation.isPending}
          >
            {signOutMutation.isPending ? "Signing out..." : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Dialog
      open={isDialogOpen}
      onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setMode("login");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Log in
        </Button>
      </DialogTrigger>
      <DialogContent>
        {mode === "login" ? (
          <>
            <DialogHeader>
              <DialogTitle>Log in</DialogTitle>
              <DialogDescription>Access your account to create posts and comments.</DialogDescription>
            </DialogHeader>
            <Form {...loginForm}>
              <form className="space-y-4" onSubmit={loginForm.handleSubmit((values) => loginMutation.mutate(values))}>
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="current-password" placeholder="Your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button className="w-full" type="submit" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Logging in..." : "Log in"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    className="text-foreground underline underline-offset-4"
                    onClick={() => setMode("signup")}
                  >
                    Sign up
                  </button>
                </p>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Sign up</DialogTitle>
              <DialogDescription>Create an account with email and username.</DialogDescription>
            </DialogHeader>
            <Form {...signupForm}>
              <form className="space-y-4" onSubmit={signupForm.handleSubmit((values) => signupMutation.mutate(values))}>
                <FormField
                  control={signupForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input autoComplete="username" placeholder="rithik" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" placeholder="At least 8 characters" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button className="w-full" type="submit" disabled={signupMutation.isPending}>
                  {signupMutation.isPending ? "Signing up..." : "Sign up"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-foreground underline underline-offset-4"
                    onClick={() => setMode("login")}
                  >
                    Log in
                  </button>
                </p>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
