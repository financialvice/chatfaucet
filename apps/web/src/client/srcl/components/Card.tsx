import type * as React from "react";
import styles from "./Card.module.css";

interface CardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  children?: React.ReactNode;
  mode?: string;
  title?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, mode, title, style }) => {
  let titleElement = (
    <header className={styles.action}>
      <div aria-hidden="true" className={styles.left} />
      {title ? <h2 className={styles.title}>{title}</h2> : null}
      <div aria-hidden="true" className={styles.right} />
    </header>
  );

  if (mode === "left") {
    titleElement = (
      <header className={styles.action}>
        <div aria-hidden="true" className={styles.leftCorner} />
        <h2 className={styles.title}>{title}</h2>
        <div aria-hidden="true" className={styles.right} />
      </header>
    );
  }

  if (mode === "right") {
    titleElement = (
      <header className={styles.action}>
        <div aria-hidden="true" className={styles.left} />
        <h2 className={styles.title}>{title}</h2>
        <div aria-hidden="true" className={styles.rightCorner} />
      </header>
    );
  }

  return (
    <article className={styles.card} style={style}>
      {titleElement}
      <section className={styles.children}>{children}</section>
    </article>
  );
};

export default Card;
