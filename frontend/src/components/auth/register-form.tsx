"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui";
import { getErrorMessage } from "@/lib/api/errors";

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    // Client-side validation matching backend rules
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setErrorMessage("Name must be between 2 and 100 characters.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage("Please provide a valid email address.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    try {
      setIsSubmitting(true);
      await register({
        name: trimmedName,
        email: trimmedEmail,
        password,
        phone: trimmedPhone || undefined,
      });

      // Successful citizen registration automatically redirects to citizen dashboard
      router.push("/dashboard");
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
          Create Citizen Account
        </CardTitle>
        <CardDescription>
          Register for the BhumiSetu land portal to file applications and track properties
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
            id="name"
            label="Full Name"
            type="text"
            autoComplete="name"
            placeholder="Tanmay Patil"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            required
          />

          <Input
            id="email"
            label="Email Address"
            type="email"
            autoComplete="email"
            placeholder="tanmay@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            required
          />

          <Input
            id="phone"
            label="Phone Number (Optional)"
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isSubmitting}
          />

          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            helperText="Must be at least 8 characters long."
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
            Create Account
          </Button>

          <p className="text-xs text-slate-600 text-center">
            Already registered?{" "}
            <Link
              href="/login"
              className="font-semibold text-emerald-800 hover:text-emerald-700 hover:underline"
            >
              Sign In
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
