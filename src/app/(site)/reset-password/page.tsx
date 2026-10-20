import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/account/AuthForms";
import styles from "@/components/account/AuthForms.module.css";
import { BenefitStrip } from "@/components/layout/BenefitStrip";
import { PageHero } from "@/components/layout/PageHero";
import { getDb } from "@/db/client";
import { isResetTokenValid } from "@/server/auth/service";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

type Props = { searchParams: Promise<{ token?: string }> };

/** Target of the link in the reset email (proposed design: the forgot-password card with one field). */
export default async function ResetPasswordRoute({ searchParams }: Props) {
  const { token } = await searchParams;
  const valid = Boolean(token && /^[0-9a-f]{64}$/.test(token) && isResetTokenValid(getDb(), token));
  return (
    <>
      <PageHero title="My account" />
      <div className={`container ${styles.page}`}>
        <div className={styles.card}>
          {valid && token ? (
            <ResetForm token={token} />
          ) : (
            <div className={styles.form}>
              <p role="alert" className={styles.alert} data-testid="reset-invalid">
                This reset link is invalid or has expired.
              </p>
              <Link href="/forgot-password" className={styles.textLink}>
                Request a new link
              </Link>
            </div>
          )}
        </div>
      </div>
      <BenefitStrip />
    </>
  );
}
