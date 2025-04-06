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
        
        // Primero, intenta borrar cualquier service worker anterior
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          for(let registration of registrations) {
            console.log('Desregistrando service worker antiguo');
            registration.unregister();
          }
          
          // Luego registra el nuevo
          console.log('Registrando nuevo service worker');
          return navigator.serviceWorker.register(swUrl, {
            updateViaCache: 'none'
          });
        })
        .then(function(registration) {
          console.log('Service Worker registrado con éxito:', registration.scope);
          
          // Forzar la actualización del service worker
          registration.update();
        })
        .catch(function(err) {
          console.log('Error al registrar el Service Worker:', err);
        });
      });
    }
  }, []);

  return <>{children}</>;
} 