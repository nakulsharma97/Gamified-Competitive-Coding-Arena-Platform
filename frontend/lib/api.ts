export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

type ApiOptions = RequestInit & {
  json?: unknown;
  token?: string | null;
};

type ApiJsonOptions = ApiOptions & object;

async function getBearerToken() {
  if (typeof window === "undefined") {
    try {
      const { auth } = await import("@clerk/nextjs/server");
      const clerkAuth = await auth();
      return clerkAuth.getToken();
    } catch {
      return null;
    }
  }

  const clerk = (
    window as typeof window & {
      Clerk?: {
        session?: {
          getToken: () => Promise<string | null>;
        };
      };
    }
  ).Clerk;

  return clerk?.session?.getToken?.() ?? null;
}

export async function apiFetch(path: string, options: ApiOptions = {}) {
  // Use NEXT_PUBLIC_API_URL when set (production / explicit local config).
  // Fall back to a relative URL so Next.js rewrites() can proxy /api/* in dev.
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  const { token, json, ...requestOptions } = options;
  const resolvedToken = token ?? (await getBearerToken());
  const headers = new Headers(options.headers);

  if (resolvedToken) {
    headers.set("Authorization", `Bearer ${resolvedToken}`);
  }

  const body = json !== undefined ? JSON.stringify(json) : requestOptions.body;

  if (
    json !== undefined &&
    !headers.has("Content-Type") &&
    !(body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...requestOptions,
    body,
    headers,
  });

  if (!response.ok) {
    let data: unknown = null;

    try {
      data = await response.clone().json();
    } catch {
      try {
        data = await response.text();
      } catch {
        data = null;
      }
    }

    throw new ApiError(
      response.statusText || "Request failed",
      response.status,
      data
    );
  }

  return response;
}

export async function apiJson<T>(path: string, options: ApiJsonOptions = {}) {
  const response = await apiFetch(path, options);
  return (await response.json()) as T;
}

export async function getServerToken() {
  if (typeof window !== "undefined") {
    return null;
  }

  try {
    const { auth } = await import("@clerk/nextjs/server");
    const session = await auth();
    return session.getToken();
  } catch {
    return null;
  }
}
