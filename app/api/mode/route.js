import { NextResponse } from 'next/server';
import { getAppMode } from '@/lib/appMode';

export async function GET() {
  return NextResponse.json({ mode: getAppMode() });
}
