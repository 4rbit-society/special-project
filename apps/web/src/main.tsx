import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './araw.css';
import './auth.css';
import './workspace.css';
import './child-araw.css';
import './motion.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
