function finite(value, name) {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
  return value;
}

function validateBoundary(points, name) {
  if (!Array.isArray(points) || points.length < 2) {
    throw new RangeError(`${name} needs at least two points`);
  }
  for (let index = 1; index < points.length; index += 1) {
    if (!(points[index - 1].y < points[index].y)) {
      throw new RangeError(`${name} y coordinates must increase strictly`);
    }
  }
}

export function interpolateBoundary(points, y, name = "boundary") {
  validateBoundary(points, name);
  finite(y, "surface y");
  if (y < points[0].y || y > points.at(-1).y) {
    throw new RangeError(`${name} does not cover surface y`);
  }
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (y <= current.y) {
      const fraction = (y - previous.y) / (current.y - previous.y);
      return previous.x + fraction * (current.x - previous.x);
    }
  }
  return points.at(-1).x;
}

export function buildUprightLiquidGeometry({ geometry, surfaceY }) {
  const visualSurface = geometry.surface;
  const leftX = interpolateBoundary(geometry.sideBoundary.left, surfaceY, "left cavity boundary");
  const rightX = interpolateBoundary(geometry.sideBoundary.right, surfaceY, "right cavity boundary");
  const leftBottom = geometry.sideBoundary.left.at(-1);
  const rightBottom = geometry.sideBoundary.right.at(-1);
  const width = rightX - leftX;
  if (!(width > 0)) throw new RangeError("liquid surface width must be positive");

  const quarter = width * 0.25;
  const rearY = surfaceY - visualSurface.rearArcRisePx;
  const frontY = surfaceY + visualSurface.frontArcDropPx;
  const surfacePath = [
    `M ${leftX.toFixed(2)} ${surfaceY.toFixed(2)}`,
    `C ${(leftX + quarter).toFixed(2)} ${rearY.toFixed(2)} ${(rightX - quarter).toFixed(2)} ${rearY.toFixed(2)} ${rightX.toFixed(2)} ${surfaceY.toFixed(2)}`,
    `C ${(rightX - quarter).toFixed(2)} ${frontY.toFixed(2)} ${(leftX + quarter).toFixed(2)} ${frontY.toFixed(2)} ${leftX.toFixed(2)} ${surfaceY.toFixed(2)} Z`,
  ].join(" ");
  const rearMeniscusPath = `M ${leftX.toFixed(2)} ${surfaceY.toFixed(2)} C ${(leftX + quarter).toFixed(2)} ${rearY.toFixed(2)} ${(rightX - quarter).toFixed(2)} ${rearY.toFixed(2)} ${rightX.toFixed(2)} ${surfaceY.toFixed(2)}`;
  const frontMeniscusPath = `M ${leftX.toFixed(2)} ${surfaceY.toFixed(2)} C ${(leftX + quarter).toFixed(2)} ${frontY.toFixed(2)} ${(rightX - quarter).toFixed(2)} ${frontY.toFixed(2)} ${rightX.toFixed(2)} ${surfaceY.toFixed(2)}`;
  const bottomWidth = rightBottom.x - leftBottom.x;
  const liquidBodyPath = [
    `M ${leftX.toFixed(2)} ${surfaceY.toFixed(2)}`,
    `C ${(leftX + quarter).toFixed(2)} ${rearY.toFixed(2)} ${(rightX - quarter).toFixed(2)} ${rearY.toFixed(2)} ${rightX.toFixed(2)} ${surfaceY.toFixed(2)}`,
    `L ${rightBottom.x.toFixed(2)} ${rightBottom.y.toFixed(2)}`,
    `C ${(rightBottom.x - bottomWidth * 0.18).toFixed(2)} ${(rightBottom.y + 26).toFixed(2)} ${(leftBottom.x + bottomWidth * 0.18).toFixed(2)} ${(leftBottom.y + 26).toFixed(2)} ${leftBottom.x.toFixed(2)} ${leftBottom.y.toFixed(2)}`,
    `L ${leftX.toFixed(2)} ${surfaceY.toFixed(2)} Z`,
  ].join(" ");

  return Object.freeze({
    surfaceY,
    leftX,
    rightX,
    liquidBodyPath,
    surfacePath,
    rearMeniscusPath,
    frontMeniscusPath,
  });
}
