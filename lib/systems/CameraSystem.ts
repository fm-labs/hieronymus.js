import { AbstractGameSystem } from './AbstractGameSystem.ts'

export class CameraSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'CameraSystem'

  constructor(game: IGame) {
    super(game)
  }

  public onLoad() {
    console.log('CameraSystem.onLoad')
  }

  public onUnload() {
    console.log('CameraSystem.onUnload')
  }

  public start() {
    console.log('CameraSystem.start')
    this._game.eventbus.on('keyboard.keydown', this.handleKeyboardKeyDownEvent.bind(this))
    this._game.eventbus.on('wheel', this.handleWheelEvent.bind(this))
    this._game.eventbus.on('zoom', this.handleZoomEvent.bind(this))

    this._game.eventbus.on('camera.reset', this.handleCameraResetEvent.bind(this))
    this._game.eventbus.on('camera.center', this.handleCameraCenterEvent.bind(this))

    this._game.camera.offset.x = -this._game.width / 2
    this._game.camera.offset.y = -this._game.height * 0.05 // center vertically
    this._game.camera.zoom = 0.5 // initial zoom level
  }

  public stop() {
    console.log('CameraSystem.stop')
    this._game.eventbus.off('keyboard.keydown', this.handleKeyboardKeyDownEvent)
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
    const deltaX = e.deltaX
    const deltaY = e.deltaY
    const minZoom = 0.5
    const maxZoom = 10
    const zoomStep = 0.1
    if (deltaY < 0) {
      // zoom in
      const newZoom = Math.min(this._game.camera.zoom + zoomStep, maxZoom)
      console.log('zoom in', newZoom)
      this._game.camera.zoom = newZoom
    } else {
      // zoom out
      const newZoom = Math.max(this._game.camera.zoom - zoomStep, minZoom)
      console.log('zoom out', newZoom)
      this._game.camera.zoom = newZoom
    }
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
}
