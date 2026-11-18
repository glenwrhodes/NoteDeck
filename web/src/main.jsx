// The entry point: Vite loads this file first (see index.html).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

// The font is bundled with the app (no external font server needed).
import '@fontsource/barlow-condensed/400.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './styles.css';

import App from './App.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';

// Mount the React component tree into <div id="root"> in index.html.
// BrowserRouter gives the app URLs (/notes, /notes/7...), and AuthProvider
// makes the logged-in user available to every component below it.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
