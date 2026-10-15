"use client";

import { signIn } from "next-auth/react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />

      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.topline} aria-hidden="true" />

        <div className={styles.content}>
          <div className={styles.icon} aria-hidden="true">
            <LockKeyhole size={30} strokeWidth={1.8} />
          </div>

          <p className={styles.eyebrow}>STARTPAGE / SECURE ACCESS</p>
          <h1 id="login-title" className={styles.title}>Management access</h1>
          <p className={styles.copy}>
            Sign in with the authorized Google account to access Notes, Management and private system tools.
          </p>

          <div className={styles.status}>
            <span className={styles.statusDot} aria-hidden="true" />
            AUTHENTICATION REQUIRED
          </div>

          <button
            type="button"
            className={styles.button}
            onClick={() => signIn("google", { callbackUrl: "/yonetim" })}
          >
            Continue with Google
            <ArrowRight size={17} />
          </button>
        </div>

        <footer className={styles.footer}>TAURUS OS · AUTHORIZED ACCESS ONLY</footer>
      </section>
    </main>
  );
}
