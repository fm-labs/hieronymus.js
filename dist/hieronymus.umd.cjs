(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.hieronymus = {}));
})(this, function(exports2) {
  "use strict";var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  class AbstractGameComponent {
    constructor(properties, x = 0, y = 0) {
      __publicField(this, "properties");
      __publicField(this, "x", 0);
      __publicField(this, "y", 0);
      this.properties = properties || {};
      this.x = x;
      this.y = y;
    }
    setPosition(x, y) {
      this.x = x;
      this.y = y;
      return this;
    }
    getPosition() {
      const x = this.x;
      const y = this.y;
      if (x === void 0 || y === void 0) return { x: 0, y: 0 };
      return { x, y };
    }
  }
  const _TileComponent = class _TileComponent extends AbstractGameComponent {
    constructor(properties) {
      super({
        ..._TileComponent.defaultProperties,
        ...properties
      });
      __publicField(this, "componentType", "Tile");
      __publicField(this, "name");
      this.name = properties.name || "TileEntity";
    }
    draw(ctx) {
      const x = this.x;
      const y = this.y;
      if (x === void 0 || y === void 0) return;
      const width = this.properties.width;
      const height = this.properties.height;
      const fillColor = this.properties.backgroundColor;
      this.properties.borderColor;
      const text = this.properties.text;
      const textColor = this.properties.color;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width / 2, y + height / 2);
      ctx.lineTo(x, y + height);
      ctx.lineTo(x - width / 2, y + height / 2);
      ctx.closePath();
      if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
      if (text) {
        if (textColor) {
          ctx.fillStyle = textColor;
        }
        ctx.fillText(text, x - 10, y + height / 2);
      }
    }
    update(deltaTime) {
    }
  };
  __publicField(_TileComponent, "defaultProperties", {
    width: 32,
    height: 32,
    // visible: true,
    // opacity: 1,
    // rotation: 0,
    // scaleX: 1,
    // scaleY: 1,
    // anchorX: 0,
    // anchorY: 0,
    color: "rgba(0,0,0,0)",
    backgroundColor: "rgba(0,0,0,0)",
    borderColor: "rgba(0,0,0,0)",
    // borderWidth: 0,
    // borderRadius: 0,
    // shadowColor: 'rgba(0,0,0,0)',
    // shadowBlur: 0,
    // shadowOffsetX: 0,
    // shadowOffsetY: 0,
    // image: null,
    text: void 0
    // font: null,
    // audio: null,
    // video: null,
    // children: [],
  });
  let TileComponent = _TileComponent;
  const degreeToRadian = (degree) => degree * Math.PI / 180;
  const _IsoTextComponent = class _IsoTextComponent extends AbstractGameComponent {
    constructor(properties) {
      super({ ..._IsoTextComponent.defaultProperties, ...properties });
      __publicField(this, "componentType", "Text");
    }
    draw(ctx) {
      const x = this.x;
      const y = this.y;
      if (x === void 0 || y === void 0) return;
      const color = this.properties.color;
      const text = this.properties.text;
      const orientation = this.properties.orientation;
      const font = this.properties.font;
      const angle = Math.atan(Math.sin(degreeToRadian(30)));
      const rotationAngle = orientation === "vertical" ? -angle : angle;
      let skewAngle = 0;
      if (this.properties.skewOrientation === "flat") {
        skewAngle = orientation === "vertical" ? 0.75 : -0.75;
      } else if (this.properties.skewOrientation === "upright") {
        skewAngle = orientation === "vertical" ? -angle : angle;
      }
      if (color) {
        ctx.fillStyle = color;
      }
      if (font) {
        ctx.font = font;
      }
      ctx.translate(x, y);
      ctx.rotate(rotationAngle);
      ctx.transform(1, 0, skewAngle, 1, 0, 0);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
    update(deltaTime) {
    }
  };
  __publicField(_IsoTextComponent, "defaultProperties", {
    text: "",
    font: "12px Arial,Helvetica,sans-serif",
    color: "rgba(238,238,238,1)",
    direction: "ltr",
    orientation: "vertical",
    // vertical | horizontal
    skewOrientation: "flat",
    // upright | flat
    offset: { x: 0, y: 0 }
  });
  let IsoTextComponent = _IsoTextComponent;
  class OrthogonalGridProjection {
    constructor(tileSize, cols, rows) {
      __publicField(this, "tileSize");
      __publicField(this, "cols");
      __publicField(this, "rows");
      this.tileSize = tileSize;
      this.cols = cols;
      this.rows = rows;
    }
    mapGridToScreen(col, row) {
      const tileWidth = this.tileSize;
      const tileHeight = this.tileSize;
      const x = col * tileWidth;
      const y = row * tileHeight;
      return { x, y };
    }
    mapScreenToGrid(x, y) {
      const tileWidth = this.tileSize;
      const tileHeight = this.tileSize;
      const col = Math.floor(x / tileWidth);
      const row = Math.floor(y / tileHeight);
      return { col, row };
    }
    getGridDimensions() {
      const width = this.cols * this.tileSize;
      const height = this.rows * this.tileSize;
      return { width, height };
    }
  }
  const STROKE_COLORS = ["#57b6c2", "#459d86", "#2c7a6a", "#01152c", "#082848", "#262626"];
  const FILL_COLORS = [
    "rgba(87,182,194,0.33)",
    "rgba(69,157,134,0.33)",
    "rgba(44,122,106,0.33)",
    "rgba(87,182,194,0.33)",
    "rgba(69,157,134,0.33)",
    "rgba(44,122,106,0.33)"
  ];
  const KEYBOARD_KEYS = {
    BACKSPACE: 8,
    TAB: 9,
    ENTER: 13,
    ESC: 27,
    SPACE: 32,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40
  };
  class IsometricGridProjection {
    constructor(tileSize, cols, rows) {
      __publicField(this, "tileWidth");
      __publicField(this, "tileHeight");
      __publicField(this, "cols");
      __publicField(this, "rows");
      __publicField(this, "gridWidth");
      __publicField(this, "gridHeight");
      this.tileWidth = tileSize;
      this.tileHeight = tileSize / 2;
      this.cols = cols;
      this.rows = rows;
      this.gridWidth = this.cols * this.tileWidth;
      this.gridHeight = this.rows * this.tileHeight;
    }
    mapGridToScreen(col, row) {
      const x = (col - row) * (this.tileWidth / 2);
      const y = (col + row) * (this.tileHeight / 2);
      return { x, y };
    }
    mapScreenToGrid(x, y) {
      const tileHeight = this.tileWidth / 2;
      const tileWidthHalf = this.tileWidth / 2;
      const tileHeightHalf = tileHeight / 2;
      const col = Math.floor((x / tileWidthHalf + y / tileHeightHalf) / 2);
      const row = Math.floor((y / tileHeightHalf - x / tileWidthHalf) / 2);
      return { col, row };
    }
    getGridDimensions() {
      return { width: this.gridWidth, height: this.gridHeight };
    }
  }
  function drawIsoTile(ctx, x, y, width, height, fillColor, strokeColor, text, textColor) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width / 2, y + height / 2);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x - width / 2, y + height / 2);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
    if (text) {
      ctx.fillStyle = textColor || strokeColor;
      ctx.fillText(text, x - 10, y + height / 2);
    }
    ctx.restore();
  }
  function drawIsometricCube(ctx, x, y, width, height, depth, text, lineDash = [3, 3]) {
    const topFacePaths = [
      [x, y],
      [x + width / 2, y + height / 2],
      [x, y + height],
      [x - width / 2, y + height / 2]
    ];
    const leftFacePaths = [
      [x, y + height],
      [x, y + height + depth],
      [x - width / 2, y + height / 2 + depth],
      [x - width / 2, y + height / 2]
    ];
    const rightFacePaths = [
      [x, y + height],
      [x, y + height + depth],
      [x + width / 2, y + height / 2 + depth],
      [x + width / 2, y + height / 2]
    ];
    ctx.setLineDash(lineDash);
    const paths = [topFacePaths, leftFacePaths, rightFacePaths];
    paths.forEach((paths2, idx) => {
      ctx.beginPath();
      ctx.moveTo(paths2[0][0], paths2[0][1]);
      for (let i = 1; i < paths2.length; i++) {
        ctx.lineTo(paths2[i][0], paths2[i][1]);
      }
      ctx.closePath();
      ctx.fillStyle = FILL_COLORS[idx];
      ctx.fill();
      ctx.strokeStyle = STROKE_COLORS[idx];
      ctx.stroke();
    });
    if (text) {
      const textWidth = ctx.measureText(text).width;
      const textHeight = 20;
      ctx.fillStyle = "white";
      ctx.save();
      ctx.translate(x - textWidth / 2, y + height / 2);
      ctx.rotate(degreeToRadian(25));
      ctx.fillText(text, 0, 0);
      ctx.restore();
      ctx.save();
      ctx.translate(x - width / 2, y + height + depth / 2 - textHeight / 2);
      ctx.rotate(degreeToRadian(25));
      ctx.fillText(text, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.restore();
      ctx.save();
      ctx.translate(x, y + height + depth / 2);
      const skewAngle = degreeToRadian(25);
      ctx.transform(1, 0, Math.tan(skewAngle), 1, 0, 0);
      ctx.fillText(text, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.restore();
    }
  }
  function drawIsometricHexagon(ctx, x, y, width, depth) {
    const topHexagonEdges = calculateIsometricHexagonEdges(0, 0, width, 1);
    ctx.setLineDash([3, 3]);
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(topHexagonEdges[0][0], topHexagonEdges[0][1]);
    for (let i = 1; i < topHexagonEdges.length; i++) {
      ctx.lineTo(topHexagonEdges[i][0], topHexagonEdges[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = FILL_COLORS[0];
    ctx.fill();
    ctx.strokeStyle = STROKE_COLORS[0];
    ctx.stroke();
    ctx.translate(0, -depth);
    ctx.beginPath();
    ctx.moveTo(topHexagonEdges[0][0], topHexagonEdges[0][1]);
    for (let i = 1; i < topHexagonEdges.length; i++) {
      ctx.lineTo(topHexagonEdges[i][0], topHexagonEdges[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = FILL_COLORS[0];
    ctx.fill();
    ctx.strokeStyle = FILL_COLORS[0];
    ctx.stroke();
    for (const i of [0, 1, 5]) {
      ctx.beginPath();
      const j = i + 1 >= topHexagonEdges.length ? 0 : i + 1;
      ctx.moveTo(topHexagonEdges[i][0], topHexagonEdges[i][1]);
      ctx.lineTo(topHexagonEdges[i][0], topHexagonEdges[i][1] + depth);
      ctx.lineTo(topHexagonEdges[j][0], topHexagonEdges[j][1] + depth);
      ctx.lineTo(topHexagonEdges[j][0], topHexagonEdges[j][1]);
      ctx.closePath();
      ctx.fillStyle = FILL_COLORS[i];
      ctx.fill();
      ctx.strokeStyle = STROKE_COLORS[i];
      ctx.stroke();
    }
  }
  function calculateHexagonEdges(x, y, length) {
    const edges = [];
    for (let i = 0; i < 6; i++) {
      const angle = 60 * i * (Math.PI / 180);
      const edgeX = x + length * Math.cos(angle);
      const edgeY = y + length * Math.sin(angle);
      edges.push([edgeX, edgeY]);
    }
    return edges;
  }
  function calculateIsometricHexagonEdges(x, y, length, tileSize) {
    const edges = calculateHexagonEdges(x, y, length);
    return edges.map((edge) => orthogonalToIsometric(edge[0], edge[1], tileSize));
  }
  function orthogonalToIsometric(orthoX, orthoY, tileSize) {
    const orthoProjection = new OrthogonalGridProjection(tileSize, 1, 1);
    const isoProjection = new IsometricGridProjection(tileSize, 1, 1);
    const orthoGridPos = orthoProjection.mapScreenToGrid(orthoX, orthoY);
    const isoScreenPos = isoProjection.mapGridToScreen(orthoGridPos.col, orthoGridPos.row);
    return [isoScreenPos.x, isoScreenPos.y];
  }
  const drawElevation = (ctx, elevation, x, y) => {
    const centerX = x;
    const centerY = y;
    const elevationY = centerY - elevation;
    ctx.font = "12px Arial";
    ctx.fillStyle = "lime";
    ctx.fillStyle = "lime";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(centerX, elevationY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, elevationY);
    ctx.strokeStyle = "rgba(47,255,0,0.5)";
    ctx.stroke();
    const radiusX = Math.max(10, elevation / 2);
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusX / 2, 0, 0, Math.PI * 2);
    ctx.closePath();
    ctx.strokeStyle = "rgba(47,255,0,0.5)";
    ctx.stroke();
    ctx.fillStyle = "rgba(47,255,0,0.1)";
    ctx.fill();
  };
  const _IsoCubeComponent = class _IsoCubeComponent extends AbstractGameComponent {
    constructor(properties) {
      super({ ..._IsoCubeComponent.defaultProperties, ...properties });
      __publicField(this, "componentType", "IsoCube");
    }
    draw(ctx) {
      const x = this.x;
      const y = this.y;
      if (x === void 0 || y === void 0) return;
      const text = this.properties.text;
      const cubeWidth = this.properties.width;
      const cubeHeight = cubeWidth / 2;
      const cubeDepth = this.properties.depth;
      const tileSize = this.properties.tileSize;
      const offset = this.properties.offset || { x: 0, y: 0 };
      const centerX = x + offset.x;
      const centerY = y + tileSize / 2 / 2 + offset.y;
      const elevation = this.properties.elevation || 0;
      drawElevation(ctx, elevation, centerX, centerY);
      const cubeY = centerY - cubeHeight / 2 - cubeDepth - elevation;
      ctx.save();
      ctx.translate(centerX, cubeY);
      drawIsometricCube(ctx, 0, 0, cubeWidth, cubeHeight, cubeDepth, text, this.properties.lineDash);
      ctx.restore();
    }
    update(deltaTime) {
    }
  };
  __publicField(_IsoCubeComponent, "defaultProperties", {
    tileSize: 0,
    width: 32,
    depth: 16,
    elevation: 0,
    text: void 0,
    offset: { x: 0, y: 0 },
    lineDash: [4, 0]
  });
  let IsoCubeComponent = _IsoCubeComponent;
  const loaderSuccessHandler = (res) => {
    console.log(`Asset loaded from ${res.url}`);
    return res.json();
  };
  const loaderErrorHandler = (e) => {
    console.error(`Asset loading FAILED: ${e.message}`);
  };
  const fetchImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = reject;
      return img;
    });
  };
  const fetchSpritesheetAtlas = async (url) => {
    return await fetch(url).then(loaderSuccessHandler).catch(loaderErrorHandler);
  };
  const _GameAssets = class _GameAssets {
    static async loadSpritesheet(name, imageUrl, atlasUrl, nextgid) {
      console.log(`Load spritesheet for ${name}`, imageUrl, atlasUrl);
      const imageName = name;
      const image = await _GameAssets.loadImage(imageName, imageUrl);
      if (!image) {
        throw new Error(`Failed to load image from ${imageUrl}`);
      }
      const atlas = await fetchSpritesheetAtlas(atlasUrl);
      if (!atlas || !atlas.sprites || atlas.sprites.length === 0) {
        throw new Error(`Spritesheet atlas at ${atlasUrl} is empty or invalid`);
      }
      if (nextgid) {
        if (nextgid < this._nextgid) throw new Error("nextgid must be greater than previous");
        this._nextgid = nextgid;
      }
      atlas.sprites.forEach((sprite) => {
        const _gid = this._nextgid++;
        console.log("Registering sprite", _gid, sprite);
        this.sprites[_gid] = { ...sprite, imageName };
      });
    }
    static getSprite(gid) {
      return this.sprites[gid] || void 0;
    }
    static getSpriteImage(gid) {
      const sprite = this.getSprite(gid);
      if (!sprite) {
        console.warn(`Sprite with gid ${gid} not found.`);
        return void 0;
      }
      const imageName = sprite.imageName;
      const img = this.imageCache.get(imageName);
      if (!img) {
        console.warn(`Image for sprite with gid ${gid} not loaded.`);
        return void 0;
      }
      return img;
    }
    static async loadTilesheet(name, url, columns, rows, nextgid) {
      const imageName = "tilesheet-" + name;
      const image = await this.loadImage(imageName, url);
      if (!image) {
        throw new Error(`Failed to load tilesheet image from ${url}`);
      }
      if (nextgid) {
        if (nextgid < this._nextgid) throw new Error("nextgid must be greater than previous");
        this._nextgid = nextgid;
      }
      this.tilesheets[name] = {
        imageName,
        name,
        tileWidth: image.width / columns,
        tileHeight: image.height / rows,
        columns,
        rows
      };
    }
    static getTilesheet(name) {
      return this.tilesheets[name] || void 0;
    }
    static getTilesheetImage(name) {
      const tilesheet = this.getTilesheet(name);
      if (!tilesheet) {
        console.warn(`Tilesheet with name "${name}" not found.`);
        return void 0;
      }
      const img = this.imageCache.get(tilesheet.imageName);
      if (!img) {
        console.warn(`Image for tilesheet "${name}" not loaded.`);
        return void 0;
      }
      return img;
    }
    /**
     * Loads an image from a URL and caches it with the provided key.
     * If the image is already cached, it returns immediately.
     * @param key A unique identifier for the image.
     * @param url The URL of the image to load.
     */
    static async loadImage(key, url) {
      console.log(`Load image ${key}`, url);
      if (this.imageCache.has(key)) {
        console.warn(`Image "${key}" already loaded.`);
        return this.imageCache.get(key);
      }
      const img = new Image();
      img.src = url;
      return await new Promise((resolve, reject) => {
        img.onload = () => {
          this.imageCache.set(key, img);
          resolve(img);
        };
        img.onerror = (err) => {
          console.error(`Failed to load image "${key}":`, err);
          reject(err);
        };
      });
    }
    /**
     * Loads a font from a URL and caches it with the provided key.
     * @param key A unique identifier for the font.
     * @param url The URL of the font to load.
     */
    static async loadFont(key, url) {
      if (this.fontCache.has(key)) {
        console.warn(`Font "${key}" already loaded.`);
        return;
      }
      const font = new FontFace(key, `url(${url})`);
      await font.load();
      document.fonts.add(font);
      this.fontCache.set(key, font);
    }
    /**
     * Loads an audio file from a URL and caches it with the provided key.
     * @param key A unique identifier for the audio.
     * @param url The URL of the audio file to load.
     */
    static async loadAudio(key, url) {
      if (this.audioCache.has(key)) {
        console.warn(`Audio "${key}" already loaded.`);
        return;
      }
      const audio = new Audio(url);
      await new Promise((resolve, reject) => {
        audio.oncanplaythrough = () => {
          this.audioCache.set(key, audio);
          resolve();
        };
        audio.onerror = (err) => {
          console.error(`Failed to load audio "${key}":`, err);
          reject(err);
        };
      });
    }
    /**
     * Gets a cached font.
     * @param key The key of the font.
     */
    static getFont(key) {
      const font = this.fontCache.get(key);
      if (!font) {
        throw new Error(`Font "${key}" not loaded.`);
      }
      return font;
    }
    /**
     * Gets a cached audio.
     * @param key The key of the audio.
     */
    static getAudio(key) {
      const audio = this.audioCache.get(key);
      if (!audio) {
        throw new Error(`Audio "${key}" not loaded.`);
      }
      return audio;
    }
    /**
     * Gets a cached image.
     * @param key The key of the image.
     */
    static getImage(key) {
      const img = this.imageCache.get(key);
      if (!img) {
        throw new Error(`Image "${key}" not loaded.`);
      }
      return img;
    }
    // /**
    //  * Checks if an image is loaded and cached.
    //  * @param key The key of the image.
    //  */
    // static isImageLoaded(key: string): boolean {
    //   return this.imageCache.has(key)
    // }
    //
    // /**
    //  * Draws a cached image onto a canvas.
    //  * @param ctx CanvasRenderingContext2D
    //  * @param key Cached image key
    //  * @param x X position
    //  * @param y Y position
    //  * @param width Optional width
    //  * @param height Optional height
    //  */
    // static drawImage(
    //   ctx: CanvasRenderingContext2D,
    //   key: string,
    //   x: number,
    //   y: number,
    //   width?: number,
    //   height?: number,
    // ): void {
    //   const img = this.getImage(key)
    //   if (width && height) {
    //     ctx.drawImage(img, x, y, width, height)
    //   } else {
    //     ctx.drawImage(img, x, y)
    //   }
    // }
  };
  __publicField(_GameAssets, "_nextgid", 1);
  // next global ID for sprites
  __publicField(_GameAssets, "imageCache", /* @__PURE__ */ new Map());
  __publicField(_GameAssets, "fontCache", /* @__PURE__ */ new Map());
  __publicField(_GameAssets, "audioCache", /* @__PURE__ */ new Map());
  __publicField(_GameAssets, "sprites", {});
  __publicField(_GameAssets, "tilesheets", {});
  let GameAssets = _GameAssets;
  const _SpriteComponent = class _SpriteComponent extends AbstractGameComponent {
    constructor(properties) {
      properties = properties || {};
      super({ ..._SpriteComponent.defaultProperties, ...properties });
      __publicField(this, "componentType", "Sprite");
      __publicField(this, "name");
      __publicField(this, "_rendered", false);
      __publicField(this, "_spriteCanvas");
      this.name = properties.name || "SpriteEntity";
      this._spriteCanvas = document.createElement("canvas");
      const spriteId = this.properties.spriteId;
      if (spriteId === void 0) {
        console.warn(`spriteId is required for SpriteComponent`);
        return;
      }
      const spriteImage = GameAssets.getSpriteImage(spriteId);
      if (!spriteImage) {
        console.warn(`Sprite image element for sprite with id ${spriteId} not found`);
        return;
      }
      const sprite = GameAssets.getSprite(spriteId);
      if (!sprite) {
        console.warn(`Sprite with id ${spriteId} not found`);
        return;
      }
      this._spriteCanvas.width = sprite.width;
      this._spriteCanvas.height = sprite.height;
      const spriteCanvasCtx = this._spriteCanvas.getContext("2d");
      spriteCanvasCtx.drawImage(
        spriteImage,
        sprite.x,
        sprite.y,
        sprite.width,
        sprite.height,
        0,
        0,
        sprite.width,
        sprite.height
      );
    }
    draw(ctx) {
      if (this._rendered) return;
      const x = this.x;
      const y = this.y;
      if (x === void 0 || y === void 0) return;
      const tsize = this.properties.tileSize;
      const twidth = tsize;
      const theight = tsize / 2;
      const ratio = this._spriteCanvas.width / this._spriteCanvas.height;
      const imgW = Math.min(this._spriteCanvas.width, twidth);
      const imgH = imgW / ratio;
      const offsetX = -(imgW / 2);
      const offsetY = -imgH + theight;
      ctx.drawImage(
        this._spriteCanvas,
        0,
        0,
        this._spriteCanvas.width,
        this._spriteCanvas.height,
        x + offsetX,
        y + offsetY,
        imgW,
        imgH
      );
    }
    update(deltaTime) {
    }
  };
  __publicField(_SpriteComponent, "defaultProperties", {
    tileSize: 0
  });
  let SpriteComponent = _SpriteComponent;
  const _IsoHexagonComponent = class _IsoHexagonComponent extends AbstractGameComponent {
    constructor(properties) {
      super({ ..._IsoHexagonComponent.defaultProperties, ...properties });
      __publicField(this, "componentType", "IsoHexagon");
    }
    draw(ctx) {
      const x = this.x;
      const y = this.y;
      if (x === void 0 || y === void 0) return;
      const sideLength = this.properties.sideLength;
      const depth = this.properties.depth;
      const tileSize = this.properties.tileSize;
      const tileCenterY = y + tileSize / 2 / 2;
      drawIsometricHexagon(ctx, x, tileCenterY, sideLength, depth);
    }
    update(deltaTime) {
    }
  };
  __publicField(_IsoHexagonComponent, "defaultProperties", {
    sideLength: 32,
    depth: 16,
    tileSize: 32
  });
  let IsoHexagonComponent = _IsoHexagonComponent;
  const _IsoCylinderComponent = class _IsoCylinderComponent extends AbstractGameComponent {
    constructor(properties) {
      super({ ..._IsoCylinderComponent.defaultProperties, ...properties });
      __publicField(this, "componentType", "IsoCylinder");
    }
    draw(ctx) {
      const x = this.x;
      const y = this.y;
      if (x === void 0 || y === void 0) return;
      const radius = this.properties.radius;
      const depth = this.properties.depth;
      const tileSize = this.properties.tileSize;
      const centerX = x;
      const centerY = y + tileSize / 2 / 2;
      const radiusX = radius;
      const radiusY = radius / 2;
      ctx.setLineDash([3, 3]);
      ctx.translate(centerX, centerY);
      ctx.beginPath();
      ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.strokeStyle = STROKE_COLORS[0];
      ctx.stroke();
      ctx.fillStyle = FILL_COLORS[0];
      ctx.fill();
      ctx.translate(0, -depth);
      ctx.beginPath();
      ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.strokeStyle = STROKE_COLORS[1];
      ctx.stroke();
      ctx.fillStyle = FILL_COLORS[1];
      ctx.fill();
      ctx.translate(0, depth);
      ctx.beginPath();
      ctx.moveTo(-radiusX, 0);
      ctx.lineTo(-radiusX, -depth);
      ctx.moveTo(radiusX, 0);
      ctx.lineTo(radiusX, -depth);
      ctx.moveTo(0, radiusY);
      ctx.lineTo(0, -radiusY);
      ctx.closePath();
      ctx.strokeStyle = STROKE_COLORS[2];
      ctx.stroke();
    }
    update(deltaTime) {
    }
  };
  __publicField(_IsoCylinderComponent, "defaultProperties", {
    radius: 16,
    depth: 16,
    tileSize: 32
  });
  let IsoCylinderComponent = _IsoCylinderComponent;
  class ComponentManager {
    constructor() {
      __publicField(this, "_components", /* @__PURE__ */ new Map());
      __publicField(this, "_lastId", 0);
    }
    add(component, nextId) {
      const _nextId = nextId || this._lastId + 1;
      if (_nextId < this._lastId) throw new Error("nextId must be greater than previous");
      this._components.set(_nextId, component);
      return this._lastId = _nextId;
    }
    get(id) {
      return this._components.get(id) || void 0;
    }
    set(id, c) {
      this._components.set(id, c);
    }
    remove(id) {
      if (!this._components.has(id)) {
        throw new Error(`Component with ID ${id} does not exist`);
      }
      this._components.delete(id);
    }
    findByName(name) {
      var _a;
      for (const component of this._components.values()) {
        if (((_a = component == null ? void 0 : component.properties) == null ? void 0 : _a.name) === name) {
          return component;
        }
      }
      return void 0;
    }
    all() {
      const result = {};
      for (const [key, value] of this._components.entries()) {
        result[key] = value;
      }
      return result;
    }
    dump() {
      const dump = [];
      for (const [key, value] of this._components.entries()) {
        dump.push({
          id: key,
          componentType: value.componentType,
          properties: value.properties
        });
      }
      return dump;
    }
    restore(dump) {
      this._components.clear();
      this._lastId = 1;
      for (const c of dump) {
        const component = this.createComponent(c.componentType, c.properties);
        if (component) {
          this._components.set(c.id, component);
          this._lastId = Math.max(this._lastId, c.id + 1);
        } else {
          throw new Error(`Failed to create component of type ${c.componentType}`);
        }
      }
    }
    createComponent(componentType, properties) {
      switch (componentType) {
        case "Tile":
          return new TileComponent(properties);
        case "Text":
          return new IsoTextComponent(properties);
        case "Sprite":
          return new SpriteComponent(properties);
        case "IsoCube":
          return new IsoCubeComponent(properties);
        case "IsoHexagon":
          return new IsoHexagonComponent(properties);
        case "IsoCylinder":
          return new IsoCylinderComponent(properties);
        default:
          throw new Error(`Unknown component type: ${componentType}`);
      }
    }
  }
  class EventBus {
    constructor() {
      __publicField(this, "listeners", {});
    }
    // Subscribe to an event
    on(event, listener) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(listener);
    }
    // Unsubscribe from an event
    off(event, listener) {
      const eventListeners = this.listeners[event];
      if (eventListeners) {
        const index = eventListeners.indexOf(listener);
        if (index !== -1) {
          eventListeners.splice(index, 1);
        }
      }
    }
    // Dispatch an event
    emit(event, ...args) {
      const eventListeners = this.listeners[event] || [];
      if (eventListeners) {
        for (const listener of eventListeners) {
          listener(...args);
        }
      }
    }
  }
  class GameResourcesManager {
    constructor() {
      __publicField(this, "loadSpritesheet", async (name, imageUrl, atlasUrl, nextgid) => {
        return GameAssets.loadSpritesheet(name, imageUrl, atlasUrl, nextgid);
      });
      __publicField(this, "loadTilesheet", async (name, url, columns, rows, nextgid) => {
        return GameAssets.loadTilesheet(name, url, columns, rows, nextgid);
      });
      // public loadKenneySpritesheet = async (name: string, nextgid?: number): Promise<void> => {
      //   const url = `/assets/2d/${name}/${name}.png`
      //   const sname = `kenney-${name}`
      //   return this.loadSpritesheet(sname, url, nextgid)
      // }
      __publicField(this, "loadFont", async (name, url) => {
        return GameAssets.loadFont(name, url);
      });
    }
    loadImage(name, url) {
      return GameAssets.loadImage(name, url);
    }
    // public getSprite(gid: number): SpriteResource | undefined {
    //   return this.sprites[gid]
    // }
    // public getSpriteByName(name: string): SpriteResource | undefined {
    //   return this.sprites.find((sprite) => sprite.sprite.name === name)
    // }
    // public getSpritesheet(name: string): SpritesheetResource | TilesheetResource | undefined {
    //   return this.spritesheets.find((spritesheet) => spritesheet.name === name)
    // }
    // private registerSpritesFromSpritesheet(spritesheet: SpritesheetResource) {
    //   // create resource and entity indices
    //   const spritesheetId = this.spritesheets.length
    //
    //   spritesheet.sprites.forEach((sprite) => {
    //     const spriteGid = this._nextgid++
    //     this.sprites[spriteGid] = {
    //       type: 'SPRITE',
    //       $element: spritesheet.$element,
    //       sprite: sprite,
    //     }
    //   })
    //   this.spritesheets[spritesheetId] = spritesheet
    // }
    // private registerSpritesFromTilesheet(tileset: TilesheetResource, columns: number, rows: number) {
    //   const image = tileset.$element
    //   const width = image.width / columns
    //   const height = image.height / rows
    //
    //   const spriteIdx = 0
    //   for (let row = 0; row < rows; row++) {
    //     for (let col = 0; col < columns; col++) {
    //       const spriteGid = this._nextgid++
    //       const spriteX = col * width
    //       const spriteY = row * height
    //       const sprite = {
    //         x: spriteX,
    //         y: spriteY,
    //         width: width,
    //         height: height,
    //         name: 'tileset',
    //         id: spriteIdx,
    //       }
    //       this.sprites[spriteGid] = {
    //         type: 'SPRITE',
    //         $element: image,
    //         sprite: sprite,
    //       }
    //       console.log(spriteGid, sprite.name, sprite.x, sprite.y, sprite.width, sprite.height)
    //     }
    //   }
    // }
  }
  class Game {
    constructor($container, config, resources) {
      __publicField(this, "config");
      /**
       * The container element for the game.
       */
      __publicField(this, "$container");
      /**
       * The main canvas element for the game.
       */
      //public $canvas: HTMLCanvasElement
      /**
       * The logging container.
       * @private
       */
      __publicField(this, "$logContainer");
      /**
       * The attached game systems.
       */
      __publicField(this, "systems", []);
      /**
       * The loaded spritesheets.
       */
      __publicField(this, "resources");
      /**
       * The event bus.
       */
      __publicField(this, "eventbus", new EventBus());
      __publicField(this, "width", 800);
      __publicField(this, "height", 600);
      __publicField(this, "camera", {
        offset: { x: 0, y: 0 },
        zoom: 1
      });
      __publicField(this, "data", {});
      __publicField(this, "gameRunning", false);
      __publicField(this, "gamePaused", false);
      // public draw() {
      //   //const ctx = this.$canvas.getContext('2d')!
      //   //ctx.clearRect(0, 0, this.width, this.height)
      //   this.systems.forEach((system) => {
      //     if (system.draw) {
      //       //system.draw(ctx)
      //     }
      //   })
      //
      //   // ctx.rect(0, 0, this.width, this.height)
      //   // ctx.strokeStyle = 'red'
      //   // ctx.stroke()
      // }
      // fps
      __publicField(this, "lastFrameTime", 0);
      __publicField(this, "frameCount", 0);
      __publicField(this, "fps", 0);
      __publicField(this, "deltaTime", 0);
      __publicField(this, "fpsWindowStart", 0);
      console.log("Game constructor", config, resources);
      this.config = config;
      this.resources = resources || new GameResourcesManager();
      this.$container = $container;
      if (config == null ? void 0 : config.fullscreen) {
        this.$container.style.position = "absolute";
        this.$container.style.top = "0px";
        this.$container.style.left = "0px";
        this.$container.style.width = "100vw";
        this.$container.style.height = "100vh";
      }
      this.width = this.$container.offsetWidth;
      this.height = this.$container.offsetHeight;
      this.$logContainer = document.createElement("div");
      this.tick = this.tick.bind(this);
      this.eventbus.on("resize", (event) => {
        console.log("resize game", event);
        this.updateDimensions(event.width, event.height);
      });
    }
    updateDimensions(width, height) {
      this.width = width;
      this.height = height;
    }
    addSystem(system) {
      try {
        if (system.onLoad) {
          system.onLoad();
        }
        this.systems.push(system);
      } catch (err) {
        console.error(err);
        throw err;
      }
    }
    async tick(currentTime) {
      if (currentTime <= 1) {
        console.log("GAME TICK", currentTime);
      }
      if (!this.gameRunning) return;
      this.deltaTime = this.lastFrameTime ? currentTime - this.lastFrameTime : 0;
      this.lastFrameTime = currentTime;
      this.frameCount++;
      if (!this.fpsWindowStart) this.fpsWindowStart = currentTime;
      if (currentTime - this.fpsWindowStart >= 1e3) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.fpsWindowStart = currentTime;
      }
      if (this.gamePaused) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        requestAnimationFrame(this.tick);
        return;
      }
      await Promise.all(this.systems.map((system) => {
        var _a;
        return (_a = system.tick) == null ? void 0 : _a.call(system, this.deltaTime);
      }));
      requestAnimationFrame(this.tick);
    }
    async run() {
      console.log("RUN GAME");
      await this.start();
      requestAnimationFrame(this.tick);
    }
    async start() {
      console.info("START GAME");
      this.gameRunning = true;
      await Promise.all(this.systems.map((system) => {
        var _a;
        return (_a = system.start) == null ? void 0 : _a.call(system);
      }));
    }
    async stop() {
      console.info("STOP GAME");
      this.gameRunning = false;
      await Promise.all(this.systems.map((system) => {
        var _a;
        return (_a = system.stop) == null ? void 0 : _a.call(system);
      }));
    }
    pause() {
      console.info("PAUSE GAME");
      this.gamePaused = true;
    }
    resume() {
      console.info("RESUME GAME");
      this.gamePaused = false;
    }
    // async saveState(state: any) {}
    //
    // async restoreState(): Promise<any> {}
    //
    // public log(...msg: any[]) {
    //   console.log(...msg)
    //   const div = document.createElement('div')
    //   div.textContent = msg.join(' ')
    //   this.$logContainer.appendChild(div)
    // }
    // public logwarn(...msg: any[]) {
    //   console.warn(...msg)
    // }
    //
    // public logerr(...msg: any[]) {
    //   console.error(...msg)
    // }
  }
  const arraySortByName = (key) => (a, b) => {
    const nameA = a[key].toUpperCase();
    const nameB = b[key].toUpperCase();
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
    return 0;
  };
  function randomColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  }
  function getCellIndex(col, row, columns) {
    return row * columns + col;
  }
  function getGridPosFromIndex(index, columns) {
    const col = index % columns;
    const row = Math.floor(index / columns);
    return { col, row };
  }
  function isometricScreenToGrid(x, y, tileWidth) {
    const tileHeight = tileWidth / 2;
    const tileWidthHalf = tileWidth / 2;
    const tileHeightHalf = tileHeight / 2;
    const col = Math.floor((x / tileWidthHalf + y / tileHeightHalf) / 2);
    const row = Math.floor((y / tileHeightHalf - x / tileWidthHalf) / 2);
    return { col, row };
  }
  function isometricGridToScreen(col, row, tileWidth) {
    const tileHeight = tileWidth / 2;
    const x = (col - row) * (tileWidth / 2);
    const y = (col + row) * (tileHeight / 2);
    return { x, y };
  }
  function orthogonalGridToScreen(col, row, tileSize) {
    const tileWidth = tileSize;
    const tileHeight = tileSize;
    const x = col * tileWidth;
    const y = row * tileHeight;
    return { x, y };
  }
  function orthogonalScreenToGrid(x, y, tileSize) {
    const tileWidth = tileSize;
    const tileHeight = tileSize;
    const col = Math.floor(x / tileWidth);
    const row = Math.floor(y / tileHeight);
    return { col, row };
  }
  function findCellNeighbors(col, row, totalCols, totalRows, distance = 1) {
    const neighbors = [];
    for (let dy = -distance; dy <= distance; dy++) {
      for (let dx = -distance; dx <= distance; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nCol = col + dx;
        const nRow = row + dy;
        if (nCol >= 0 && nCol < totalCols && nRow >= 0 && nRow < totalRows) {
          neighbors.push([nCol, nRow]);
        }
      }
    }
    return neighbors;
  }
  const DEFAULT_SPEED = 1;
  const _AnimatedSpriteComponent = class _AnimatedSpriteComponent extends AbstractGameComponent {
    constructor(properties) {
      properties = properties || {};
      super({ ..._AnimatedSpriteComponent.defaultProperties, ...properties });
      __publicField(this, "componentType", "AnimatedSprite");
      __publicField(this, "name");
      __publicField(this, "_spriteIdx", 0);
      __publicField(this, "_lastUpdate", 0);
      __publicField(this, "_tilesheet");
      __publicField(this, "_tilesheetImage");
      this.name = properties.name || "AnimatedSpriteEntity";
      if (properties.tilesheetName) {
        this.applyTilesheet(properties.tilesheetName);
      }
    }
    setElevation(elevation) {
      this.properties.elevation = elevation;
      return this;
    }
    applyTilesheet(tilesheetName) {
      if (!tilesheetName) {
        this._tilesheet = void 0;
        this._tilesheetImage = void 0;
        return;
      }
      const tilesheet = GameAssets.getTilesheet(tilesheetName);
      if (!tilesheet) {
        throw new Error(`Tilesheet with name ${tilesheetName} not found`);
      }
      this._tilesheet = tilesheet;
      const tilesheetImage = GameAssets.getTilesheetImage(tilesheetName);
      if (!tilesheetImage) {
        throw new Error(`Tilesheet image for tilesheet with name ${tilesheetName} not found`);
      }
      this._tilesheetImage = tilesheetImage;
    }
    draw(ctx) {
      const x = this.x;
      const y = this.y;
      if (x === void 0 || y === void 0) return;
      if (!this._tilesheet || !this._tilesheetImage) return;
      const tilesheet = this._tilesheet;
      const spriteIdx = this._spriteIdx;
      const col = spriteIdx % tilesheet.columns;
      const row = Math.floor(spriteIdx / tilesheet.columns);
      const spriteX = col * tilesheet.tileWidth;
      const spriteY = row * tilesheet.tileHeight;
      const sprite = {
        x: spriteX,
        y: spriteY,
        width: tilesheet.tileWidth,
        height: tilesheet.tileHeight,
        imageName: this.properties.tilesheetName
        //tilesheetName is guaranteed to be defined
      };
      const spriteCanvas = document.createElement("canvas");
      spriteCanvas.width = sprite.width;
      spriteCanvas.height = sprite.height;
      const spriteCanvasCtx = spriteCanvas.getContext("2d");
      spriteCanvasCtx.drawImage(
        this._tilesheetImage,
        sprite.x,
        sprite.y,
        sprite.width,
        sprite.height,
        0,
        0,
        sprite.width,
        sprite.height
      );
      const tsize = this.properties.tileSize;
      const twidth = tsize;
      const theight = tsize / 2;
      const ratio = sprite.width / sprite.height;
      const imgW = Math.min(sprite.width, twidth);
      const imgH = imgW / ratio;
      const centerX = x;
      const centerY = y + this.properties.tileSize / 2 / 2;
      const elevation = this.properties.elevation || 0;
      drawElevation(ctx, elevation, centerX, centerY);
      const _x = x - imgW / 2;
      const _y = y - imgH + theight - elevation;
      ctx.drawImage(spriteCanvas, 0, 0, sprite.width, sprite.height, _x, _y, imgW, imgH);
      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(_x, _y, imgW, imgH);
      ctx.save();
      ctx.resetTransform();
      ctx.restore();
    }
    update(deltaTime) {
      if (!this._tilesheet || !this._tilesheetImage) return;
      const cols = this._tilesheet.columns;
      const rows = this._tilesheet.rows;
      const speed = this.properties.speed || DEFAULT_SPEED;
      const startIdx = this.properties.startIdx || 0;
      const endIdx = this.properties.endIdx || cols * rows;
      this.properties.autoPlay || true;
      this.properties.loop || true;
      const now = Date.now();
      if (now - this._lastUpdate < 100 / speed) {
        return false;
      }
      this._spriteIdx++;
      if (this._spriteIdx >= endIdx) {
        this._spriteIdx = startIdx;
      }
      this._lastUpdate = now;
      return true;
    }
  };
  __publicField(_AnimatedSpriteComponent, "defaultProperties", {
    tileSize: 32,
    speed: DEFAULT_SPEED,
    loop: 0,
    autoPlay: true,
    elevation: 0
  });
  let AnimatedSpriteComponent = _AnimatedSpriteComponent;
  const _GenericComponent = class _GenericComponent extends AbstractGameComponent {
    constructor(properties) {
      properties = properties || {};
      super({ ..._GenericComponent.defaultProperties, ...properties });
      __publicField(this, "componentType", "Generic");
    }
    draw(ctx) {
      this.x;
      this.y;
    }
    update(deltaTime) {
    }
  };
  __publicField(_GenericComponent, "defaultProperties", {});
  let GenericComponent = _GenericComponent;
  const _IsoImageComponent = class _IsoImageComponent extends AbstractGameComponent {
    constructor(properties) {
      properties = properties || {};
      super({ ..._IsoImageComponent.defaultProperties, ...properties });
      __publicField(this, "componentType", "Image");
      __publicField(this, "name");
      __publicField(this, "_rendered", false);
      __publicField(this, "_imageCanvas");
      __publicField(this, "_image");
      this.name = properties.name || "ImageEntity";
      this._imageCanvas = document.createElement("canvas");
      const imageId = this.properties.imageName;
      if (imageId === void 0) {
        console.warn(`imageId is required for ImageComponent`);
        throw new Error("imageId is required for ImageComponent");
      }
      const img = GameAssets.getImage(imageId);
      if (!img) {
        console.warn(`Image with id ${imageId} not found`);
        throw new Error(`Image with id ${imageId} not found`);
      }
      this._image = img;
      const imgW = img.width;
      const imgH = img.height;
      this._imageCanvas.width = img.width * 2;
      this._imageCanvas.height = img.height;
      const imageCanvasCtx = this._imageCanvas.getContext("2d");
      let u, v;
      if (this.properties.orientation === "right-wall") {
        u = { x: imgW, y: 0.5 * imgW };
        v = { x: 0, y: 0.5 * imgH };
      } else if (this.properties.orientation === "left-wall") {
        u = { x: -imgW, y: 0.5 * imgW };
        v = { x: 0, y: 0.5 * imgH };
      } else {
        u = { x: imgW, y: 0.5 * imgW };
        v = { x: -imgH, y: 0.5 * imgH };
      }
      const cx = this.x;
      this.y;
      const p = { x: cx + imgW, y: cx };
      imageCanvasCtx.save();
      imageCanvasCtx.setTransform(u.x / imgW, u.y / imgW, v.x / imgH, v.y / imgH, p.x, p.y);
      imageCanvasCtx.drawImage(img, 0, 0);
      imageCanvasCtx.restore();
      imageCanvasCtx.save();
      imageCanvasCtx.strokeStyle = "red";
      imageCanvasCtx.lineWidth = 2;
      imageCanvasCtx.strokeRect(0, 0, this._imageCanvas.width, this._imageCanvas.height);
      imageCanvasCtx.restore();
    }
    draw(ctx) {
      if (this._rendered) return;
      const x = this.x;
      const y = this.y;
      if (x === void 0 || y === void 0) return;
      const img = this._image;
      this.properties.tileSize;
      const scaleFactor = this.properties.scale || 1;
      const offsetX = 0;
      const offsetY = 0;
      ctx.drawImage(
        this._imageCanvas,
        0,
        0,
        this._imageCanvas.width,
        this._imageCanvas.height,
        x + offsetX - this.properties.tileSize * scaleFactor / 2,
        y + offsetY,
        // - (this.properties.tileSize / 4) * scaleFactor,
        this.properties.tileSize * scaleFactor,
        this.properties.tileSize / 2 * scaleFactor
      );
      ctx.globalAlpha = 0.2;
      ctx.drawImage(this._imageCanvas, x - img.width, y);
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.strokeStyle = "white";
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 2e3);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }
    update(deltaTime) {
    }
  };
  __publicField(_IsoImageComponent, "defaultProperties", {
    tileSize: 0,
    scale: 1,
    orientation: "floor"
  });
  let IsoImageComponent = _IsoImageComponent;
  const _TextComponent = class _TextComponent extends AbstractGameComponent {
    constructor(properties) {
      super({ ..._TextComponent.defaultProperties, ...properties });
      __publicField(this, "componentType", "Text");
    }
    draw(ctx) {
      const x = this.x;
      const y = this.y;
      if (x === void 0 || y === void 0) return;
      const color = this.properties.color;
      const text = this.properties.text;
      const orientation = this.properties.orientation;
      const font = this.properties.font;
      let angle = this.properties.angle || 0;
      if (angle === 0) {
        angle = orientation === "vertical" ? 90 : 0;
        if (this.properties.inverse) {
          angle = -angle;
        }
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(degreeToRadian(angle));
      if (color) {
        ctx.fillStyle = color;
      }
      if (font) {
        ctx.font = font;
      }
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
    update(deltaTime) {
    }
  };
  __publicField(_TextComponent, "defaultProperties", {
    text: "",
    font: "12px Arial,Helvetica,sans-serif",
    color: "rgba(238,238,238,1)",
    direction: "ltr",
    orientation: "vertical",
    // vertical | horizontal
    inverse: false,
    angle: 0
  });
  let TextComponent = _TextComponent;
  const _LineComponent = class _LineComponent extends AbstractGameComponent {
    constructor(properties) {
      super({
        ..._LineComponent.defaultProperties,
        ...properties
      });
      __publicField(this, "componentType", "Line");
      __publicField(this, "name");
      __publicField(this, "lastLineLength", 0);
      this.name = properties.name || "LineEntity";
    }
    draw(ctx) {
      var _a, _b;
      const offsetX = ((_a = this.properties.offset) == null ? void 0 : _a.x) || 0;
      const offsetY = ((_b = this.properties.offset) == null ? void 0 : _b.y) || 0;
      const x = this.x;
      const y = this.y;
      if (x === void 0 || y === void 0) return;
      const width = this.properties.lineWidth;
      const strokeColor = this.properties.strokeColor;
      ctx.beginPath();
      ctx.moveTo(x + offsetX, y + offsetY);
      for (const to of this.properties.to) {
        if (to.x === void 0 || to.y === void 0) continue;
        ctx.lineTo(to.x + offsetX, to.y + offsetY);
      }
      ctx.lineWidth = width;
      ctx.setLineDash([13, 5]);
      if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.strokeStyle = "rgba(42,169,186,0.7)";
      }
      ctx.stroke();
      if (this.lastLineLength > 24) {
        this.lastLineLength = 20;
      }
    }
    update(deltaTime) {
    }
  };
  __publicField(_LineComponent, "defaultProperties", {
    lineWidth: 3,
    lineDash: [5, 1],
    to: [{ x: 0, y: 0 }],
    strokeColor: "rgba(0,0,0,0)",
    offset: { x: 0, y: 0 }
  });
  let LineComponent = _LineComponent;
  const _MovingTileComponent = class _MovingTileComponent extends AbstractGameComponent {
    constructor(properties) {
      super({
        ..._MovingTileComponent.defaultProperties,
        ...properties
      });
      __publicField(this, "componentType", "Tile");
      __publicField(this, "name");
      __publicField(this, "lastUpdateTime", 0);
      __publicField(this, "startPosition", null);
      __publicField(this, "moveDirection", "right");
      this.name = properties.name || "TileEntity";
      this.startPosition = null;
    }
    draw(ctx) {
      const x = this.x;
      const y = this.y;
      if (x === void 0 || y === void 0) return;
      const width = this.properties.width;
      const height = this.properties.height;
      const fillColor = this.properties.backgroundColor;
      this.properties.borderColor;
      const text = this.properties.text;
      const textColor = this.properties.color;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width / 2, y + height / 2);
      ctx.lineTo(x, y + height);
      ctx.lineTo(x - width / 2, y + height / 2);
      ctx.closePath();
      if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
      if (text) {
        if (textColor) {
          ctx.fillStyle = textColor;
        }
        ctx.fillText(text, x - 10, y + height / 2);
      }
    }
    changeToNextDirection() {
      if (this.moveDirection === "right") {
        this.moveDirection = "down";
      } else if (this.moveDirection === "down") {
        this.moveDirection = "left";
      } else if (this.moveDirection === "left") {
        this.moveDirection = "up";
      } else if (this.moveDirection === "up") {
        this.moveDirection = "right";
      }
    }
    changeToNextRandomColor() {
      const colors = [
        "rgba(255,0,0,0.2)",
        "rgba(0,255,0,0.2)",
        "rgba(0,0,255,0.2)",
        "rgba(84,84,179,0.2)",
        "rgba(255,255,0,0.2)",
        "rgba(0,255,255,0.2)"
      ];
      const randomIndex = Math.floor(Math.random() * colors.length);
      this.properties.backgroundColor = colors[randomIndex];
    }
    update(deltaTime) {
      const maxOffsetX = this.properties.width * 3;
      const maxOffsetY = this.properties.height * 3;
      const speed = 5;
      if (!this.startPosition) {
        this.startPosition = { x: this.x || 0, y: this.y || 0 };
      }
      if (this.moveDirection === "right") {
        this.x = (this.x || 0) + speed;
        this.y = (this.y || 0) + speed / 2;
      } else if (this.moveDirection === "down") {
        this.x = (this.x || 0) + speed;
        this.y = (this.y || 0) - speed / 2;
      } else if (this.moveDirection === "left") {
        this.x = (this.x || 0) - speed;
        this.y = (this.y || 0) - speed / 2;
      } else if (this.moveDirection === "up") {
        this.x = (this.x || 0) - speed;
        this.y = (this.y || 0) - speed / 2;
      }
      if (this.x - this.startPosition.x > maxOffsetX || this.x - this.startPosition.x < -maxOffsetX) {
        this.x = this.startPosition.x;
        this.y = this.startPosition.y;
        this.properties.width += 10;
        this.properties.height += 10 / 2;
        this.changeToNextDirection();
        this.changeToNextRandomColor();
      }
      if (this.y - this.startPosition.y > maxOffsetY || this.y - this.startPosition.y < -maxOffsetY) {
        this.x = this.startPosition.x;
        this.y = this.startPosition.y;
        this.properties.width -= 10;
        this.properties.height -= 10 / 2;
        this.changeToNextDirection();
        this.changeToNextRandomColor();
      }
    }
  };
  __publicField(_MovingTileComponent, "defaultProperties", {
    width: 32,
    height: 32,
    // visible: true,
    // opacity: 1,
    // rotation: 0,
    // scaleX: 1,
    // scaleY: 1,
    // anchorX: 0,
    // anchorY: 0,
    color: "rgba(0,0,0,0.2)",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderColor: "rgba(0,0,0,0.5)",
    // borderWidth: 0,
    // borderRadius: 0,
    // shadowColor: 'rgba(0,0,0,0)',
    // shadowBlur: 0,
    // shadowOffsetX: 0,
    // shadowOffsetY: 0,
    // image: null,
    text: void 0
    // font: null,
    // audio: null,
    // video: null,
    // children: [],
  });
  let MovingTileComponent = _MovingTileComponent;
  function calculateIsoWaypoints(A, B) {
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const waypoints = [];
    waypoints.push(A);
    let turnPoint = null;
    let line1 = null;
    let line2 = null;
    if (dx < 0 && dy > 0) {
      console.log("Find waypoint SW");
      line1 = pointAtAngle(A, 153.4, distance * 2);
      line2 = pointAtAngle(B, -153.4, distance * 2);
    } else if (dx > 0 && dy > 0) {
      console.log("Find waypoint SE");
      line1 = pointAtAngle(A, 26.56, distance * 2);
      line2 = pointAtAngle(B, -26.56, distance * 2);
    } else if (dx > 0 && dy < 0) {
      console.log("Find waypoint NE");
      line1 = pointAtAngle(A, -26.56, distance * 2);
      line2 = pointAtAngle(B, 26.56, distance * 2);
    } else if (dx < 0 && dy < 0) {
      console.log("Find waypoint NW");
      line1 = pointAtAngle(A, -153.4, distance * 2);
      line2 = pointAtAngle(B, -153.4 - 90, distance * 2);
    } else ;
    if (line1 !== null && line2 !== null) {
      turnPoint = getLineIntersection(A, line1, B, line2);
    }
    if (turnPoint !== null) {
      waypoints.push(turnPoint);
    }
    waypoints.push(B);
    return waypoints;
  }
  function getDirection(A, B) {
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    if (dx < 0 && dy > 0) {
      return "down";
    } else if (dx > 0 && dy > 0) {
      return "right";
    } else if (dx > 0 && dy < 0) {
      return "up";
    } else if (dx < 0 && dy < 0) {
      return "left";
    } else {
      return void 0;
    }
  }
  function pointAtAngle(origin, angleDeg, length) {
    const angleRad = angleDeg * Math.PI / 180;
    const x = origin.x + length * Math.cos(angleRad);
    const y = origin.y + length * Math.sin(angleRad);
    return { x, y };
  }
  function getLineIntersection(A, B, C, D) {
    const a1 = B.y - A.y;
    const b1 = A.x - B.x;
    const c1 = a1 * A.x + b1 * A.y;
    const a2 = D.y - C.y;
    const b2 = C.x - D.x;
    const c2 = a2 * C.x + b2 * C.y;
    const determinant = a1 * b2 - a2 * b1;
    if (determinant === 0) {
      return null;
    }
    const x = (b2 * c1 - b1 * c2) / determinant;
    const y = (a1 * c2 - a2 * c1) / determinant;
    return { x, y };
  }
  const _IsoCharacterComponent = class _IsoCharacterComponent extends AnimatedSpriteComponent {
    constructor(properties) {
      const baseTilesheetName = properties.tilesheetName;
      const movementDirection = properties.movementDirection || "down";
      const tilesheetName = `${baseTilesheetName}-${movementDirection}`;
      const constructedProperties = {
        ..._IsoCharacterComponent.defaultProperties,
        ...properties,
        tilesheetName
      };
      super(constructedProperties);
      __publicField(this, "componentType", "IsoCharacter");
      __publicField(this, "_spawnTime", Date.now());
      __publicField(this, "_baseTilesheetName");
      __publicField(this, "_lastMove", 0);
      __publicField(this, "_moves", 0);
      __publicField(this, "_targetX");
      __publicField(this, "_targetY");
      __publicField(this, "_waypoints", []);
      __publicField(this, "_waypointIndex", 0);
      this._baseTilesheetName = baseTilesheetName;
    }
    setPosition(x, y) {
      super.setPosition(x, y);
      this.updateWaypoints();
      return this;
    }
    setTargetPosition(x, y) {
      this._targetX = x;
      this._targetY = y;
      console.log(
        `IsoCharacterComponent set target position to (${this.x}, ${this.y}) -> (${x}, ${y})`
      );
      this.updateWaypoints();
    }
    updateWaypoints() {
      const x = this._targetX;
      const y = this._targetY;
      if (x === void 0 || y === void 0) {
        this._waypoints = [];
        this._waypointIndex = 0;
        return;
      }
      const waypoints = calculateIsoWaypoints({ x: this.x, y: this.y }, { x, y });
      console.log("Updated waypoints", x, y, waypoints);
      this._waypoints = waypoints;
      this._waypointIndex = 0;
    }
    update(deltaTime) {
      super.update(deltaTime);
      const ttl = this.properties.ttl;
      if (ttl && Date.now() - this._spawnTime > ttl) {
        console.log(`IsoCharacterComponent expired after ${ttl}ms`);
        return null;
      }
      const speed = this.properties.movementSpeed;
      const direction = this.properties.movementDirection;
      if (speed && direction) {
        const now = Date.now();
        if (now - this._lastMove < 100 / speed) {
          return false;
        }
        if (direction === "up") {
          this.y -= speed;
          this.x += speed * 2;
        } else if (direction === "down") {
          this.y += speed;
          this.x -= speed * 2;
        } else if (direction === "left") {
          this.x -= speed * 2;
          this.y -= speed;
        } else if (direction === "right") {
          this.x += speed * 2;
          this.y += speed;
        }
        this._lastMove = Date.now();
      }
      if (this._targetX !== void 0 && this._targetY !== void 0) {
        const dx = this._targetX - this.x;
        const dy = this._targetY - this.y;
        const treshold = 12;
        if (this._waypointIndex < this._waypoints.length) {
          const waypoint = this._waypoints[this._waypointIndex];
          const waypointDx = waypoint.x - this.x;
          const waypointDy = waypoint.y - this.y;
          const waypointDistance = Math.sqrt(waypointDx * waypointDx + waypointDy * waypointDy);
          const moveSpeed = speed || 1;
          const direction2 = getDirection({ x: this.x, y: this.y }, waypoint);
          if (direction2) {
            this.properties.movementDirection = direction2;
            this.properties.movementSpeed = moveSpeed;
          }
          if (waypointDistance < treshold) {
            console.log(
              `Reached waypoint ${this._waypointIndex} at (${waypoint.x}, ${waypoint.y}), moving to next waypoint.`
            );
            this._waypointIndex++;
            if (this._waypointIndex >= this._waypoints.length) {
              this._targetX = void 0;
              this._targetY = void 0;
              this.properties.movementSpeed = 0;
              this.properties.movementDirection = void 0;
              console.log("Reached the final waypoint, stopping movement.");
            }
          }
        } else {
          if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) {
              this.properties.movementDirection = "right";
            } else {
              this.properties.movementDirection = "left";
            }
          } else {
            if (dy > 0) {
              this.properties.movementDirection = "down";
            } else {
              this.properties.movementDirection = "up";
            }
          }
        }
        if (this.properties.movementDirection !== void 0) {
          this.applyTilesheet(this._baseTilesheetName + `-${this.properties.movementDirection}`);
        }
      }
    }
    draw(ctx) {
      super.draw(ctx);
      ctx.beginPath();
      ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
      ctx.stroke();
      ctx.closePath();
      const targetColor = "rgba(201,0,232,0.98)";
      if (this._targetX !== void 0 && this._targetY !== void 0) {
        ctx.beginPath();
        ctx.arc(this._targetX, this._targetY, 5, 0, Math.PI * 2);
        ctx.fillStyle = targetColor;
        ctx.fill();
        ctx.closePath();
        const deltaX = this._targetX - this.x;
        const deltaY = this._targetY - this.y;
        const angle = Math.atan2(deltaY, deltaX);
        const dangle = angle * (180 / Math.PI);
        ctx.font = "12px Arial";
        ctx.fillStyle = targetColor;
        ctx.fillText(
          `ΔX: ${deltaX.toFixed(2)}, ΔY: ${deltaY.toFixed(2)}, Angle: ${angle.toFixed(2)} / ${dangle}`,
          this._targetX + 10,
          this._targetY - 10
        );
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this._targetX, this._targetY);
        ctx.strokeStyle = targetColor;
        ctx.stroke();
        ctx.closePath();
        this._waypoints.forEach((waypoint) => {
          ctx.beginPath();
          ctx.arc(waypoint.x, waypoint.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,0,0,0.65)";
          ctx.fill();
          ctx.closePath();
        });
        if (this._waypoints.length > 0) {
          ctx.beginPath();
          ctx.moveTo(this.x, this.y);
          this._waypoints.forEach((waypoint) => {
            ctx.lineTo(waypoint.x, waypoint.y);
          });
          ctx.strokeStyle = "rgba(255,235,0,0.65)";
          ctx.stroke();
          ctx.closePath();
        }
      }
    }
  };
  __publicField(_IsoCharacterComponent, "defaultProperties", {
    ...AnimatedSpriteComponent.defaultProperties,
    movementSpeed: 0,
    movementDirection: void 0
  });
  let IsoCharacterComponent = _IsoCharacterComponent;
  const _IsoCharacter2Component = class _IsoCharacter2Component extends AnimatedSpriteComponent {
    constructor(properties) {
      const baseTilesheetName = properties.tilesheetName;
      const constructedProperties = {
        ..._IsoCharacter2Component.defaultProperties,
        ...properties,
        tilesheetName: baseTilesheetName + "-down"
      };
      super(constructedProperties);
      __publicField(this, "componentType", "IsoCharacter2");
      __publicField(this, "_spawnTime", Date.now());
      __publicField(this, "_baseTilesheetName");
      __publicField(this, "_lastMove", 0);
      __publicField(this, "_moves", 0);
      __publicField(this, "_targetX");
      __publicField(this, "_targetY");
      //private _waypoints: { x: number; y: number }[] = []
      //private _waypointIndex: number = 0
      __publicField(this, "_movementDirection");
      this._baseTilesheetName = baseTilesheetName;
      this.setMovementDirection(properties.movementDirection || "down");
    }
    setPosition(x, y) {
      super.setPosition(x, y);
      return this;
    }
    setTargetPosition(x, y) {
      this._targetX = x;
      this._targetY = y;
      console.log(
        `IsoCharacter2Component set target position to (${this.x}, ${this.y}) -> (${x}, ${y})`
      );
      return this;
    }
    setMovementDirection(movementDirection) {
      const tilesheetName = `${this._baseTilesheetName}-${movementDirection}`;
      this.applyTilesheet(tilesheetName);
      return this;
    }
    moveToGridPosition(col, row) {
    }
    moveUp(distance) {
      if (this.y === void 0) return;
      this.setTargetPosition(this.x || 0, (this.y || 0) - distance);
    }
    moveDown(distance) {
      if (this.y === void 0) return;
      this.setTargetPosition(this.x || 0, (this.y || 0) + distance);
    }
    moveLeft(distance) {
      if (this.x === void 0) return;
      this.setTargetPosition((this.x || 0) - distance, this.y || 0);
    }
    moveRight(distance) {
      if (this.x === void 0) return;
      this.setTargetPosition((this.x || 0) + distance, this.y || 0);
    }
    // private updateWaypoints(): void {
    //   const x = this._targetX
    //   const y = this._targetY
    //   if (x === undefined || y === undefined) {
    //     this._waypoints = []
    //     this._waypointIndex = 0
    //     return
    //   }
    //
    //   const waypoints = calculateIsoWaypoints({ x: this.x, y: this.y }, { x, y })
    //   console.log('Updated waypoints', x, y, waypoints)
    //   this._waypoints = waypoints
    //   this._waypointIndex = 0
    // }
    update(deltaTime) {
      super.update(deltaTime);
      const ttl = this.properties.ttl;
      if (ttl && Date.now() - this._spawnTime > ttl) {
        console.log(`IsoCharacterComponent expired after ${ttl}ms`);
        return null;
      }
      if (this._targetX !== void 0 && this._targetY !== void 0) {
        const dx = this._targetX - (this.x || 0);
        const dy = this._targetY - (this.y || 0);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = this.properties.movementSpeed || 0;
        if (distance > 1 && speed > 0) {
          const moveX = dx / distance * speed / 1e3;
          const moveY = dy / distance * speed / 1e3;
          this.setPosition((this.x || 0) + moveX, (this.y || 0) + moveY);
        } else {
          this.setPosition(this._targetX, this._targetY);
          this._targetX = void 0;
          this._targetY = void 0;
        }
      }
    }
    draw(ctx) {
      super.draw(ctx);
      ctx.beginPath();
      ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
      ctx.stroke();
      ctx.closePath();
    }
  };
  __publicField(_IsoCharacter2Component, "defaultProperties", {
    ...AnimatedSpriteComponent.defaultProperties,
    movementSpeed: 0,
    movementDirection: void 0
  });
  let IsoCharacter2Component = _IsoCharacter2Component;
  class AbstractGameSystem {
    constructor(_game) {
      __publicField(this, "_game");
      this._game = _game;
    }
  }
  function zoomCameraAt(camera, factor, screen2, minZoom, maxZoom) {
    const { offset, zoom } = camera;
    const next = Math.min(Math.max(maxZoom, zoom), Math.max(Math.min(minZoom, zoom), zoom * factor));
    return {
      ...camera,
      zoom: next,
      offset: {
        x: (screen2.x + offset.x) / zoom * next - screen2.x,
        y: (screen2.y + offset.y) / zoom * next - screen2.y
      }
    };
  }
  class CameraSystem extends AbstractGameSystem {
    constructor(game) {
      super(game);
      __publicField(this, "name", "CameraSystem");
      this.handleKeyboardKeyDownEvent = this.handleKeyboardKeyDownEvent.bind(this);
      this.handleWheelEvent = this.handleWheelEvent.bind(this);
      this.handleZoomEvent = this.handleZoomEvent.bind(this);
      this.handleCameraResetEvent = this.handleCameraResetEvent.bind(this);
      this.handleCameraCenterEvent = this.handleCameraCenterEvent.bind(this);
    }
    onLoad() {
      console.log("CameraSystem.onLoad");
    }
    onUnload() {
      console.log("CameraSystem.onUnload");
    }
    start() {
      console.log("CameraSystem.start");
      this._game.eventbus.on("keyboard.keydown", this.handleKeyboardKeyDownEvent);
      this._game.eventbus.on("wheel", this.handleWheelEvent);
      this._game.eventbus.on("zoom", this.handleZoomEvent);
      this._game.eventbus.on("camera.reset", this.handleCameraResetEvent);
      this._game.eventbus.on("camera.center", this.handleCameraCenterEvent);
      this._game.camera.offset.x = -this._game.width / 2;
      this._game.camera.offset.y = -this._game.height * 0.05;
      this._game.camera.zoom = 1;
    }
    stop() {
      console.log("CameraSystem.stop");
      this._game.eventbus.off("keyboard.keydown", this.handleKeyboardKeyDownEvent);
      this._game.eventbus.off("wheel", this.handleWheelEvent);
      this._game.eventbus.off("zoom", this.handleZoomEvent);
      this._game.eventbus.off("camera.reset", this.handleCameraResetEvent);
      this._game.eventbus.off("camera.center", this.handleCameraCenterEvent);
    }
    // public update() {
    //   console.log('CameraSystem.update')
    // }
    // public draw() {
    //   // console.log('CameraSystem.draw')
    // }
    handleKeyboardKeyDownEvent(e) {
      console.log("[CameraSystem keydown]", e.key, e.code, e.altKey, e.ctrlKey, e.shiftKey);
      const delta = 16;
      if (e.code == "KeyA") {
        this._game.camera.offset.x -= delta;
      } else if (e.code == "KeyD") {
        this._game.camera.offset.x += delta;
      }
      if (e.code == "KeyW") {
        this._game.camera.offset.y -= delta;
      } else if (e.code == "KeyS") {
        this._game.camera.offset.y += delta;
      }
    }
    handleWheelEvent(e) {
      if (this._game.gamePaused) {
        return;
      }
      const deltaX = e.deltaX;
      const deltaY = e.deltaY;
      const moveStep = 1;
      const offset = this._game.camera.offset;
      this._game.camera.offset = {
        x: offset.x + deltaX * moveStep,
        y: offset.y + deltaY * moveStep
      };
    }
    handleZoomEvent(e) {
      if (this._game.gamePaused) {
        return;
      }
      const { minZoom = 0.05, maxZoom = 10 } = this._game.config.camera ?? {};
      const rect = this._game.$container.getBoundingClientRect();
      this._game.camera = zoomCameraAt(
        this._game.camera,
        Math.exp(-e.deltaY * 0.01),
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        minZoom,
        maxZoom
      );
    }
    handleCameraResetEvent() {
      this._game.camera = {
        offset: { x: 0, y: 0 },
        zoom: 1
      };
    }
    handleCameraCenterEvent() {
      const oldCam = this._game.camera;
      const newOffset = { x: 0, y: 0 };
      this._game.camera = { ...oldCam, offset: newOffset };
    }
    moveTo(x, y) {
      const oldCam = this._game.camera;
      const newOffset = { x, y };
      this._game.camera = { ...oldCam, offset: newOffset };
    }
    setZoom(zoom) {
      const oldCam = this._game.camera;
      this._game.camera = { ...oldCam, zoom };
    }
    centerTo(x, y) {
      const oldCam = this._game.camera;
      const newOffset = { x: x - this._game.width / 2, y: y - this._game.height / 2 };
      this._game.camera = { ...oldCam, offset: newOffset };
    }
    resetCamera() {
      this._game.camera = {
        offset: { x: 0, y: 0 },
        zoom: 1
      };
    }
  }
  class DebugSystem extends AbstractGameSystem {
    constructor() {
      super(...arguments);
      __publicField(this, "name", "DebugSystem");
    }
    onLoad() {
      console.log("DebugSystem.onLoad");
    }
    onUnload() {
      console.log("DebugSystem.onUnload");
    }
    start() {
      console.log("DebugSystem.start");
    }
    stop() {
      console.log("DebugSystem.stop");
    }
    async tick() {
      console.log("DebugSystem.update");
    }
    draw() {
      console.log("DebugSystem.draw");
    }
  }
  class DevPanelSystem extends AbstractGameSystem {
    constructor() {
      super(...arguments);
      __publicField(this, "name", "DevPanelSystem");
      __publicField(this, "dirty", true);
      __publicField(this, "devPanelContainer");
    }
    onLoad() {
      console.log("DevPanelSystem.onLoad");
      const devPanelContainer = document.createElement("div");
      devPanelContainer.style.position = "absolute";
      devPanelContainer.style.top = "0";
      devPanelContainer.style.left = "0";
      devPanelContainer.style.width = "100%";
      devPanelContainer.style.height = "100%";
      devPanelContainer.style.backgroundColor = "rgba(194,64,64,0.5)";
      this.devPanelContainer = devPanelContainer;
      this._game.$container.appendChild(this.devPanelContainer);
    }
    onUnload() {
      console.log("DevPanelSystem.onUnload");
    }
    start() {
      console.log("DevPanelSystem.start");
    }
    stop() {
      console.log("DevPanelSystem.stop");
    }
    async tick() {
      console.log("DevPanelSystem.update");
    }
    draw() {
      if (!this.dirty || !this.devPanelContainer) return;
      console.log("DevPanelSystem.draw");
      this.devPanelContainer.innerHTML = "";
    }
  }
  class EntitySystem extends AbstractGameSystem {
    constructor(game) {
      super(game);
      __publicField(this, "name", "EntitySystem");
      __publicField(this, "_selectedSpriteImage");
    }
    onLoad() {
      console.log("EntitySystem.onLoad");
    }
    onUnload() {
      console.log("EntitySystem.onUnload");
    }
    start() {
      console.log("EntitySystem.start");
      this._game.eventbus.on("grid.cellClick", this.handleCellClick.bind(this));
      this._game.eventbus.on("editor.selectedSpriteImage", (selectedSpriteImage) => {
        this._selectedSpriteImage = selectedSpriteImage;
      });
    }
    stop() {
      console.log("EntitySystem.stop");
    }
    async tick() {
    }
    handleCellClick({ index, col, row }) {
      console.log("[Entitys] clicked cell", index, col, row, this._selectedSpriteImage);
      if (this._selectedSpriteImage) {
        const obj = {
          col,
          row,
          spriteRef: this._selectedSpriteImage
        };
        console.log("Update Object", index, obj);
        this._game.eventbus.emit("object.update", obj);
      }
    }
    draw(mainCtx) {
    }
  }
  class GamepadSystem extends AbstractGameSystem {
    constructor(game) {
      super(game);
      __publicField(this, "name", "GamepadInputSystem");
      __publicField(this, "lastInputTime", 0);
      __publicField(this, "gamepads", []);
      this.handleGamepadConnected = this.handleGamepadConnected.bind(this);
      this.handleGamepadDisconnected = this.handleGamepadDisconnected.bind(this);
    }
    onLoad() {
      console.log("GamepadInputSystem.onLoad");
    }
    onUnload() {
      console.log("GamepadInputSystem.onUnload");
    }
    start() {
      console.log("GamepadInputSystem.start");
      this.gamepads = navigator.getGamepads();
      if ("GamepadEvent" in window) {
        window.addEventListener("gamepadconnected", this.handleGamepadConnected);
        window.addEventListener("gamepaddisconnected", this.handleGamepadDisconnected);
      }
    }
    stop() {
      console.log("GamepadInputSystem.stop");
      window.removeEventListener("gamepadconnected", this.handleGamepadConnected);
      window.removeEventListener("gamepaddisconnected", this.handleGamepadDisconnected);
      this.gamepads = [];
    }
    async tick(delta) {
      const now = Date.now();
      if (this.lastInputTime && now - this.lastInputTime < 50) return;
      this.gamepads = navigator.getGamepads();
      for (const gamepad of this.gamepads) {
        if (gamepad) {
          this.updateGamepadState.bind(this)(gamepad);
        }
      }
      this.lastInputTime = now;
    }
    // public draw() {
    //   console.log('GamepadInputSystem.draw')
    // }
    // Function to handle gamepad connections
    handleGamepadConnected(event) {
      const gamepad = event.gamepad;
      console.log(`[gamepad.connected] Gamepad ID: ${gamepad.id}`);
      this._game.eventbus.emit("gamepad.connected", gamepad);
    }
    // Function to handle gamepad disconnections
    handleGamepadDisconnected(event) {
      const gamepad = event.gamepad;
      console.log(`[gamepad.disconnected] Gamepad ID: ${gamepad.id}`);
      this._game.eventbus.emit("gamepad.disconnected", gamepad);
    }
    // Function to update gamepad state
    updateGamepadState(gamepad) {
      const stickThreshold = 0.2;
      const buttons = gamepad.buttons;
      const stickX = gamepad.axes[0];
      const stickY = gamepad.axes[1];
      if (stickX < -stickThreshold) {
        console.log("[gamepad] Left");
      } else if (stickX > stickThreshold) {
        console.log("[gamepad] Right");
      }
      if (stickY < -stickThreshold) {
        console.log("[gamepad] Up");
      } else if (stickY > stickThreshold) {
        console.log("[gamepad] Down");
      }
      const stick = {
        stickLeft: stickX < -stickThreshold,
        stickRight: stickX > stickThreshold,
        stickUp: stickY < -stickThreshold,
        stickDown: stickY > stickThreshold
      };
      if (stick.stickLeft || stick.stickRight || stick.stickUp || stick.stickDown) {
        this._game.eventbus.emit("gamepad.stickChange", stick);
      }
      for (let i = 0; i < buttons.length; i++) {
        if (buttons[i].pressed) {
          console.log(`[gamepad] Button ${i} pressed`);
          this._game.eventbus.emit("gamepad.buttonPress", { button: i, state: "pressed" });
        }
      }
    }
  }
  class GridSystem extends AbstractGameSystem {
    constructor(game, tileMap) {
      super(game);
      __publicField(this, "name", "GridSystem");
      __publicField(this, "tsize");
      __publicField(this, "cols");
      __publicField(this, "rows");
      __publicField(this, "projection");
      __publicField(this, "infoDiv");
      __publicField(this, "gridCanvas");
      __publicField(this, "gridCtx");
      //private _dirty: boolean = true
      //private _clientScreenPos: { x: number; y: number } = { x: 0, y: 0 }
      __publicField(this, "_activeCellIdx");
      __publicField(this, "_activeGridPos");
      __publicField(this, "_cellsRendered", 0);
      __publicField(this, "_selectedCellIdx");
      __publicField(this, "_selectedCell");
      this.handleMouseMove = this.handleMouseMove.bind(this);
      this.handleMouseClick = this.handleMouseClick.bind(this);
      this.tsize = tileMap.tileWidth;
      this.cols = tileMap.columns;
      this.rows = tileMap.rows;
      this.projection = tileMap.projection;
      const infoDiv = document.createElement("div");
      infoDiv.id = "infoDiv";
      infoDiv.style.position = "fixed";
      infoDiv.style.bottom = "0";
      infoDiv.style.left = "0";
      infoDiv.style.background = "black";
      infoDiv.style.padding = "0.1rem";
      infoDiv.style.fontFamily = "monospace";
      infoDiv.style.fontSize = "10px";
      infoDiv.style.color = "lime";
      infoDiv.style.zIndex = "10000";
      this.infoDiv = infoDiv;
    }
    onLoad() {
      console.log("GridSystem.onLoad");
      this._game.$container.appendChild(this.infoDiv);
      const gridCanvas = document.createElement("canvas");
      gridCanvas.id = "gridCanvas";
      gridCanvas.width = this._game.width;
      gridCanvas.height = this._game.height;
      this.gridCanvas = gridCanvas;
      this.gridCtx = gridCanvas.getContext("2d");
      this._game.eventbus.on("resize", (event) => {
        console.log("resize grid", event);
        this.gridCanvas.width = event.width;
        this.gridCanvas.height = event.height;
      });
    }
    onUnload() {
      console.log("GridSystem.onUnload");
    }
    start() {
      console.log("GridSystem.start");
      this._game.$container.addEventListener("mousemove", this.handleMouseMove);
      this._game.$container.addEventListener("mousedown", this.handleMouseClick);
    }
    stop() {
      console.log("GridSystem.stop");
      this._game.$container.removeEventListener("mousemove", this.handleMouseMove);
      this._game.$container.removeEventListener("mousedown", this.handleMouseClick);
    }
    handleMouseMove(e) {
      const mainContainer = this._game.$container;
      const rect = mainContainer.getBoundingClientRect();
      const x = e.clientX - rect.left + this._game.camera.offset.x;
      const y = e.clientY - rect.top + this._game.camera.offset.y;
      const pos = this.projection.mapScreenToGrid(
        x / this._game.camera.zoom,
        y / this._game.camera.zoom
      );
      const index = getCellIndex(pos.col, pos.row, this.cols);
      if (pos.col >= 0 && pos.col < this.cols && pos.row >= 0 && pos.row < this.rows) {
        if (index != this._activeCellIdx) {
          this._game.eventbus.emit("grid.cellHover", {
            index,
            col: pos.col,
            row: pos.row
          });
          this._activeCellIdx = index;
          this._activeGridPos = pos;
        }
      } else if (this._activeCellIdx !== void 0) {
        this._activeCellIdx = void 0;
        this._activeGridPos = void 0;
      }
      if (this.infoDiv) {
        this.infoDiv.innerHTML = `<div>MOUSE: ${e.clientX.toFixed(2)},${e.clientY.toFixed(2)}</div>
      <div>CANVASPOS: ${x.toFixed(2)},${y.toFixed(2)}</div>
      <div>GRIDPOS: [${pos.col},${pos.row}]</div>
      <div>IDX: ${index}</div>
      <div>CELLSRND: ${this._cellsRendered}</div>
      `;
      }
    }
    handleMouseClick(e) {
      console.log("handleMouseClick", this._activeCellIdx, this._activeGridPos);
      const index = this._activeCellIdx;
      const pos = this._activeGridPos;
      if (index !== void 0 && pos !== void 0) {
        this._game.eventbus.emit("grid.cellClick", { index, col: pos.col, row: pos.row });
        this._selectedCellIdx = index;
        this._selectedCell = pos;
      }
    }
    draw(gridCtx) {
      var _a, _b, _c, _d, _e, _f;
      const cols = this.cols;
      const rows = this.rows;
      const tileSize = this.tsize;
      const fillColor = "rgba(131,127,127,0)";
      const cameraOffsetX = this._game.camera.offset.x;
      const cameraOffsetY = this._game.camera.offset.y;
      gridCtx.reset();
      gridCtx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
      gridCtx.translate(-cameraOffsetX, -cameraOffsetY);
      gridCtx.scale(this._game.camera.zoom, this._game.camera.zoom);
      const gridDimensions = this.projection.getGridDimensions();
      gridCtx.fillStyle = "white";
      gridCtx.fillText(`${gridDimensions.width}/${gridDimensions.height}`, -20, -20);
      let renderedCells = 0;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const { x, y } = this.projection.mapGridToScreen(i, j);
          const _x = x * this._game.camera.zoom;
          const _y = y * this._game.camera.zoom;
          if (_x - cameraOffsetX + tileSize < 0 || _y - cameraOffsetY + tileSize < 0) continue;
          if (_x > window.innerWidth + cameraOffsetX || _y > window.innerHeight + cameraOffsetY)
            continue;
          let tileColor = fillColor;
          let strokeColor = "rgba(117,195,20,0.6)";
          let textColor = void 0;
          let shouldRender = false;
          if (((_a = this._selectedCell) == null ? void 0 : _a.col) == i && ((_b = this._selectedCell) == null ? void 0 : _b.row) == j) {
            tileColor = "rgba(255,196,0,0.5)";
            textColor = "rgba(0,0,0,0.85)";
            strokeColor = "rgba(255,196,0,0.5)";
            shouldRender = true;
          } else if (((_c = this._activeGridPos) == null ? void 0 : _c.col) == i && ((_d = this._activeGridPos) == null ? void 0 : _d.row) == j) {
            tileColor = "rgba(4,230,8,0.37)";
            textColor = "rgba(255,255,255,0.85)";
            shouldRender = true;
          } else if (((_e = this._activeGridPos) == null ? void 0 : _e.col) == i || ((_f = this._activeGridPos) == null ? void 0 : _f.row) == j) {
            strokeColor = "rgba(4,230,8,0.32)";
            shouldRender = true;
          }
          if (!shouldRender) {
            continue;
          }
          if (this.projection instanceof IsometricGridProjection) {
            drawIsoTile(
              gridCtx,
              x,
              y,
              tileSize,
              tileSize / 2,
              tileColor,
              strokeColor,
              "",
              // `[${i},${j}]`,
              textColor
            );
          } else {
            gridCtx.fillStyle = tileColor;
            gridCtx.fillRect(x, y, tileSize, tileSize);
            gridCtx.strokeStyle = "rgba(163,164,163,0.48)";
            gridCtx.setLineDash([1, 3]);
            gridCtx.strokeRect(x, y, tileSize, tileSize);
            if (textColor) {
              gridCtx.fillStyle = textColor;
            }
            gridCtx.fillText(`[${i},${j}]`, x + 2, y + 10);
          }
          renderedCells++;
        }
      }
      this._cellsRendered = renderedCells;
      this._game.eventbus.emit("system.draw", {
        system: this.name,
        context: gridCtx,
        drawCounter: this._cellsRendered
      });
    }
    async tick(deltaTime) {
      this.draw(this.gridCtx);
    }
  }
  class GridLinesSystem extends AbstractGameSystem {
    constructor(game, tileMap) {
      super(game);
      __publicField(this, "name", "GridLinesSystem");
      __publicField(this, "cols");
      __publicField(this, "rows");
      __publicField(this, "projection");
      __publicField(this, "gridCanvas");
      __publicField(this, "gridCtx");
      __publicField(this, "_gridColor", "rgba(230,151,82,0.4)");
      this.cols = tileMap.columns;
      this.rows = tileMap.rows;
      this.projection = tileMap.projection;
    }
    onLoad() {
      console.log("GridLinesSystem.onLoad");
      const gridCanvas = document.createElement("canvas");
      gridCanvas.id = "gridLinesCanvas";
      gridCanvas.width = this._game.width;
      gridCanvas.height = this._game.height;
      this.gridCanvas = gridCanvas;
      this.gridCtx = gridCanvas.getContext("2d");
      this._game.$container.appendChild(this.gridCanvas);
      this._game.eventbus.on("resize", (event) => {
        console.log("resize grid", event);
        this.gridCanvas.width = event.width;
        this.gridCanvas.height = event.height;
      });
    }
    onUnload() {
      console.log("GridLinesSystem.onUnload");
    }
    draw(gridCtx) {
      const cols = this.cols;
      const rows = this.rows;
      const cameraOffsetX = this._game.camera.offset.x;
      const cameraOffsetY = this._game.camera.offset.y;
      gridCtx.reset();
      gridCtx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
      gridCtx.translate(-cameraOffsetX, -cameraOffsetY);
      gridCtx.scale(this._game.camera.zoom, this._game.camera.zoom);
      const gridDimensions = this.projection.getGridDimensions();
      gridCtx.fillStyle = "purple";
      gridCtx.fillText(`${gridDimensions.width}/${gridDimensions.height}`, 0, -40);
      gridCtx.strokeStyle = this._gridColor;
      gridCtx.lineWidth = 1;
      for (let col = -cols; col <= cols * 2; col++) {
        const start = this.projection.mapGridToScreen(col, -rows);
        const end = this.projection.mapGridToScreen(col, rows * 2);
        gridCtx.beginPath();
        gridCtx.moveTo(start.x, start.y);
        gridCtx.lineTo(end.x, end.y);
        gridCtx.stroke();
      }
      for (let row = -rows; row <= rows * 2; row++) {
        const start = this.projection.mapGridToScreen(-cols, row);
        const end = this.projection.mapGridToScreen(cols * 2, row);
        gridCtx.beginPath();
        gridCtx.moveTo(start.x, start.y);
        gridCtx.lineTo(end.x, end.y);
        gridCtx.stroke();
      }
    }
    async tick(deltaTime) {
      this.draw(this.gridCtx);
    }
  }
  class HeroSystem extends AbstractGameSystem {
    constructor(game) {
      super(game);
      __publicField(this, "name", "HeroSystem");
      __publicField(this, "hero", {
        x: 0,
        y: 0,
        width: 32,
        height: 32,
        speed: 256,
        color: "#00ff00",
        direction: "down",
        moving: false
      });
      __publicField(this, "dirty", true);
      __publicField(this, "heroCanvas");
      __publicField(this, "heroCtx");
      __publicField(this, "characterComponent");
    }
    onLoad() {
      console.log("HeroSystem.onLoad");
      const heroCanvas = document.createElement("canvas");
      heroCanvas.id = "heroCanvas";
      heroCanvas.width = this._game.width;
      heroCanvas.height = this._game.height;
      this.heroCanvas = heroCanvas;
      this.heroCtx = heroCanvas.getContext("2d");
      this._game.$container.appendChild(this.heroCanvas);
      this.characterComponent = new IsoCharacter2Component({
        name: "hero-character",
        tileSize: 64,
        tilesheetName: "mech",
        speed: 7,
        movementSpeed: 1.5,
        movementDirection: "down",
        //ttl: 20000,
        elevation: 0,
        autoPlay: true
      });
      this.handleKeyboardDownEvent = this.handleKeyboardDownEvent.bind(this);
      this.handleGamepadStickChange = this.handleGamepadStickChange.bind(this);
      this.handleGamepadButtonChangeEvent = this.handleGamepadButtonChangeEvent.bind(this);
      this._game.eventbus.on("keyboard.keydown", this.handleKeyboardDownEvent);
      this._game.eventbus.on("gamepad.stickChange", this.handleGamepadStickChange);
      this._game.eventbus.on("gamepad.buttonPress", this.handleGamepadButtonChangeEvent);
      this._game.eventbus.on("resize", (event) => {
        console.log("resize tilemap", event);
        this.heroCanvas.width = event.width;
        this.heroCanvas.height = event.height;
      });
    }
    onUnload() {
      console.log("HeroSystem.onUnload");
      this._game.eventbus.off("keyboard.keydown", this.handleKeyboardDownEvent);
      this._game.eventbus.off("gamepad.stickChange", this.handleGamepadStickChange);
      this._game.eventbus.off("gamepad.buttonPress", this.handleGamepadButtonChangeEvent);
    }
    handleGamepadStickChange(e) {
      if (e.stickLeft) {
        console.log("left stick change", e);
        this.move("left");
      } else if (e.stickRight) {
        console.log("right stick change", e);
        this.move("right");
      } else if (e.stickUp) {
        console.log("up stick change", e);
        this.move("up");
      } else if (e.stickDown) {
        console.log("down stick change", e);
        this.move("down");
      }
    }
    handleKeyboardDownEvent(e) {
      console.log("[hero]", e.key, e.code, e.altKey, e.ctrlKey, e.shiftKey);
      switch (e.code) {
        case "KeyA":
        case "ArrowLeft":
          this.move("left");
          break;
        case "KeyD":
        case "ArrowRight":
          this.move("right");
          break;
        case "KeyW":
        case "ArrowUp":
          this.move("up");
          break;
        case "KeyS":
        case "ArrowDown":
          this.move("down");
          break;
        default:
          this.move(void 0);
          break;
      }
    }
    handleGamepadButtonChangeEvent(e) {
      var _a, _b;
      console.log("[hero] button event", e);
      if (e.button === 0) {
        this.hero.speed += 2;
      } else if (e.button === 1) {
        this.hero.speed -= 2;
      } else if (e.button === 2) {
        this.hero.color = randomColor();
      } else if (e.button === 4) {
        this.characterComponent.setElevation(
          (((_a = this.characterComponent.properties) == null ? void 0 : _a.elevation) || 0) + 20
        );
      } else if (e.button === 5) {
        this.characterComponent.setElevation(
          (((_b = this.characterComponent.properties) == null ? void 0 : _b.elevation) || 0) - 10
        );
      } else if (e.button === 9) {
        this._game.camera.offset.x = -this.hero.x;
        this._game.camera.offset.y = -this.hero.y;
      }
      console.log("[hero] speed:", this.hero.speed);
    }
    move(direction) {
      const movementDelta = 1 / 10;
      const speed = this.hero.speed;
      switch (direction) {
        case "left":
          this.hero.x -= speed * movementDelta;
          this.hero.y -= speed * movementDelta / 2;
          this.hero.direction = "left";
          this.hero.moving = true;
          this.characterComponent.setMovementDirection("right");
          this._game.camera.offset.x -= speed * movementDelta;
          this._game.camera.offset.y -= speed * movementDelta / 2;
          break;
        case "right":
          this.hero.x += speed * movementDelta;
          this.hero.y += speed * movementDelta / 2;
          this.hero.direction = "right";
          this.hero.moving = true;
          this.characterComponent.setMovementDirection("left");
          this._game.camera.offset.x += speed * movementDelta;
          this._game.camera.offset.y += speed * movementDelta / 2;
          break;
        case "up":
          this.hero.x += speed * movementDelta;
          this.hero.y -= speed * movementDelta / 2;
          this.hero.direction = "up";
          this.hero.moving = true;
          this.characterComponent.setMovementDirection("up");
          this._game.camera.offset.x += speed * movementDelta;
          this._game.camera.offset.y -= speed * movementDelta / 2;
          break;
        case "down":
          this.hero.x -= speed * movementDelta;
          this.hero.y += speed * movementDelta / 2;
          this.hero.direction = "down";
          this.hero.moving = true;
          this.characterComponent.setMovementDirection("down");
          this._game.camera.offset.x -= speed * movementDelta;
          this._game.camera.offset.y += speed * movementDelta / 2;
          break;
        default:
          this.hero.moving = false;
          break;
      }
      this._game.eventbus.emit("hero.move", this.hero);
    }
    start() {
      console.log("HeroSystem.start");
      this.hero.x = 300;
      this.hero.y = 300;
      this.characterComponent.setPosition(this.hero.x, this.hero.y);
    }
    stop() {
      console.log("HeroSystem.stop");
    }
    async tick(deltaTime) {
      this._game.eventbus.emit("hero.update", this.hero);
      this.dirty = true;
      this.characterComponent.setPosition(this.hero.x, this.hero.y);
      this.characterComponent.update(deltaTime);
      this.draw(this.heroCtx);
    }
    draw(heroCtx) {
      this.hero;
      heroCtx.reset();
      heroCtx.clearRect(0, 0, heroCtx.canvas.width, heroCtx.canvas.height);
      heroCtx.save();
      const cameraOffsetX = this._game.camera.offset.x;
      const cameraOffsetY = this._game.camera.offset.y;
      heroCtx.translate(-cameraOffsetX, -cameraOffsetY);
      heroCtx.fillStyle = "rgba(255,255,255,0.46)";
      heroCtx.font = "10px Arial";
      const text = `(${Math.round(this.hero.x)}, ${Math.round(this.hero.y)})`;
      heroCtx.fillText(text, this.hero.x, this.hero.y + 30);
      this.characterComponent.draw(heroCtx);
      heroCtx.restore();
      this.dirty = false;
    }
  }
  class InfoSystem extends AbstractGameSystem {
    constructor(game) {
      super(game);
      __publicField(this, "name", "InfoSystem");
      __publicField(this, "systemDiv");
      //private dirty = true
      __publicField(this, "mousePos", { x: 0, y: 0 });
      __publicField(this, "metrics", {});
      const systemDiv = document.createElement("div");
      systemDiv.id = "systemDiv";
      systemDiv.style.position = "absolute";
      systemDiv.style.bottom = "5px";
      systemDiv.style.right = "5px";
      systemDiv.style.overflowX = "ellipsis";
      systemDiv.style.overflowY = "scroll";
      systemDiv.style.fontFamily = "monospace";
      systemDiv.style.fontSize = "10px";
      systemDiv.style.color = "rgb(132,255,0)";
      systemDiv.style.opacity = "1";
      systemDiv.style.zIndex = "100000";
      this.systemDiv = systemDiv;
    }
    onLoad() {
      console.log("InfoSystem.onLoad");
      this._game.$container.appendChild(this.systemDiv);
      this._game.$container.addEventListener("mousemove", (e) => {
        this.mousePos = { x: e.clientX, y: e.clientY };
      });
      this._game.eventbus.on("system.draw", (event) => {
        const systemName = (event == null ? void 0 : event.system) || "unknown";
        const metricsKey = `${systemName}DrawCounter`;
        this.metrics[metricsKey] = (event == null ? void 0 : event.drawCounter) || 0;
      });
    }
    onUnload() {
      console.log("InfoSystem.onUnload");
    }
    start() {
      console.log("InfoSystem.start");
    }
    stop() {
      console.log("InfoSystem.stop");
    }
    async tick() {
      this.draw();
    }
    draw() {
      this.systemDiv.innerHTML = `
<div>${this._game.frameCount}/${this._game.deltaTime.toFixed(3)} ms/${this._game.fps} fps</div>
<div>Screen W:${screen.width} H:${screen.height}</div>
<div>Window W:${window.innerWidth} H:${window.innerHeight}</div>
<div>Container W:${this._game.$container.offsetWidth} H:${this._game.$container.offsetHeight}</div>
<div>Canvas W:${this._game.width} H:${this._game.height}</div>
<div>Game W:${this._game.width} H:${this._game.height}</div>
<div>Camera X:${this._game.camera.offset.x} Y:${this._game.camera.offset.y} ZOOM ${this._game.camera.zoom}</div>
<div>Mouse X:${this.mousePos.x} Y:${this.mousePos.y}</div>
`;
      for (const [key, value] of Object.entries(this.metrics)) {
        this.systemDiv.innerHTML += `<div>${key}: ${value}</div>`;
      }
    }
  }
  const canScroll = (el) => {
    const { overflowX, overflowY } = getComputedStyle(el);
    return /auto|scroll/.test(overflowY) && el.scrollHeight > el.clientHeight || /auto|scroll/.test(overflowX) && el.scrollWidth > el.clientWidth;
  };
  function wheelOwner(target, container) {
    var _a;
    for (let el = target; el && el !== document.body; el = el.parentElement) {
      if (el === container) return void 0;
      if (((_a = el.dataset) == null ? void 0 : _a.nativeScroll) !== void 0 || canScroll(el)) return el;
    }
    return void 0;
  }
  class InputSystem extends AbstractGameSystem {
    constructor(game) {
      super(game);
      __publicField(this, "name", "InputSystem");
      this.handleKeyboardEvent = this.handleKeyboardEvent.bind(this);
      this.handleMouseEvent = this.handleMouseEvent.bind(this);
      this.handleWheelEvent = this.handleWheelEvent.bind(this);
      this.handleWindowResizeEvent = this.handleWindowResizeEvent.bind(this);
      this.handleGestureEvent = this.handleGestureEvent.bind(this);
    }
    onLoad() {
      console.log("InputSystem.onLoad");
    }
    onUnload() {
      console.log("InputSystem.onUnload");
    }
    start() {
      console.log("InputSystem.start");
      window.addEventListener("keydown", this.handleKeyboardEvent);
      window.addEventListener("keyup", this.handleKeyboardEvent);
      window.addEventListener("mouseup", this.handleMouseEvent);
      window.addEventListener("mousedown", this.handleMouseEvent);
      window.addEventListener("dblclick", this.handleMouseEvent);
      window.addEventListener("wheel", this.handleWheelEvent, { passive: false });
      window.addEventListener("gesturestart", this.handleGestureEvent);
      window.addEventListener("gesturechange", this.handleGestureEvent);
      window.addEventListener("resize", this.handleWindowResizeEvent);
      window.dispatchEvent(new Event("resize"));
    }
    stop() {
      console.log("InputSystem.stop");
      window.removeEventListener("keydown", this.handleKeyboardEvent);
      window.removeEventListener("keyup", this.handleKeyboardEvent);
      window.removeEventListener("mousedown", this.handleMouseEvent);
      window.removeEventListener("mouseup", this.handleMouseEvent);
      window.removeEventListener("dblclick", this.handleMouseEvent);
      window.removeEventListener("wheel", this.handleWheelEvent);
      window.removeEventListener("gesturestart", this.handleGestureEvent);
      window.removeEventListener("gesturechange", this.handleGestureEvent);
      window.removeEventListener("resize", this.handleWindowResizeEvent);
    }
    // public update() {
    //   console.log('InputSystem.update')
    // }
    // public draw() {
    //   // console.log('InputSystem.draw')
    // }
    handleKeyboardEvent(e) {
      this._game.eventbus.emit(`keyboard.${e.type}`, e);
    }
    handleMouseEvent(e) {
      console.log("mouse event", e.type, e.altKey, e.ctrlKey, e.shiftKey, e);
      this._game.eventbus.emit(`mouse.${e.type}`, e);
    }
    handleWheelEvent(e) {
      const zoom = (e.ctrlKey || e.metaKey) && e.deltaY !== 0;
      const owner = zoom ? void 0 : wheelOwner(e.target, this._game.$container);
      if (owner) {
        if (!canScroll(owner)) e.preventDefault();
        return;
      }
      e.preventDefault();
      this._game.eventbus.emit(zoom ? "zoom" : "wheel", e);
    }
    handleGestureEvent(e) {
      e.preventDefault();
    }
    handleWindowResizeEvent(e) {
      const _width = window.innerWidth;
      const _height = window.innerHeight;
      const width = _width;
      const height = _height;
      console.log("resize", _width, _height, width, height);
      this._game.eventbus.emit("resize", { width, height });
    }
  }
  class TileMapSystem extends AbstractGameSystem {
    constructor(game, tileMap, canvas) {
      super(game);
      __publicField(this, "name", "TileMapSystem");
      __publicField(this, "tileMap");
      __publicField(this, "tsize");
      __publicField(this, "cols");
      __publicField(this, "rows");
      __publicField(this, "worldCanvas");
      //private dirty = true
      __publicField(this, "_drawCounter", 0);
      /**
       * Cell indices in back-to-front (painter's) order.
       * Cells are sorted by their screen y position, which is row by row for orthogonal maps
       * and diagonal by diagonal (col + row) for isometric maps.
       */
      __publicField(this, "cellDrawOrder");
      this.tileMap = tileMap;
      this.cols = tileMap.columns;
      this.rows = tileMap.rows;
      this.tsize = tileMap.tileWidth;
      this.worldCanvas = canvas ? canvas : document.createElement("canvas");
      this.cellDrawOrder = this.computeCellDrawOrder();
      console.log("TileMapSystem.constructor", this.cols, this.rows, this.tsize);
    }
    computeCellDrawOrder() {
      const cells = [];
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const { x, y } = this.tileMap.projection.mapGridToScreen(c, r);
          cells.push({ idx: getCellIndex(c, r, this.cols), x, y });
        }
      }
      return cells.sort((a, b) => a.y - b.y || a.x - b.x).map((cell) => cell.idx);
    }
    onLoad() {
      console.log("TileMapSystem.onLoad");
      const gridWidth = this.cols * this.tsize;
      this.rows * this.tsize;
      this.worldCanvas.width = this._game.width;
      this.worldCanvas.height = this._game.height;
      this.worldCanvas.id = "worldCanvas";
      if (this.tileMap.projection instanceof IsometricGridProjection) {
        this._game.camera.offset.x = -gridWidth / 2;
      }
      this._game.$container.appendChild(this.worldCanvas);
      this._game.eventbus.on("resize", (event) => {
        console.log("resize tilemap", event);
        this.worldCanvas.width = event.width;
        this.worldCanvas.height = event.height;
      });
    }
    onUnload() {
      console.log("TileMapSystem.onUnload");
    }
    start() {
      console.log("TileMapSystem.start");
    }
    stop() {
      console.log("TileMapSystem.stop");
    }
    async tick(deltaTime) {
      this.tileMap.layers.forEach((layer, layerIdx) => {
        this.updateLayer(layerIdx, deltaTime);
      });
      this.draw(this.worldCanvas.getContext("2d"));
    }
    draw(layerCanvasCtx) {
      this._drawCounter = 0;
      layerCanvasCtx.reset();
      layerCanvasCtx.translate(-this._game.camera.offset.x, -this._game.camera.offset.y);
      layerCanvasCtx.scale(this._game.camera.zoom, this._game.camera.zoom);
      let depthSortedDrawn = false;
      this.tileMap.layers.forEach((layer, layerIdx) => {
        if (layer.depthSort) {
          if (!depthSortedDrawn) {
            this.drawComponents(this.collectDepthSortedComponents(), layerCanvasCtx);
            depthSortedDrawn = true;
          }
        } else if (layer.type === "TILE") {
          this.drawComponents(this.collectTiles(layerIdx), layerCanvasCtx);
        } else if (layer.type === "OBJECT") {
          this.drawComponents(sortByDepth(this.collectObjects(layerIdx)), layerCanvasCtx);
        }
      });
      this._game.eventbus.emit("system.draw", {
        system: this.name,
        context: layerCanvasCtx,
        drawCounter: this._drawCounter
      });
    }
    /** Tiles of a TILE layer in painter's order. */
    collectTiles(layerIdx) {
      var _a;
      const data = ((_a = this.tileMap.layers[layerIdx]) == null ? void 0 : _a.data) || [];
      const components = [];
      for (const cellIdx of this.cellDrawOrder) {
        const componentId = data[cellIdx];
        if (!componentId) continue;
        const component = this.tileMap.components.get(componentId);
        if (component) components.push(component);
      }
      return components;
    }
    /** Components of an OBJECT layer in insertion order. */
    collectObjects(layerIdx) {
      var _a;
      const data = ((_a = this.tileMap.layers[layerIdx]) == null ? void 0 : _a.data) || [];
      const components = [];
      for (const componentId of data) {
        const component = this.tileMap.components.get(componentId);
        if (component) components.push(component);
      }
      return components;
    }
    /** Components of all depthSort layers, sorted back-to-front. */
    collectDepthSortedComponents() {
      const components = [];
      this.tileMap.layers.forEach((layer, layerIdx) => {
        if (!layer.depthSort) return;
        const layerComponents = layer.type === "TILE" ? this.collectTiles(layerIdx) : this.collectObjects(layerIdx);
        components.push(...layerComponents);
      });
      return sortByDepth(components);
    }
    drawComponents(components, ctx) {
      for (const component of components) {
        if (!component.draw) continue;
        ctx.save();
        component.draw(ctx);
        ctx.restore();
        this._drawCounter++;
      }
    }
    updateLayer(layerIdx, deltaTime) {
      const layerData = [...this.tileMap.layers[layerIdx].data];
      layerData.forEach((componentId) => {
        const component = this.tileMap.components.get(componentId);
        if (component && component.update) {
          const updateResult = component.update(deltaTime);
          if (updateResult === null) {
            console.log("updateTriggeredRemoval", layerIdx, componentId);
            this.tileMap.removeObject(layerIdx, componentId);
          }
        }
      });
    }
  }
  function sortByDepth(components) {
    return components.sort((a, b) => a.y - b.y);
  }
  class TileMapEditorSystem extends AbstractGameSystem {
    constructor(game, tileMap) {
      super(game);
      __publicField(this, "name", "TileMapEditorSystem");
      __publicField(this, "uiDiv");
      __publicField(this, "controlsDiv");
      __publicField(this, "dirty", true);
      __publicField(this, "cols");
      //private rows: number
      //private tileSize: number
      //private _hoveredCellIdx: number | undefined
      //private _hoverTimer: any | undefined
      __publicField(this, "_selectedCellIdx");
      __publicField(this, "_selectedLayerIdx");
      __publicField(this, "_selectedSpriteIdx");
      __publicField(this, "_selection");
      __publicField(this, "tileMap");
      __publicField(this, "_editorMode", "select");
      this.tileMap = tileMap;
      this.cols = this.tileMap.columns;
      this.handleCellClick = this.handleCellClick.bind(this);
    }
    onLoad() {
      console.log("WebUiSystem.onLoad");
      const uiCanvas = document.createElement("canvas");
      uiCanvas.width = this._game.width;
      uiCanvas.height = this._game.height;
      const uiDiv = document.createElement("div");
      uiDiv.id = "uiDiv";
      uiDiv.style.position = "absolute";
      uiDiv.style.top = "0px";
      uiDiv.style.left = "0px";
      uiDiv.style.width = "320px";
      uiDiv.style.height = "100vh";
      uiDiv.style.overflowY = "scroll";
      uiDiv.style.backgroundColor = "rgba(30,30,30,0.9)";
      this.uiDiv = uiDiv;
      this._game.$container.appendChild(uiDiv);
      const controlsDiv = document.createElement("div");
      controlsDiv.id = "controlsDiv";
      controlsDiv.style.zIndex = "10000";
      controlsDiv.style.position = "absolute";
      controlsDiv.style.top = "0px";
      controlsDiv.style.right = "0px";
      controlsDiv.style.width = "320px";
      controlsDiv.style.height = "100vh";
      controlsDiv.style.overflowY = "scroll";
      controlsDiv.style.backgroundColor = "rgba(37,36,36,0.8)";
      this.controlsDiv = controlsDiv;
      this._game.$container.appendChild(controlsDiv);
    }
    onUnload() {
      console.log("WebUiSystem.onUnload");
    }
    start() {
      console.log("WebUiSystem.start");
      this._game.eventbus.on("grid.cellClick", this.handleCellClick);
    }
    stop() {
      console.log("WebUiSystem.stop");
      this._game.eventbus.off("grid.cellClick", this.handleCellClick);
    }
    async tick() {
      if (this._game.frameCount % 60 === 0 || this.dirty) {
        this.dirty = true;
        this.draw();
      }
    }
    handleCellClick(cellEvent) {
      console.log("WebUiSystem.handleCellClick", cellEvent, this._editorMode);
      if (this._editorMode === "draw") {
        this._selectedCellIdx = cellEvent.index;
        if (this._selectedSpriteIdx !== void 0 && this._selectedCellIdx !== void 0 && this._selectedLayerIdx !== void 0) {
          console.log(
            "add sprite component to layer",
            this._selectedLayerIdx,
            this._selectedSpriteIdx
          );
          const _component = new SpriteComponent({
            spriteId: this._selectedSpriteIdx,
            //spriteImage: this._game.resources.sprites[this._selectedSpriteIdx], // deprecated
            tileSize: this.tileMap.tileWidth
          });
          if (this.tileMap.layers[this._selectedLayerIdx].type === "TILE") {
            this.tileMap.addTile(this._selectedLayerIdx, cellEvent.col, cellEvent.row, _component);
          } else {
            this.tileMap.addObjectAtGridPos(
              this._selectedLayerIdx,
              cellEvent.col,
              cellEvent.row,
              _component
            );
          }
        } else if (this._selectedSpriteIdx !== void 0 && !this._selectedLayerIdx) {
          console.warn("No layer selected, cannot add sprite to cell");
          alert("No layer selected, cannot add sprite to cell");
        }
      }
      this.dirty = true;
    }
    draw() {
      if (!this.dirty) return;
      console.log("WebUiSystem.draw");
      const spriteWidth = 48;
      const spriteHeight = 48;
      this.uiDiv.innerHTML = "";
      const spritesContainer = document.createElement("div");
      spritesContainer.style.display = "flex";
      spritesContainer.style.flexDirection = "row";
      spritesContainer.style.flexWrap = "wrap";
      spritesContainer.style.width = "320px";
      spritesContainer.style.borderTop = "5px solid blue";
      console.log("GameAssets.sprites", GameAssets.sprites);
      Object.entries(GameAssets.sprites).forEach((entry) => {
        const spriteIdx = parseInt(entry[0]);
        const { x, y, width, height, imageName, name } = entry[1];
        const spriteCanvas = document.createElement("canvas");
        spriteCanvas.width = spriteWidth;
        spriteCanvas.height = spriteHeight;
        spriteCanvas.style.position = "relative";
        const spriteCanvasCtx = spriteCanvas.getContext("2d");
        spriteCanvasCtx.drawImage(
          GameAssets.getImage(imageName),
          x,
          y,
          width,
          height,
          0,
          0,
          spriteWidth,
          spriteHeight
        );
        const spriteDiv = document.createElement("div");
        spriteDiv.title = `${imageName} ${name} (${x}, ${y})`;
        spriteDiv.style.width = `${spriteWidth}px`;
        spriteDiv.style.height = `${spriteHeight}px`;
        spriteDiv.style.border = "1px solid rgba(255,255,255,1)";
        spriteDiv.style.borderWidth = "0 1px 1px 0";
        spriteDiv.dataset.spriteIndex = spriteIdx.toString();
        spriteDiv.onclick = (ev) => {
          const spriteIdx2 = parseInt(spriteDiv.dataset.spriteIndex);
          if (spriteIdx2 === this._selectedSpriteIdx) {
            console.log("deselect sprite", spriteIdx2);
            this._selectedSpriteIdx = void 0;
            this._game.eventbus.emit("editor.spriteDeselect", { index: spriteIdx2 });
          } else {
            console.log("selectedSpriteIdx is now", spriteIdx2, ev);
            this._selectedSpriteIdx = spriteIdx2;
            this._game.eventbus.emit("editor.spriteSelect", { index: spriteIdx2 });
          }
          this.dirty = true;
          this.draw();
          ev.preventDefault();
          ev.stopPropagation();
        };
        if (this._selectedSpriteIdx === spriteIdx) {
          spriteDiv.style.backgroundColor = "rgba(72,255,0,0.8)";
        }
        const spriteImg = document.createElement("img");
        spriteImg.src = spriteCanvas.toDataURL("image/png");
        spriteDiv.appendChild(spriteImg);
        spritesContainer.appendChild(spriteDiv);
      });
      this.uiDiv.appendChild(spritesContainer);
      if (this._editorMode !== "draw") ;
      else {
        this.uiDiv.style.display = "block";
        this.uiDiv.style.visibility = "visible";
      }
      this.controlsDiv.innerHTML = "";
      const buttonDump = document.createElement("button");
      buttonDump.textContent = "Dump";
      buttonDump.onclick = () => {
        console.log("Dump");
        const jsonString = JSON.stringify(this.tileMap.dump(), null, 2);
        console.log(jsonString);
      };
      this.controlsDiv.appendChild(buttonDump);
      const buttonSave = document.createElement("button");
      buttonSave.textContent = "Save";
      buttonSave.onclick = () => {
        console.log("save");
        const jsonString = JSON.stringify(this.tileMap.dump(), null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "save.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this._game.eventbus.emit("editor.save", {
          tilemapJson: jsonString
        });
      };
      this.controlsDiv.appendChild(buttonSave);
      const inputRestoreFile = document.createElement("input");
      inputRestoreFile.type = "file";
      inputRestoreFile.accept = ".json";
      inputRestoreFile.style.display = "none";
      inputRestoreFile.onchange = (ev) => {
        const file = ev.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          var _a;
          const jsonString = (_a = event.target) == null ? void 0 : _a.result;
          console.log("restore", jsonString);
          const json = JSON.parse(jsonString);
          this._game.eventbus.emit("editor.restore", { tilemapJson: json });
          console.warn("Restoring tilemap from JSON is not implemented yet");
        };
        reader.readAsText(file);
      };
      const buttonRestore = document.createElement("button");
      buttonRestore.textContent = "Restore";
      buttonRestore.onclick = () => {
        inputRestoreFile.click();
      };
      this.controlsDiv.appendChild(inputRestoreFile);
      this.controlsDiv.appendChild(buttonRestore);
      this.controlsDiv.appendChild(document.createElement("hr"));
      const buttonCamReset = document.createElement("button");
      buttonCamReset.textContent = "Reset camera";
      buttonCamReset.onclick = () => {
        console.log("reset camera");
        this._game.eventbus.emit("camera.reset", {});
      };
      this.controlsDiv.appendChild(buttonCamReset);
      const buttonCamCenter = document.createElement("button");
      buttonCamCenter.textContent = "Center camera";
      buttonCamCenter.onclick = () => {
        console.log("center camera");
        this._game.eventbus.emit("camera.center", {});
      };
      this.controlsDiv.appendChild(buttonCamCenter);
      this.controlsDiv.appendChild(document.createElement("hr"));
      const buttonSelectCell = document.createElement("button");
      buttonSelectCell.textContent = "Select Mode";
      buttonSelectCell.onclick = () => {
        console.log("select cell");
        this._editorMode = "select";
        this._game.eventbus.emit("editor.set_mode", { mode: "select" });
      };
      this.controlsDiv.appendChild(buttonSelectCell);
      const buttonDrawCell = document.createElement("button");
      buttonDrawCell.textContent = "Draw Mode";
      buttonDrawCell.onclick = () => {
        console.log("select cell");
        this._editorMode = "draw";
        this._game.eventbus.emit("editor.set_mode", { mode: "draw" });
      };
      this.controlsDiv.appendChild(buttonDrawCell);
      this.controlsDiv.appendChild(document.createElement("hr"));
      const headingCell = document.createElement("div");
      headingCell.textContent = `Selected Cell: ${this._selectedCellIdx}`;
      this.controlsDiv.appendChild(headingCell);
      if (this._selectedCellIdx !== void 0) {
        const gridPos = getGridPosFromIndex(this._selectedCellIdx, this.cols);
        const screenPos = this.tileMap.projection.mapGridToScreen(gridPos.col, gridPos.row);
        const cellInfo = document.createElement("div");
        cellInfo.innerHTML = `CellIdx: ${this._selectedCellIdx}`;
        cellInfo.innerHTML += `<br />GridPos: ${gridPos.col},${gridPos.row}`;
        cellInfo.innerHTML += `<br />ScreenPos: ${screenPos.x},${screenPos.y}`;
        this.controlsDiv.appendChild(cellInfo);
      }
      const buttonCellClear = document.createElement("button");
      buttonCellClear.textContent = "Clear";
      buttonCellClear.onclick = () => {
        console.log("clear cell");
        this._game.eventbus.emit("editor.clear_cell", { index: this._selectedCellIdx });
        this._selectedCellIdx = void 0;
        this.dirty = true;
      };
      this.controlsDiv.appendChild(buttonCellClear);
      this.controlsDiv.appendChild(document.createElement("hr"));
      const headingLayers = document.createElement("div");
      headingLayers.textContent = "Layers";
      this.controlsDiv.appendChild(headingLayers);
      const layerInfo = document.createElement("div");
      layerInfo.textContent = `LayerIdx: ${this._selectedLayerIdx}`;
      this.controlsDiv.appendChild(layerInfo);
      this.tileMap.layers.forEach((layer, layerIdx) => {
        const layerDiv = document.createElement("div");
        layerDiv.style.display = "flex";
        layerDiv.style.flexDirection = "row";
        layerDiv.style.justifyContent = "flex-start";
        layerDiv.style.marginBottom = "5px";
        layerDiv.style.padding = "2px 0";
        layerDiv.style.borderBottom = "1px solid rgba(255,0,255,0.8)";
        layerDiv.style.fontSize = "12px";
        const layerIcons = document.createElement("div");
        layerIcons.style.display = "flex";
        layerIcons.style.flexDirection = "row";
        layerIcons.style.justifyContent = "flex-start";
        const layerLock = document.createElement("div");
        layerLock.textContent = layer.locked ? "🔒" : "🔓";
        layerLock.title = layer.locked ? "Layer is locked" : "Layer is unlocked";
        layerIcons.appendChild(layerLock);
        const layerVisible = document.createElement("div");
        layerVisible.textContent = layer.visible ? "👁️" : "👁️‍🗨️";
        layerVisible.title = layer.visible ? "Layer is visible" : "Layer is hidden";
        layerIcons.appendChild(layerVisible);
        const layerName = document.createElement("div");
        layerName.style.fontSize = "12px";
        layerName.textContent = `${layer.name} (${layer.type}) - ${layer.data.filter((d) => d !== 0).length} comp`;
        const buttonSelectLayer = document.createElement("button");
        buttonSelectLayer.textContent = "Select";
        buttonSelectLayer.onclick = (e) => {
          console.log("select layer", layer.name);
          this._selectedLayerIdx = layerIdx;
          this._game.eventbus.emit("editor.select_layer", { layer: layer.name });
          this.dirty = true;
          e.stopPropagation();
          e.preventDefault();
        };
        layerDiv.appendChild(buttonSelectLayer);
        layerDiv.appendChild(layerIcons);
        layerDiv.appendChild(layerName);
        this.controlsDiv.appendChild(layerDiv);
      });
      this.dirty = false;
    }
  }
  class WebUiSystem2 extends AbstractGameSystem {
    constructor(game) {
      super(game);
      __publicField(this, "name", "WebUiSystem");
      __publicField(this, "uiDiv");
      __publicField(this, "controlsDiv");
      __publicField(this, "dirty", true);
      __publicField(this, "selectedSpriteImage", null);
      __publicField(this, "thumbSize", 32);
    }
    onLoad() {
      console.log("WebUiSystem.onLoad");
      const uiCanvas = document.createElement("canvas");
      uiCanvas.getContext("2d");
      uiCanvas.width = this._game.width;
      uiCanvas.height = this._game.height;
      const uiDiv = document.createElement("div");
      uiDiv.id = "uiDiv";
      uiDiv.style.position = "absolute";
      uiDiv.style.top = "0px";
      uiDiv.style.left = "0px";
      uiDiv.style.width = "320px";
      uiDiv.style.height = "100vh";
      uiDiv.style.overflowY = "scroll";
      uiDiv.style.backgroundColor = "rgba(30,30,30,0.9)";
      this.uiDiv = uiDiv;
      this._game.$container.appendChild(uiDiv);
      const controlsDiv = document.createElement("div");
      controlsDiv.id = "controlsDiv";
      controlsDiv.style.position = "absolute";
      controlsDiv.style.top = "0px";
      controlsDiv.style.right = "0px";
      controlsDiv.style.width = "320px";
      controlsDiv.style.height = "100vh";
      controlsDiv.style.overflowY = "scroll";
      controlsDiv.style.backgroundColor = "rgba(215,6,6,0.2)";
      this.controlsDiv = controlsDiv;
      this._game.$container.appendChild(controlsDiv);
    }
    onUnload() {
      console.log("WebUiSystem.onUnload");
    }
    start() {
      console.log("WebUiSystem.start");
    }
    stop() {
      console.log("WebUiSystem.stop");
    }
    // public update() {
    //   console.log('WebUiSystem.update')
    // }
    draw() {
      if (!this.dirty) return;
      console.log("WebUiSystem.draw");
      this.uiDiv.innerHTML = "";
      this.dirty = false;
    }
  }
  class TileMap {
    // current selected grid position
    constructor(config, layers = [], components) {
      // readonly assets: any[]
      __publicField(this, "config");
      __publicField(this, "columns");
      __publicField(this, "rows");
      __publicField(this, "tileWidth");
      __publicField(this, "tileHeight");
      __publicField(this, "layers", []);
      __publicField(this, "components");
      __publicField(this, "projection");
      __publicField(this, "activeCellPos", [0, 0]);
      this.config = config;
      this.columns = config.columns;
      this.rows = config.rows;
      this.tileWidth = config.tileSize;
      this.tileHeight = config.tileSize / 2;
      this.layers = layers;
      this.components = new ComponentManager();
      if (components) {
        this.components.restore(components);
      }
      let projection;
      if (config.projection === "isometric") {
        projection = new IsometricGridProjection(this.tileWidth, config.columns, config.rows);
      } else if (config.projection === "orthogonal") {
        projection = new OrthogonalGridProjection(this.tileWidth, config.columns, config.rows);
      } else {
        throw new Error(`Unsupported projection type: ${config.projection}`);
      }
      this.projection = projection;
    }
    // registerAsset(assetType: string, name: string, asset: any) {
    //   this.assets.push({ type: assetType, name, ...asset })
    // }
    addLayer(layerId, layer) {
      this.layers[layerId] = layer;
      const totalCells = this.columns * this.rows;
      if (layer.type === "TILE") {
        layer.data = new Array(totalCells).fill(0);
      } else {
        layer.data = [];
      }
    }
    getLayer(layerId) {
      return this.layers[layerId] || void 0;
    }
    removeLayer(layerId) {
      this.layers.splice(layerId, 1);
    }
    // addTileAtPosition(
    //   layerId: number,
    //   pos: Grid2DPosition | Screen2DPosition,
    //   properties: TileComponentProps,
    // ) {
    //   if ('col' in pos && 'row' in pos) {
    //     this.addTile(layerId, pos.col, pos.row, properties)
    //   } else if ('x' in pos && 'y' in pos) {
    //     const gridPos = this.projection.mapScreenToGrid(pos.x, pos.y)
    //     this.addTile(layerId, gridPos.col, gridPos.row, properties)
    //   }
    // }
    /**
     * Creates a tile at the specified layer, column, and row with the given properties.
     * @param layerId - The ID of the layer to add the tile to.
     * @param col - The column index of the tile.
     * @param row - The row index of the tile.
     * @param properties - Partial properties for the tile.
     * @returns The component ID of the created tile.
     * @deprecated Use assignTile instead
     */
    createTile(layerId, col, row, properties) {
      const defaultProperties = {
        width: this.tileWidth,
        height: this.tileHeight
      };
      const tile = new TileComponent({
        ...defaultProperties,
        ...properties
      });
      const screenPos = this.projection.mapGridToScreen(col, row);
      tile.setPosition(screenPos.x, screenPos.y);
      const componentId = this.components.add(tile);
      console.log("createTile", layerId, col, row, componentId);
      this.setTileLayerData(layerId, col, row, componentId);
      return componentId;
    }
    /**
     * @param layerId
     * @param col
     * @param row
     * @param tile
     * @deprecated Use assignTile instead
     */
    addTile(layerId, col, row, tile) {
      if (!this.layers[layerId]) throw new Error(`Layer ${layerId} does not exist`);
      if (this.layers[layerId].type !== "TILE") {
        throw new Error(`Layer ${layerId} is not of type TILE`);
      }
      const screenPos = this.projection.mapGridToScreen(col, row);
      tile.setPosition(screenPos.x, screenPos.y);
      const componentId = this.components.add(tile);
      this.setTileLayerData(layerId, col, row, componentId);
      this.activeCellPos = [col, row];
      return componentId;
    }
    assignTile(layerId, col, row, componentId) {
      console.log("assignTile", layerId, col, row, componentId);
      if (!this.layers[layerId]) throw new Error(`Layer ${layerId} does not exist`);
      if (this.layers[layerId].type !== "TILE") {
        throw new Error(`Layer ${layerId} is not a TILE`);
      }
      const screenPos = this.projection.mapGridToScreen(col, row);
      const tile = this.components.get(componentId);
      if (!tile) throw new Error(`Entity ${componentId} does not exist`);
      tile.setPosition(screenPos.x, screenPos.y);
      this.setTileLayerData(layerId, col, row, componentId);
      this.activeCellPos = [col, row];
    }
    resetTile(layerId, col, row) {
      console.log("resetTile", layerId, col, row);
      if (!this.layers[layerId]) throw new Error(`Layer ${layerId} does not exist`);
      const cellIdx = getCellIndex(col, row, this.columns);
      this.layers[layerId].data[cellIdx] = 0;
      this.activeCellPos = [col, row];
    }
    getTile(layerId, col, row) {
      const componentId = this.getTileLayerData(layerId, col, row);
      if (!componentId) return void 0;
      this.activeCellPos = [col, row];
      return this.components.get(componentId);
    }
    setTileLayerData(layerIdx, col, row, data) {
      if (!this.layers[layerIdx]) throw new Error(`Layer ${layerIdx} does not exist`);
      const cellIdx = getCellIndex(col, row, this.columns);
      this.layers[layerIdx].data[cellIdx] = data;
    }
    getTileLayerData(layerIdx, col, row) {
      var _a;
      const cellIdx = getCellIndex(col, row, this.columns);
      return ((_a = this.layers[layerIdx]) == null ? void 0 : _a.data[cellIdx]) || void 0;
    }
    // addObject(layerId: number, obj: IGameComponent): number {
    //   const componentId = this.components.add(obj)
    //   this.layers[layerId].data.push(componentId)
    //   return componentId
    // }
    addObjectAtGridPos(layerId, col, row, obj) {
      if (!this.layers[layerId]) throw new Error(`Layer ${layerId} does not exist`);
      if (this.layers[layerId].type !== "OBJECT") {
        throw new Error(
          `Layer ${layerId} is not of type OBJECT. You are trying to add an object to a ${this.layers[layerId].type} layer`
        );
      }
      const screenPos = this.projection.mapGridToScreen(col, row);
      obj.setPosition(screenPos.x, screenPos.y);
      const componentId = this.components.add(obj);
      this.layers[layerId].data.push(componentId);
      this.activeCellPos = [col, row];
      return componentId;
    }
    removeObject(layerId, componentId) {
      if (!this.layers[layerId]) throw new Error(`Layer ${layerId} does not exist`);
      if (this.layers[layerId].type !== "OBJECT") {
        throw new Error(`Layer ${layerId} is not of type OBJECT`);
      }
      const index = this.layers[layerId].data.indexOf(componentId);
      if (index === -1) {
        throw new Error(`Component ID ${componentId} not found in layer ${layerId}`);
      }
      this.layers[layerId].data.splice(index, 1);
      this.components.remove(componentId);
    }
    findObjectsAtGridPos(layerId, col, row) {
      if (!this.layers[layerId]) throw new Error(`Layer ${layerId} does not exist`);
      if (this.layers[layerId].type !== "OBJECT") {
        throw new Error(`Layer ${layerId} is not an OBJECT`);
      }
      const screenPos = this.projection.mapGridToScreen(col, row);
      const { x, y } = screenPos;
      x - this.tileWidth / 2;
      y - this.tileHeight / 2;
      return this.layers[layerId].data.reduce(
        (result, componentId, idx) => {
          const component = this.components.get(componentId);
          if (!component) return result;
          const objX = component.x;
          const objY = component.y;
          if (objX == x && objY == y) {
            result.push(componentId);
          }
          return result;
        },
        []
      );
    }
    // getObject(layerId: number, idx: number): IGameComponent | undefined {
    //   //const componentId = this.objects[layerId][id] || undefined
    //   // const componentId = this.layers[layerId].data[idx] || undefined
    //   // if (!componentId) return undefined
    //   // return this.components.get(componentId)
    //   console.warn('Method getObject is not implemented yet')
    //   return undefined
    // }
    //
    // updateObject(layerId: number, idx: number, component: IGameComponent): void {
    //   // const componentId = this.layers[layerId].data[idx] || undefined
    //   // if (!componentId) throw new Error(`Entity ${idx} does not exist`)
    //   // const entity = this.components.get(componentId)
    //   // if (!entity) throw new Error(`Entity ${idx} does not exist`)
    //   // this.components.set(componentId, component)
    //   console.warn('Method updateObject is not implemented yet')
    // }
    clearLayer(layerId) {
      if (!this.layers[layerId]) throw new Error(`Layer ${layerId} does not exist`);
      if (this.layers[layerId].type === "TILE") {
        const totalCells = this.columns * this.rows;
        this.layers[layerId].data = new Array(totalCells).fill(0);
      } else {
        this.layers[layerId].data = [];
      }
    }
    dump() {
      return {
        config: this.config,
        resources: null,
        layers: this.layers,
        components: this.components.dump()
      };
    }
  }
  const WORLD_EDITOR_CELL_TOGGLE_DEADALIVE = "WORLD_EDITOR_CELL_TOGGLE_DEADALIVE";
  class WorldInstanceEditor {
    constructor(world, canvas) {
      __publicField(this, "world");
      __publicField(this, "canvas");
      __publicField(this, "editMode", WORLD_EDITOR_CELL_TOGGLE_DEADALIVE);
      this.world = world;
      this.canvas = canvas;
    }
    init() {
    }
    unload() {
    }
    // public getWorld() {
    //   return this.world
    // }
    //
    // public setWorld(world: WorldInstance) {
    //   this.world = world
    // }
    setEditMode(editMode) {
      console.log("setEditMode", editMode);
      this.editMode = editMode;
    }
    getCell(x, y) {
      return this.world.getCell(x, y);
    }
    setCell(cell) {
      console.log("setCell", cell);
      this.world.setCell(cell);
    }
    setCellLayer(cell, layer) {
      this.world.setCellLayer(cell, layer);
    }
  }
  exports2.AbstractGameComponent = AbstractGameComponent;
  exports2.AbstractGameSystem = AbstractGameSystem;
  exports2.AnimatedSpriteComponent = AnimatedSpriteComponent;
  exports2.CameraSystem = CameraSystem;
  exports2.ComponentManager = ComponentManager;
  exports2.DebugSystem = DebugSystem;
  exports2.DevPanelSystem = DevPanelSystem;
  exports2.EntitySystem = EntitySystem;
  exports2.EventBus = EventBus;
  exports2.FILL_COLORS = FILL_COLORS;
  exports2.Game = Game;
  exports2.GameResourcesManager = GameResourcesManager;
  exports2.GamepadSystem = GamepadSystem;
  exports2.GenericComponent = GenericComponent;
  exports2.GridLinesSystem = GridLinesSystem;
  exports2.GridSystem = GridSystem;
  exports2.HeroSystem = HeroSystem;
  exports2.InfoSystem = InfoSystem;
  exports2.InputSystem = InputSystem;
  exports2.IsoCharacterComponent = IsoCharacterComponent;
  exports2.IsoCharacterComponent2 = IsoCharacter2Component;
  exports2.IsoCubeComponent = IsoCubeComponent;
  exports2.IsoCylinderComponent = IsoCylinderComponent;
  exports2.IsoHexagonComponent = IsoHexagonComponent;
  exports2.IsoImageComponent = IsoImageComponent;
  exports2.IsoTextComponent = IsoTextComponent;
  exports2.IsometricGridProjection = IsometricGridProjection;
  exports2.KEYBOARD_KEYS = KEYBOARD_KEYS;
  exports2.LineComponent = LineComponent;
  exports2.MovingTileComponent = MovingTileComponent;
  exports2.OrthogonalGridProjection = OrthogonalGridProjection;
  exports2.STROKE_COLORS = STROKE_COLORS;
  exports2.SpriteComponent = SpriteComponent;
  exports2.TextComponent = TextComponent;
  exports2.TileComponent = TileComponent;
  exports2.TileMap = TileMap;
  exports2.TileMapEditorSystem = TileMapEditorSystem;
  exports2.TileMapSystem = TileMapSystem;
  exports2.WebUiSystem2 = WebUiSystem2;
  exports2.WorldInstanceEditor = WorldInstanceEditor;
  exports2.arraySortByName = arraySortByName;
  exports2.degreeToRadian = degreeToRadian;
  exports2.drawIsoTile = drawIsoTile;
  exports2.drawIsometricCube = drawIsometricCube;
  exports2.drawIsometricHexagon = drawIsometricHexagon;
  exports2.fetchImage = fetchImage;
  exports2.fetchSpritesheetAtlas = fetchSpritesheetAtlas;
  exports2.findCellNeighbors = findCellNeighbors;
  exports2.getCellIndex = getCellIndex;
  exports2.getGridPosFromIndex = getGridPosFromIndex;
  exports2.isometricGridToScreen = isometricGridToScreen;
  exports2.isometricScreenToGrid = isometricScreenToGrid;
  exports2.orthogonalGridToScreen = orthogonalGridToScreen;
  exports2.orthogonalScreenToGrid = orthogonalScreenToGrid;
  exports2.randomColor = randomColor;
  exports2.zoomCameraAt = zoomCameraAt;
  Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" });
});
