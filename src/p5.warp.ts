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

type Material = () => void;

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
  const p5 = this as P5.p5InstanceExtensions | P5.Graphics;
  const compatibility = `
#ifdef WEBGL2

#define IN in
#define OUT out

#ifdef FRAGMENT_SHADER
out vec4 outColor;
#define OUT_COLOR outColor
#endif
#define TEXTURE texture

#else

#ifdef FRAGMENT_SHADER
#define IN varying
#else
#define IN attribute
#endif
#define OUT varying
#define TEXTURE texture2D

#ifdef FRAGMENT_SHADER
#define OUT_COLOR gl_FragColor
#endif

#endif`

  const vert = `${webGL2CompatibilityPrefix(this, 'vert', 'highp')}
${compatibility}
precision highp int;

IN vec3 aPosition;
IN vec3 aNormal;
IN vec2 aTexCoord;
IN vec4 aVertexColor;

${defs}

uniform vec3 uAmbientColor[5];

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;
uniform int uAmbientLightCount;

uniform bool uUseVertexColor;
uniform vec4 uMaterialColor;

OUT vec3 vNormal;
OUT vec2 vTexCoord;
OUT vec3 vViewPosition;
OUT vec3 vAmbientColor;
OUT vec4 vColor;

uniform vec2 mouse;
uniform float millis;
uniform float pixelDensity;
uniform vec2 size;

void main(void) {
  vColor = (uUseVertexColor ? aVertexColor : uMaterialColor);

  ${
    space === "world"
      ? "vec3 world = (uModelViewMatrix * vec4(aPosition, 1.0)).xyz;"
      : ""
  }
  ${space === "world" ? "vec3 worldNormal = uNormalMatrix * aNormal;" : ""}

  ${gen((glsl) => {
    const position = glsl.vec3Param(space === "world" ? "world" : "aPosition");
    const millis = glsl.param("millis");
    const mouse = glsl.vec2Param("mouse");
    const mouseX = mouse.x();
    const mouseY = mouse.y();
    const pixelDensity = glsl.param("pixelDensity");
    const size = glsl.vec2Param("size");
    const width = size.x();
    const height = size.y();
    const uv = glsl.vec2Param("aTexCoord");
    const normal = glsl.vec2Param(
      space === "world" ? "worldNormal" : "aNormal",
    );
    const color = glsl.vec4Param("vColor");

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

  vec4 viewModelPosition = ${
    space === "world"
      ? "vec4(world + offset, 1.0)"
      : "uModelViewMatrix * vec4(aPosition + offset, 1.0)"
  };

  // Pass varyings to fragment shader
  vViewPosition = viewModelPosition.xyz;
  gl_Position = uProjectionMatrix * viewModelPosition;  

  vNormal = ${space === "world" ? "" : "uNormalMatrix *"} adjustedNormal;
  vTexCoord = aTexCoord;

  // TODO: this should be a uniform
  vAmbientColor = vec3(0.0);
  for (int i = 0; i < 5; i++) {
    if (i < uAmbientLightCount) {
      vAmbientColor += uAmbientColor[i];
    }
  }
}`;

  const frag = `${webGL2CompatibilityPrefix(this, 'frag', 'highp')}
${compatibility}
#define PI 3.141592
precision highp int;

uniform bool normalMaterial;

uniform vec4 uSpecularMatColor;
uniform vec4 uAmbientMatColor;
uniform vec4 uEmissiveMatColor;

uniform vec4 uTint;
uniform sampler2D uSampler;
uniform bool isTexture;
uniform bool uHasSetAmbient;

IN vec3 vNormal;
IN vec2 vTexCoord;
IN vec3 vViewPosition;
IN vec3 vAmbientColor;
IN vec4 vColor;

uniform mat4 uViewMatrix;

uniform bool uUseLighting;

uniform int uAmbientLightCount;
uniform vec3 uAmbientColor[5];

uniform int uDirectionalLightCount;
uniform vec3 uLightingDirection[5];
uniform vec3 uDirectionalDiffuseColors[5];
uniform vec3 uDirectionalSpecularColors[5];

uniform int uPointLightCount;
uniform vec3 uPointLightLocation[5];
uniform vec3 uPointLightDiffuseColors[5];	
uniform vec3 uPointLightSpecularColors[5];

uniform int uSpotLightCount;
uniform float uSpotLightAngle[5];
uniform float uSpotLightConc[5];
uniform vec3 uSpotLightDiffuseColors[5];
uniform vec3 uSpotLightSpecularColors[5];
uniform vec3 uSpotLightLocation[5];
uniform vec3 uSpotLightDirection[5];

uniform bool uSpecular;
uniform float uShininess;

uniform float uConstantAttenuation;
uniform float uLinearAttenuation;
uniform float uQuadraticAttenuation;

// setting from  _setImageLightUniforms()
// boolean to initiate the calculateImageDiffuse and calculateImageSpecular
uniform bool uUseImageLight;
// texture for use in calculateImageDiffuse
uniform sampler2D environmentMapDiffused;
// texture for use in calculateImageSpecular
uniform sampler2D environmentMapSpecular;
// roughness for use in calculateImageSpecular
uniform float levelOfDetail;

const float specularFactor = 2.0;
const float diffuseFactor = 0.73;

struct LightResult {
  float specular;
  float diffuse;
};

float _phongSpecular(
  vec3 lightDirection,
  vec3 viewDirection,
  vec3 surfaceNormal,
  float shininess) {

  vec3 R = reflect(lightDirection, surfaceNormal);
  return pow(max(0.0, dot(R, viewDirection)), shininess);
}

float _lambertDiffuse(vec3 lightDirection, vec3 surfaceNormal) {
  return max(0.0, dot(-lightDirection, surfaceNormal));
}

LightResult _light(vec3 viewDirection, vec3 normal, vec3 lightVector) {

  vec3 lightDir = normalize(lightVector);

  //compute our diffuse & specular terms
  LightResult lr;
  if (uSpecular)
    lr.specular = _phongSpecular(lightDir, viewDirection, normal, uShininess);
  lr.diffuse = _lambertDiffuse(lightDir, normal);
  return lr;
}

// converts the range of "value" from [min1 to max1] to [min2 to max2]
float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

vec2 mapTextureToNormal( vec3 v ){
  // x = r sin(phi) cos(theta)   
  // y = r cos(phi)  
  // z = r sin(phi) sin(theta)
  float phi = acos( v.y );
  // if phi is 0, then there are no x, z components
  float theta = 0.0;
  // else 
  theta = acos(v.x / sin(phi));
  float sinTheta = v.z / sin(phi);
  if (sinTheta < 0.0) {
    // Turn it into -theta, but in the 0-2PI range
    theta = 2.0 * PI - theta;
  }
  theta = theta / (2.0 * 3.14159);
  phi = phi / 3.14159 ;
  
  vec2 angles = vec2( fract(theta + 0.25), 1.0 - phi );
  return angles;
}


vec3 calculateImageDiffuse( vec3 vNormal, vec3 vViewPosition ){
  // make 2 seperate builds 
  vec3 worldCameraPosition =  vec3(0.0, 0.0, 0.0);  // hardcoded world camera position
  vec3 worldNormal = normalize(vNormal);
  vec2 newTexCoor = mapTextureToNormal( worldNormal );
  vec4 texture = TEXTURE( environmentMapDiffused, newTexCoor );
  // this is to make the darker sections more dark
  // png and jpg usually flatten the brightness so it is to reverse that
  return smoothstep(vec3(0.0), vec3(0.8), texture.xyz);
}

vec3 calculateImageSpecular( vec3 vNormal, vec3 vViewPosition ){
  vec3 worldCameraPosition =  vec3(0.0, 0.0, 0.0);
  vec3 worldNormal = normalize(vNormal);
  vec3 lightDirection = normalize( vViewPosition - worldCameraPosition );
  vec3 R = reflect(lightDirection, worldNormal);
  vec2 newTexCoor = mapTextureToNormal( R );
#ifdef WEBGL2
  vec4 outColor = textureLod(environmentMapSpecular, newTexCoor, levelOfDetail);
#else
  vec4 outColor = TEXTURE(environmentMapSpecular, newTexCoor);
#endif
  // this is to make the darker sections more dark
  // png and jpg usually flatten the brightness so it is to reverse that
  return pow(outColor.xyz, vec3(10.0));
}

void totalLight(
  vec3 modelPosition,
  vec3 normal,
  out vec3 totalDiffuse,
  out vec3 totalSpecular
) {

  totalSpecular = vec3(0.0);

  if (!uUseLighting) {
    totalDiffuse = vec3(1.0);
    return;
  }

  totalDiffuse = vec3(0.0);

  vec3 viewDirection = normalize(-modelPosition);

  for (int j = 0; j < 5; j++) {
    if (j < uDirectionalLightCount) {
      vec3 lightVector = (uViewMatrix * vec4(uLightingDirection[j], 0.0)).xyz;
      vec3 lightColor = uDirectionalDiffuseColors[j];
      vec3 specularColor = uDirectionalSpecularColors[j];
      LightResult result = _light(viewDirection, normal, lightVector);
      totalDiffuse += result.diffuse * lightColor;
      totalSpecular += result.specular * lightColor * specularColor;
    }

    if (j < uPointLightCount) {
      vec3 lightPosition = (uViewMatrix * vec4(uPointLightLocation[j], 1.0)).xyz;
      vec3 lightVector = modelPosition - lightPosition;
    
      //calculate attenuation
      float lightDistance = length(lightVector);
      float lightFalloff = 1.0 / (uConstantAttenuation + lightDistance * uLinearAttenuation + (lightDistance * lightDistance) * uQuadraticAttenuation);
      vec3 lightColor = lightFalloff * uPointLightDiffuseColors[j];
      vec3 specularColor = lightFalloff * uPointLightSpecularColors[j];

      LightResult result = _light(viewDirection, normal, lightVector);
      totalDiffuse += result.diffuse * lightColor;
      totalSpecular += result.specular * lightColor * specularColor;
    }

    if(j < uSpotLightCount) {
      vec3 lightPosition = (uViewMatrix * vec4(uSpotLightLocation[j], 1.0)).xyz;
      vec3 lightVector = modelPosition - lightPosition;
    
      float lightDistance = length(lightVector);
      float lightFalloff = 1.0 / (uConstantAttenuation + lightDistance * uLinearAttenuation + (lightDistance * lightDistance) * uQuadraticAttenuation);

      vec3 lightDirection = (uViewMatrix * vec4(uSpotLightDirection[j], 0.0)).xyz;
      float spotDot = dot(normalize(lightVector), normalize(lightDirection));
      float spotFalloff;
      if(spotDot < uSpotLightAngle[j]) {
        spotFalloff = 0.0;
      }
      else {
        spotFalloff = pow(spotDot, uSpotLightConc[j]);
      }
      lightFalloff *= spotFalloff;

      vec3 lightColor = uSpotLightDiffuseColors[j];
      vec3 specularColor = uSpotLightSpecularColors[j];
     
      LightResult result = _light(viewDirection, normal, lightVector);
      
      totalDiffuse += result.diffuse * lightColor * lightFalloff;
      totalSpecular += result.specular * lightColor * specularColor * lightFalloff;
    }
  }

  if( uUseImageLight ){
    totalDiffuse += calculateImageDiffuse(normal, modelPosition);
    totalSpecular += calculateImageSpecular(normal, modelPosition);
  }

  totalDiffuse *= diffuseFactor;
  totalSpecular *= specularFactor;
}

void main(void) {
  if (normalMaterial) {
    OUT_COLOR = vec4(abs(normalize(vNormal)), 1.0);
    return;
  }

  vec3 diffuse;
  vec3 specular;
  totalLight(vViewPosition, normalize(vNormal), diffuse, specular);

  // Calculating final color as result of all lights (plus emissive term).

  vec4 baseColor = isTexture
    // Textures come in with premultiplied alpha. To apply tint and still have
    // premultiplied alpha output, we need to multiply the RGB channels by the
    // tint RGB, and all channels by the tint alpha.
    ? TEXTURE(uSampler, vTexCoord) * vec4(uTint.rgb/255., 1.) * (uTint.a/255.)
    // Colors come in with unmultiplied alpha, so we need to multiply the RGB
    // channels by alpha to convert it to premultiplied alpha.
    : vec4(vColor.rgb * vColor.a, vColor.a);
  OUT_COLOR = vec4(diffuse * baseColor.rgb + 
                    vAmbientColor * (
                      uHasSetAmbient ? uAmbientMatColor.rgb : baseColor.rgb
                    ) + 
                    specular * uSpecularMatColor.rgb + 
                    uEmissiveMatColor.rgb, baseColor.a);
}`;

  const materialShader: P5.Shader = this.createShader(vert, frag);
  const material: Material = () => {
    p5.shader(materialShader);
    materialShader.setUniform("mouse", [p5.mouseX, p5.mouseY]);
    materialShader.setUniform("millis", p5.millis());
    materialShader.setUniform("pixelDensity", p5.pixelDensity());
    materialShader.setUniform("size", [p5.width, p5.height]);
    materialShader.setUniform("normalMaterial", type === "normal");
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
