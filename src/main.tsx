import '@ant-design/v5-patch-for-react-19';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import App from './App.tsx';
import './index.css';
import './nav.css';

const themeTokens = {
  colorPrimary: '#006837',
  colorSuccess: '#047857',
  colorWarning: '#C2410C',
  colorError: '#EF4444',
  colorInfo: '#1D4ED8',
  colorBgContainer: '#FFFFFF',
  colorBgLayout: '#F4F6FA',
  colorText: '#0F172A',
  colorTextDescription: '#64748B',
  borderRadius: 8,
  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={{ token: themeTokens }}>
      <App />
    </ConfigProvider>
  </StrictMode>,
);
