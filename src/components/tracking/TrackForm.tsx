"use client";

import { useState, type FormEvent } from "react";
import { Field } from "@/components/form/Field";
import formStyles from "@/components/account/AuthForms.module.css";
import { OrderDetails, OrderTimeline } from "@/components/orders/OrderDetails";
import pageStyles from "@/components/orders/OrderPages.module.css";
import { Icon } from "@/components/ui/Icon";
import { sendJson } from "@/lib/api";
import { trackSchema } from "@/lib/validation/auth";
import { fieldErrors, type FieldErrors } from "@/lib/validation/checkout";
import type { OrderView } from "@/server/orders/service";
import { STATUS_LABEL } from "@/server/orders/state";

/**
 * Order tracking (TRK-001, TRK-002). Figma 3:23740 is the form; the result below it is a proposed design.
 * A wrong ID or email always shows the same message, so IDs cannot be probed.
 */
export function TrackForm() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [order, setOrder] = useState<OrderView | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    setOrder(null);
    const parsed = trackSchema.safeParse({ orderId, email });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    const result = await sendJson<{ order: OrderView }>("/api/orders/track", "POST", parsed.data);
    setBusy(false);
    if (result.ok) setOrder(result.data.order);
    else {
      setErrors(result.data.errors ?? {});
      if (!result.data.errors) setFormError(result.data.message ?? "Something went wrong.");
    }
  }

  return (
    <>
      <div className={formStyles.card}>
        <form className={formStyles.form} onSubmit={submit} noValidate data-testid="track-form">
          <p className={formStyles.intro}>
            To track your order please enter your Order ID in the box below and press the
            &ldquo;Track&rdquo; button. This was given to you on your receipt and in the
            confirmation email you should have received.
          </p>
          {formError ? (
            <p role="alert" className={formStyles.alert} data-testid="form-error">
              {formError}
            </p>
          ) : null}
          <Field
            label="Order ID"
            name="orderId"
            value={orderId}
            onChange={setOrderId}
            error={errors.orderId}
            required
          />
          <Field
            label="Billing email"
            name="email"
            kind="email"
            value={email}
            onChange={setEmail}
            error={errors.email}
            autoComplete="email"
            required
          />
          <button
            type="submit"
            className={formStyles.submit}
            disabled={busy}
            data-testid="auth-submit"
          >
            <span>{busy ? "Looking…" : "Track order"}</span>
            <Icon name="arrow-up-right" size={18} />
          </button>
        </form>
      </div>

      {order ? (
        <section
          className={pageStyles.section}
          aria-labelledby="track-result"
          data-testid="track-result"
        >
          <h2 id="track-result">
            Order {order.number} · {STATUS_LABEL[order.status]}
          </h2>
          <OrderTimeline order={order} />
          <div style={{ marginTop: 40 }}>
            <OrderDetails order={order} />
          </div>
        </section>
      ) : null}
    </>
  );
}
