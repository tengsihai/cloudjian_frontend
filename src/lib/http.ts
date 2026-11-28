import { API_BASE } from './config';
import { getAccessToken, onUnauthorized } from './auth';

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  query?: Query;
  body?: unknown;
  headers?: Record<string, string>;
  /** 匿名接口（公开笔记）不附带 Authorization */
  anonymous?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  etag: string | null;
  status: number;
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/** 统一请求：解 `{statuscode, body}` / `{statuscode, error_message}` 信封，回 ETag。 */
export async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (!options.anonymous) {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path, options.query), {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 401) onUnauthorized();

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const envelope = payload as { error_message?: string; message?: string } | null;
    const message = envelope?.error_message ?? envelope?.message ?? `请求失败（${response.status}）`;
    throw new HttpError(response.status, message);
  }

  const envelope = payload as { statuscode?: number; body?: T } | null;
  const data = envelope && typeof envelope === 'object' && 'statuscode' in envelope
    ? (envelope.body as T)
    : (payload as T);

  return { data, etag: response.headers.get('etag'), status: response.status };
}
