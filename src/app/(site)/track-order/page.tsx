import type { Metadata } from "next";
import styles from "@/components/account/AuthForms.module.css";
import { BenefitStrip } from "@/components/layout/BenefitStrip";
import { PageHero } from "@/components/layout/PageHero";
import { TrackForm } from "@/components/tracking/TrackForm";

export const metadata: Metadata = { title: "Order tracking" };

/** Figma 3:23740. */
export default function TrackOrderRoute() {
  return (
    <>
      <PageHero title="Order tracking" />
      <div
        className={`container ${styles.page}`}
        style={{ display: "flex", flexDirection: "column", gap: 60 }}
      >
        <TrackForm />
      </div>
      <BenefitStrip />
    </>
  );
}
