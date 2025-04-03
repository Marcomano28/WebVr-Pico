import { ThreeElements } from '@react-three/fiber'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: ThreeElements['mesh']
      boxGeometry: ThreeElements['boxGeometry']
      planeGeometry: ThreeElements['planeGeometry']
      meshStandardMaterial: ThreeElements['meshStandardMaterial']
      ambientLight: ThreeElements['ambientLight']
      directionalLight: ThreeElements['directionalLight']
    }
  }
} 