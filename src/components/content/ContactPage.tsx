import Image from "next/image";
import { CONTACT_FAQS } from "@/content/faqs";
import { Accordion } from "./Accordion";
import { ContactForm } from "./ContactForm";
import styles from "./ContactPage.module.css";

const CARDS = [
  {
    id: "location",
    icon: "/images/contact/icon-location.svg",
    title: "Our location",
    dark: true,
    lines: ["2571 Oakridge Street, Suite 4B, Portland, OR 97205"],
  },
  {
    id: "email",
    icon: "/images/contact/icon-email.svg",
    title: "Email us",
    dark: false,
    links: [
      { text: "support@cosmia.com", href: "mailto:support@cosmia.com" },
      { text: "info@cosmia.com", href: "mailto:info@cosmia.com" },
    ],
  },
  {
    id: "phone",
    icon: "/images/contact/icon-phone.svg",
    title: "Call us",
    dark: true,
    links: [
      { text: "+1 (009) 544-7828", href: "tel:+10095447828" },
      { text: "+1 (009) 544-7828", href: "tel:+10095447828" },
    ],
  },
  {
    id: "chat",
    icon: "/images/contact/icon-chat.svg",
    title: "Live chat",
    dark: true,
    lines: ["livechat@cosmia.com"],
    help: "Need Help?",
  },
] as const;

/** Contact us. Figma 3:27227: four contact cards, map beside the message form, then "Common questions". */
export function ContactPage() {
  return (
    <>
      <section className={`container ${styles.intro}`} aria-labelledby="contact-title">
        <div className={styles.head}>
          <div>
            <p className={styles.label}>Contact us</p>
            <h2 id="contact-title" className={styles.display}>
              Find Us and connect
            </h2>
          </div>
          <p className={styles.lead}>
            Our support team is made up of licensed estheticians and real humans — no bots reading
            scripts. <strong>Average reply time: under 4 hours.</strong>
          </p>
        </div>
        <ul className={styles.cards}>
          {CARDS.map((card) => (
            <li key={card.id} className={styles.card} data-testid="contact-card">
              <span className={styles.icon} data-red={card.dark ? undefined : ""}>
                <Image src={card.icon} alt="" width={31} height={31} unoptimized />
              </span>
              <h3>{card.title}</h3>
              {"lines" in card ? <p className={styles.plain}>{card.lines[0]}</p> : null}
              {"links" in card
                ? card.links.map((link, i) => (
                    <a key={`${link.href}-${i}`} href={link.href}>
                      {link.text}
                    </a>
                  ))
                : null}
              {"help" in card ? (
                <a className={styles.help} href="mailto:livechat@cosmia.com">
                  {card.help}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className={`container ${styles.talk}`} aria-label="Visit us or write to us">
        <div className={styles.map} data-testid="contact-map">
          <Image
            src="/images/stores/map.png"
            alt="Map of central Copenhagen"
            fill
            sizes="645px"
            className={styles.mapImage}
          />
          <Image
            src="/images/contact/pin.svg"
            alt=""
            width={60}
            height={60}
            unoptimized
            className={styles.pin}
          />
        </div>
        <ContactForm />
      </section>

      <section className={styles.faq} aria-labelledby="faq-title">
        <p className={`${styles.label} ${styles.center}`}>Read FAQ</p>
        <h2 id="faq-title" className={`${styles.display} ${styles.center}`}>
          Common questions
        </h2>
        <div className={styles.accordion}>
          <Accordion items={CONTACT_FAQS} defaultOpen={[CONTACT_FAQS[0]!.id]} />
        </div>
      </section>
    </>
  );
}
