import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SettingsApp } from './settings/SettingsApp';
import './styles/globals.css';

const isSettings = window.location.hash.startsWith('#settings');
if (isSettings) document.body.classList.add('settings-window');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isSettings ? <SettingsApp /> : <App />}</React.StrictMode>
);
