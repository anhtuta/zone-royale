/**
 * Static map data types: obstacles, houses and ground decoration.
 *
 * @packageDocumentation
 */

/** An axis-aligned wall segment (house walls). Blocks movement, bullets and sight. */
export interface WallObstacle {
  /** Discriminator. */
  readonly t: 'wall';
  /** Left edge. */
  readonly x: number;
  /** Top edge. */
  readonly y: number;
  /** Width. */
  readonly w: number;
  /** Height. */
  readonly h: number;
}

/** A round boulder. Blocks movement, bullets and sight. */
export interface RockObstacle {
  /** Discriminator. */
  readonly t: 'rock';
  /** Centre X. */
  readonly x: number;
  /** Centre Y. */
  readonly y: number;
  /** Collision radius. */
  readonly r: number;
  /** Per-rock brightness offset for visual variety. */
  readonly shade: number;
}

/** A tree: a small solid trunk with a larger canopy drawn above entities. */
export interface TreeObstacle {
  /** Discriminator. */
  readonly t: 'tree';
  /** Centre X. */
  readonly x: number;
  /** Centre Y. */
  readonly y: number;
  /** Trunk (collision) radius. */
  readonly r: number;
  /** Canopy (visual) radius. */
  readonly vr: number;
  /** Per-tree brightness offset for visual variety. */
  readonly shade: number;
}

/** Any solid map obstacle. */
export type Obstacle = WallObstacle | RockObstacle | TreeObstacle;

/** Circular obstacles (rocks and trees). */
export type CircleObstacle = RockObstacle | TreeObstacle;

/** A house footprint (its walls are separate {@link WallObstacle}s). */
export interface House {
  /** Left edge. */
  readonly x: number;
  /** Top edge. */
  readonly y: number;
  /** Width. */
  readonly w: number;
  /** Height. */
  readonly h: number;
}

/** A purely cosmetic ground speck (flowers, dirt). */
export interface Decor {
  /** Left edge. */
  readonly x: number;
  /** Top edge. */
  readonly y: number;
  /** Size of the square in pixels. */
  readonly s: number;
  /** CSS fill color. */
  readonly c: string;
}

/** Everything produced by map generation. */
export interface GameMap {
  /** All solid obstacles (walls, rocks, trees). */
  readonly obstacles: Obstacle[];
  /** House footprints. */
  readonly houses: House[];
  /** Cosmetic decoration. */
  readonly decor: Decor[];
}
