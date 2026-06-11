"use client";

import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type DamagePopupHandle = {
  show: (value: number) => void;
};

type DamagePopupItem = {
  id: string;
  value: number;
};

type DamagePopupProps = {
  className?: string;
};

export const DamagePopup = forwardRef<DamagePopupHandle, DamagePopupProps>(function DamagePopup(
  { className },
  ref,
) {
  const [items, setItems] = useState<DamagePopupItem[]>([]);

  useImperativeHandle(ref, () => ({
    show(value: number) {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setItems(current => [...current, { id, value }]);
      window.setTimeout(() => {
        setItems(current => current.filter(item => item.id !== id));
      }, 900);
    },
  }), []);

  const renderedItems = useMemo(() => items, [items]);

  return (
    <div className={cn("pointer-events-none relative h-0 w-full", className)}>
      {renderedItems.map((item, index) => (
        <div
          key={item.id}
          className="absolute left-1/2 top-0 -translate-x-1/2 text-xl font-black tracking-widest text-amber-300 drop-shadow-[0_0_12px_rgba(186,117,23,0.45)]"
          style={{
            animation: `damageFloatUp 900ms ease-out forwards`,
            transform: `translateX(-50%) translateY(${index * -4}px)`,
          }}
        >
          -{Math.abs(item.value)}
        </div>
      ))}
    </div>
  );
});
