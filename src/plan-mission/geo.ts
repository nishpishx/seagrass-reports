// ═══ Geometry Utilities for Mission Planning ═══

const DEG_TO_M = 111_320; // meters per degree of latitude

/**
 * Compute a closed rectangle boundary (5 points) from a center point,
 * rotation angle, and dimensions in meters.
 *
 * @param center  [lng, lat] center of the rectangle
 * @param angleDeg  rotation angle in degrees (0 = north-aligned, CW positive)
 * @param lengthM   length in meters (along the rotated "up" axis)
 * @param widthM    width in meters (perpendicular to length)
 * @returns Closed polygon ring: [[lng,lat], …, [lng,lat]] (5 points, first === last)
 */
export function computeRectBoundary(
  center: [number, number],
  angleDeg: number,
  lengthM: number,
  widthM: number,
): [number, number][] {
  const [cLng, cLat] = center;
  const rad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

  // Meters → degrees conversion (longitude shrinks with latitude)
  const mToLat = 1 / DEG_TO_M;
  const mToLng = 1 / (DEG_TO_M * Math.cos((cLat * Math.PI) / 180));

  const halfL = lengthM / 2;
  const halfW = widthM / 2;

  // Local corners (x = east, y = north) before rotation
  const corners: [number, number][] = [
    [-halfW, halfL],
    [halfW, halfL],
    [halfW, -halfL],
    [-halfW, -halfL],
  ];

  // Rotate and convert to lng/lat
  const ring: [number, number][] = corners.map(([x, y]) => {
    const rx = x * cosA - y * sinA; // rotated east
    const ry = x * sinA + y * cosA; // rotated north
    return [cLng + rx * mToLng, cLat + ry * mToLat];
  });

  // Close the ring
  ring.push([...ring[0]] as [number, number]);
  return ring;
}

/**
 * Compute the centroid of a polygon boundary (ignoring the closing duplicate).
 */
export function computePolygonCenter(boundary: [number, number][]): [number, number] {
  // Exclude the closing point if boundary is closed
  const pts =
    boundary.length > 1 &&
    boundary[0][0] === boundary[boundary.length - 1][0] &&
    boundary[0][1] === boundary[boundary.length - 1][1]
      ? boundary.slice(0, -1)
      : boundary;

  let lng = 0;
  let lat = 0;
  for (const [x, y] of pts) {
    lng += x;
    lat += y;
  }
  return [lng / pts.length, lat / pts.length];
}
