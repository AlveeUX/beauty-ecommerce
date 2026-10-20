"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./PolicyPage.module.css";

type Item = { id: string; toc: string };

/** "On this page" list (Figma 3:24160): numbered anchors; the section being read is underlined. */
export function PolicyToc({ items }: { items: Item[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  // after a click the page scrolls by itself; the clicked entry stays selected until the reader scrolls on
  const lockedUntil = useRef(0);

  useEffect(() => {
    const sections = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    // the section being read is the last one whose top has passed the upper third of the screen;
    // above the first section the first entry is selected
    let frame = 0;
    const update = () => {
      frame = 0;
      if (Date.now() < lockedUntil.current) return;
      const line = window.innerHeight * 0.34;
      let current = sections[0]!.id;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= line) current = section.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // the reader taking over (wheel, touch, keys) ends the click lock
    const unlock = () => {
      lockedUntil.current = 0;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", unlock, { passive: true });
    window.addEventListener("touchmove", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", unlock);
      window.removeEventListener("touchmove", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [items]);

  return (
    <nav className={styles.toc} aria-label="On this page" data-testid="policy-toc">
      <p className={styles.tocTitle}>On this page</p>
      <ol>
        {items.map((item, index) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? "location" : undefined}
              onClick={() => {
                lockedUntil.current = Date.now() + 1200;
                setActive(item.id);
              }}
            >
              <span>{index + 1}.</span>
              {item.toc}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
