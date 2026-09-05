import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dora — Personal Management & Knowledge Universe',
    short_name: 'Dora',
    description: 'Personal Jira Management Dashboard, 2D/3D Knowledge Universe, Strategic Roadmap & Executive Command Center',
    start_url: '/dashboard/knowledge',
    scope: '/',
    display: 'standalone',
    background_color: '#090d16',
    theme_color: '#3b82f6',
    orientation: 'any',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
    shortcuts: [
      {
        name: 'Knowledge Universe',
        url: '/dashboard/knowledge',
        description: '2D/3D Reusable Concept Universe',
      },
      {
        name: 'Overview',
        url: '/dashboard',
        description: 'Jira Sprint & Performance Metrics',
      },
      {
        name: 'Strategic Roadmap',
        url: '/dashboard/roadmap',
        description: 'Milestones & Swimlanes',
      },
      {
        name: 'K8s Architecture',
        url: '/dashboard/k8s-draw',
        description: '3D Kubernetes Studio',
      },
    ],
  };
}
