import Image from "next/image";
import styles from "./BenefitStrip.module.css";

export type Benefit = { icon: string; title: string; text: string };

/** Placeholder copy from the design; managed from the admin in P9 (ACN-003). */
const DEFAULT_BENEFITS: Benefit[] = [
  {
    icon: "/images/ui/benefit-free-shipping.svg",
    title: "Free Shipping",
    text: "Enjoy free shippings on orders over $50, carefully packed and delivered straight.",
  },
  {
    icon: "/images/ui/benefit-easy-returns.svg",
    title: "Easy Returns",
    text: "Not the right fit? Enjoy over easy returns within 15 days on eligible, unopened products.",
  },
  {
    icon: "/images/ui/benefit-secure-checkout.svg",
    title: "Secure Checkout",
    text: "Shop with confidence through our safe and secure checkout, designed to keep.",
  },
  {
    icon: "/images/ui/benefit-support.svg",
    title: "Beauty Support",
    text: "Need help choosing a product? Our beauty support team is here to answer & questions.",
  },
];

/** Dark four-up strip shown above the footer on inner pages. Figma 3:4859. */
export function BenefitStrip({ benefits = DEFAULT_BENEFITS }: { benefits?: Benefit[] }) {
  return (
    <section className={styles.strip} aria-label="Why shop with us">
      <ul className={`container ${styles.grid}`}>
        {benefits.map((b) => (
          <li key={b.title} className={styles.card}>
            <Image src={b.icon} alt="" width={64} height={64} unoptimized />
            <h2>{b.title}</h2>
            <p>{b.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
