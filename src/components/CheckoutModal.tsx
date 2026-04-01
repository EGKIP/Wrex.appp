import { useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { X } from "lucide-react";

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",
);

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
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ fetchClientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>

        {/* Trust footer */}
        <div className="border-t border-border-base px-6 py-3 text-center text-xs text-charcoal/40">
          Payments processed securely by Stripe · Cancel anytime
        </div>
      </div>
    </div>
  );
}

