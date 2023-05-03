# p5.warp
Fast 3D domain warping in p5

![warp](https://user-images.githubusercontent.com/5315059/235771152-13493afd-5d1f-4da3-b160-05d2b1028cfb.gif)

## What does this do?

This library is secretly building and applying a shader for you from the warp function you build! It works with p5's material system so that you can keep using normal lighting and color functions as usual.

It uses a vertex shader to adjust the position of each point on a model according to the warp, and also update the normals of the model so that lighting still works.  Because it's done in a shader, that means you can animate your warps and it will still run fast by leveraging your GPU! It also means that it only moves the points that already exist on the model: for a warp to look smooth, your model has to already be somewhat dense with points (which, for example, p5's `box()` is not.)

## Usage

### Adding the library

Add the library in a script tag:

```html
<script src="https://cdn.jsdelivr.net/npm/@davepagurek/p5.warp@0.0.1"></script>
```

Or on OpenProcessing, add the CDN link as a library:

```
https://cdn.jsdelivr.net/npm/@davepagurek/p5.warp@0.0.1
```

### Making a warp

In your setup function, you can create a new warp by calling `createWarp` and giving it a function that takes in the **warp inputs** and returns a **3D offset** that will be applied to each vertex of a shape:

```js
let distort
function setup() {
  createCanvas(600, 600, WEBGL);
  distort = createWarp(({ glsl, millis, position }) => {
    const t = millis.div(1000)
    return glsl.vec3(
      t.mult(2).add(position.y().mult(4)).sin().mult(0.15),
      t.mult(0.5).add(position.z().mult(2)).sin().mult(0.15),
      t.mult(1.5).add(position.x().mult(3)).sin().mult(0.15)
    )
  })
}
```

Then, when you want to apply the warp, call the warp function you made before you draw shapes:

```js
function draw() {
  background(220)
  distort()
  lights()
  sphere(150)
}
```

### Warp inputs

The function you pass to `createWarp` will be passed an object with the following type:

```typescript
type Params = {
  glsl: AD
  position: VecParam
  uv: VecParam
  normal: VecParam
  mouse: VecParam
  mouseX: Param
  mouseY: Param
  millis: Param
  pixelDensity: Param
  size: VecParam
  width: Param
  height: Param
  color: VecParam
}
```

Here's what each property is and how you might want to use them:
- `glsl` is an instance of the [glsl-autodiff library.](https://github.com/davepagurek/glsl-autodiff#operations) From it, you can create now constant values (e.g. `glsl.val(123)`, `glsl.val(Math.PI)`, etc), or create vectors containing other values (e.g. `glsl.vec3(0, 1, position.x()`)
- `position` is a `vec3` with the object-space position of each vertex. Note that the general scale of these values will vary from shape to shape: `sphere()` goes from -1 to 1, while a normalized `p5.Geometry` will have values ranging from -100 to 100.
- `uv` is a `vec2` with the texture coordinate for each vertex.
- `normal` is a `vec3` with the normal for that vertex, which is a direction pointing directly out of the surface.
- `mouse` is a `vec2` with p5's `mouseX` and `mouseY` values stored in x and y.
- `mouseX` is a `float` set to p5's `mouseX`. This is equivalent to `mouse.x()`.
- `mouseY` is a `float` set to p5's `mouseY`. This is equivalent to `mouse.y()`.
- `millis` is a `float` set to p5's `millis()`.
- `pixelDensity` is a `float` set to p5's `pixelDensity()`.
- `size` is a `vec2` with p5's `width` and `height` stored in x and y.
- `width` is a `float` set to p5's `width`. This is equivalent to `size.x()`.
- `height` is a `float` set to p5's `height`. This is equivalent to `size.y()`.
- `color` is a `vec4` representing either the whole model's fill color, or the per-vertex fill color if it exists.

Each input property comes from `glsl-autodiff`. You can see a [full list of the methods you can call on them in the `glsl-autodiff` readme.](https://github.com/davepagurek/glsl-autodiff#operations)
