var canvas = document.getElementById('main-canvas');
var ctx = canvas.getContext('2d');
var canvasWidth = canvas.clientWidth;
var canvasHeight = canvas.clientHeight;
var keyPressed = {};

function Vector(x, y, z){
    this.x = x;
    this.y = y;
    this.z = z;
}

Vector.prototype.add = function(v){
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
}

Vector.prototype.multiply = function(v){
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    return this;
}

function Camera(){
    this.pos = new Vector(0, 2, -5);
    this.rot = new Vector(0, 0, 0);
    this.pos = new Vector(-4, 2, 2);
    this.rot = new Vector(0, -Math.PI / 2, 0);
    this.fovAngle = 80;
    this.focalLength = 5;
    this.fov = 2 * this.focalLength * Math.tan(this.fovAngle / 2 * Math.PI / 180)
    this.aspectRatio = 1;
}

Camera.prototype.setFov = function(fovAngle){
    this.fovAngle = fovAngle;
    this.fov = 2 * this.focalLength * Math.tan(this.fovAngle / 2 * Math.PI / 180)
}

function rotateVectorAroundOneAxis(v, axis, theta){
    // Rodrigues rotation formula: https://en.wikipedia.org/wiki/Rodrigues%27_rotation_formula
    let K = math.matrix([[0, -axis.z, axis.y], [axis.z, 0, -axis.x], [-axis.y, axis.x, 0]]);
    return math.add(v, math.add(math.multiply(Math.sin(theta), math.multiply(K, v)), math.multiply(1 - Math.cos(theta), math.multiply(K, math.multiply(K, v)))));
}

function rotateVectorAroundCameraAxis(axis, camera){
    
    let v = math.matrix([[axis.x], [axis.y], [axis.z]]);
    
    // x axis
    v = rotateVectorAroundOneAxis(v, new Vector(1, 0, 0), camera.rot.x);
    // y axis
    v = rotateVectorAroundOneAxis(v, new Vector(0, 1, 0), camera.rot.y);
    // z axis
    v = rotateVectorAroundOneAxis(v, new Vector(0, 0, 1), camera.rot.z);

    return v;

}

Camera.prototype.worldAxisRotated = function(){

    return new Vector(
        rotateVectorAroundCameraAxis(new Vector(1, 0, 0), camera),
        rotateVectorAroundCameraAxis(new Vector(0, 1, 0), camera),
        rotateVectorAroundCameraAxis(new Vector(0, 0, 1), camera),
    );

}

Camera.prototype.moveWorldAxis = function(x, y, z){
    if(x == 0 && y == 0 && z == 0) return new Vector(0, 0, 0);
    const v = math.matrix([[-x], [-y], [z]]);
    const R = camera.worldAxisRotated();
    const RM = math.matrix([[R.x.get([0,0]), R.y.get([0,0]), R.z.get([0,0])], [R.x.get([1,0]), R.y.get([1,0]), R.z.get([1,0])], [R.x.get([2, 0]), R.y.get([2, 0]), R.z.get([2, 0])]]);
    const RV = math.multiply(RM, v);
    const MV = new Vector(-RV.get([0, 0]), -RV.get([1, 0]), RV.get([2, 0]));
    return MV;

}

class Point{

    constructor(x, y, z, color){
        this.pos = new Vector(x, y, z);
        this.color = color;
    }

    distance(camera){
        return Math.sqrt(Math.pow(this.pos.x - camera.pos.x, 2) + Math.pow(this.pos.y - camera.pos.y, 2) + Math.pow(this.pos.z - camera.pos.z, 2));
    }

    render(ctx, camera){
        const T = math.matrix([[1, 0, 0, -camera.pos.x], [0, 1, 0, -camera.pos.y], [0, 0, 1, -camera.pos.z], [0, 0, 0, 1]]);
        const R = camera.worldAxisRotated();
        const RM = math.matrix([[R.x.get([0,0]), R.y.get([0,0]), R.z.get([0,0]), 0], [R.x.get([1,0]), R.y.get([1,0]), R.z.get([1,0]), 0], [R.x.get([2, 0]), R.y.get([2, 0]), R.z.get([2, 0]), 0], [0, 0, 0, 0]])
        const XYZM = math.multiply(RM, math.multiply(T, math.matrix([[this.pos.x], [this.pos.y], [this.pos.z], [1]])));
        var X = XYZM.get([0, 0]);
        var Y = XYZM.get([1, 0]);
        var Z = XYZM.get([2, 0]);
        if(Z <= 0) return;
        var x = camera.focalLength * X / Z;
        var y = camera.focalLength * Y / Z;
        ctx.fillStyle = this.color;
        ctx.fillRect(x*canvasWidth/(camera.fov) - 5 + canvasWidth/2, -y*canvasWidth/(camera.fov / camera.aspectRatio) - 5 + canvasHeight/2, 10, 10);
    }

}

var camera = new Camera();

/*
var points = [
    new Point(0, 0, 2),
    new Point(0, 2, 2),
    new Point(0, 2, 1),
    new Point(0, 0, 1),
    new Point(2, 0, 1),
    new Point(2, 2, 1),
    new Point(2, 2, 2),
    new Point(2, 0, 2),
    new Point(0, 0, 2),
];

for(var i = 0; i < 8; i++){
    if(points[i].pos.x != points[i+1].pos.x){
        var p1 = Math.min(points[i].pos.x, points[i+1].pos.x);
        var p2 = Math.max(points[i].pos.x, points[i+1].pos.x);
        for(var j = p1 + 0.1; j < p2; j += 0.1) points.push(new Point(j, points[i].pos.y, points[i].pos.z));
    }else if(points[i].pos.y != points[i+1].pos.y){
        var p1 = Math.min(points[i].pos.y, points[i+1].pos.y);
        var p2 = Math.max(points[i].pos.y, points[i+1].pos.y);
        for(var j = p1 + 0.1; j < p2; j += 0.1) points.push(new Point(points[i].pos.x, j, points[i].pos.z));
    }else{
        var p1 = Math.min(points[i].pos.z, points[i+1].pos.z);
        var p2 = Math.max(points[i].pos.z, points[i+1].pos.z);
        for(var j = p1 + 0.1; j < p2; j += 0.1) points.push(new Point(points[i].pos.x, points[i].pos.y, j));
    }
}*/

var points = [
    new Point(0, 0, 0),
]

for(var i = 0.1; i <= 4; i += 0.1) points.push(new Point(i, 0, 0, "#ff0000"));
for(var i = 0.1; i <= 4; i += 0.1) points.push(new Point(0, i, 0, "#00ff00"));
for(var i = 0.1; i <= 4; i += 0.1) points.push(new Point(0, 0, i, "#0000ff"));

function render(){
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    points.forEach((point) => point.render(ctx, camera));
}

const movementSpeed = 0.1;
const rotationSpeed = Math.PI / 100;

setInterval(function(){
    var dx = 0, dy = 0, dz = 0;
    if(keyPressed["w"]) dz = movementSpeed;
    if(keyPressed["a"]) dx = -movementSpeed;
    if(keyPressed["s"]) dz = -movementSpeed;
    if(keyPressed["d"]) dx = movementSpeed;
    if(keyPressed[" "]) dy = movementSpeed;
    if(keyPressed["Shift"]) dy = -movementSpeed;
    camera.pos.add(camera.moveWorldAxis(dx, dy, dz));

    dx = 0, dy = 0, dz = 0;
    if(keyPressed["ArrowUp"]) dx -= rotationSpeed;
    if(keyPressed["ArrowDown"]) dx += rotationSpeed;
    if(keyPressed["ArrowRight"]) dy += rotationSpeed;
    if(keyPressed["ArrowLeft"]) dy -= rotationSpeed;
    if(keyPressed["/"]) dz += rotationSpeed;
    if(keyPressed["."]) dz -= rotationSpeed;
    camera.rot.x += dx;
    camera.rot.y += dy;
    camera.rot.z += dz;
    //camera.rot.add(camera.moveWorldAxis(dx, dy, 0));
    //camera.rot.z += 0.01;
    points.sort(function(a,b){
        return b.distance(camera) - a.distance(camera);
    });
    render();
}, 50);

document.onkeyup = function(event) {
	keyPressed[event.key] = false;
}

document.onkeydown = function(event) {
    keyPressed[event.key] = true;
}