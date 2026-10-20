export type Point = [number, number];
export type PaintColor = 'shiro' | 'kiiro' | 'daidai' | 'aka' | 'momo' | 'kimidori' | 'midori' | 'mizu' | 'ao' | 'murasaki' | 'chairo' | 'kuro';
export type Color = PaintColor | 'water';
export type Tool = 'pencil' | 'crayon' | 'oil-pastel' | 'brush-round' | 'brush-flat' | 'waribashi' | 'finger' | 'tissue' | 'cotton' | 'bamboo' | 'sponge' | 'net-brush' | 'eraser';
export type SceneSprite = 'circle' | 'ellipse' | 'triangle' | 'square' | 'rect' | 'rectangle' | 'apple' | 'dog' | 'leaf' | 'tree' | 'house' | 'flower' | 'mountain' | 'cloud' | 'sun' | 'person' | 'face' | 'palette' | 'water-cup' | 'cloth' | 'paper' | 'tube' | 'paint-tube' | 'tray' | 'straw' | 'net' | 'brush';
export type SceneItem = Tool | SceneSprite;
export type Pressure = number | Point[];
export type RegionShape =
  | { shape: 'rect'; x: number; y: number; w: number; h: number }
  | { shape: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { shape: 'circle'; cx: number; cy: number; r: number }
  | { shape: 'polygon'; points: Point[] };
export type Region = RegionShape | { ref: string };
export type Path =
  | { points: Point[] }
  | { subpaths: Point[][] }
  | { d: string }
  | { gen: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { gen: 'wave'; x: number; y: number; w: number; amplitude: number; cycles: number }
  | { gen: 'zigzag'; x: number; y: number; w: number; amplitude: number; cycles: number }
  | { gen: 'spiral'; cx: number; cy: number; r: number; turns: number }
  | { gen: 'dots'; x: number; y: number; w: number; count: number }
  | { gen: 'burst'; cx: number; cy: number; r: number; rays: number }
  | { gen: 'rectangle'; x: number; y: number; w: number; h: number }
  | { gen: 'leaf'; cx: number; cy: number; rx: number; ry: number }
  | { gen: 'ellipse'; cx: number; cy: number; rx: number; ry: number };
export interface ActionBase { id: string; t: number; dur: number }
export type Action =
  | (ActionBase & { type: 'hand.enter'; tool: Tool; from?: 'kiki' })
  | (ActionBase & { type: 'hand.exit' })
  | (ActionBase & { type: 'hand.move'; to: Point })
  | (ActionBase & { type: 'pencil.stroke'; path: Path; hardness?: 'H' | 'HB' | 'B' | '2B' | '4B'; pressure?: Pressure; width?: number; mode?: 'stand' | 'lay' })
  | (ActionBase & { type: 'pencil.hatch'; region: Region; angle?: number; spacing?: number; cross?: boolean })
  | (ActionBase & { type: 'crayon.stroke'; path: Path; color: PaintColor; kind?: 'crayon' | 'oil-pastel'; mode?: 'stand' | 'lay'; pressure?: Pressure; width?: number; resist?: boolean })
  | (ActionBase & { type: 'crayon.fill'; region: Region; color?: PaintColor; colors?: PaintColor[]; kind?: 'crayon' | 'oil-pastel'; pattern?: 'oneway' | 'round' | 'stripes' | 'dots'; pressure?: Pressure; layer?: 'paint' | 'under' })
  | (ActionBase & { type: 'smudge'; path: Path; tool?: 'finger' | 'tissue' | 'cotton'; strength?: number; width?: number })
  | (ActionBase & { type: 'paint.stroke'; path: Path; color: PaintColor; water?: number; brush?: 'round' | 'flat'; part?: 'tip' | 'belly'; width?: number; mode?: 'transparent' | 'opaque'; layer?: 'paint' | 'wet' })
  | (ActionBase & { type: 'paint.wash'; region: Region; color: Color; water?: number; pattern?: 'flat' | 'grad'; gradTo?: PaintColor; mode?: 'transparent' | 'opaque'; layer?: 'paint' | 'wet' })
  | (ActionBase & { type: 'paint.drop'; at: Point; color: PaintColor; size: number; water?: number })
  | (ActionBase & { type: 'paint.bleed'; source: string; region: Region; radius: number })
  | (ActionBase & { type: 'paint.dry'; region: Region })
  | (ActionBase & { type: 'paint.soften'; path: Path; width?: number; strength?: number })
  | (ActionBase & { type: 'fx.sheen'; region: Region })
  | (ActionBase & { type: 'scratch.cover'; region: Region; color?: PaintColor })
  | (ActionBase & { type: 'scratch.stroke'; path: Path; width: number })
  | (ActionBase & { type: 'note.arrow'; at: Point; to: Point; text?: string })
  | (ActionBase & { type: 'note.circle'; at: Point; r: number; text?: string })
  | (ActionBase & { type: 'note.label'; at: Point; text: string })
  | (ActionBase & { type: 'zoom.to'; rect: [number, number, number, number] })
  | (ActionBase & { type: 'zoom.reset' })
  | (ActionBase & { type: 'frottage.setup'; pattern: 'leaf' | 'wood' | 'mesh'; region: Region })
  | (ActionBase & { type: 'frottage.rub'; path: Path; color: PaintColor; width?: number })
  | (ActionBase & { type: 'tool.place'; item: SceneItem; to: Point; scale?: number; color?: PaintColor })
  | (ActionBase & { type: 'scene.object'; objectId: string; sprite: SceneSprite; at: Point; scale?: number; z?: number; rotation?: number; opacity?: number; color?: PaintColor; light?: Point })
  | (ActionBase & { type: 'compare'; left: Script; right: Script; labels: [string,string] })
  | (ActionBase & { type: 'note.meter'; label: string; value: Pressure; at?: Point })
  | (ActionBase & { type: 'paint.mix'; colors: PaintColor[]; amounts: number[]; region: Region })
  | (ActionBase & { type: 'paint.dab'; region: Region; color: PaintColor; tool?: 'brush' | 'sponge'; count?: number })
  | (ActionBase & { type: 'eraser.stroke'; path: Path; width?: number; layer?: 'paint' | 'top' })
  | (ActionBase & { type: 'stencil'; region: Region; path: Path; color: PaintColor; width?: number; side?: 'inside' | 'outside' })
  | (ActionBase & { type: 'splatter'; region: Region; color: PaintColor; count?: number; size?: number })
  | (ActionBase & { type: 'drip'; path: Path; color: PaintColor; width?: number })
  | (ActionBase & { type: 'blow'; at: Point; color: PaintColor; direction?: Point; length?: number; branches?: number })
  | (ActionBase & { type: 'decal.fold'; region: Region; axis?: 'vertical' | 'horizontal' })
  | (ActionBase & { type: 'marble.swirl'; region: Region; colors: PaintColor[]; turns?: number })
  | (ActionBase & { type: 'marble.transfer'; region: Region; to: Point; scale?: number })
  | (ActionBase & { type: 'stamp.press'; at: Point; color: PaintColor; shape?: 'circle' | 'square' | 'leaf' | 'vegetable' | 'cardboard'; size?: number; count?: number })
  | (ActionBase & { type: 'grid.show'; kind?: 'thirds' | 'perspective' | 'center'; vanishing?: Point })
  | (ActionBase & { type: 'grid.hide' })
  | (ActionBase & { type: 'wait' });
export interface Step { id: string; durationMs: number; caption: string; description: string; actions: Action[] }
export interface Script {
  schemaVersion: 1;
  id: string;
  seed: number;
  stage: { paper: 'gayoushi'; view: 'top' | 'side'; mirror: 'handedness' | 'none' };
  regions: Record<string, RegionShape>;
  steps: Step[];
}
export interface DevLesson { id: string; title: string; anim: string; description: string; color: string }
export interface DevManifest { schemaVersion: 1; lessons: DevLesson[] }
