import { useSyncExternalStore } from "react";

import type { CheckoutStep } from "@/components/checkout/checkout-steps";

const DEFAULT_STEP: CheckoutStep = "address";

let currentStep: CheckoutStep = DEFAULT_STEP;
const listeners = new Set<() => void>();

export function setCheckoutStep(step: CheckoutStep): void {
  if (step === currentStep) return;
  currentStep = step;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Step shown by the header tracker while on `/checkout`. */
export function useCheckoutStep(): CheckoutStep {
  return useSyncExternalStore(
    subscribe,
    () => currentStep,
    () => DEFAULT_STEP,
  );
}
