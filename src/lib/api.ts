import { mockApi } from './mock';
import { realApi } from './realApi';
import { API_BASE, useRealApi } from './config';

/** 真实实现与 mock 必须保持同一套方法签名，页面只依赖 `api`。 */
export type ApiClient = typeof mockApi;

/** 配了 VITE_API_URL 走真实接口，否则走本地 mock。 */
export const api: ApiClient = useRealApi ? realApi : mockApi;

export const isMockApi = !API_BASE;
