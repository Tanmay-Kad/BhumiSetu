import React from "react";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Citizen Registration | BhumiSetu",
  description: "Register for a citizen account on the BhumiSetu platform.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
