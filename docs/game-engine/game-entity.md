# Game Entity


A `GameEntity` is any **renderable** object in the game world. 

It can be a player, a tile, or any other object that needs to be displayed on the screen.

A `GameEntity` is defined by its `GameEntityType`, which determines how it is rendered and what properties it has.

## GameEntityType

A `GameEntityType` is a template for a `GameEntity`. It defines the properties and behavior of the entity.

It can be a `Tile`, a `Sprite`, or any other type of entity that needs to be rendered.

## GameEntityState

A `GameEntityState` is the current state of a `GameEntity`. It contains the properties that can change during the game, such as position, rotation, and scale.

It is used to render the entity on the screen and to update its position and other properties during the game.
