import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AccountNav } from "@/components/account/AccountNav";
import styles from "@/components/account/Account.module.css";
import { BenefitStrip } from "@/components/layout/BenefitStrip";
import { PageHero } from "@/components/layout/PageHero";
import { getCurrentUser } from "@/server/auth/session";

/** Every /account page needs a signed-in customer; the check runs on the server for each request (USR-004). */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  return (
    <>
      <PageHero title="My account" />
      <div className={`container ${styles.page}`}>
        <div className={styles.layout}>
          <AccountNav />
          <div className={styles.content}>{children}</div>
        </div>
      </div>
      <BenefitStrip />
    </>
  );
}
