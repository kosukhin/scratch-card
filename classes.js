"use strict";

const commonOf =
  (classRef) =>
  (...args) =>
    new classRef(...args);

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
    this._top = newTopFn(this._top, this._left);
    this._left = newLeftFn(this._left, this._top);
    return this;
  }
}

class PrimitiveAware {
  computeValue() {
    throw Error("not implemented!");
  }

  valueOf() {
    return this.computeValue();
  }

  toString() {
    return this.computeValue();
  }
}

class BinaryOperation extends PrimitiveAware {
  _operandOne;
  _operandTwo;

  constructor(operandOne, operandTwo) {
    super();
    this._operandOne = Number(operandOne);
    this._operandTwo = Number(operandTwo);
  }
}

class UnaryOperation extends PrimitiveAware {
  _operand;

  constructor(operand) {
    super();
    this._operand = operand;
  }
}

class RandomNumber extends BinaryOperation {
  static of = commonOf(RandomNumber);

  computeValue() {
    return this._operandOne + Math.random() * this._operandTwo;
  }
}

class RoundNumber extends UnaryOperation {
  static of = commonOf(RoundNumber);

  computeValue() {
    return Math.round(this._operand);
  }
}

class FloorNumber extends UnaryOperation {
  static of = commonOf(FloorNumber);

  computeValue() {
    return Math.floor(this._operand);
  }
}

class BottomLimitNumber extends BinaryOperation {
  static of = commonOf(BottomLimitNumber);

  constructor(limit, value) {
    super(limit, value);
  }

  computeValue() {
    return this._operandTwo < this._operandOne
      ? this.operandOne
      : this._operandTwo;
  }
}

class Division extends BinaryOperation {
  static of = commonOf(Division);

  computeValue() {
    return this._operandOne / this._operandTwo;
  }
}

class Sum extends BinaryOperation {
  static of = commonOf(Sum);

  computeValue() {
    return this._operandOne + this._operandTwo;
  }
}

class Mul extends BinaryOperation {
  static of = commonOf(Mul);

  computeValue() {
    return this._operandOne * this._operandTwo;
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

  constructor(radius, top, left, color = "black") {
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

class FallParabolicAnimation extends CanvasObject {
  static of = commonOf(FallParabolicAnimation);
  #targetObject;
  #distancePerTick;
  #ticker;
  #initialTop;
  #parabolicConstant;

  /**
   * @param {CanvasObject} targetObject
   * @param {Ticker} ticker
   * @param {number} distancePerTick
   */
  constructor(
    targetObject,
    ticker,
    distancePerTick = 16,
    parabolicConstant = 10
  ) {
    super(...targetObject.position());
    this.#targetObject = targetObject;
    this.#distancePerTick = distancePerTick;
    this.#ticker = ticker;
    this.#initialTop = this._top;
    this.#parabolicConstant = parabolicConstant;
  }

  render(canvas) {
    const tickerDelayMs = this.#ticker.delayMs();
    const nextStep = tickerDelayMs / this.#distancePerTick;
    this.#targetObject.move(
      (top) => top + nextStep,
      (left, top) => {
        const deltaFromInitial = top - this.#initialTop;
        return left + (this.#parabolicConstant * 2) / deltaFromInitial;
      }
    );
    this.#targetObject.render(canvas);
    return this;
  }
}

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

class CanvasEvent {
  static of = commonOf(CanvasEvent);
  /**
   * @type {Function[]}
   */
  #handlers;
  /**
   * @type {Canvas}
   */
  #canvas;
  /**
   * @type {string}
   */
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

class Handler {
  static of = commonOf(Handler);
  #fn;

  /**
   * @param {Function} fn
   */
  constructor(fn) {
    this.#fn = fn;
  }

  do(...args) {
    return this.#fn(...args);
  }
}

class Timeout extends Handler {
  static of = commonOf(Timeout);

  /**
   * @param {Function} fn
   * @param {number} delay
   */
  constructor(fn, delay) {
    super(setTimeout.bind(null, fn, delay));
  }
}

class Range {
  static of = commonOf(Range);
  /**
   * @type {number}
   */
  #from;
  /**
   * @type {number}
   */
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

class SandStream extends CanvasObject {
  static of = commonOf(SandStream);
  /**
   * @type {number}
   */
  #size = 1;
  /**
   * @type {number}
   */
  #width = 50;
  /**
   * @type {Ticker}
   */
  #ticker;
  /**
   * @type {Scene}
   */
  #scene;
  /**
   * @type {number}
   */
  #removeDelay = 500;
  /**
   * @type {string[]}
   */
  #colors = ["#222"];

  /**
   * @param {string[]} colors
   * @param {number} width
   * @param {Ticker} ticker
   * @param {Scene} scene
   * @param {number} top
   * @param {number} left
   */
  constructor(
    colors,
    width,
    ticker,
    scene,
    top,
    left
  ) {
    super(top, left);
    this.#colors = colors;
    this.#width = width;
    this.#ticker = ticker;
    this.#scene = scene;
  }

  scene() {
    return this.#scene;
  }

  /**
   * @param {number} parts
   * @param {number} partsDelay
   * @param {number} speedRange
   */
  render(parts, partsDelay, speedRange) {
    let nextDelay = 0;
    const delays = Range.of(1, parts)
      .array()
      .map(() => {
        const result = Sum.of(nextDelay, RandomNumber.of(0, partsDelay));
        nextDelay += partsDelay;
        return result;
      });
    delays.forEach((delay) => {
      Timeout.of(() => {
        const figure = Circle.of(
          RandomNumber.of(1, this.#size),
          this._top,
          Sum.of(this._left, RandomNumber.of(0, this.#width)),
          this.#colors[FloorNumber.of(RandomNumber.of(0, this.#colors.length))]
        );
        const fallingRect = FallParabolicAnimation.of(
          figure,
          this.#ticker,
          RandomNumber.of(speedRange, Mul.of(speedRange, 2)),
          Mul.of(RandomNumber.of(-1, 2), 16)
        );
        const removable = RemoveAfterDelay.of(
          fallingRect,
          this.#scene,
          RandomNumber.of(this.#removeDelay, this.#removeDelay * 2)
        );
        this.#scene.addObject(removable);
      }, Mul.of(delay, 10)).do();
    });
  }
}

class Sand extends CanvasObject {
  static of = commonOf(Sand);
  /**
   * @type {number}
   */
  #partsCount = 10;
  /**
   * @type {number}
   */
  #streamsCount = 1;
  /**
   * @type {SandStream}
   */
  #sandStream;

  /**
   * @param {SandStream} sandStream
   * @param {number} partsCount
   * @param {number} streamsCount
   */
  constructor(
    sandStream,
    partsCount,
    streamsCount,
  ) {
    super(...sandStream.position());
    this.#partsCount = partsCount;
    this.#streamsCount = streamsCount;
    this.#sandStream = sandStream;
  }

  render() {
    const speed = 4;
    const dist = 30;
    const partsForStream = RoundNumber.of(
      Division.of(this.#partsCount, this.#streamsCount)
    );
    Range.of(1, this.#streamsCount)
      .array()
      .forEach(() => {
        this.#sandStream.render(partsForStream, dist, speed);
      });

    this.#sandStream.scene().removeObject(this);

    return this;
  }
}
