import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/arena(.*)", "/match(.*)"]);
const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  const session = await auth();

  if (!session.userId) {
    if (isProtectedRoute(request)) {
      auth.protect();
    }

    return;
  }

  if (isAuthRoute(request) || isOnboardingRoute(request)) {
    return;
  }

  const token = await session.getToken(process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE ? { template: process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE } : undefined);

  if (!token) {
    return;
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return;
    }

    const profile = (await response.json()) as { onboardingComplete?: boolean };

    if (profile.onboardingComplete === false) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  } catch {
    return;
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};