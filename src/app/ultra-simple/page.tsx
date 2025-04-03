'use client'

export default function UltraSimplePage() {
  return (
    <div 
      id="vr-container" 
      style={{ 
        position: 'relative', 
        width: '100vw', 
        height: '100vh', 
        background: '#000', 
        overflow: 'hidden' 
      }}
    >
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        color: 'white',
        padding: '20px'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>
          Escena Ultra Simple para Pico Neo 3
        </h1>
        
        <div style={{
          width: '200px',
          height: '200px',
          backgroundColor: '#5555FF',
          margin: '0 auto 30px auto',
          animation: 'rotateCube 4s linear infinite',
          transform: 'rotateY(45deg) rotateX(45deg)'
        }}></div>
        
        <p style={{ maxWidth: '500px', margin: '0 auto 20px auto' }}>
          Esta página no utiliza WebXR ni react-three-fiber para evitar errores de compatibilidad con Pico Browser.
        </p>
        
        <p style={{ fontSize: '14px', color: '#aaa', maxWidth: '500px', margin: '0 auto 30px auto' }}>
          Si estás viendo problemas con &quot;cannot read properties of undefined (reading &apos;layers&apos;)&quot;, esta página debería funcionar sin errores.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px', margin: '0 auto' }}>
          <a
            href="/"
            style={{
              padding: '12px 20px',
              backgroundColor: '#5555FF',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '5px',
              fontWeight: 'bold'
            }}
          >
            Volver al Inicio
          </a>
          
          <a
            href="/pico"
            style={{
              padding: '12px 20px',
              backgroundColor: 'rgba(85,85,255,0.3)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '5px'
            }}
          >
            Intentar Modo Pico
          </a>
        </div>
      </div>
    </div>
  )
} 