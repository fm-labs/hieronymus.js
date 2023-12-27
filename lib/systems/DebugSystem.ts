export class DebugSystem implements IGameSystem {
  public name = 'DebugSystem'

  public onLoad() {
    console.log('DebugSystem.onLoad')
  }

  public onUnload() {
    console.log('DebugSystem.onUnload')
  }

  public start() {
    console.log('DebugSystem.start')
  }

  public stop() {
    console.log('DebugSystem.stop')
  }

  public update() {
    console.log('DebugSystem.update')
  }

  public draw() {
    console.log('DebugSystem.draw')
  }
}
