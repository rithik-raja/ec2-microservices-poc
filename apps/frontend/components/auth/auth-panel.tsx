"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { ApiError, confirmSignUp, login, resendConfirmationCode, signOut, signUp } from "@/lib/api";
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

const verifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export function AuthPanel() {
  const { isAuthenticated, isReady, session, setSession, clearSession } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup" | "verify">("login");
  const [verificationEmail, setVerificationEmail] = useState("");

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    shouldUnregister: true,
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    shouldUnregister: true,
    defaultValues: {
      email: "",
      username: "",
      password: "",
    },
  });

  const verifyForm = useForm<z.infer<typeof verifySchema>>({
    resolver: zodResolver(verifySchema),
    shouldUnregister: true,
    defaultValues: {
      code: "",
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
      if (error instanceof ApiError && error.message === "UserNotConfirmedException") {
        const email = loginForm.getValues("email");
        setVerificationEmail(email);
        verifyForm.setValue("code", "");
        setMode("verify");
        toast.error("Email not verified. Enter the 6-digit code sent to your email.");
        return;
      }

      const message = error instanceof ApiError ? error.message : "Login failed.";
      toast.error(message);
    },
  });

  const signupMutation = useMutation({
    mutationFn: signUp,
    onSuccess: (_, values) => {
      signupForm.reset();
      setVerificationEmail(values.email);
      verifyForm.setValue("code", "");
      setMode("verify");
      toast.success("Signup successful. Enter the 6-digit code sent to your email.");
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Signup failed.";
      toast.error(message);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ code }: z.infer<typeof verifySchema>) => {
      if (!verificationEmail) {
        throw new ApiError(400, "Missing verification email. Please sign up again.");
      }

      return confirmSignUp({ email: verificationEmail, code });
    },
    onSuccess: () => {
      loginForm.setValue("email", verificationEmail);
      verifyForm.setValue("code", "");
      setMode("login");
      toast.success("Email verified. You can log in now.");
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Verification failed.";
      toast.error(message);
    },
  });

  const resendCodeMutation = useMutation({
    mutationFn: resendConfirmationCode,
    onSuccess: () => {
      toast.success("A new verification code was sent.");
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Failed to resend code.";
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
          <DropdownMenuLabel className="truncate text-muted-foreground">{session.user.email}</DropdownMenuLabel>
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
          setVerificationEmail("");
          verifyForm.reset();
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
            <Form key="login-form" {...loginForm}>
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
        ) : mode === "signup" ? (
          <>
            <DialogHeader>
              <DialogTitle>Sign up</DialogTitle>
              <DialogDescription>Create an account with email and username.</DialogDescription>
            </DialogHeader>
            <Form key="signup-form" {...signupForm}>
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
                        <Input autoComplete="username" placeholder="your.username" {...field} />
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
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Verify email</DialogTitle>
              <DialogDescription>Enter the 6-digit code from your email to activate your account.</DialogDescription>
            </DialogHeader>
            <Form key="verify-form" {...verifyForm}>
              <form className="space-y-4" onSubmit={verifyForm.handleSubmit((values) => verifyMutation.mutate(values))}>
                <FormField
                  control={verifyForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification code</FormLabel>
                      <FormControl>
                        <Input inputMode="numeric" maxLength={6} placeholder="123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button className="w-full" type="submit" disabled={verifyMutation.isPending}>
                  {verifyMutation.isPending ? "Verifying..." : "Verify email"}
                </Button>
                <Button
                  className="w-full"
                  type="button"
                  variant="outline"
                  disabled={resendCodeMutation.isPending}
                  onClick={() => {
                    if (!verificationEmail) {
                      toast.error("Missing verification email. Please sign up again.");
                      return;
                    }

                    resendCodeMutation.mutate({ email: verificationEmail });
                  }}
                >
                  {resendCodeMutation.isPending ? "Sending..." : "Resend code"}
                </Button>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
