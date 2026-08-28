import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

/**
 * Every value here points at a custom property defined in app/globals.css.
 * Nothing is written twice, so the token file stays the single source of truth.
 *
 * Note on `theme.colors`: it *replaces* Tailwind's palette rather than
 * extending it. `bg-slate-500` and `text-red-600` do not exist in this
 * project — asking for a colour that is not a Tallie token is a build-time
 * mistake instead of a design drift found in review.
 *
 * Note on alpha: the tokens are hex, so opacity modifiers (`bg-pine/10`) do
 * NOT work — Tailwind cannot split a hex held in a custom property into
 * channels. This is deliberate. The design is flat and hairlined; if a tint
 * is genuinely needed, add a token for it (as --mint and --amber-bg already
 * are) so it has a name and a reason.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      inherit: "inherit",

      paper: "var(--paper)",
      canvas: "var(--canvas)",
      ink: "var(--ink)",
      muted: "var(--muted)",
      faint: "var(--faint)",
      pine: {
        DEFAULT: "var(--pine)",
        deep: "var(--pine-deep)",
      },
      mint: "var(--mint)",
      amber: {
        DEFAULT: "var(--amber)",
        bg: "var(--amber-bg)",
      },
      over: {
        DEFAULT: "var(--over)",
        bg: "var(--over-bg)",
      },
      line: "var(--line)",
      scrim: "var(--scrim)",
    },

    borderRadius: {
      none: "0",
      button: "var(--radius-button)",
      card: "var(--radius-card)",
      app: "var(--radius-card-app)",
      full: "9999px",
    },

    extend: {
      fontFamily: {
        // Body is the default family; `font-display` and `font-numeral` are
        // added as utilities below so they always carry their tracking and
        // numeric settings with them.
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderColor: {
        // A bare `border` is a hairline. That is the only border this design has.
        DEFAULT: "var(--line)",
      },
      ringColor: {
        DEFAULT: "var(--pine)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        /* Headings only. Tracking travels with the family so it cannot be
           forgotten. */
        ".font-display": {
          fontFamily: "var(--font-display), ui-sans-serif, system-ui, sans-serif",
          letterSpacing: "-0.02em",
        },
        /* Every rand amount, everywhere, no exceptions. Tabular figures are
           part of the family here so a column of money always lines up. */
        ".font-numeral": {
          fontFamily: "var(--font-numeral), ui-monospace, SFMono-Regular, Menlo, monospace",
          fontVariantNumeric: "tabular-nums",
          fontFeatureSettings: '"tnum" 1',
        },
      });
    }),
  ],
};

export default config;
