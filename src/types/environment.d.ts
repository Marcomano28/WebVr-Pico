/// <reference types="react" />
/// <reference types="three" />
/// <reference types="@types/webxr" />

declare namespace JSX {
  interface IntrinsicElements {
    xr: any
    vr: any
  }
}

declare module "*.glb" {
  const content: any
  export default content
}

declare module "*.gltf" {
  const content: any
  export default content
} 