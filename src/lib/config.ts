/** 构建期注入的运行时配置；缺省时前端走本地 mock。 */
export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
export const USER_POOL_ID = import.meta.env.VITE_USER_POOL_ID ?? '';
export const CLIENT_ID = import.meta.env.VITE_CLIENT_ID ?? '';
export const AWS_REGION = import.meta.env.VITE_AWS_REGION ?? 'ap-northeast-1';

/** 配了 API 基址就走真实接口，否则走 mock。 */
export const useRealApi = Boolean(API_BASE);
/** 配了用户池就走 Cognito SRP，否则走演示账号。 */
export const useCognito = Boolean(USER_POOL_ID && CLIENT_ID);
