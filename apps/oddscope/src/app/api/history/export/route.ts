import { auth } from "@/lib/auth";
import { fetchHistory, parseFilters } from "@/lib/history";

/**
 * CSV export of the currently filtered history.
 *
 * Values are written raw rather than pre-formatted — a spreadsheet should get
 * 0.072, not "+7.2%", so the user can do their own arithmetic on top of ours.
 */
export const dynamic = "force-dynamic";

const COLUMNS = [
  "date",
  "match",
  "competition",
  "market",
  "selection",
  "odds",
  "tier",
  "model_probability",
  "implied_probability",
  "edge",
  "stake_units",
  "stake_amount",
  "outcome",
  "profit_loss_units",
  "settled_at",
];

/** RFC 4180: quote everything, and double any quote inside a field. */
function cell(value: unknown): string {
  if (value == null) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Not signed in.", { status: 401 });
  }

  const url = new URL(request.url);
  const filters = parseFilters(Object.fromEntries(url.searchParams));
  const rows = await fetchHistory(session.user.id, filters);

  const lines = [
    COLUMNS.join(","),
    ...rows.map((row) =>
      [
        row.analysis.createdAt.toISOString(),
        `${row.analysis.homeTeam} v ${row.analysis.awayTeam}`,
        row.analysis.competition,
        row.market,
        row.selection,
        row.odds,
        row.tier,
        row.modelProbability,
        row.impliedProbability,
        row.edgePercent,
        row.stakeUnits,
        row.stakeAmount,
        row.outcome,
        row.profitLoss,
        row.settledAt?.toISOString() ?? null,
      ]
        .map(cell)
        .join(","),
    ),
  ];

  const filename = `oddscope-history-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(`${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
