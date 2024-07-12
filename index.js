const canvasCtxBuilding = (inCanvasOptions) => {
  const canvasElement =
    inCanvasOptions.canvasElement ?? document.createElement("canvas");

  return canvasElement.getContext("2d", { willReadFrequently: true });
};

const truthy = (inExpressionResult, inTruthyFn) => {
  return inExpressionResult ? inTruthyFn() : undefined;
};

const drawCanvasImage = (inCanvasCtx, inBuildImageFn, inDrawOptions = {}) => {
  inBuildImageFn().then((image) => {
    inCanvasCtx.drawImage(
      image,
      inDrawOptions.left ?? 0,
      inDrawOptions.top ?? 0
    );
  });
};

const drawCanvasImageRotated = (
  inCanvasCtx,
  inBuildImageFn,
  inDrawOptions = {}
) => {
  inBuildImageFn().then((image) => {
    inCanvasCtx.save();
    inCanvasCtx.translate(inDrawOptions.left, inDrawOptions.top);
    const degrees = inDrawOptions.degrees ?? 0;
    inCanvasCtx.rotate((degrees * Math.PI) / 180);
    inCanvasCtx.drawImage(image, 0, 0);
    inCanvasCtx.restore();
  });
};

const canvasFilledPixelsCount = (inCanvasCtx) => {
  const inImagePixels = inCanvasCtx.getImageData(
    0,
    0,
    inCanvasCtx.canvas.width,
    inCanvasCtx.canvas.height
  );
  let filledPixelsCount = 0;

  for (let i = 0; i < inImagePixels.data.length; i += 4) {
    if (
      inImagePixels.data[i] === 0 &&
      inImagePixels.data[i + 1] === 0 &&
      inImagePixels.data[i + 2] === 0 &&
      inImagePixels.data[i + 3] === 0
    ) {
      filledPixelsCount++;
    }
  }

  return filledPixelsCount;
};

const canvasFilledPixelsPercent = (inCanvasCtx, inFilledPixelsCount) => {
  return (
    inFilledPixelsCount >= 1
      ? (inFilledPixelsCount /
          (inCanvasCtx.canvas.width * inCanvasCtx.canvas.height)) *
        100
      : 0
  ).toPrecision(2);
};

const handleUserEvent = (inElement, inEventName, inHandlerFn) => {
  inElement.addEventListener(inEventName, inHandlerFn);
};

const removeUserEvent = (inElement, inEventName, inHandlerFn) => {
  inElement.removeEventListener(inEventName, inHandlerFn);
};

const buildPositionFromTouchEvent = (inEvent) => {
  return {
    x: inEvent.targetTouches[0].clientX - inEvent.target.offsetLeft,
    y: inEvent.targetTouches[0].clientY - inEvent.target.offsetTop,
  };
};

const buildPositionFromEvent = (inEvent) => {
  return inEvent.targetTouches?.[0]
    ? buildPositionFromTouchEvent(inEvent)
    : { x: inEvent.offsetX ?? 0, y: inEvent.offsetY ?? 0 };
};

const throttle = (inFn, inTime) => {
  const noResult = Symbol("no-result");
  let lastCallTime = new Date().getTime();
  let lastResult = noResult;
  const updateResults = (in2Now, in2NewResult) => {
    lastCallTime = in2Now;
    lastResult = in2NewResult;
  };
  return (...args) => {
    const now = new Date().getTime();
    const newResult =
      lastResult === noResult || now - lastCallTime > inTime
        ? inFn(...args)
        : noResult;
    truthy(newResult !== noResult, updateResults.bind(null, now, newResult));
    return lastResult;
  };
};

const loadImageByUrl = (inUrl) =>
  new Promise((resolve, reject) => {
    const pic = new Image();
    pic.crossOrigin = "anonymous";
    pic.src = inUrl;
    pic.onload = resolve.bind(null, pic);
    pic.onerror = reject.bind(null, "Ошибка загрузки изображеия");
  });

const scratchStopHandler = (
  inOptions,
  inScratchMoveHandler,
  inScratchStopHandler
) => {
  removeUserEvent(
    inOptions.canvasElement,
    inOptions.events.move,
    inScratchMoveHandler
  );
  removeUserEvent(
    inOptions.canvasElement,
    inOptions.events.end,
    inScratchStopHandler
  );
};

const scratchPercentReachedHandler = throttle((inOptions) => {
  if (inOptions.reachPercent && inOptions.reachPercentHandler) {
    const inPercent = canvasFilledPixelsPercent(
      inOptions.canvasCtx,
      canvasFilledPixelsCount(inOptions.canvasCtx)
    );
    if (inPercent >= inOptions.reachPercent) {
      inOptions.reachPercentHandler(inPercent);
    }

    return inPercent;
  }

  return null;
}, 100);

const renderDustAnimation = throttle(() => {
  console.log('dust');
}, 500)

const scratchMoveHandler = throttle((inOptions, inEvent) => {
  inEvent.stopImmediatePropagation();
  inEvent.preventDefault();
  const inRandomImage = inOptions.scratchImages.then(
    throttle((images) => {
      return images[Math.floor(Math.random() * images.length)];
    }, 3000)
  );
  let lastClearPercent = 0;

  requestAnimationFrame(() => {
    const inPercent = scratchPercentReachedHandler(inOptions);
    if (lastClearPercent !== inPercent) {
      renderDustAnimation();
    }

    inOptions.canvasCtx.globalCompositeOperation = "destination-out";
    inOptions.canvasCtx.save();
    const position = buildPositionFromEvent(inEvent);
    inRandomImage.then((image) => {
      drawCanvasImageRotated(
        inOptions.canvasCtx,
        () => Promise.resolve(image),
        {
          top: position.y - image.height / 2,
          left: position.x - image.width / 2,
          width: image.width,
          height: image.height,
          degrees: Math.floor(Math.random() * 30),
        }
      );
    });
    inOptions.canvasCtx.restore();
  });
}, 16);

const scratchStartHandler = (inOptions) => {
  const inMoveHandler = scratchMoveHandler.bind(null, inOptions);
  const inStopHandler = () => {
    return scratchStopHandler(inOptions, inMoveHandler, inStopHandler);
  };
  handleUserEvent(inOptions.canvasElement, inOptions.events.start, () => {
    handleUserEvent(
      inOptions.canvasElement,
      inOptions.events.move,
      inMoveHandler
    );
    handleUserEvent(
      inOptions.canvasElement,
      inOptions.events.end,
      inStopHandler
    );
  });
  handleUserEvent(window, inOptions.events.end, inStopHandler);
};

const canvasTouchActionDisable = (inCanvasElement) => {
  inCanvasElement.style.touchAction = "none";
};

const scratch = (inOptions) => {
  const inCanvasCtx = canvasCtxBuilding({
    canvasElement: inOptions.canvasElement,
  });
  canvasTouchActionDisable(inOptions.canvasElement);
  drawCanvasImage(inCanvasCtx, loadImageByUrl.bind(null, inOptions.image), {
    degrees: 0,
  });

  scratchStartHandler({
    ...inOptions,
    canvasCtx: inCanvasCtx,
    events: {
      start: "mousedown",
      move: "mousemove",
      end: "mouseup",
    },
  });

  scratchStartHandler({
    ...inOptions,
    canvasCtx: inCanvasCtx,
    events: {
      start: "touchstart",
      move: "touchmove",
      end: "touchend",
    },
  });
};

const once = (inFn) => {
  const inNoResult = Symbol("no-result");
  let inCallResult = inNoResult;
  return (...in2Args) => {
    truthy(inCallResult === inNoResult, () => {
      inCallResult = inFn(...in2Args);
    });
    return inCallResult;
  };
};

// Клиентский код
scratch({
  canvasElement: document.querySelector(".the-card-canvas"),
  image: "https://placehold.co/450x300/31343C/EEE",
  reachPercent: 60,
  reachPercentHandler: once((percent) => {
    console.log("percent reached", percent);
    console.log("Вы выиграли!");
  }),
  scratchImages: Promise.all([
    // loadImageByUrl("./rect.svg"),

    loadImageByUrl("./one.svg"),
    loadImageByUrl("./two.svg"),
    loadImageByUrl("./three.svg"),
    loadImageByUrl("./four.svg"),
    loadImageByUrl("./five.svg"),
    loadImageByUrl("./six.svg"),
    loadImageByUrl("./seven.svg"),
    loadImageByUrl("./eight.svg"),
  ]),
});
