import { isWalkable } from "./walkable";
import { roomIndexAt } from "./rooms";
import { stepWorld } from "./step";
import { createWorld, cloneWorldForRetry } from "./world";
import type { SimApi } from "../contracts";

export { createWorld, cloneWorldForRetry, stepWorld, roomIndexAt, isWalkable };
export { runScenario } from "./scenario";
export type { ScriptSegment, ScenarioOptions, ScenarioResult, TraceSample } from "./scenario";
export { selectGait } from "./player";
export { footstepRadius, surfaceAt } from "./noise";
export { random as simRandom } from "./rng";

export const sim: SimApi = { createWorld, stepWorld, roomIndexAt, isWalkable };
export default sim;
