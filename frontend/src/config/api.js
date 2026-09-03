// Centralized API configuration for JVM Architecture Visualizer
// When no VITE_API_BASE is specified in the environment,
// it falls back directly to the live AWS ECS Express backend.

export const AWS_LIVE_BACKEND_URL = 'https://ja-f080c07d4b5940e08a435fb60c7dcf1e.ecs.us-east-1.on.aws';

export const API_BASE = (
  import.meta.env.VITE_API_BASE !== undefined && import.meta.env.VITE_API_BASE !== ''
    ? import.meta.env.VITE_API_BASE
    : AWS_LIVE_BACKEND_URL
).replace(/\/$/, '');
