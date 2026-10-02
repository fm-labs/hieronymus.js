# CameraSystem

```typescript
const cameraSystem = new CameraSystem(game)
game.addSystem(cameraSystem)
```

## Synopsis

The CameraSystem moves and zooms `game.camera` (see [Camera](../game-world.md#camera)).
It reacts to events from the [InputSystem](input-system.md), so the InputSystem must be added as well.

On `start` it sets the camera to `offset = (-width / 2, -height · 0.05)` and `zoom = 1`,
which shows an isometric map's top corner centered near the top of the screen.

## Controls

| Input                              | Action                                        |
| ---------------------------------- | --------------------------------------------- |
| `W` / `A` / `S` / `D`              | Pan by 16 px                                  |
| Mouse wheel / two-finger scroll    | Pan by the wheel delta (ignored while paused) |
| Pinch / ctrl + wheel / cmd + wheel | Zoom by 0.1, between 0.5 and 10               |

!!! note
    The HeroSystem also reacts to `WASD`, so with both systems added these keys move the camera and the hero.

## Events

| Listens to         | Action                            |
| ------------------ | --------------------------------- |
| `keyboard.keydown` | Pan with WASD                     |
| `wheel`            | Pan                               |
| `zoom`             | Zoom                              |
| `camera.reset`     | `offset = (0, 0)`, `zoom = 1`     |
| `camera.center`    | `offset = (0, 0)`, zoom unchanged |

## Methods

```typescript
cameraSystem.moveTo(x, y) // set the offset
cameraSystem.centerTo(x, y) // center the view on a world position
cameraSystem.setZoom(zoom)
cameraSystem.resetCamera() // offset (0, 0), zoom 1
```
