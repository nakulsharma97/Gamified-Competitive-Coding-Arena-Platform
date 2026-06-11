import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Spinner } from '@codeslam/ui';

import { ApiError, get } from './api';
import { navigateTo } from './navigation';

type MeResponse = {
  username: string | null;
  eloRating: number;
  rank: string | null;
  preferredLanguages: string[] | null;
  topicInterests: string[] | null;
};

export function AuthCallbackPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [message, setMessage] = useState('Finalizing your account...');
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    document.title = 'Signing you in | CodeSlam';
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return undefined;
    }

    if (!isSignedIn) {
      navigateTo('/login');
      return undefined;
    }

    let active = true;

    const clearPoll = () => {
      if (pollRef.current != null) {
        window.clearTimeout(pollRef.current);
        pollRef.current = null;
      }
    };

    const checkAccount = async () => {
      try {
        const token = await getToken();
        const me = await get<MeResponse>('/api/users/me', { token });
        if (!active) {
          return;
        }

        clearPoll();

        if (!me.username || !me.username.trim()) {
          navigateTo('/onboarding');
          return;
        }

        navigateTo('/dashboard');
      } catch (error) {
        if (!active) {
          return;
        }

        if (error instanceof ApiError && error.status === 404) {
          setMessage('Waiting for your account to be created...');
          clearPoll();
          pollRef.current = window.setTimeout(() => {
            void checkAccount();
          }, 2000);
          return;
        }

        setMessage('We could not verify your account yet. Retrying...');
        clearPoll();
        pollRef.current = window.setTimeout(() => {
          void checkAccount();
        }, 2000);
      }
    };

    void checkAccount();

    return () => {
      active = false;
      clearPoll();
    };
  }, [getToken, isLoaded, isSignedIn]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_28%),linear-gradient(180deg,#030712_0%,#050816_55%,#020617_100%)] text-slate-100">
      <div className="rounded-[1.75rem] border border-white/10 bg-white/5 px-6 py-5 backdrop-blur-xl">
        <Spinner label={message} />
      </div>
    </div>
  );
}