import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme } from 'antd';
import App from './App';
import { AuthProvider } from './app/AuthContext';
import { PreferencesProvider, usePreferences } from './app/PreferencesContext';
import { ToastProvider } from './app/ToastContext';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/web">
        <ToastProvider>
          <AuthProvider>
            <PreferencesProvider>
              <ThemedApp />
            </PreferencesProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

function ThemedApp() {
  const { theme } = usePreferences();
  return (
    <ConfigProvider
      theme={{
        algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: theme === 'dark' ? '#a6ce8b' : '#4c7a45',
          colorBgBase: theme === 'dark' ? '#12161b' : '#f6f7f9',
          colorBgContainer: theme === 'dark' ? '#171c23' : '#ffffff',
          colorBorderSecondary: theme === 'dark' ? '#2a333e' : '#e4e7ec',
          borderRadius: 6,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", "Noto Sans JP", sans-serif',
        },
      }}
    >
      <App />
    </ConfigProvider>
  );
}
