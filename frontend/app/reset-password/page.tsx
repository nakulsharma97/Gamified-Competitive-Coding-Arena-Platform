import type { Metadata } from "next";
import ResetPasswordClient from "./reset-password-client";

export const metadata: Metadata = {
  title: "Reset Password | CodeSlam",
  description: "Request a reset link or set a new CodeSlam password.",
};

type PageProps = {
  searchParams: Promise<{
    token?: string | string[];
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const token = Array.isArray(params?.token)
    ? params.token[0]
    : params?.token ?? "";

  return <ResetPasswordClient initialToken={token} />;
}