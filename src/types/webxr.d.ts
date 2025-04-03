interface XRRenderState {
  baseLayer?: XRWebGLLayer
  depthFar?: number
  depthNear?: number
  inlineVerticalFieldOfView?: number
}

interface XRWebGLLayer {
  framebuffer: WebGLFramebuffer | null
  framebufferWidth: number
  framebufferHeight: number
}

interface XRSession {
  renderState: XRRenderState
  updateRenderState(state: Partial<XRRenderState>): Promise<void>
  requestReferenceSpace(type: XRReferenceSpaceType): Promise<XRReferenceSpace>
  requestAnimationFrame(callback: XRFrameRequestCallback): number
  cancelAnimationFrame(handle: number): void
  end(): Promise<void>
  inputSources: XRInputSourceArray
  environmentBlendMode: XREnvironmentBlendMode
  visibilityState: XRVisibilityState
  layers?: XRLayer[]
}

type XRReferenceSpaceType = 'viewer' | 'local' | 'local-floor' | 'bounded-floor' | 'unbounded'
type XREnvironmentBlendMode = 'opaque' | 'additive' | 'alpha-blend'
type XRVisibilityState = 'visible' | 'visible-blurred' | 'hidden'
type XRFrameRequestCallback = (time: DOMHighResTimeStamp, frame: XRFrame) => void

interface XRLayer {
  // Base interface for XR layers
}

interface XRInputSourceArray extends Array<XRInputSource> {
  [Symbol.iterator](): IterableIterator<XRInputSource>
}

interface XRInputSource {
  handedness: XRHandedness
  targetRayMode: XRTargetRayMode
  targetRaySpace: XRSpace
  gripSpace?: XRSpace
  gamepad?: Gamepad
  profiles: string[]
}

type XRHandedness = 'none' | 'left' | 'right'
type XRTargetRayMode = 'gaze' | 'tracked-pointer' | 'screen'

interface XRSpace {
  // Base interface for XR spaces
}

interface XRReferenceSpace extends XRSpace {
  getOffsetReferenceSpace(originOffset: XRRigidTransform): XRReferenceSpace
}

interface XRRigidTransform {
  position: DOMPointReadOnly
  orientation: DOMPointReadOnly
  matrix: Float32Array
  inverse: XRRigidTransform
}

interface XRFrame {
  session: XRSession
  getViewerPose(referenceSpace: XRReferenceSpace): XRViewerPose | null
  getPose(space: XRSpace, baseSpace: XRSpace): XRPose | null
}

interface XRViewerPose extends XRPose {
  views: XRView[]
}

interface XRPose {
  transform: XRRigidTransform
  emulatedPosition: boolean
}

interface XRView {
  eye: XREye
  projectionMatrix: Float32Array
  transform: XRRigidTransform
}

type XREye = 'none' | 'left' | 'right' 