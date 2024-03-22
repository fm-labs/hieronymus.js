import { AbstractGameSystem } from './AbstractGameSystem.ts'

export class DevPanelSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'DevPanelSystem'
  private dirty = true
  private devPanelContainer?: HTMLDivElement

  public onLoad() {
    console.log('DevPanelSystem.onLoad')

    const devPanelContainer = document.createElement('div')
    devPanelContainer.style.position = 'absolute'
    devPanelContainer.style.top = '0'
    devPanelContainer.style.left = '0'
    devPanelContainer.style.width = '100%'
    devPanelContainer.style.height = '100%'
    devPanelContainer.style.backgroundColor = 'rgba(194,64,64,0.5)'

    this.devPanelContainer = devPanelContainer
    this._game.$container.appendChild(this.devPanelContainer)
  }

  public onUnload() {
    console.log('DevPanelSystem.onUnload')
  }

  public start() {
    console.log('DevPanelSystem.start')
  }

  public stop() {
    console.log('DevPanelSystem.stop')
  }

  public update() {
    console.log('DevPanelSystem.update')
  }

  public draw() {
    if (!this.dirty || !this.devPanelContainer) return
    console.log('DevPanelSystem.draw')

    this.devPanelContainer.innerHTML = ''
  }
}
