// Centralized API configuration for JVM Architecture Visualizer
// When no VITE_API_BASE is specified in the environment,
// it falls back directly to the live AWS ECS Express backend.

export const AWS_LIVE_BACKEND_URL = 'https://ja-f080c07d4b5940e08a435fb60c7dcf1e.ecs.us-east-1.on.aws';

export const API_BASE = (
  import.meta.env.VITE_API_BASE !== undefined && import.meta.env.VITE_API_BASE !== ''
    ? import.meta.env.VITE_API_BASE
    : AWS_LIVE_BACKEND_URL
).replace(/\/$/, '');

// API key sent as X-API-Key header on all protected POST requests.
// Set VITE_APP_API_KEY in frontend/.env to match APP_API_KEY in backend/.env
export const APP_API_KEY = import.meta.env.VITE_APP_API_KEY || '';

// Convenience helper: returns headers object for authenticated POST requests
export const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(APP_API_KEY ? { 'X-API-Key': APP_API_KEY } : {}),
});
