"use client";

import * as React from "react";

type ToastVariant = "default" | "success" | "destructive";

export type Toast = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastAction =
  | { type: "ADD"; toast: Toast }
  | { type: "DISMISS"; toastId: string }
  | { type: "REMOVE"; toastId: string };

type ToastState = {
  toasts: Toast[];
};

const TOAST_LIMIT = 4;
const TOAST_REMOVE_DELAY = 3500;

let count = 0;
const listeners = new Set<(state: ToastState) => void>();
let memoryState: ToastState = { toasts: [] };
const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

function dispatch(action: ToastAction) {
  memoryState = reducer(memoryState, action);
  listeners.forEach(listener => listener(memoryState));
}

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "ADD": {
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    }
    case "DISMISS": {
      const { toastId } = action;
      if (!timeouts.has(toastId)) {
        const timeout = setTimeout(() => {
          timeouts.delete(toastId);
          dispatch({ type: "REMOVE", toastId });
        }, TOAST_REMOVE_DELAY);
        timeouts.set(toastId, timeout);
      }
      return state;
    }
    case "REMOVE": {
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== action.toastId),
      };
    }
    default:
      return state;
  }
}

export function toast(input: Omit<Toast, "id">) {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  const id = String(count);
  dispatch({ type: "ADD", toast: { id, ...input } });
  dispatch({ type: "DISMISS", toastId: id });
  return id;
}

export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);

  React.useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId: string) => dispatch({ type: "DISMISS", toastId }),
  };
}
