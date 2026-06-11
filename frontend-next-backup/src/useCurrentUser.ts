import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

import { ApiError, get } from './api';

export type CurrentUser = {
  profile: {
    username: string;
    eloRating: number;
    rank: string | null;
    preferredLanguages: string[];
    interests: string[];
  };
  stats: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    badgesEarned: number;
    rankPosition: number;
  };
};

type UserResponse = {
  username: string;
  eloRating: number | null;
  rankTier: string | null;
  preferredLanguages: string[] | null;
  topicInterests: string[] | null;
};

type StatsResponse = CurrentUser['stats'];

function normalizeUser(profile: UserResponse, stats: StatsResponse): CurrentUser {
  return {
    profile: {
      username: profile.username,
      eloRating: profile.eloRating ?? 0,
      rank: profile.rankTier,
      preferredLanguages: profile.preferredLanguages ?? [],
      interests: profile.topicInterests ?? [],
    },
    stats,
  };
}

export function useCurrentUser() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      if (!isLoaded || !isSignedIn) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = await getToken();
        const [profile, stats] = await Promise.all([
          get<UserResponse>('/api/users/me', { signal: controller.signal, token }),
          get<StatsResponse>('/api/users/me/stats', { signal: controller.signal, token }),
        ]);

        if (!active) {
          return;
        }

        setUser(normalizeUser(profile, stats));
      } catch (unknownError) {
        if (!active) {
          return;
        }

        if (unknownError instanceof ApiError && unknownError.status === 404) {
          setError('User record not ready yet.');
        } else {
          setError('Failed to load current user.');
        }
        setUser(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [getToken, isLoaded, isSignedIn]);

  return { user, loading, error };
}