import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthTabs, RegisterForm, safeNext } from "@/components/account/AuthForms";
import styles from "@/components/account/AuthForms.module.css";
import { BenefitStrip } from "@/components/layout/BenefitStrip";
import { PageHero } from "@/components/layout/PageHero";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Register" };

type Props = { searchParams: Promise<{ next?: string }> };

/** Figma 3:23089. */
export default async function RegisterRoute({ searchParams }: Props) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(safeNext(next));
  return (
    <>
      <PageHero title="My account" />
      <div className={`container ${styles.page}`}>
        <div className={styles.card}>
          <AuthTabs active="register" />
          <RegisterForm next={next} />
        </div>
      </div>
      <BenefitStrip />
    </>
  );
}
