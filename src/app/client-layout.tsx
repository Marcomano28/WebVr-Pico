'use client'

import { useEffect } from 'react'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Registrar el service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        const swUrl = '/sw.js';
        navigator.serviceWorker.register(swUrl)
          .then(function(registration) {
            console.log('Service Worker registrado con éxito:', registration.scope);
          })
          .catch(function(err) {
            console.log('Error al registrar el Service Worker:', err);
          });
      });
    }
  }, []);

  return <>{children}</>;
} 