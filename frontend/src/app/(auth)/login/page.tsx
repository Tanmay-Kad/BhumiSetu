import React from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In | BhumiSetu",
  description: "Sign in to your BhumiSetu land portal account.",
};

export default function LoginPage() {
  return <LoginForm />;
}
