let bunny
let distort
let twist
let picker

function preload() {
  bunny = loadModel('bunny.obj', true)
}

function setup() {
  createCanvas(600, 600, WEBGL);
  picker = createSelect()
  picker.option('none')
  picker.option('distort')
  picker.option('twist')
  picker.selected('distort')
  
  distort = createWarp(({ glsl, millis, position }) => {
    const t = millis.div(1000)
    return glsl.vec3(
      t.mult(2).add(position.y().mult(0.04)).sin().mult(15),
      t.mult(0.5).add(position.z().mult(0.02)).sin().mult(15),
      t.mult(1.5).add(position.x().mult(0.03)).sin().mult(15)
    )
  })
  
  twist = createWarp(({ glsl, millis, position }) => {
    const rotateX = (pos, angle) => {
      const sa = glsl.sin(angle)
      const ca = glsl.cos(angle)
      return glsl.vec3(
        pos.x(),
        pos.y().mult(ca).sub(pos.z().mult(sa)),
        pos.y().mult(sa).add(pos.z().mult(ca))
      )
    }
    
    const rotated = rotateX(
      position,
      position.x().mult(0.03).add(millis.div(1000))
    )
    return rotated.sub(position)
  })
}

function draw() {
  background(220)
  
  orbitControl()
  
  push()
  noStroke()
  ambientLight(128, 128, 128)
  directionalLight(100, 100, 128, -0.8, 0, -1)
  directionalLight(30, 30, 30, 1, 1, -0.5)
  
  if (picker.value() === 'twist') {
    twist()
  } else if (picker.value() === 'distort') {
    distort()
  }
  ambientMaterial(255, 50, 50)
  specularMaterial(255, 50, 50)
  shininess(250)
  
  scale(1, -1, 1)
  model(bunny)
  pop()
}
