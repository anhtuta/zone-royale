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
  /** Centre X of the collision circle. */
  readonly x: number;
  /** Centre Y of the collision circle. */
  readonly y: number;
  /** Collision radius. */
  readonly r: number;
  /** Sprite variant index (`config/obstacleSprites.ts`), chosen once in mapgen. */
  readonly variant: number;
  /** Per-rock brightness offset for visual variety. */
  readonly shade: number;
}

/*
- r = how wide is the trunk for rules? It's used for movement, bullets, line-of-sight, loot clearance, minimap/debug.
- vr = how big does this tree look on screen? It's used for drawing and culling only.
Trees split the two because the design is a small solid trunk and a much larger canopy drawn on top of entities for cover.
*/
/** A tree: a small solid trunk with a larger canopy drawn above entities. */
export interface TreeObstacle {
  /** Discriminator. */
  readonly t: 'tree';
  /** Centre X of the trunk collision circle (same convention as {@link RockObstacle}). */
  readonly x: number;
  /** Centre Y of the trunk collision circle. */
  readonly y: number;
  /** Trunk (collision) radius. */
  readonly r: number;
  /** Canopy (visual) radius. */
  readonly vr: number;
  /** Sprite variant index (`config/obstacleSprites.ts`), chosen once in mapgen. */
  readonly variant: number;
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
