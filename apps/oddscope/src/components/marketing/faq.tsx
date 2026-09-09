const QUESTIONS = [
  {
    q: "Will this make me money?",
    a: "Honest answer: it improves your decisions, and better decisions compound. But betting has variance, losing runs are mathematically normal, and a realistic long-term edge is a few percent, not a fortune. Anyone promising more is selling you something.",
  },
  {
    q: "Which bookmakers does it work with?",
    a: "All of them. We read the screenshot, not an API.",
  },
  {
    q: "Where does the data come from?",
    a: "Live web search at the moment of analysis — recent results, confirmed team news, head-to-head records, home and away form.",
  },
  {
    q: "What if my screenshot is blurry?",
    a: "We'll tell you and ask for a clearer one rather than guess at the odds.",
  },
  {
    q: "How fast is it?",
    a: "Twenty to forty seconds. It's searching and reasoning, not looking something up in a table.",
  },
  {
    q: "Can I cancel?",
    a: "Any time, from your Whop dashboard. No email, no retention call.",
  },
  {
    q: "Is betting legal where I am?",
    a: "Depends on your country. Check before you use this.",
  },
];

/**
 * Native <details> rather than a scripted accordion: it opens without
 * JavaScript, it is keyboard-operable for free, and browser find-in-page can
 * reach the answers.
 */
export function Faq() {
  return (
    <div className="mt-8 divide-y divide-navy-800 border-y border-navy-800">
      {QUESTIONS.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-medium text-slate-100">
            {item.q}
            <span
              className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
              aria-hidden="true"
            >
              ▾
            </span>
          </summary>
          <p className="prose-measure pb-5 text-sm leading-relaxed text-slate-400">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
