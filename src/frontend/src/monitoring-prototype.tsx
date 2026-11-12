import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MonitoringPrototype } from './monitoring/MonitoringPrototype.js';
import './monitoring/monitoring.css';

const root = document.getElementById('root');
if (!root) throw new Error('The monitoring prototype root is missing.');

createRoot(root).render(
  <StrictMode>
    <MonitoringPrototype />
  </StrictMode>,
);
