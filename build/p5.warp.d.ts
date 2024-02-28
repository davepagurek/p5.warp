import { AD, VectorOp, VecParam, Param } from "@davepagurek/glsl-autodiff";
import type P5 from "p5";
type DistortionOptions = {
    type?: "specular" | "normal";
    space?: "world" | "local";
};
type Params = {
    glsl: AD;
    position: VecParam;
    uv: VecParam;
    normal: VecParam;
    mouse: VecParam;
    mouseX: Param;
    mouseY: Param;
    millis: Param;
    pixelDensity: Param;
    size: VecParam;
    width: Param;
    height: Param;
    color: VecParam;
};
type Material = () => void;
declare module "P5" {
    interface __Graphics__ {
        createWarp(getOffset: (params: Params) => VectorOp, options: DistortionOptions): Material;
    }
}
export declare const setupWarp: (p5: P5) => void;
export {};
