import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Ensure that ./App.tsx exists in the same directory, or update the path accordingly
import './index.css';
import 'mapbox-gl/dist/mapbox-gl.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);
