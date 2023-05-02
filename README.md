# p5.warp
Fast 3D domain warping in p5

![warp](https://user-images.githubusercontent.com/5315059/235771152-13493afd-5d1f-4da3-b160-05d2b1028cfb.gif)

## Usage

### Adding the library

Add the library in a script tag:

```html
<script src="https://cdn.jsdelivr.net/npm/@davepagurek/p5.warp@0.0.1/p5.warp.js"></script>
```

Or on OpenProcessing, add the CDN link as a library:

```
https://cdn.jsdelivr.net/npm/@davepagurek/p5.warp@0.0.1/p5.warp.js
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
