/**
 * The initial constants of simulation-model §17, one per row of the table (rows
 * with several names give one constant each). They are calibration: changing a
 * value means updating the table, `constants.test.ts` and the rule tests. The
 * tables of the other sections are data in the modules that use them.
 */

/** Seconds of fiction per tick (§17 `TICK_SECONDS`, §2). */
export const TICK_SECONDS = 5;
/** Largest grid side, in cells: grids are at most 48 × 48 (§17 `GRID_MAX`, §3.1). */
export const GRID_MAX = 48;
/** Sight range, in cells, with `DAY` light (§17 `VISION_DAY`, §3.2). */
export const VISION_DAY = 20;
/** Sight range, in cells, with `DIM` light (§17 `VISION_DIM`, §3.2). */
export const VISION_DIM = 8;
/** Sight range, in cells, with `DARK` light (§17 `VISION_DARK`, §3.2). */
export const VISION_DARK = 3;
/** Share of the weather temperature felt in a roofed cell, in bp (§17 `ROOFED_WEATHER_SHARE`, §3.2). */
export const ROOFED_WEATHER_SHARE = 2500;
/** A body need at or above this level is a discomfort (§17 `DISCOMFORT`, §5.1). */
export const DISCOMFORT = 5000;
/** A body need at or above this level is urgent (§17 `URGENT`, §5.1). */
export const URGENT = 7500;
/** A body need at or above this level is critical (§17 `CRITICAL`, §5.1). */
export const CRITICAL = 9000;
/** Per-tick `relax` rate of the emotions toward their baseline (§17 `EMOTION_DECAY`, §5.2). */
export const EMOTION_DECAY = 9900;
/** Per-tick `relax` rate of surprise toward its baseline (§17 `SURPRISE_DECAY`, §5.2). */
export const SURPRISE_DECAY = 9500;
/** Upper limit of an emotion baseline (§17 `EMOTION_BASELINE_MAX`, §5.2). */
export const EMOTION_BASELINE_MAX = 3000;
/** Boredom gained per tick of an act that does not interest the character (§17 `BOREDOM_RATE`, §5.2). */
export const BOREDOM_RATE = 25;
/** Boredom gained per tick of silence (§17 `BOREDOM_SILENCE_RATE`, §5.2). */
export const BOREDOM_SILENCE_RATE = 50;
/** Boredom relieved by an interesting act heard as `DIRECT` (§17 `BOREDOM_RELIEF`, §5.2). */
export const BOREDOM_RELIEF = 1000;
/** Boredom relieved when that interesting act is addressed to the character with a positive valence (§17 `BOREDOM_RELIEF_ADDRESSED`, §5.2). */
export const BOREDOM_RELIEF_ADDRESSED = 2000;
/** Fear gained per tick for each fear of a present tag (§17 `ASSOCIATION_FEAR_RATE`, §5.7). */
export const ASSOCIATION_FEAR_RATE = 20;
/** Joy gained per tick for each attachment to a present tag (§17 `ASSOCIATION_JOY_RATE`, §5.7). */
export const ASSOCIATION_JOY_RATE = 10;
/** A drive with at least this weight is dominant (§17 `DOMINANT_DRIVE_WEIGHT`, §5.3). */
export const DOMINANT_DRIVE_WEIGHT = 7000;
/** Per-tick `relax` rate of a perception without updates (§17 `PERCEPTION_RELAX`, §5.5). */
export const PERCEPTION_RELAX = 9800;
/** An apparent emotion that relaxes below this intensity fades out (§17 `APPARENT_EMOTION_FLOOR`, §5.5). */
export const APPARENT_EMOTION_FLOOR = 1000;
/** Ticks without confirmation after which a mark of the apparent state fades (§17 `APPARENT_MARK_TTL_TICKS`, §5.5). */
export const APPARENT_MARK_TTL_TICKS = 60;
/** Threat added by `DARK` light (§17 `DARK_THREAT`, §6). */
export const DARK_THREAT = 1000;
/** Intensity of the apparent emotion read from an emotion signal (§17 `APPARENT_EMOTION_INTENSITY`, §7). */
export const APPARENT_EMOTION_INTENSITY = 6000;
/** Effect unit at full intensity: `u = mulBp(800, intensity)` (§17 `EFFECT_UNIT_MAX`, §2). */
export const EFFECT_UNIT_MAX = 800;
/** Largest bond change per axis per act (§17 `BOND_DELTA_CAP`, §9). */
export const BOND_DELTA_CAP = 1500;
/** Utility bonus of the possible answers to a pending obligation (§17 `OBLIGATION_BONUS`, §10). */
export const OBLIGATION_BONUS = 4000;
/** Ticks without an answer after which an obligation is ignored (§17 `OBLIGATION_TTL_TICKS`, §10). */
export const OBLIGATION_TTL_TICKS = 12;
/** Fixed intensity of the effect of an ignored obligation (§17 `IGNORE_INTENSITY`, §10). */
export const IGNORE_INTENSITY = 5000;
/** Size of the per-tick emotion change from a body condition in its band: +5, or −5 for `joy` (§17 `BODY_EMOTION_RATE`, §5.2). */
export const BODY_EMOTION_RATE = 5;
/** Intensity of the `FAREWELL` or `LEAVE` of a character who decides to leave (§17 `LEAVE_ACT_INTENSITY`, §11). */
export const LEAVE_ACT_INTENSITY = 3000;
/** Tones considered per act and target when choosing (§17 `TONES_PER_ACT`, §10). */
export const TONES_PER_ACT = 3;
/** Most salient topics considered per act (§17 `TOPICS_MAX`, §10). */
export const TOPICS_MAX = 4;
/** Best candidates that enter the weighted choice (§17 `TOP_K`, §10). */
export const TOP_K = 5;
/** Utility penalty per repetition of the same act and topic (§17 `REPEAT_PENALTY`, §10). */
export const REPEAT_PENALTY = 1500;
/** How many of the character's own last acts count as repetitions (§17 `REPEAT_WINDOW`, §10). */
export const REPEAT_WINDOW = 6;
/** Utility bonus factor, in bp, of a dominant directed drive served by the act (§17 `GOAL_BONUS`, §10). */
export const GOAL_BONUS = 2000;
/** Urge to act from which a character takes part in the turn draw (§17 `URGE_THRESHOLD`, §11). */
export const URGE_THRESHOLD = 4000;
/** Lead of the will to leave over the will to stay that allows the leave draw (§17 `LEAVE_MARGIN`, §11). */
export const LEAVE_MARGIN = 3000;
/** Ticks of silence in a row that end the slice (§17 `SILENCE_END_TICKS`, §11). */
export const SILENCE_END_TICKS = 60;
/** Least distance, in cells, from its target that a `WITHDRAW` seeks (§17 `WITHDRAW_DISTANCE`, §8.1). */
export const WITHDRAW_DISTANCE = 4;
/** A fact copy at or above this importance is a lasting memory (§17 `MEMORY_IMPORTANCE`, §12). */
export const MEMORY_IMPORTANCE = 6000;
/** Lasting memories kept per character between slices (§17 `MEMORIES_MAX`, §12). */
export const MEMORIES_MAX = 50;
/** Fidelity factor, in bp, of a fact copy told by someone else (§17 `TOLD_FIDELITY`, §12). */
export const TOLD_FIDELITY = 8000;
/** Fidelity of the copies of the facts of the shared history (§17 `HISTORY_FIDELITY`, §12). */
export const HISTORY_FIDELITY = 8000;
/** Share, in bp, of the distance to the signal that a trait tendency moves per act (§17 `TENDENCY_RATE`, §13). */
export const TENDENCY_RATE = 1000;
/** Weight, in bp, of the tendency in the effective trait (§17 `TENDENCY_WEIGHT`, §13). */
export const TENDENCY_WEIGHT = 3000;
/** Tendency magnitude that counts toward crystallization (§17 `CRYSTAL_THRESHOLD`, §13). */
export const CRYSTAL_THRESHOLD = 6000;
/** Acts in a row with the tendency at or above the threshold needed to crystallize (§17 `CRYSTAL_ACTS`, §13). */
export const CRYSTAL_ACTS = 30;
/** Slices with such acts needed to crystallize (§17 `CRYSTAL_SLICES`, §13). */
export const CRYSTAL_SLICES = 2;
/** How far, in bp, a trait moves when it crystallizes (§17 `CRYSTAL_STEP`, §13). */
export const CRYSTAL_STEP = 500;
