import { gen, AD, VectorOp, VecParam, Param } from "@davepagurek/glsl-autodiff";
import type P5 from "p5";

type DistortionOptions = {
  type?: "specular" | "normal";
  space?: "world" | "local";
  defs?: string;
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

type Material = (uniforms?: Record<string, any>) => void;

declare module "P5" {
  interface __Graphics__ {
    createWarp(
      getOffset: (params: Params) => VectorOp,
      options: DistortionOptions,
    ): Material;
  }
}

declare class p5 extends P5 {
  createWarp(
    getOffset: (params: Params) => VectorOp,
    options: DistortionOptions,
  ): Material;
  static Graphics: new (...args: any[]) => P5.Graphics;
}

const createWarp = function (
  getOffset: (params: Params) => VectorOp,
  { type = "specular", space = "local", defs = "" }: DistortionOptions = {},
) {
  const p5 = this as P5 | P5.Graphics;
  const baseShader = type === 'specular' ? p5.baseMaterialShader() : p5.baseNormalShader();
  const hookName = space === 'local' ? 'Vertex getObjectInputs' : 'Vertex getWorldInputs';

  const materialShader = baseShader.modify({
    declarations: defs,
    vertexDeclarations: `
      uniform float millis;
      uniform vec2 mouse;
      uniform float pixelDensity;
      uniform vec2 size;
    `,
    [hookName]: `(Vertex inputs) {
      ${gen((glsl) => {
        const position = glsl.vec3Param("inputs.position");
        const millis = glsl.param("millis");
        const mouse = glsl.vec2Param("mouse");
        const mouseX = mouse.x();
        const mouseY = mouse.y();
        const pixelDensity = glsl.param("pixelDensity");
        const size = glsl.vec2Param("size");
        const width = size.x();
        const height = size.y();
        const uv = glsl.vec2Param("inputs.texCoord");
        const normal = glsl.vec2Param("inputs.normal");
        const color = glsl.vec4Param("inputs.color");

        const offset = getOffset({
          glsl,
          position,
          millis,
          mouse,
          mouseX,
          mouseY,
          pixelDensity,
          size,
          width,
          height,
          uv,
          normal,
          color,
        });
        offset.output("offset");

        const adjustedNormal = offset.adjustNormal(normal, position);
        adjustedNormal.output("adjustedNormal");
      })}

      inputs.position += offset;
      inputs.normal = adjustedNormal;
      return inputs;
    }
    `
  })
  // @ts-ignore
  console.log(materialShader.vertSrc())

  const material: Material = (uniforms = {}) => {
    p5.shader(materialShader);
    materialShader.setUniform("mouse", [p5.mouseX, p5.mouseY]);
    materialShader.setUniform("millis", p5.millis());
    materialShader.setUniform("pixelDensity", p5.pixelDensity());
    materialShader.setUniform("size", [p5.width, p5.height]);
    materialShader.setUniform("normalMaterial", type === "normal");
    for (const key in uniforms) {
      materialShader.setUniform(key, uniforms[key]);
    }
    p5.noStroke();
  };

  return material;
};

function webGL2CompatibilityPrefix(
  p5: P5,
  shaderType: 'vert' | 'frag',
  floatPrecision: 'lowp' | 'mediump' | 'highp'
) {
  let code = '';
  if (p5.webglVersion === p5.WEBGL2) {
    code += '#version 300 es\n#define WEBGL2\n';
  }
  if (shaderType === 'vert') {
    code += '#define VERTEX_SHADER\n';
  } else if (shaderType === 'frag') {
    code += '#define FRAGMENT_SHADER\n';
  }
  if (floatPrecision) {
    code += `precision ${floatPrecision} float;\n`;
  }
  return code;
}

export const setupWarp = (p5: P5) => {
  // @ts-ignore
  p5.prototype.createWarp = createWarp;
  // @ts-ignore
  p5.Graphics.prototype.createWarp = createWarp;
};
// @ts-ignore
if (window.p5) setupWarp(p5);
