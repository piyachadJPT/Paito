/** Shared colors for the postcard art, so every picture reads as one set. */
export const INK = "#3a3428";
export const PAPER = "#fffdf7";
export const GOLD = "#e3b65e";
export const GOLD_DARK = "#c99a45";
export const RED = "#c2562f";
export const BRICK = "#b0644a";
export const CREAM = "#f1e4c8";
export const WOOD = "#b98a5a";
export const WOOD_DARK = "#8e6440";
export const LEAF = "#6f9a6a";
export const LEAF_DARK = "#4f7a52";
export const WATER = "#8cc3dc";
export const ROAD = "#7b746a";
export const LAMP = "#ffd98a";
export const CURRY = "#e9a64a";

/** Stroke props for an ink outline. */
export const stroke = (width = 2) =>
  ({ stroke: INK, strokeWidth: width, strokeLinecap: "round", strokeLinejoin: "round" }) as const;
