import type { IGame, IGameSystem } from '../game.types'
import { AbstractGameSystem } from './AbstractGameSystem'

const canScroll = (el: HTMLElement) => {
  const { overflowX, overflowY } = getComputedStyle(el)
  return (
    (/auto|scroll/.test(overflowY) && el.scrollHeight > el.clientHeight) ||
    (/auto|scroll/.test(overflowX) && el.scrollWidth > el.clientWidth)
  )
}

/**
 * The element that the wheel over `target` belongs to, instead of the camera: one that has something
 * to scroll, or a panel marked with data-native-scroll (even while its content fits).
 */
function wheelOwner(target: EventTarget | null, container: HTMLElement): HTMLElement | undefined {
  for (let el = target as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
    if (el === container) return undefined
    if (el.dataset?.nativeScroll !== undefined || canScroll(el)) return el
  }
  return undefined
}

export class InputSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'InputSystem'

  constructor(game: IGame) {
    super(game)

    // bind once, so the same references can be removed in stop()
    this.handleKeyboardEvent = this.handleKeyboardEvent.bind(this)
    this.handleMouseEvent = this.handleMouseEvent.bind(this)
    this.handleWheelEvent = this.handleWheelEvent.bind(this)
    this.handleWindowResizeEvent = this.handleWindowResizeEvent.bind(this)
    this.handleGestureEvent = this.handleGestureEvent.bind(this)
  }

  public onLoad() {
    console.log('InputSystem.onLoad')
  }

  public onUnload() {
    console.log('InputSystem.onUnload')
  }

  public start() {
    console.log('InputSystem.start')
    window.addEventListener('keydown', this.handleKeyboardEvent)
    window.addEventListener('keyup', this.handleKeyboardEvent)
    window.addEventListener('mouseup', this.handleMouseEvent)
    window.addEventListener('mousedown', this.handleMouseEvent)
    window.addEventListener('dblclick', this.handleMouseEvent)

    // The `{ passive: false }` option is important to allow `preventDefault` to work.
    window.addEventListener('wheel', this.handleWheelEvent, { passive: false })
    // Safari pinches with gesture events, which would zoom the page
    window.addEventListener('gesturestart', this.handleGestureEvent)
    window.addEventListener('gesturechange', this.handleGestureEvent)

    // handle window resize events
    window.addEventListener('resize', this.handleWindowResizeEvent)
    window.dispatchEvent(new Event('resize'))

    // @todo TOUCH HANDLER
    // let startDistance: number | null = null
    //
    // function getDistance(touches: any) {
    //   const touch1 = touches[0]
    //   const touch2 = touches[1]
    //   const dx = touch1.pageX - touch2.pageX
    //   const dy = touch1.pageY - touch2.pageY
    //   return Math.sqrt(dx * dx + dy * dy)
    // }
    //
    // window.addEventListener('touchstart', function (event) {
    //   console.log('touchstart')
    //   if (event.touches.length === 2) {
    //     // Check for two touch points
    //     startDistance = getDistance(event.touches)
    //   }
    // })
    //
    // window.addEventListener('touchmove', function (event) {
    //   console.log('touchmove')
    //   if (event.touches.length === 2) {
    //     const currentDistance = getDistance(event.touches)
    //     if (startDistance && currentDistance !== startDistance) {
    //       const zoomingIn = currentDistance > startDistance
    //       console.log(zoomingIn ? 'Zooming In' : 'Zooming Out')
    //       // Handle zoom gesture...
    //       startDistance = currentDistance // Update start distance for next move event
    //     }
    //   }
    // })
    //
    // window.addEventListener('touchend', function (event) {
    //   console.log('touchend')
    //   // Reset or finalize gesture
    //   startDistance = null
    // })
    //
    // window.addEventListener('scroll', function (event) {
    //   console.log('scroll', event)
    // })
  }

  public stop() {
    console.log('InputSystem.stop')
    window.removeEventListener('keydown', this.handleKeyboardEvent)
    window.removeEventListener('keyup', this.handleKeyboardEvent)
    window.removeEventListener('mousedown', this.handleMouseEvent)
    window.removeEventListener('mouseup', this.handleMouseEvent)
    window.removeEventListener('dblclick', this.handleMouseEvent)
    window.removeEventListener('wheel', this.handleWheelEvent)
    window.removeEventListener('gesturestart', this.handleGestureEvent)
    window.removeEventListener('gesturechange', this.handleGestureEvent)
    window.removeEventListener('resize', this.handleWindowResizeEvent)
  }

  // public update() {
  //   console.log('InputSystem.update')
  // }

  // public draw() {
  //   // console.log('InputSystem.draw')
  // }

  private handleKeyboardEvent(e: KeyboardEvent) {
    //console.log('keyboard event', e.type, e.key, e.code, e.altKey, e.ctrlKey, e.shiftKey, e)
    this._game.eventbus.emit(`keyboard.${e.type}`, e)
  }

  private handleMouseEvent(e: MouseEvent) {
    console.log('mouse event', e.type, e.altKey, e.ctrlKey, e.shiftKey, e)
    this._game.eventbus.emit(`mouse.${e.type}`, e)
  }

  private handleWheelEvent(e: WheelEvent) {
    // event.deltaX - The horizontal scroll amount
    // event.deltaY - The vertical scroll amount

    // ctrl + wheel, and the trackpad pinch (which browsers send as ctrl + wheel), zoom;
    // metaKey for the Mac command key
    const zoom = (e.ctrlKey || e.metaKey) && e.deltaY !== 0
    // over a panel, the panel scrolls (if it can) and the camera stays
    const owner = zoom ? undefined : wheelOwner(e.target, this._game.$container)
    if (owner) {
      // nothing to scroll: the page must not take the wheel either (swipe back/forward)
      if (!canScroll(owner)) e.preventDefault()
      return
    }
    // otherwise the engine owns the wheel: no page scroll, no page zoom, no two-finger swipe back/forward
    e.preventDefault()
    this._game.eventbus.emit(zoom ? 'zoom' : 'wheel', e)
  }

  private handleGestureEvent(e: Event) {
    e.preventDefault()
  }

  private handleWindowResizeEvent(e: UIEvent) {
    const _width = window.innerWidth
    const _height = window.innerHeight

    const width = _width // Math.min(_width, 800)
    const height = _height // Math.min(_height, 600)
    console.log('resize', _width, _height, width, height)
    this._game.eventbus.emit('resize', { width, height })
  }
}
