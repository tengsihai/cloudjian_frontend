import { mockApi } from './mock';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

/**
 * 当前阶段默认走本地 mock，保证没有后端时也能开发完整交互。
 * 配置 VITE_API_URL 后，后续只需在这个对象里把对应方法切到 fetch 封装。
 */
export const api = mockApi;

export const isMockApi = !API_BASE;
