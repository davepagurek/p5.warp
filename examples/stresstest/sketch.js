let cube
let smallCube
let hugeCube
let airplane
let dialog
let distort
let distort2
let twist
let wobble
let flatten
let genie
let complex
let none
let warpPicker
let modelPicker
let fps
let avgFps = 0
const fpsSamples = []
let vertCount
const type = 'normal'

// p5.prototype.millis = () => 1200

function preload() {
  bunny = loadModel('../bunny.obj', true)
  airplane = loadModel('../plane.obj', true)
  dialog = loadModel('../dialog.obj', true)
}

function setup() {
  createCanvas(600, 600, WEBGL);
  setAttributes({ antialias: true });
  fps = createP()
  fps.position(10, 0)
  
  vertCount = createP()
  vertCount.position(10, 30)
  
  warpPicker = createSelect()
  warpPicker.option('none')
  warpPicker.option('distort')
  warpPicker.option('distort2')
  warpPicker.option('twist')
  warpPicker.option('wobble')
  warpPicker.option('flatten')
  warpPicker.option('genie')
  warpPicker.option('complex')
  warpPicker.selected('distort')
  
  modelPicker = createSelect()
  modelPicker.option('bunny')
  modelPicker.option('airplane')
  modelPicker.option('dialog')
  modelPicker.option('cube')
  modelPicker.option('huge cube')
  modelPicker.option('low poly cube')
  modelPicker.option('sphere')
  modelPicker.option('planeX')
  modelPicker.option('planeY')
  modelPicker.option('planeZ')
  modelPicker.selected('cube')
  
  cube = makeCube(20)
  smallCube = makeCube(2)
  hugeCube = makeCube(200)
  
  none = createWarp(({ glsl }) => glsl.vec3(0, 0, 0), { type })
  
  wobble = createWarp(({ glsl: ad, millis: time, position}) => {
    const center = ad.vec3(0, 0, -500)
    const orig = position.sub(center)
    const origX = orig.x().div(3) //.mult(0.5)
    const origY = orig.y().div(3) //.mult(0.5)
    const origZ = orig.z().div(3) //.mult(0.5)
    const x = origX.div(100)
    const y = origY.div(100)
    const position3 = ad.vec3(origX, origY, origZ) //ad.vec3(origX, origY, origZ);
    
    const rotateX = (pos, angle) => {
      const sa = ad.sin(angle)
      const ca = ad.cos(angle)
      return ad.vec3(
        pos.x(),
        pos.y().mult(ca).sub(pos.z().mult(sa)),
        pos.y().mult(sa).add(pos.z().mult(ca)),
      )
    }

    const timeJitter = ad.sin(time.mult(0.0001)).add(1).mult(0.5)
    let offset = ad.vec3(
      ad.sin(x.mult(6).add(time.mult(0.003))).mult(5),
      ad.sin(
        x
          .mult(2)
          .add(
            time.add(timeJitter).mult(0.005)
          )
          .add(100)
      ).mult(10).mult(timeJitter.sub(1).div(10).clamp(0, 0.5).add(0.5)),
      ad.sin(x.mult(8).add(time.mult(0.006)).add(10)).mult(0.5),
    ).add(
      rotateX(
        position3,
        ad.sin(time.mult(0.001).sub(x)).add(ad.sin(time.mult(0.00025))).mult(0.5),
      ).sub(position3)
    ).add(
      rotateX(
        orig,
        ad.sin(time.mult(0.001).sub(x)).clamp(0, 1).mult(Math.PI).mult(ad.sin(time.mult(0.001)))
      ).sub(orig)
    )
    return offset
  }, { space: 'world', type })
  
  genie = createWarp(({ glsl, millis, position}) => {
    const scaledTime = millis.mult(0.0015)
    const tX = scaledTime.add(position.x().mult(0.0001)).sin()
    const tY = scaledTime.add(position.y().mult(0.003)).sin()
    
    const map = (val, fromA, fromB, toA, toB, clamp) => {
      const mapped =
        val
          .sub(fromA)
          .div(fromB.sub(fromA))
          .mult(toA.sub(toB))
          .add(toB)
      return clamp ? mapped.clamp(toA, toB) : mapped
    }
    
    let progressX = map(tX, glsl.val(-0.3), glsl.val(0.5), glsl.val(0), glsl.val(1), true)
    progressX = progressX.mult(progressX).mult(progressX)
    
    let progressY = map(tY, glsl.val(-0.5), glsl.val(0.5), glsl.val(0), glsl.val(1), true)
    progressY = progressY.mult(progressY).mult(progressY)
    
    const progress = progressY.mult(progressX)
    
    const zero = glsl.val(0)
    
    const offset = glsl.vec3(
      zero.mix(
        position.x().mult(-0.9).add(300),
        progress
      ),
      zero.mix(
        position.y().mult(-0.5).add(450),
        progress
      ),
      zero
    )
    return offset
    // return glsl.vec3(0, progress.mult(200), 0)
  }, { space: 'world', type })
  
  complex = createWarp(({ glsl, millis, position}) => {
    let offX = glsl.val(0)
    let offY = glsl.val(0)
    let offZ = glsl.val(0)
    
    let nodes = 3
    
    const iters = 200
    for (let i = 0; i < iters; i++) {
      const inputs = [position.x(), position.y(), position.z()]
      const makeOffset = () => {
        nodes += 5
        return random(inputs).mult(random(0.0001, 0.001)).add(millis.mult(random(0.0001, 0.01))).sin().mult(random(1, 500))
      }
      offX = offX.add(makeOffset())
      offY = offY.add(makeOffset())
      offZ = offZ.add(makeOffset())
    }
    offX = offX.div(iters)
    offY = offY.div(iters)
    offZ = offZ.div(iters)
    nodes += 3
    
    console.log(nodes)

    return glsl.vec3(offX, offY, offZ)
  }, { space: 'world', type })
  
  distort = createWarp(({ glsl, millis, position }) => {
    const t = millis.div(1000)
    return glsl.vec3(
      t.mult(2).add(position.y().mult(0.04)).sin().mult(15),
      t.mult(0.5).add(position.z().mult(0.02)).sin().mult(15),
      t.mult(1.5).add(position.x().mult(0.03)).sin().mult(15)
    )
  }, { space: 'world', type })
  
  distort2 = createWarp(({ glsl, millis, position }) => {
    const t = millis.div(1000)
    return glsl.vec3(
      t.mult(2).add(position.y().mult(0.4/0.02)).sin().mult(15/300),
      t.mult(0.5).add(position.z().mult(0.2/0.02)).sin().mult(15/300),
      t.mult(1.5).add(position.x().mult(0.3/0.02)).sin().mult(15/300)
    )
  }, { space: 'local', type })
  
  twist = createWarp(({ glsl, millis, position }) => {
    const center = glsl.vec3(0, 0, -500)
    const rotateX = (pos, angle) => {
      const sa = glsl.sin(angle)
      const ca = glsl.cos(angle)
      return glsl.vec3(
        pos.x(),
        pos.y().mult(ca).sub(pos.z().mult(sa)),
        pos.y().mult(sa).add(pos.z().mult(ca))
      )
    }
    
    const normPosition = position.sub(center)
    const rotated = rotateX(
      normPosition,
      position.x().mult(0.02).add(millis.div(1000))
    )
    return rotated.sub(normPosition)
  }, { space: 'world', type })
  
  flatten = createWarp(({ glsl, position }) => {
    return glsl.vec3(
      position.x().mult(-1),
      0,
      0
    )
  }, { type })
}

function draw() {
  background(255) //220
  const numSamples = 60
  const rate = frameRate()
  fpsSamples.push(rate)
  avgFps += rate/numSamples
  if (fpsSamples.length > numSamples) {
    avgFps -= fpsSamples.shift()/numSamples
  }
  fps.html(round(avgFps) + 'fps')
  
  orbitControl()
  // rotateY(PI*-0.1)
  
  push()
  noStroke()
  ambientLight(128, 128, 128)
  directionalLight(100, 100, 128, -0.8, 0, -1)
  directionalLight(30, 30, 30, 1, 1, -0.5)
  
  switch (warpPicker.value()) {
    case 'twist': {
      twist()
      break
    }
    case 'distort': {
      distort()
      break
    }
    case 'distort2': {
      distort2()
      break
    }
    case 'wobble': {
      wobble()
      break
    }
    case 'flatten': {
      flatten()
      break
    }
    case 'genie': {
      genie()
      break
    }
    case 'complex': {
      complex()
      break
    }
    default: {
      none()
      break
    }
  }
  ambientMaterial(255, 50, 50)
  specularMaterial(255, 50, 50)
  shininess(250)
  
  let geom
  switch(modelPicker.value()) {
    case 'bunny': {
      scale(1, -1, 1)
      model(bunny)
      geom = bunny
      break
    }
    case 'airplane': {
      scale(2, -2, 2)
      model(airplane)
      geom = airplane
      break
    }
    case 'dialog': {
      scale(2, 2, -2)
      model(dialog)
      geom = dialog
      break
    }
    case 'cube': {
      scale(150)
      model(cube)
      geom = cube
      break
    }
    case 'huge cube': {
      scale(150)
      model(hugeCube)
      geom = hugeCube
      break
    }
    case 'low poly cube': {
      scale(150)
      model(smallCube)
      geom = smallCube
      break
    }
    case 'sphere': {
      sphere(150, 30, 50)
      geom = _renderer.retainedMode.geometry[`ellipsoid|1|1`]
      break
    }
    case 'planeX': {
      beginShape(QUAD_STRIP)
      normal(1, 0, 0)
      vertex(0, -75, -75)
      vertex(0, -75, 75)
      vertex(0, 75, -75)
      vertex(0, 75, 75)
      endShape()
      /*rotateX(PI/2)
      plane(150, 150, 20, 20)
      geom = _renderer.retainedMode.geometry[`plane|1|1`]*/
      break
    }
    case 'planeY': {
      beginShape(QUAD_STRIP)
      normal(1, 0, 0)
      vertex(-75, 0, -75)
      vertex(-75, 0, 75)
      vertex(75, 0, -75)
      vertex(75, 0, 75)
      endShape()
      /*rotateY(PI/2)
      plane(150, 150, 20, 20)
      geom = _renderer.retainedMode.geometry[`plane|1|1`]*/
      break
    }
    case 'planeZ': {
      plane(150, 150, 20, 20)
      geom = _renderer.retainedMode.geometry[`plane|1|1`]
      break
    }
  }
  pop()
  if (geom) {
    vertCount.html(geom.vertices.length + ' vertices')
  }
}

function makeCube(detail) {
  return new p5.Geometry(detail, detail, function() {
    this.gid = `subdivCube|${detail}`;
    
    // Direction vectors for each cube axis
    const faceUVs = [
      [createVector(1, 0, 0), createVector(0, 1, 0)],
      [createVector(1, 0, 0), createVector(0, 0, 1)],
      [createVector(0, 1, 0), createVector(0, 0, 1)],
    ];
    for (const [uVec, vVec] of faceUVs) {
      
      // Make both a front and back face
      for (const side of [-1, 1]) {
        
        const normal = uVec.cross(vVec).mult(side);
        
        // This will be the index of the first vertex
        // of this face
        const vertexOffset = this.vertices.length;
        
        for (let i = 0; i < detail; i++) {
          for (let j = 0; j < detail; j++) {
            const u = i / (detail-1);
            const v = j / (detail-1);
            this.vertices.push(
              normal.copy().mult(0.5)
                .add(uVec.copy().mult(u - 0.5))
                .add(vVec.copy().mult(v - 0.5))
            );
            this.uvs.push([u, v]);
            this.vertexNormals.push(normal);
          }
        }

        for (let i = 1; i < detail; i++) {
          for (let j = 1; j < detail; j++) {
            // +--+
            //  \ |
            //    +
            this.faces.push([
              vertexOffset + (j-1)*detail + i-1,
              vertexOffset + (j-1)*detail + i,
              vertexOffset + j*detail + i,
            ]);
            
            // +
            // | \
            // +--+
            this.faces.push([
              vertexOffset + j*detail + i,
              vertexOffset + j*detail + i-1,
              vertexOffset + (j-1)*detail + i-1,
            ]);
          }
        }
      }
    }
  });
}

function keyPressed() {
  if (keyIsDown('S'.charCodeAt(0))) {
    save()
  }
}
