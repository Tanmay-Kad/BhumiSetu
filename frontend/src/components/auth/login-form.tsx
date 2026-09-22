"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui";
import { getErrorMessage } from "@/lib/api/errors";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await login({ email: trimmedEmail, password });

      // Role-based routing
      if (user.role === "OFFICER") {
        router.push("/officer/dashboard");
      } else if (user.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-md">
      <CardHeader className="text-center py-6">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-emerald-900 text-white font-bold text-base">
          BS
        </div>
        <CardTitle className="text-xl font-bold text-slate-900">
          Sign In to BhumiSetu
        </CardTitle>
        <CardDescription>
          Access your land records, applications, and workflow portal
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div
              className="rounded-md bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 font-medium leading-relaxed"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          <Input
            id="email"
            label="Email Address"
            type="email"
            autoComplete="email"
            placeholder="citizen@bhumisetu.local"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            required
          />

          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </CardContent>

        <CardFooter className="flex-col gap-3">
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isSubmitting}
          >
            Sign In
          </Button>

          <p className="text-xs text-slate-600 text-center">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-emerald-800 hover:text-emerald-700 hover:underline"
            >
              Register as a Citizen
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
