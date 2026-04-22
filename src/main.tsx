import './utils/polyfills';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ccc } from '@ckb-ccc/connector-react';
import './index.css';
import App from './App';
import { AppProvider } from './context/AppContext';
import { TransactionProvider } from './context/TransactionContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ccc.Provider
      defaultClient={new ccc.ClientPublicTestnet()}
      name="RGB++ Asset Manager"
    >
      <AppProvider>
        <TransactionProvider>
          <App />
        </TransactionProvider>
      </AppProvider>
    </ccc.Provider>
  </StrictMode>,
);
