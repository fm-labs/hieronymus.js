export declare abstract class AbstractGameComponent {
    static defaultProperties: GameComponentProperties;
    abstract readonly componentType: string;
    readonly properties: GameComponentProperties;
    x: number;
    y: number;
    protected constructor(properties?: GameComponentProperties, x?: number, y?: number);
    setPosition(x: number, y: number): this;
    getPosition(): {
        x: number;
        y: number;
    };
    abstract update(deltaTime: number): void | boolean | null;
    abstract draw(ctx: CanvasRenderingContext2D): void;
}

export declare abstract class AbstractGameSystem {
    protected readonly _game: IGame;
    protected constructor(_game: IGame);
}

export declare class AnimatedSpriteComponent extends AbstractGameComponent implements IGameComponent {
    properties: AnimatedSpriteComponentProps;
    static readonly defaultProperties: Partial<AnimatedSpriteComponentProps>;
    readonly componentType: string;
    readonly name: string;
    private _spriteIdx;
    private _lastUpdate;
    private _tilesheet?;
    private _tilesheetImage?;
    constructor(properties: AnimatedSpriteComponentProps);
    setElevation(elevation: number): this;
    protected applyTilesheet(tilesheetName: string | undefined): void;
    draw(ctx: CanvasRenderingContext2D): void;
    update(deltaTime: number): void | boolean | null;
}

export declare interface AnimatedSpriteComponentProps extends GameComponentProperties {
    tilesheetName?: string;
    tileSize: number;
    startIdx?: number;
    endIdx?: number;
    speed?: number;
    loop?: number;
    autoPlay?: boolean;
    ttl?: number;
    elevation?: number;
}

export declare const arraySortByName: (key: string) => (a: any, b: any) => number;

export declare type ButtonState = 'pressed' | 'released';

/** CAMERA TYPES **/
export declare type Camera2D = {
    offset: Point2D;
    zoom: number;
};

export declare class CameraSystem extends AbstractGameSystem implements IGameSystem {
    name: string;
    constructor(game: IGame);
    onLoad(): void;
    onUnload(): void;
    start(): void;
    stop(): void;
    private handleKeyboardKeyDownEvent;
    private handleWheelEvent;
    private handleZoomEvent;
    private handleCameraResetEvent;
    private handleCameraCenterEvent;
    moveTo(x: number, y: number): void;
    setZoom(zoom: number): void;
    centerTo(x: number, y: number): void;
    resetCamera(): void;
}

export declare class ComponentManager implements IComponentManager {
    private readonly _components;
    private _lastId;
    constructor();
    add(component: IGameComponent, nextId?: number): number;
    get(id: number): IGameComponent | undefined;
    set(id: number, c: IGameComponent): void;
    remove(id: number): void;
    findByName(name: string): IGameComponent | undefined;
    all(): {
        [key: number]: IGameComponent;
    };
    dump(): any;
    restore(dump: any[]): void;
    createComponent(componentType: string, properties: any): IGameComponent;
}

export declare class DebugSystem extends AbstractGameSystem implements IGameSystem {
    name: string;
    onLoad(): void;
    onUnload(): void;
    start(): void;
    stop(): void;
    tick(): Promise<void>;
    draw(): void;
}

export declare const degreeToRadian: (degree: number) => number;

export declare class DevPanelSystem extends AbstractGameSystem implements IGameSystem {
    name: string;
    private dirty;
    private devPanelContainer?;
    onLoad(): void;
    onUnload(): void;
    start(): void;
    stop(): void;
    tick(): Promise<void>;
    draw(): void;
}

export declare function drawIsometricCube(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, depth: number, text?: string, lineDash?: number[]): void;

export declare function drawIsometricHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, depth: number): void;

export declare function drawIsoTile(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, fillColor: string, strokeColor: string, text?: string, textColor?: string): void;

export declare class EntitySystem extends AbstractGameSystem implements IGameSystem {
    name: string;
    private _selectedSpriteImage;
    constructor(game: IGame);
    onLoad(): void;
    onUnload(): void;
    start(): void;
    stop(): void;
    tick(): Promise<void>;
    private handleCellClick;
    draw(mainCtx: CanvasRenderingContext2D): void;
}

export declare class EventBus {
    private listeners;
    on(event: string, listener: Listener): void;
    off(event: string, listener: Listener): void;
    emit(event: string, ...args: any[]): void;
}

export declare const fetchImage: (url: string) => Promise<HTMLImageElement>;

export declare const fetchSpritesheetAtlas: (url: string) => Promise<SpritesheetAtlas>;

export declare const FILL_COLORS: string[];

/**
 * Find neighboring cells in a 2D grid within a given distance.
 * @param col - Column index of the cell (x-axis)
 * @param row - Row index of the cell (y-axis)
 * @param totalCols - Total number of columns in the grid
 * @param totalRows - Total number of rows in the grid
 * @param distance - Distance from the center cell to search for neighbors
 * @returns An array of [col, row] pairs representing neighboring cells
 */
export declare function findCellNeighbors(col: number, row: number, totalCols: number, totalRows: number, distance?: number): [number, number][];

export declare class Game implements IGame {
    readonly config: GameConfig;
    /**
     * The container element for the game.
     */
    $container: HTMLDivElement;
    /**
     * The main canvas element for the game.
     */
    /**
     * The logging container.
     * @private
     */
    private $logContainer;
    /**
     * The attached game systems.
     */
    systems: IGameSystem[];
    /**
     * The loaded spritesheets.
     */
    resources: IGameResources;
    /**
     * The event bus.
     */
    eventbus: EventBus;
    width: number;
    height: number;
    camera: Camera2D;
    data: any;
    gameRunning: boolean;
    gamePaused: boolean;
    constructor($container: HTMLDivElement, config: GameConfig, resources?: IGameResources);
    updateDimensions(width: number, height: number): void;
    addSystem(system: IGameSystem): void;
    lastFrameTime: number;
    frameCount: number;
    fps: number;
    deltaTime: number;
    private fpsWindowStart;
    tick(currentTime: number): Promise<void>;
    run(): Promise<void>;
    private start;
    private stop;
    pause(): void;
    resume(): void;
}

export declare type GameComponentProperties = {
    name?: string;
    ttl?: number;
    [key: string]: any;
};

/** GAME ENGINE **/
export declare type GameConfig = {
    id: string;
    name?: string;
    fullscreen?: boolean;
    width?: number;
    height?: number;
    /** limits for the user's zoom gestures (default 0.05 … 10) */
    camera?: {
        minZoom?: number;
        maxZoom?: number;
    };
};

export declare type GamepadButtonChangeEvent = {
    button: number;
    state: ButtonState;
};

/** INPUT TYPES **/
export declare type GamepadStickChangeEvent = {
    stickLeft: boolean;
    stickRight: boolean;
    stickUp: boolean;
    stickDown: boolean;
};

export declare class GamepadSystem extends AbstractGameSystem implements IGameSystem {
    name: string;
    private lastInputTime;
    private gamepads;
    constructor(game: IGame);
    onLoad(): void;
    onUnload(): void;
    start(): void;
    stop(): void;
    tick(delta: number): Promise<void>;
    private handleGamepadConnected;
    private handleGamepadDisconnected;
    updateGamepadState(gamepad: Gamepad): void;
}

export declare class GameResourcesManager implements IGameResources {
    loadImage(name: string, url: string): Promise<HTMLImageElement>;
    loadSpritesheet: (name: string, imageUrl: string, atlasUrl: string, nextgid?: number) => Promise<void>;
    loadTilesheet: (name: string, url: string, columns: number, rows: number, nextgid?: number) => Promise<void>;
    loadFont: (name: string, url: string) => Promise<void>;
}

export declare class GenericComponent extends AbstractGameComponent implements IGameComponent {
    readonly componentType: string;
    static readonly defaultProperties: GameComponentProperties;
    constructor(properties?: GameComponentProperties);
    draw(ctx: CanvasRenderingContext2D): void;
    update(deltaTime: number): void;
}

/**
 * Determine the one-dimensional cell index from the column and row.
 */
export declare function getCellIndex(col: number, row: number, columns: number): number;

/**
 * Get the grid position from the one-dimensional cell index.
 *
 * @param index - The cell index.
 * @param columns - The number of columns in the grid.
 * @returns An object containing the column and row of the grid position.
 */
export declare function getGridPosFromIndex(index: number, columns: number): {
    col: number;
    row: number;
};

export declare type Grid2DCell = Grid2DPosition & {
    props?: any;
};

export declare type Grid2DPoint = [number, number];

/** GRID **/
export declare type Grid2DPosition = {
    col: number;
    row: number;
};

/**
 * Renders grid lines for the tile map on its own canvas.
 *
 * Purely visual: mouse interaction (grid.cellHover / grid.cellClick) is handled by the GridSystem.
 */
export declare class GridLinesSystem extends AbstractGameSystem implements IGameSystem {
    readonly name = "GridLinesSystem";
    private readonly cols;
    private readonly rows;
    private readonly projection;
    private gridCanvas;
    private gridCtx;
    private _gridColor;
    constructor(game: IGame, tileMap: ITileMap);
    onLoad(): void;
    onUnload(): void;
    draw(gridCtx: CanvasRenderingContext2D): void;
    tick(deltaTime: number): Promise<void>;
}

export declare class GridSystem extends AbstractGameSystem implements IGameSystem {
    readonly name = "GridSystem";
    private readonly tsize;
    private readonly cols;
    private readonly rows;
    private readonly projection;
    private infoDiv;
    private gridCanvas;
    private gridCtx;
    private _activeCellIdx?;
    private _activeGridPos?;
    private _cellsRendered;
    private _selectedCellIdx?;
    private _selectedCell?;
    constructor(game: IGame, tileMap: ITileMap);
    onLoad(): void;
    onUnload(): void;
    start(): void;
    stop(): void;
    private handleMouseMove;
    private handleMouseClick;
    draw(gridCtx: CanvasRenderingContext2D): void;
    tick(deltaTime: number): Promise<void>;
}

export declare class HeroSystem extends AbstractGameSystem implements IGameSystem {
    name: string;
    private hero;
    private dirty;
    private heroCanvas;
    private heroCtx;
    private characterComponent;
    constructor(game: IGame);
    onLoad(): void;
    onUnload(): void;
    private handleGamepadStickChange;
    private handleKeyboardDownEvent;
    private handleGamepadButtonChangeEvent;
    move(direction?: MoveDirection): void;
    start(): void;
    stop(): void;
    tick(deltaTime: number): Promise<void>;
    draw(heroCtx: CanvasRenderingContext2D): void;
}

export declare interface IComponentManager {
    add(component: IGameComponent, nextId?: number): number;
    set(id: number, component: IGameComponent): void;
    get(id: number): IGameComponent | undefined;
}

/** EVENTS **/
export declare interface IEventBus {
    on: (eventName: string, callback: (e: any) => void) => void;
    off: (eventName: string, callback: (e: any) => void) => void;
    emit: (eventName: string, e: any) => void;
}

export declare interface IGame {
    $container: HTMLDivElement;
    config: GameConfig;
    resources: IGameResources;
    mainScene?: IScene;
    eventbus: IEventBus;
    camera: Camera2D;
    width: number;
    height: number;
    gameRunning: boolean;
    gamePaused: boolean;
    pause: () => void;
    resume: () => void;
    data: {
        [key: string]: any;
    };
    run: () => void | Promise<void>;
    tick: (deltaTime: number) => void | Promise<void>;
    fps: number;
    frameCount: number;
    lastFrameTime: number;
    deltaTime: number;
}

export declare interface IGameComponent {
    componentType: string;
    x: number;
    y: number;
    properties?: GameComponentProperties;
    update?: (deltaTime: number) => void | boolean | null;
    draw?: (ctx: CanvasRenderingContext2D) => void;
    setPosition: (x: number, y: number) => void;
}

/** RESOURCE TYPES **/
/** RESOURCE TYPES **/
export declare interface IGameResources {
    loadFont(name: string, url: string): Promise<void>;
    loadImage(name: string, url: string): Promise<HTMLImageElement>;
    loadSpritesheet(name: string, imageUrl: string, atlasUrl: string, nextgid?: number): Promise<void>;
    loadTilesheet(name: string, url: string, columns: number, rows: number, nextgid?: number): Promise<void>;
}

export declare interface IGameSystem {
    name: string;
    onLoad?: () => void;
    onUnload?: () => void;
    start?: () => void;
    stop?: () => void;
    tick?: (deltaTime: number) => Promise<void>;
    draw?: (ctx: CanvasRenderingContext2D) => void;
}

export declare interface IGrid2DProjection {
    mapGridToScreen(col: number, row: number): {
        x: number;
        y: number;
    };
    mapScreenToGrid(x: number, y: number): {
        col: number;
        row: number;
    };
    getGridDimensions(): {
        width: number;
        height: number;
    };
}

export declare interface IMapSelection {
    getSelectedCells: () => Grid2DCell[];
    isCellSelected: (cell: Grid2DCell) => boolean;
}

export declare class InfoSystem extends AbstractGameSystem implements IGameSystem {
    name: string;
    private readonly systemDiv;
    private mousePos;
    private metrics;
    constructor(game: IGame);
    onLoad(): void;
    onUnload(): void;
    start(): void;
    stop(): void;
    tick(): Promise<void>;
    draw(): void;
}

export declare class InputSystem extends AbstractGameSystem implements IGameSystem {
    name: string;
    constructor(game: IGame);
    onLoad(): void;
    onUnload(): void;
    start(): void;
    stop(): void;
    private handleKeyboardEvent;
    private handleMouseEvent;
    private handleWheelEvent;
    private handleGestureEvent;
    private handleWindowResizeEvent;
}

export declare interface IScene {
    name: string;
}

export declare interface ISceneManager {
    addScene(scene: IScene): void;
    getScene(name: string): IScene | undefined;
    removeScene(name: string): void;
    setActiveScene(name: string): void;
    getActiveScene(): IScene | undefined;
}

export declare interface IsoCharacter2ComponentProps extends AnimatedSpriteComponentProps {
    tilesheetName: string;
    movementSpeed?: number;
    movementDirection?: MovementDirection_2;
    ttl?: number;
}

export declare class IsoCharacterComponent extends AnimatedSpriteComponent {
    properties: IsoCharacterComponentProps;
    static readonly defaultProperties: Partial<IsoCharacterComponentProps>;
    readonly componentType: string;
    private _spawnTime;
    private _baseTilesheetName;
    private _lastMove;
    private _moves;
    private _targetX?;
    private _targetY?;
    private _waypoints;
    private _waypointIndex;
    constructor(properties: IsoCharacterComponentProps);
    setPosition(x: number, y: number): this;
    setTargetPosition(x: number, y: number): void;
    private updateWaypoints;
    update(deltaTime: number): void | boolean | null;
    draw(ctx: CanvasRenderingContext2D): void;
}

export declare class IsoCharacterComponent2 extends AnimatedSpriteComponent {
    properties: IsoCharacter2ComponentProps;
    static readonly defaultProperties: Partial<IsoCharacter2ComponentProps>;
    readonly componentType: string;
    private _spawnTime;
    private _baseTilesheetName;
    private _lastMove;
    private _moves;
    private _targetX?;
    private _targetY?;
    private _movementDirection?;
    constructor(properties: IsoCharacter2ComponentProps);
    setPosition(x: number, y: number): this;
    setTargetPosition(x: number, y: number): this;
    setMovementDirection(movementDirection: MovementDirection_2): this;
    moveToGridPosition(col: number, row: number): void;
    moveUp(distance: number): void;
    moveDown(distance: number): void;
    moveLeft(distance: number): void;
    moveRight(distance: number): void;
    update(deltaTime: number): void | boolean | null;
    draw(ctx: CanvasRenderingContext2D): void;
}

export declare interface IsoCharacterComponentProps extends AnimatedSpriteComponentProps {
    tilesheetName: string;
    movementSpeed?: number;
    movementDirection?: MovementDirection;
    ttl?: number;
}

export declare class IsoCubeComponent extends AbstractGameComponent implements IGameComponent {
    properties: IsoCubeComponentProps;
    static readonly defaultProperties: IsoCubeComponentProps;
    readonly componentType: string;
    constructor(properties: IsoCubeComponentProps);
    draw(ctx: CanvasRenderingContext2D): void;
    update(deltaTime: number): void;
}

export declare interface IsoCubeComponentProps extends GameComponentProperties {
    tileSize: number;
    width: number;
    depth: number;
    elevation?: number;
    text?: string;
    offset?: {
        x: number;
        y: number;
    };
    lineDash?: number[];
}

export declare class IsoCylinderComponent extends AbstractGameComponent implements IGameComponent {
    properties: IsoCylinderComponentProps;
    readonly componentType: string;
    static readonly defaultProperties: IsoCylinderComponentProps;
    constructor(properties: IsoCylinderComponentProps);
    draw(ctx: CanvasRenderingContext2D): void;
    update(deltaTime: number): void;
}

export declare interface IsoCylinderComponentProps extends GameComponentProperties {
    radius: number;
    depth: number;
    tileSize: number;
}

export declare class IsoHexagonComponent extends AbstractGameComponent implements IGameComponent {
    properties: IsoHexagonComponentProps;
    static readonly defaultProperties: IsoHexagonComponentProps;
    readonly componentType: string;
    constructor(properties: IsoHexagonComponentProps);
    draw(ctx: CanvasRenderingContext2D): void;
    update(deltaTime: number): void;
}

export declare interface IsoHexagonComponentProps extends GameComponentProperties {
    sideLength: number;
    depth: number;
    tileSize: number;
}

export declare class IsoImageComponent extends AbstractGameComponent implements IGameComponent {
    properties: IsoImageComponentProps;
    static readonly defaultProperties: IsoImageComponentProps;
    readonly componentType: string;
    readonly name: string;
    private _rendered;
    private _imageCanvas;
    private _image;
    constructor(properties: IsoImageComponentProps);
    draw(ctx: CanvasRenderingContext2D): void;
    update(deltaTime: number): void;
}

export declare interface IsoImageComponentProps extends GameComponentProperties {
    tileSize: number;
    scale?: number;
    imageName?: string;
    orientation?: 'floor' | 'right-wall' | 'left-wall';
}

export declare class IsometricGridProjection implements IGrid2DProjection {
    private readonly tileWidth;
    private readonly tileHeight;
    private readonly cols;
    private readonly rows;
    private readonly gridWidth;
    private readonly gridHeight;
    constructor(tileSize: number, cols: number, rows: number);
    mapGridToScreen(col: number, row: number): {
        x: number;
        y: number;
    };
    mapScreenToGrid(x: number, y: number): {
        col: number;
        row: number;
    };
    getGridDimensions(): {
        width: number;
        height: number;
    };
}

/**
 * Get the isometric screen position
 * @param col
 * @param row
 * @param tileWidth
 */
export declare function isometricGridToScreen(col: number, row: number, tileWidth: number): {
    x: number;
    y: number;
};

/** ISOMETRIC GRID */
/**
 * Get the isometric grid position
 * @param x
 * @param y
 * @param tileWidth
 */
export declare function isometricScreenToGrid(x: number, y: number, tileWidth: number): {
    col: number;
    row: number;
};

export declare class IsoTextComponent extends AbstractGameComponent implements IGameComponent {
    properties: IsoTextComponentProps;
    static readonly defaultProperties: IsoTextComponentProps;
    readonly componentType: string;
    constructor(properties: IsoTextComponentProps);
    draw(ctx: CanvasRenderingContext2D): void;
    update(deltaTime: number): void;
}

export declare interface IsoTextComponentProps extends GameComponentProperties {
    text: string;
    font?: string;
    color?: string;
    direction?: CanvasDirection;
    orientation?: 'vertical' | 'horizontal';
    skewOrientation?: 'upright' | 'flat';
    offset?: {
        x: number;
        y: number;
    };
}

export declare interface ITileMap {
    columns: number;
    rows: number;
    tileWidth: number;
    tileHeight: number;
    projection: IGrid2DProjection;
    components: IComponentManager;
    layers: TileMapLayer[];
    addLayer(layerId: number, layer: TileMapLayer): void;
    getLayer(layerId: number): TileMapLayer | undefined;
    removeLayer(layerId: number): void;
    clearLayer(layerId: number): void;
    /**
     * Creates a tile at the specified layer, column, and row with the given properties.
     * @param layerId - The ID of the layer to add the tile to.
     * @param col - The column index of the tile.
     * @param row - The row index of the tile.
     * @param properties - Partial properties for the tile.
     * @returns The component ID of the created tile.
     * @deprecated Use assignTile instead
     */
    createTile(layerId: number, col: number, row: number, properties: GameComponentProperties): number;
    /**
     * @param layerId
     * @param col
     * @param row
     * @param obj
     */
    addTile(layerId: number, col: number, row: number, obj: IGameComponent): number;
    assignTile(layerId: number, col: number, row: number, componentId: number): void;
    getTile(layerId: number, col: number, row: number): IGameComponent | undefined;
    resetTile(layerId: number, col: number, row: number): void;
    addObjectAtGridPos(layerId: number, col: number, row: number, obj: IGameComponent): number;
    removeObject(layerId: number, componentId: number): void;
    dump(): TileMapDump;
}

export declare const KEYBOARD_KEYS: {
    BACKSPACE: number;
    TAB: number;
    ENTER: number;
    ESC: number;
    SPACE: number;
    LEFT: number;
    UP: number;
    RIGHT: number;
    DOWN: number;
};

export declare class LineComponent extends AbstractGameComponent implements IGameComponent {
    properties: LineComponentProps;
    static readonly defaultProperties: LineComponentProps;
    readonly componentType: string;
    readonly name: string;
    private lastLineLength;
    constructor(properties: LineComponentProps);
    draw(ctx: CanvasRenderingContext2D): void;
    update(deltaTime: number): void;
}

export declare interface LineComponentProps extends GameComponentProperties {
    lineWidth: number;
    lineDash?: number[];
    to: Screen2DPosition[];
    strokeColor?: string;
    offset?: {
        x: number;
        y: number;
    };
}

declare type Listener = (...args: any[]) => void;

export declare type MoveDirection = 'up' | 'down' | 'left' | 'right';

declare type MovementDirection = 'up' | 'down' | 'left' | 'right';

declare type MovementDirection_2 = 'up' | 'down' | 'left' | 'right';

export declare class MovingTileComponent extends AbstractGameComponent implements IGameComponent {
    properties: MovingTileComponentProps;
    static readonly defaultProperties: MovingTileComponentProps;
    readonly componentType: string;
    readonly name: string;
    private lastUpdateTime;
    private startPosition;
    private moveDirection;
    constructor(properties: MovingTileComponentProps);
    draw(ctx: CanvasRenderingContext2D): void;
    changeToNextDirection(): void;
    changeToNextRandomColor(): void;
    update(deltaTime: number): void;
}

export declare interface MovingTileComponentProps extends GameComponentProperties {
    width: number;
    height: number;
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    text?: string;
}

export declare class OrthogonalGridProjection implements IGrid2DProjection {
    private readonly tileSize;
    private readonly cols;
    private readonly rows;
    constructor(tileSize: number, cols: number, rows: number);
    mapGridToScreen(col: number, row: number): {
        x: number;
        y: number;
    };
    mapScreenToGrid(x: number, y: number): {
        col: number;
        row: number;
    };
    getGridDimensions(): {
        width: number;
        height: number;
    };
}

/** ORTHOGONAL GRID */
/**
 * Get the orthogonal screen position
 * @param col
 * @param row
 * @param tileSize
 */
export declare function orthogonalGridToScreen(col: number, row: number, tileSize: number): {
    x: number;
    y: number;
};

/**
 * Get the orthogonal grid position
 * @param x
 * @param y
 * @param tileSize
 */
export declare function orthogonalScreenToGrid(x: number, y: number, tileSize: number): {
    col: number;
    row: number;
};

export declare type Point2D = {
    x: number;
    y: number;
};

export declare function randomColor(): string;

export declare type Screen2DPoint = [number, number];

export declare type Screen2DPosition = {
    x: number;
    y: number;
};

export declare class SpriteComponent extends AbstractGameComponent implements IGameComponent {
    properties: SpriteComponentProps;
    static readonly defaultProperties: SpriteComponentProps;
    readonly componentType: string;
    readonly name: string;
    private _rendered;
    private _spriteCanvas;
    constructor(properties: SpriteComponentProps);
    draw(ctx: CanvasRenderingContext2D): void;
    update(deltaTime: number): void;
}

export declare interface SpriteComponentProps extends GameComponentProperties {
    tileSize: number;
    spriteId?: number;
}

/** SPRITESHEET ATLAS **/
export declare type SpritesheetAtlas = {
    sprites: SpritesheetAtlasItem[];
};

export declare type SpritesheetAtlasItem = {
    id: number;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
};

export declare const STROKE_COLORS: string[];

export declare class TextComponent extends AbstractGameComponent implements IGameComponent {
    properties: TextComponentProps;
    static readonly defaultProperties: TextComponentProps;
    readonly componentType: string;
    constructor(properties: TextComponentProps);
    draw(ctx: CanvasRenderingContext2D): void;
    update(deltaTime: number): void;
}

export declare interface TextComponentProps extends GameComponentProperties {
    text: string;
    font?: string;
    color?: string;
    direction?: CanvasDirection;
    orientation?: 'vertical' | 'horizontal';
    inverse?: boolean;
    angle?: number;
}

export declare class TileComponent extends AbstractGameComponent implements IGameComponent {
    properties: TileComponentProps;
    static readonly defaultProperties: TileComponentProps;
    readonly componentType: string;
    readonly name: string;
    constructor(properties: TileComponentProps);
    draw(ctx: CanvasRenderingContext2D): void;
    update(deltaTime: number): void;
}

export declare interface TileComponentProps extends GameComponentProperties {
    width: number;
    height: number;
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    text?: string;
}

export declare class TileMap implements ITileMap {
    readonly config: TileMapConfig;
    readonly columns: number;
    readonly rows: number;
    readonly tileWidth: number;
    readonly tileHeight: number;
    readonly layers: TileMapLayer[];
    readonly components: ComponentManager;
    readonly projection: IGrid2DProjection;
    activeCellPos: Grid2DPoint;
    constructor(config: TileMapConfig, layers?: TileMapLayer[], components?: any);
    addLayer(layerId: number, layer: TileMapLayer): void;
    getLayer(layerId: number): TileMapLayer | undefined;
    removeLayer(layerId: number): void;
    /**
     * Creates a tile at the specified layer, column, and row with the given properties.
     * @param layerId - The ID of the layer to add the tile to.
     * @param col - The column index of the tile.
     * @param row - The row index of the tile.
     * @param properties - Partial properties for the tile.
     * @returns The component ID of the created tile.
     * @deprecated Use assignTile instead
     */
    createTile(layerId: number, col: number, row: number, properties: Partial<TileComponentProps>): number;
    /**
     * @param layerId
     * @param col
     * @param row
     * @param tile
     * @deprecated Use assignTile instead
     */
    addTile(layerId: number, col: number, row: number, tile: IGameComponent): number;
    assignTile(layerId: number, col: number, row: number, componentId: number): void;
    resetTile(layerId: number, col: number, row: number): void;
    getTile(layerId: number, col: number, row: number): IGameComponent | undefined;
    private setTileLayerData;
    private getTileLayerData;
    addObjectAtGridPos(layerId: number, col: number, row: number, obj: IGameComponent): number;
    removeObject(layerId: number, componentId: number): void;
    findObjectsAtGridPos(layerId: number, col: number, row: number): number[];
    clearLayer(layerId: number): void;
    dump(): TileMapDump;
}

/** TILE MAP **/
export declare type TileMapConfig = {
    columns: number;
    rows: number;
    tileSize: number;
    projection: 'orthogonal' | 'isometric' | 'dimetric';
};

export declare type TileMapDump = {
    config: TileMapConfig;
    resources: any;
    layers: TileMapLayer[];
    components: {
        id: number;
        componentType: string;
        properties: GameComponentProperties;
    }[];
};

export declare class TileMapEditorSystem extends AbstractGameSystem implements IGameSystem {
    name: string;
    private uiDiv;
    private controlsDiv;
    private dirty;
    private cols;
    private _selectedCellIdx;
    private _selectedLayerIdx;
    private _selectedSpriteIdx;
    private _selection;
    private readonly tileMap;
    private _editorMode;
    constructor(game: IGame, tileMap: ITileMap);
    onLoad(): void;
    onUnload(): void;
    start(): void;
    stop(): void;
    tick(): Promise<void>;
    private handleCellClick;
    draw(): void;
}

export declare type TileMapLayer = {
    name: string;
    type: 'TILE' | 'OBJECT';
    data: TileMapLayerData[];
    locked?: boolean;
    visible?: boolean;
    /**
     * Depth-sort this layer together with all other `depthSort` layers.
     * Use it for layers with things that stand up from the ground (buildings, characters),
     * so that moving objects can pass in front of and behind them.
     * The merged layers are drawn at the position of the first `depthSort` layer.
     */
    depthSort?: boolean;
};

export declare type TileMapLayerData = number;

export declare class TileMapSystem extends AbstractGameSystem implements IGameSystem {
    name: string;
    private readonly tileMap;
    private readonly tsize;
    private readonly cols;
    private readonly rows;
    readonly worldCanvas: HTMLCanvasElement;
    private _drawCounter;
    /**
     * Cell indices in back-to-front (painter's) order.
     * Cells are sorted by their screen y position, which is row by row for orthogonal maps
     * and diagonal by diagonal (col + row) for isometric maps.
     */
    private readonly cellDrawOrder;
    constructor(game: IGame, tileMap: ITileMap, canvas?: HTMLCanvasElement);
    private computeCellDrawOrder;
    onLoad(): void;
    onUnload(): void;
    start(): void;
    stop(): void;
    tick(deltaTime: number): Promise<void>;
    draw(layerCanvasCtx: CanvasRenderingContext2D): void;
    /** Tiles of a TILE layer in painter's order. */
    private collectTiles;
    /** Components of an OBJECT layer in insertion order. */
    private collectObjects;
    /** Components of all depthSort layers, sorted back-to-front. */
    private collectDepthSortedComponents;
    private drawComponents;
    private updateLayer;
}

export declare class WebUiSystem2 extends AbstractGameSystem implements IGameSystem {
    name: string;
    private uiDiv;
    private controlsDiv;
    private dirty;
    private selectedSpriteImage;
    private thumbSize;
    constructor(game: IGame);
    onLoad(): void;
    onUnload(): void;
    start(): void;
    stop(): void;
    draw(): void;
}

export declare type World = WorldBuilderProps & {
    cells: WorldCell[];
};

declare const WORLD_EDITOR_CELL_COPY = "WORLD_EDITOR_CELL_COPY";

declare const WORLD_EDITOR_CELL_CUT = "WORLD_EDITOR_CELL_CUT";

declare const WORLD_EDITOR_CELL_PASTE = "WORLD_EDITOR_CELL_PASTE";

declare const WORLD_EDITOR_CELL_RESET = "WORLD_EDITOR_CELL_RESET";

declare const WORLD_EDITOR_CELL_SELECT = "WORLD_EDITOR_CELL_SELECT";

declare const WORLD_EDITOR_CELL_SELECT_END = "WORLD_EDITOR_CELL_SELECT_END";

declare const WORLD_EDITOR_CELL_SELECT_START = "WORLD_EDITOR_CELL_SELECT_START";

declare const WORLD_EDITOR_CELL_SET_ALIVE = "WORLD_EDITOR_CELL_SET_ALIVE";

declare const WORLD_EDITOR_CELL_SET_ASSET = "WORLD_EDITOR_SET_ASSET";

declare const WORLD_EDITOR_CELL_SET_DEAD = "WORLD_EDITOR_CELL_SET_DEAD";

declare const WORLD_EDITOR_CELL_TOGGLE_DEADALIVE = "WORLD_EDITOR_CELL_TOGGLE_DEADALIVE";

declare const WORLD_EDITOR_NOOP = "WORLD_EDITOR_NOOP";

export declare type WorldBuilder = (props: WorldBuilderProps) => World;

export declare interface WorldBuilderProps {
    name: string;
    label?: string;
    width: number;
    height: number;
    cells?: WorldCell[];
    resources?: WorldResources;
}

export declare type WorldCell = {
    type?: WorldCellType;
    x: number;
    y: number;
    alive: boolean;
    properties?: any;
    sprite?: any;
    layers?: WorldCellLayer[];
};

export declare type WorldCellLayer = {
    idx: number;
    fillColor?: string;
    strokeColor?: string;
    sprite?: any;
};

export declare type WorldCellSelection = Point2D[];

export declare type WorldCellType = 'default' | string;

export declare type WorldConfig = {
    world: WorldBuilderProps;
    render: WorldRenderProps;
};

declare type WorldEditorModeType = typeof WORLD_EDITOR_NOOP | typeof WORLD_EDITOR_CELL_RESET | typeof WORLD_EDITOR_CELL_COPY | typeof WORLD_EDITOR_CELL_CUT | typeof WORLD_EDITOR_CELL_PASTE | typeof WORLD_EDITOR_CELL_SELECT | typeof WORLD_EDITOR_CELL_SELECT_START | typeof WORLD_EDITOR_CELL_SELECT_END | typeof WORLD_EDITOR_CELL_SET_ASSET | typeof WORLD_EDITOR_CELL_SET_ALIVE | typeof WORLD_EDITOR_CELL_SET_DEAD | typeof WORLD_EDITOR_CELL_TOGGLE_DEADALIVE;

export declare interface WorldEditorProps extends WorldViewerProps {
    editMode?: string;
    onRenderPropsChange?: (props: WorldRenderProps) => void;
    onWorldChange?: (world: World) => void;
}

export declare class WorldInstanceEditor {
    world: WorldInstanceType;
    canvas: HTMLCanvasElement;
    editMode: WorldEditorModeType;
    constructor(world: WorldInstanceType, canvas: HTMLCanvasElement);
    init(): void;
    unload(): void;
    setEditMode(editMode: WorldEditorModeType): void;
    getCell(x: number, y: number): WorldCell | undefined;
    setCell(cell: WorldCell): void;
    setCellLayer(cell: WorldCell, layer: WorldCellLayer): void;
}

export declare type WorldInstanceType = World & {
    getCell: (x: number, y: number) => WorldCell | undefined;
    setCell(cell: WorldCell): void;
    setCells: (cells: WorldCell[]) => void;
    setCellLayer(cell: WorldCell, layer: WorldCellLayer): void;
    tick(): void;
    start(): void;
    stop(): void;
};

export declare interface WorldRendererProps extends WorldRenderProps {
    world: World;
    resources: WorldResources;
}

export declare interface WorldRenderProps {
    rendererName: string;
    cellSize: number;
    canvasWidth: number;
    canvasHeight: number;
    camera?: Camera2D;
    backgroundImage?: string;
}

export declare interface WorldResources {
    backgroundImage?: string;
}

export declare interface WorldViewerProps {
    world: WorldInstanceType;
    renderProps: WorldRenderProps;
}

/**
 * Zooms the camera by `factor`, keeping the world point under `screen` (relative to the container)
 * in place. The view is drawn with translate(-offset), then scale(zoom).
 * A zoom outside the limits, e.g. set by a world to fit the map, may move back towards them, never further.
 */
export declare function zoomCameraAt(camera: Camera2D, factor: number, screen: {
    x: number;
    y: number;
}, minZoom: number, maxZoom: number): Camera2D;

export { }
