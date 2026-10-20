import type { Camera2D, IGame, IGameSystem } from '../game.types'
import { AbstractGameSystem } from './AbstractGameSystem'

/**
 * Zooms the camera by `factor`, keeping the world point under `screen` (relative to the container)
 * in place. The view is drawn with translate(-offset), then scale(zoom).
 * A zoom outside the limits, e.g. set by a world to fit the map, may move back towards them, never further.
 */
export function zoomCameraAt(
  camera: Camera2D,
  factor: number,
  screen: { x: number; y: number },
  minZoom: number,
  maxZoom: number,
): Camera2D {
  const { offset, zoom } = camera
  const next = Math.min(Math.max(maxZoom, zoom), Math.max(Math.min(minZoom, zoom), zoom * factor))
  return {
    ...camera,
    zoom: next,
    offset: {
      x: ((screen.x + offset.x) / zoom) * next - screen.x,
      y: ((screen.y + offset.y) / zoom) * next - screen.y,
    },
  }
}

export class CameraSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'CameraSystem'

  constructor(game: IGame) {
    super(game)

    // bind once, so the same references can be removed in stop()
    this.handleKeyboardKeyDownEvent = this.handleKeyboardKeyDownEvent.bind(this)
    this.handleWheelEvent = this.handleWheelEvent.bind(this)
    this.handleZoomEvent = this.handleZoomEvent.bind(this)
    this.handleCameraResetEvent = this.handleCameraResetEvent.bind(this)
    this.handleCameraCenterEvent = this.handleCameraCenterEvent.bind(this)
  }

  public onLoad() {
    console.log('CameraSystem.onLoad')
  }

  public onUnload() {
    console.log('CameraSystem.onUnload')
  }

  public start() {
    console.log('CameraSystem.start')
    this._game.eventbus.on('keyboard.keydown', this.handleKeyboardKeyDownEvent)
    this._game.eventbus.on('wheel', this.handleWheelEvent)
    this._game.eventbus.on('zoom', this.handleZoomEvent)

    this._game.eventbus.on('camera.reset', this.handleCameraResetEvent)
    this._game.eventbus.on('camera.center', this.handleCameraCenterEvent)

    this._game.camera.offset.x = -this._game.width / 2
    this._game.camera.offset.y = -this._game.height * 0.05 // center vertically
    this._game.camera.zoom = 1 // initial zoom level
  }

  public stop() {
    console.log('CameraSystem.stop')
    this._game.eventbus.off('keyboard.keydown', this.handleKeyboardKeyDownEvent)
    this._game.eventbus.off('wheel', this.handleWheelEvent)
    this._game.eventbus.off('zoom', this.handleZoomEvent)

    this._game.eventbus.off('camera.reset', this.handleCameraResetEvent)
    this._game.eventbus.off('camera.center', this.handleCameraCenterEvent)
  }

  // public update() {
  //   console.log('CameraSystem.update')
  // }

  // public draw() {
  //   // console.log('CameraSystem.draw')
  // }

  private handleKeyboardKeyDownEvent(e: KeyboardEvent) {
    console.log('[CameraSystem keydown]', e.key, e.code, e.altKey, e.ctrlKey, e.shiftKey)
    const delta = 16
    if (e.code == 'KeyA') {
      this._game.camera.offset.x -= delta
      //console.log('X', this._game.camera.offset.x)
    } else if (e.code == 'KeyD') {
      this._game.camera.offset.x += delta
      //console.log('X', this._game.camera.offset.x)
    }
    if (e.code == 'KeyW') {
      this._game.camera.offset.y -= delta
      //console.log('Y', this._game.camera.offset.y)
    } else if (e.code == 'KeyS') {
      this._game.camera.offset.y += delta
      //console.log('Y', this._game.camera.offset.y)
    }
  }

  private handleWheelEvent(e: WheelEvent) {
    if (this._game.gamePaused) {
      return
    }

    const deltaX = e.deltaX
    const deltaY = e.deltaY
    const moveStep = 1
    const offset = this._game.camera.offset

    this._game.camera.offset = {
      x: offset.x + deltaX * moveStep,
      y: offset.y + deltaY * moveStep,
    }
  }

  private handleZoomEvent(e: WheelEvent) {
    if (this._game.gamePaused) {
      return
    }
    const { minZoom = 0.05, maxZoom = 10 } = this._game.config.camera ?? {}
    const rect = this._game.$container.getBoundingClientRect()
    this._game.camera = zoomCameraAt(
      this._game.camera,
      Math.exp(-e.deltaY * 0.01),
      { x: e.clientX - rect.left, y: e.clientY - rect.top },
      minZoom,
      maxZoom,
    )
  }

  private handleCameraResetEvent() {
    this._game.camera = {
      offset: { x: 0, y: 0 },
      zoom: 1,
    }
  }

  private handleCameraCenterEvent() {
    const oldCam = this._game.camera
    const newOffset = { x: 0, y: 0 }
    this._game.camera = { ...oldCam, offset: newOffset }
  }

  public moveTo(x: number, y: number) {
    const oldCam = this._game.camera
    const newOffset = { x, y }
    this._game.camera = { ...oldCam, offset: newOffset }
  }

  public setZoom(zoom: number) {
    const oldCam = this._game.camera
    this._game.camera = { ...oldCam, zoom }
  }

  public centerTo(x: number, y: number) {
    const oldCam = this._game.camera
    const newOffset = { x: x - this._game.width / 2, y: y - this._game.height / 2 }
    this._game.camera = { ...oldCam, offset: newOffset }
  }

  public resetCamera() {
    this._game.camera = {
      offset: { x: 0, y: 0 },
      zoom: 1,
    }
  }
}
