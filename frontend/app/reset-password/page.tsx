import type { Metadata } from "next";
import ResetPasswordClient from "./reset-password-client";

export const metadata: Metadata = {
  title: "Reset Password | CodeSlam",
  description: "Request a reset link or set a new CodeSlam password.",
};

export default function ResetPasswordPage({
  searchParams,
}: Readonly<{
  searchParams?: {
    token?: string | string[];
  };
}>) {
  const token = Array.isArray(searchParams?.token) ? searchParams?.token[0] : searchParams?.token ?? "";
  return <ResetPasswordClient initialToken={token} />;
}