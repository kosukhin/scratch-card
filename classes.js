"use strict";

const commonOf =
  (classRef) =>
  (...args) =>
    new classRef(...args);

// --- Рендеринг на канвас ---
/**
 * Представитель канвы
 */
class Canvas {
  static of = commonOf(Canvas);
  #element;
  #selector;
  #context;

  /**
   * @param {string} selector
   */
  constructor(selector) {
    this.#selector = selector;
  }

  element() {
    if (!this.#element) {
      this.#element = document.querySelector(this.#selector);
    }

    return this.#element;
  }

  context() {
    if (!this.#context) {
      this.#context = this.element().getContext("2d", {
        willReadFrequently: true,
      });
    }

    return this.#context;
  }
}

/**
 * Представитель базового объекта канвы
 */
class CanvasObject {
  _top;
  _left;

  constructor(top, left) {
    this._top = top;
    this._left = left;
  }

  render() {
    console.log("nothing to render");
  }

  position() {
    return [this._top, this._left];
  }

  move(newTopFn, newLeftFn) {
    this._top = newTopFn(this._top);
    this._left = newLeftFn(this._left);
    return this;
  }
}

class FPS {
  static of = commonOf(FPS);
  #fps;

  constructor(fps) {
    this.#fps = fps;
  }

  ms() {
    return 1000 / this.#fps;
  }
}

/**
 * Представитель квадрата
 */
class Rect extends CanvasObject {
  static of = commonOf(Rect);
  #width;
  #height;
  #color;

  /**
   * @param {string} color
   * @param {number} width
   * @param {number} height
   * @param {number} top
   * @param {number} left
   */
  constructor(width, height, top, left, color = "black") {
    super(top, left);
    this.#color = color;
    this.#width = width;
    this.#height = height;
  }

  render(canvas) {
    const ctx = canvas.context();
    ctx.fillStyle = this.#color;
    ctx.fillRect(this._left, this._top, this.#width, this.#height);
  }
}

class Circle extends CanvasObject {
  static of = commonOf(Circle);
  #radius;
  #color;

  constructor(radius, top, left, color = 'black') {
    super(top, left);
    this.#radius = radius;
    this.#color = color;
  }

  render(canvas) {
    const ctx = canvas.context();
    ctx.beginPath();
    ctx.arc(this._left, this._top, this.#radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = this.#color;
    ctx.fill();
  }
}

/**
 * Решает задачу сбора объектов
 */
class Scene {
  static of = commonOf(Scene);
  #canvasObjects;
  #canvas;

  /**
   * @param {Canvas} canvas
   * @param {CanvasObject[]} canvasObjects
   */
  constructor(canvas) {
    this.#canvas = canvas;
    this.#canvasObjects = new Map();
  }

  /**
   * @param {CanvasObject} object
   * @returns
   */
  addObject(object) {
    this.#canvasObjects.set(object, object);
    return this;
  }

  removeObject(object) {
    this.#canvasObjects.delete(object);
  }

  render() {
    const ctx = this.#canvas.context();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const objectsIterator = this.#canvasObjects[Symbol.iterator]();
    for (const [object] of objectsIterator) {
      object.render(this.#canvas);
    }
    return this;
  }
}

/**
 * Представитель логики инициации рендеринга 1ого фрейма
 */
class Ticker {
  static of = commonOf(Ticker);
  #delayMs;
  #tickFn;

  constructor(delayMs, tickFn) {
    this.#delayMs = delayMs;
    this.#tickFn = tickFn;
  }

  delayMs() {
    return this.#delayMs;
  }

  run() {
    requestAnimationFrame(() => {
      this.#tickFn();
      setTimeout(this.run.bind(this), this.#delayMs);
    });
  }
}

/**
 * Представление для логики удаления объекта спустя время.
 */
class RemoveAfterDelay extends CanvasObject {
  static of = commonOf(RemoveAfterDelay);
  #targetObject;
  #removeDelay;
  #firstRenderTime;
  #scene;

  /**
   * @param {CanvasObject} targetObject
   * @param {Scene} scene
   * @param {number} removeDelay
   */
  constructor(targetObject, scene, removeDelay) {
    super(...targetObject.position());
    this.#targetObject = targetObject;
    this.#removeDelay = removeDelay;
    this.#scene = scene;
  }

  render(canvas) {
    if (!this.#firstRenderTime) {
      this.#firstRenderTime = new Date().getTime();
    }

    const now = new Date().getTime();

    if (now - this.#firstRenderTime < this.#removeDelay) {
      this.#targetObject.render(canvas);
    } else {
      this.#scene.removeObject(this.#targetObject);
      this.#scene.removeObject(this);
    }

    return this;
  }
}

/**
 * Представитель объекта, который падает
 */
class FallAnimation extends CanvasObject {
  static of = commonOf(FallAnimation);
  #targetObject;
  #distancePerTick;
  #ticker;

  /**
   * @param {CanvasObject} targetObject
   * @param {Ticker} ticker
   * @param {number} distancePerTick
   */
  constructor(targetObject, ticker, distancePerTick = 16) {
    super(...targetObject.position());
    this.#targetObject = targetObject;
    this.#distancePerTick = distancePerTick;
    this.#ticker = ticker;
  }

  render(canvas) {
    const tickerDelayMs = this.#ticker.delayMs();
    this.#targetObject.move(
      (top) => top + tickerDelayMs / this.#distancePerTick,
      (left) => left
    );
    this.#targetObject.render(canvas);
    return this;
  }
}

// --- Общее управление событиями ---
/**
 * Представление устройства указателя
 */
class Pointer {
  static of = commonOf(Pointer);
  #originalEvent;

  constructor(originalEvent) {
    this.#originalEvent = originalEvent;
  }

  offset() {
    return [this.#originalEvent?.offsetY, this.#originalEvent?.offsetX];
  }
}

/**
 * Представление адаптера на основе функции
 */
class FnAdapter {
  static of = commonOf(FnAdapter);
  #fn;

  constructor(fn) {
    this.#fn = fn;
  }

  adapted(event) {
    return this.#fn(event);
  }
}

/**
 * Представление события на канвасе
 */
class CanvasEvent {
  static of = commonOf(CanvasEvent);
  #handlers;
  #canvas;
  #eventName;

  /**
   * @param {Canvas} canvas
   * @param {string} eventName
   * @param {Function[]} handlers
   */
  constructor(canvas, eventName, handlers) {
    this.#handlers = handlers;
    this.#canvas = canvas;
    this.#eventName = eventName;
  }

  /**
   * @param {FnAdapter} eventAdapter
   * @returns
   */
  watchEvent(adapter) {
    this.#canvas.element().addEventListener(this.#eventName, (event) => {
      this.#handlers.forEach((handler) => {
        handler.do(adapter.adapted(event));
      });
    });
    return this;
  }
}

/**
 * Представление обработчика на основе функции
 */
class Handler {
  static of = commonOf(Handler);
  #fn;

  constructor(fn) {
    this.#fn = fn;
  }

  do(...args) {
    return this.#fn(...args);
  }
}

class Range {
  static of = commonOf(Range);
  #from;
  #to;

  /**
   *
   * @param {number} from
   * @param {number} to
   */
  constructor(from, to) {
    this.#from = from;
    this.#to = to;
  }

  array() {
    const result = [];
    for (let i = this.#from; i <= this.#to; i++) {
      result.push(i);
    }

    return result;
  }
}

// !-- Общее управление событиями ---

// !-- Более сложные групповые элементы ---

class Sand extends CanvasObject {
  static of = commonOf(Sand);
  #ticker;
  #scene;
  #size = 1;
  #width = 50;
  #removeDelay = 500;
  #colors = ['#222', '#444', '#666', '#888', '#aaa', '#ccc']

  constructor(ticker, scene, top, left) {
    super(top, left);
    this.#ticker = ticker;
    this.#scene = scene;
  }

  render() {
    const speed = 4;
    const dist = 30;
    this.#renderStream(10, dist, speed);
    this.#renderStream(10, dist, speed);
    this.#renderStream(10, dist, speed);
    this.#renderStream(10, dist, speed);
    this.#renderStream(10, dist, speed);
    this.#scene.removeObject(this);

    return this;
  }

  #renderStream(parts, partsDelay, speedRange) {
    let nextDelay = 0;
    const delays = Range.of(1, parts)
      .array()
      .map((item) => {
        const result = nextDelay + Math.random() * partsDelay;
        nextDelay += partsDelay;
        return result;
      });
    delays.forEach((delay) => {
      setTimeout(() => {
        const rect = Circle.of(
          1 + Math.random() * this.#size,
          this._top,
          this._left + Math.random() * this.#width,
          this.#colors[Math.floor(Math.random() * this.#colors.length)]
        );
        const fallingRect = FallAnimation.of(
          rect,
          this.#ticker,
          speedRange + Math.random() + speedRange
        );
        const removable = RemoveAfterDelay.of(
          fallingRect,
          this.#scene,
          this.#removeDelay + Math.random() * this.#removeDelay
        );
        this.#scene.addObject(removable);
      }, delay * 10);
    });
  }
}
