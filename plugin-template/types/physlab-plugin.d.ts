/**
 * PhysLab 插件 API 类型提示（仅用于编辑器自动补全，运行时不需要）。
 * 在 index.js 顶部加一行：/// <reference path="./types/physlab-plugin.d.ts" />
 */
type Row = [string, string];
type Models = string | string[];
interface Param { key: string; name: string; def: string; sym?: string; unit?: string; group?: string; pos?: boolean; nonneg?: boolean; optional?: boolean; hint?: string; ai?: string; opts?: [string, string][]; kind?: "angle" }
interface Phase { t0: number; t1: number; title?: string; lines?: string[]; end?: string }
interface SolutionStep { title: string; items: { tag?: string; tex: string }[] }
interface Check { status: "pass" | "warn" | "fail" | "info"; item: string; detail: string }
type State = Record<string, number>;

interface MakeSimOptions {
  P: Record<string, number>; tEnd: number; state(t: number, phaseIndex: number, sim: any): State;
  phases?: Phase[]; samples?: number; xmin?: number; xmax?: number; vmax?: number; summary?: Record<string, any>;
  tiles?: [string, string][]; rows?(sim: any): Row[]; checks?(inp: any, sim: any): Check[]; solution?(sim: any): SolutionStep[];
  infoBox?(st: State, sim: any): string; forceBox?(st: State, sim: any): string;
  render2D?(ctx: CanvasRenderingContext2D, W: number, H: number, sim: any, st: State, opt: any): void;
  render3D?: MakeSimOptions["render2D"]; names?: Record<string, string>; digest?(sim: any): object; endReason?: "steady" | "tmax";
}
interface ModelDef {
  id: string; name: string; short?: string; segLabel?: string; carrier?: string; noCarrier?: boolean; params: Param[];
  stats?: [string, string, string][]; defaultCharts?: string[]; builtinCharts?: boolean; presets?: any[];
  build?(cfg: any, P: any, errors: Record<string, string>): void; simulate(P: any): any; aiNote?: string;
}
interface ChartDef {
  id: string; name: string; xl?: string; yl?: string; time?: boolean; models?: Models;
  series?: { n: string; c: string; x: string | ((s: State) => number); y: string | ((s: State) => number) }[];
  paint?(ctx: CanvasRenderingContext2D, W: number, H: number, env: { sim: any; P: any; t: number; st: State; full: boolean; cfg: any; kit: any }): void | { x0: number; x1: number; left: number; width: number };
}
interface VariableDef {
  key: string; name?: string; label?: string; unit?: string; models?: Models; stat?: boolean; chart?: boolean; metric?: "end" | "max" | "min"; color?: string;
  compute(st: State, ctx: { P: any; sim: any; g: any; model: string }): number;
}
interface AIContext { cfg: any; sim: any; inp: any; callAI(o: any): Promise<any>; runAI(o: any): Promise<any>; digest(): any; systemPrompt(id: string): string; parseJSONLoose(t: string): any; toast(m: string, type?: string): void; esc(s: string): string }

interface PluginAPI {
  apiVersion: string; manifest: any; core: any; helpers: Record<string, any>; log(...a: any[]): void;
  storage: { get(k: string, d?: any): any; set(k: string, v: any): void; remove(k: string): void };
  kit: { makeSim(o: MakeSimOptions): any; axes(ctx: CanvasRenderingContext2D, box: { l: number; t: number; w: number; h: number }, rng: { x0: number; x1: number; y0: number; y1: number }): { X(x: number): number; Y(y: number): number } };
  models: { register(d: ModelDef): any; extend(id: string, p: { params?: Param[]; presets?: any[]; build?: ModelDef["build"] }): void; get(id: string): any; list(): string[] };
  charts: { register(d: ChartDef): void };
  variables: { register(d: VariableDef): void };
  metrics: { register(d: { id: string; name: string; unit?: string; f(sim: any): number }): void };
  results: { add(fn: (sim: any) => Row[], o?: { models?: Models }): void; transform(fn: (rows: Row[], sim: any) => Row[], o?: { models?: Models }): void };
  checks: { add(fn: (inp: any, sim: any) => Check[], o?: { models?: Models }): void };
  solution: { add(fn: (sim: any) => SolutionStep[], o?: { models?: Models }): void; transform(fn: (s: SolutionStep[], sim: any) => SolutionStep[], o?: { models?: Models }): void };
  simulation: { before(fn: (P: any) => void): void; after(fn: (sim: any, P: any) => void): void; onChange(fn: (e: { cfg: any; sim: any; inp: any }) => void): void };
  ai: {
    addTool(d: { id: string; name: string; render(el: HTMLElement, ctx: AIContext): void }): void;
    addPrompt(id: string, d: { name: string; text: string }): void;
    extendPrompt(id: string, p: { prepend?: string; append?: string } | ((text: string, ctx: AIContext) => string)): void;
    addProvider(key: string, preset: Record<string, any>): void; addQuickQuestion(q: string): void;
    addContext(fn: (sim: any) => object, o?: { models?: Models }): void;
    onRequest(fn: (o: any) => void): void; onResponse(fn: (res: any, o: any) => void): void;
    call(o: any): Promise<any>; run(o: any): Promise<any>;
  };
  ui: { addInfoTab(d: { id: string; title: string; render(el: HTMLElement, ctx: AIContext): void }): void; toast(m: string, t?: string): void; onReady(fn: () => void): void };
}
declare const PhysLab: {
  apiVersion: string;
  definePlugin(def: { id: string; name: string; version: string; author?: string; category?: "official" | "users"; kinds?: string[]; apiVersion?: string; activate(api: PluginAPI): void }): void;
};
