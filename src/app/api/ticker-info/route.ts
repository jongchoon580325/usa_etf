import { NextRequest, NextResponse } from 'next/server';

const ALPHA_VANTAGE_API_KEY = '0SSBBFH0HOMROMSD';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker');
  if (!ticker) {
    return NextResponse.json({ error: 'ticker required' }, { status: 400 });
  }
  try {
    // 1. 실시간 가격 (GLOBAL_QUOTE)
    const priceUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const priceRes = await fetch(priceUrl);
    const priceJson = await priceRes.json();
    const price = priceJson?.['Global Quote']?.['05. price'] ? Number(priceJson['Global Quote']['05. price']) : null;

    // 2. 배당금 (OVERVIEW)
    const overviewUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const overviewRes = await fetch(overviewUrl);
    const overviewJson = await overviewRes.json();
    // Alpha Vantage는 연간 배당금(AnnualDividendRate)만 제공
    const annualDividend = overviewJson?.['AnnualDividendRate'] ? Number(overviewJson['AnnualDividendRate']) : null;
    // 월 배당금으로 환산 (단순히 12로 나눔, 실제 월배당 ETF는 다를 수 있음)
    const dividend = annualDividend !== null ? Number((annualDividend / 12).toFixed(4)) : null;

    return NextResponse.json({ ticker, price, dividend });
  } catch (e: any) {
    return NextResponse.json({ ticker, price: null, dividend: null, error: e.message || 'fetch error' }, { status: 500 });
  }
} 