import { useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { X } from "lucide-react";

const stripePublishableKey =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

interface CheckoutModalProps {
  clientSecret: string;
  onClose: () => void;
}

export function CheckoutModal({ clientSecret, onClose }: CheckoutModalProps) {
  const fetchClientSecret = useCallback(
    () => Promise.resolve(clientSecret),
    [clientSecret],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-base px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-charcoal/45 font-semibold">
              Upgrade
            </p>
            <h2 className="text-lg font-bold text-navy leading-tight">
              Wrex Pro — $9/month
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-charcoal/40 transition hover:bg-mist hover:text-charcoal"
            aria-label="Close checkout"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stripe Embedded Checkout */}
        <div className="max-h-[70vh] overflow-y-auto px-2 py-2">
          {stripePromise ? (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-semibold text-navy">
                Checkout is not configured in this environment.
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-charcoal/60">
                Add a Stripe publishable key to enable upgrades locally.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 rounded-soft bg-navy px-4 py-2 text-xs font-bold text-white transition hover:bg-navy/80"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Trust footer */}
        <div className="border-t border-border-base px-6 py-3 text-center text-xs text-charcoal/40">
          Payments processed securely by Stripe · Cancel anytime
        </div>
      </div>
    </div>
  );
}
