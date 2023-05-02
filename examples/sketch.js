let bunny
let cube
let distort
let twist
let warpPicker
let objPicker

function preload() {
  bunny = loadModel('bunny.obj', true)
}

function setup() {
  createCanvas(600, 600, WEBGL);
  cube = makeCube(12)
  warpPicker = createSelect()
  warpPicker.option('none')
  warpPicker.option('distort')
  warpPicker.option('twist')
  warpPicker.selected('distort')
  objPicker = createSelect()
  objPicker.option('bunny')
  objPicker.option('sphere')
  objPicker.option('cube')
  objPicker.selected('bunny')
  
  distort = createWarp(({ glsl, millis, position }) => {
    const t = millis.div(1000)
    return glsl.vec3(
      t.mult(2).add(position.y().mult(0.04)).sin().mult(15),
      t.mult(0.5).add(position.z().mult(0.02)).sin().mult(15),
      t.mult(1.5).add(position.x().mult(0.03)).sin().mult(15)
    )
  }, { space: 'world' })
  
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
  }, { space: 'world' })
}

function draw() {
  background(220)
  
  orbitControl()
  
  push()
  noStroke()
  ambientLight(128, 128, 128)
  directionalLight(100, 100, 128, -0.8, 0, -1)
  directionalLight(30, 30, 30, 1, 1, -0.5)
  
  if (warpPicker.value() === 'twist') {
    twist()
  } else if (warpPicker.value() === 'distort') {
    distort()
  }
  ambientMaterial(255, 50, 50)
  specularMaterial(255, 50, 50)
  shininess(250)
  
  if (objPicker.value() === 'bunny') {
    scale(1, -1, 1)
    model(bunny)
  } else if (objPicker.value() === 'sphere') {
    sphere(180, 30, 50)
  } else {
    scale(150)
    model(cube)
  }
  pop()
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
