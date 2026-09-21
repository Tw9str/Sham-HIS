import { NextRequest, NextResponse } from 'next/server';
import { DomainError, StorageConfigurationError, getStore } from '@/lib/store';
export const maxDuration = 60;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const COOKIE = 'sham_session';
function errorResponse(error: unknown) {
  if (error instanceof DomainError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof StorageConfigurationError)
    return NextResponse.json({ error: error.message, code: error.code }, { status: 503 });
  console.error('Hospital API error', {
    name: error instanceof Error ? error.name : 'Unknown',
    code: (error as { code?: string })?.code,
  });
  return NextResponse.json(
    { error: 'The request could not be completed. / تعذر إكمال الطلب.' },
    { status: 500 },
  );
}
export async function GET(request: NextRequest) {
  try {
    const store = await getStore();
    const user = await store.user(request.cookies.get(COOKIE)?.value);
    if (!user)
      return NextResponse.json(
        { user: null, demo: store.demo },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    return NextResponse.json(await store.snapshot(user), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const expectedOrigin =
      process.env.SHAM_PUBLIC_ORIGIN ??
      `${request.nextUrl.protocol}//${request.headers.get('host')}`;
    if (request.headers.get('origin') !== expectedOrigin)
      throw new DomainError('Request origin is not allowed. / مصدر الطلب غير مسموح.', 403);
    if (!request.headers.get('content-type')?.includes('application/json'))
      throw new DomainError('JSON content required.', 415);
    if (Number(request.headers.get('content-length') ?? 0) > 65536)
      throw new DomainError('Request too large.', 413);
    const raw = await request.text();
    if (raw.length > 65536) throw new DomainError('Request too large.', 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new DomainError('Invalid JSON.');
    }
    if (!body || typeof body !== 'object') throw new DomainError('Invalid request.');
    const store = await getStore();
    if (body.action === 'login') {
      if (
        typeof body.email !== 'string' ||
        body.email.length > 150 ||
        typeof body.password !== 'string' ||
        body.password.length > 200
      )
        throw new DomainError('Invalid credentials.');
      const { token } = await store.login(body.email, body.password);
      const response = NextResponse.json({ ok: true });
      response.cookies.set(COOKIE, token, {
        httpOnly: true,
        secure: new URL(expectedOrigin).protocol === 'https:',
        sameSite: 'strict',
        path: '/',
        maxAge: 12 * 3600,
      });
      return response;
    }
    const token = request.cookies.get(COOKIE)?.value;
    const user = await store.user(token);
    if (!user) throw new DomainError('Please sign in again. / يرجى تسجيل الدخول مجددًا.', 401);
    if (body.action === 'logout') {
      await store.logout(token!);
      const response = NextResponse.json({ ok: true });
      response.cookies.delete(COOKIE);
      return response;
    }
    const result = await store.execute(user, body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
