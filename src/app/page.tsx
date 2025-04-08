"use client";

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Home() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<unknown>(null);

  useEffect(() => {
    // Escuchar el evento beforeinstallprompt para capturar cuando la app puede ser instalada
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevenir que Chrome muestre automáticamente el diálogo de instalación
      e.preventDefault();
      // Guardar el evento para poder activarlo más tarde
      setDeferredPrompt(e);
      // Actualizar la UI para mostrar que la app puede ser instalada
      setIsInstallable(true);
    });

    // Escuchar el evento appinstalled para saber cuando la app ha sido instalada
    window.addEventListener('appinstalled', () => {
      // La app ha sido instalada, ocultar el botón
      setIsInstallable(false);
      console.log('PWA fue instalada correctamente');
    });
  }, []);

  const handleInstallClick = () => {
    // Ocultar el botón de instalación
    setIsInstallable(false);
    // Mostrar el diálogo de instalación
    if (deferredPrompt) {
      const prompt = deferredPrompt as any;
      prompt.prompt();
      // Esperar a que el usuario responda
      prompt.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('Usuario aceptó la instalación');
        } else {
          console.log('Usuario rechazó la instalación');
          // Mostrar de nuevo el botón ya que el usuario rechazó
          setIsInstallable(true);
        }
        // Clear the deferredPrompt so it can be garbage collected
        setDeferredPrompt(null);
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-between">
      <div className="mb-32 mt-12 flex flex-col items-center">
        <h1 className="text-4xl font-bold mb-8">WebVR Demo</h1>
        <p className="text-xl mb-12">WebVR Experience para Pico Neo 3</p>

        <div className="flex flex-col gap-4">
          <Link href="/vr" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded text-center">
            <div>
              <h2 className="text-xl mb-2">Escena Completa &rarr;</h2>
              <p>Accede a la experiencia VR completa con todos los modelos y controles.</p>
            </div>
          </Link>

          {isInstallable && (
            <button 
              onClick={handleInstallClick}
              style={{
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '15px 20px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginTop: '20px',
                display: 'block',
                width: 'fit-content',
                margin: '20px auto'
              }}
            >
              Instalar como App
            </button>
          )}
          
          <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm text-gray-700">
            <p className="font-semibold">Instrucciones para Pico Browser:</p>
            <ol className="list-decimal ml-5 mt-2 space-y-1">
              <li>Abre esta URL en Pico Browser</li>
              <li>Toca "Instalar como App" cuando aparezca</li>
              <li>Selecciona "Escena Completa" para iniciar la experiencia VR</li>
              <li>Este sitio está optimizado y no requiere ngrok</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
} 