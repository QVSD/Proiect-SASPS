import 'dotenv/config';
import { prisma } from '../src/config/db';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

type CsvRow = Array<string | number | null>;

const OUTPUT_PATH =
  process.env.TRADER_METRICS_CSV ??
  resolve(process.cwd(), 'trader-metrics.csv');

function escapeCsv(value: string | number | null) {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: CsvRow[]) {
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
}

async function exportMetrics() {
  const metrics = await prisma.traderMetric.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const rows: CsvRow[] = [
    [
      'id',
      'traderAddress',
      'baseTokenAddress',
      'quoteTokenAddress',
      'traderType',
      'blockNumber',
      'txCount',
      'baseBalance',
      'quoteBalance',
      'createdAt',
    ],
  ];

  for (const metric of metrics) {
    rows.push([
      metric.id,
      metric.traderAddress,
      metric.baseTokenAddress,
      metric.quoteTokenAddress,
      metric.traderType,
      metric.blockNumber,
      metric.txCount,
      metric.baseBalance,
      metric.quoteBalance,
      metric.createdAt.toISOString(),
    ]);
  }

  writeFileSync(OUTPUT_PATH, `${toCsv(rows)}\n`, 'utf-8');
  // eslint-disable-next-line no-console
  console.log(`Exported ${metrics.length} rows to ${OUTPUT_PATH}`);
}

exportMetrics()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
