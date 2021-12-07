var canvas = document.getElementById('main-canvas');
var ctx = canvas.getContext('2d');
var canvasWidth = canvas.clientWidth;
var canvasHeight = canvas.clientHeight;
var keyPressed = {};

function Vector(x, y="inv", z=false){
    if(y == "inv"){
        y = x.y;
        z = x.z;
        x = x.x;
    }
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
    if(typeof v != 'Vector') v = new Vector(v, v, v);
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    return this;
}

Vector.prototype.mag = function(){
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
}

Vector.prototype.unit = function(){
    return new Vector(this).multiply(1/this.mag());
}

Vector.prototype.dot = function(v){
    return this.x * v.x + this.y * v.y + this.z * v.z;
}

Vector.prototype.cross = function(v){
    return new Vector(
        this.y * v.z - this.z * v.y,
        this.z * v.x - this.x * v.z,
        this.x * v.y - this.y * v.x,
    );
}

function Quaternion(r, i, j="false", k="false"){
    this.r = r;
    this.c = (j=="false") ? i : new Vector(i, j, k);
}

Quaternion.prototype.add = function(q){
    this.r += q.r;
    this.c.add(q.c);
    return this;
}

Quaternion.prototype.multiply = function(q){
    var p0q0 = this.r * q.r;
    var pdq = this.c.dot(q.c);
    var p0q = new Vector(q.c).multiply(this.r);
    var pq0 = new Vector(this.c).multiply(q.r);
    var pcq = this.c.cross(q.c);
    return new Quaternion(
        p0q0 - pdq,
        p0q.add(pq0.add(pcq)),
    )
}

Quaternion.prototype.conjugate = function(){
    return new Quaternion(
        this.r,
        new Vector(this.c).multiply(-1),
    )
}

function constructRotationQuaternion(v, theta){
    v = v.unit();
    return new Quaternion(
        Math.cos(theta/2),
        v.x * Math.sin(theta/2),
        v.y * Math.sin(theta/2),
        v.z * Math.sin(theta/2),
    );
}

function multiplyByConjugate(q, v){
    return v.multiply(q.r * q.r - q.c.mag() * q.c.mag()).add(q.c.multiply(2 * q.c.dot(v))).add(q.c.cross(v).multiply(2 * q.r));
}

function Camera(){
    // gimbal lock
    this.pos = new Vector(0, 2, -5);
    this.rot = new Vector(0, 0, 0); // euler rotations 
    this.fovAngle = 80;
    this.fov = 2 * Math.tan(this.fovAngle / 2 * Math.PI / 180)
    this.aspectRatio = 1;
}

Camera.prototype.totalRotation = function(){
    let total_rotation = new Quaternion(1, 0, 0, 0);
    let xrotq = constructRotationQuaternion(new Vector(1, 0, 0), this.rot.x / 2);
    total_rotation = xrotq.multiply(total_rotation);
    let yrotq = constructRotationQuaternion(new Vector(0, 1, 0), this.rot.y / 2);
    total_rotation = yrotq.multiply(total_rotation);
    let zrotq = constructRotationQuaternion(new Vector(0, 0, 1), this.rot.z / 2);
    total_rotation = zrotq.multiply(total_rotation);
    return total_rotation;
}

Camera.prototype.worldAxisRotated = function(){

    let total_rotation = this.totalRotation();
    let r = total_rotation.r, x = total_rotation.c.x, y = total_rotation.c.y, z = total_rotation.c.z;
    return new Vector(
        math.matrix([[1 - 2 * y * y - 2 * z * z], [2 * x * y - 2 * r * z], [2 * x * z + 2 * r * y]]),
        math.matrix([[2 * x * y + 2 * r * z], [1 - 2 * x * x - 2 * z * z], [2 * y * z - 2 * r * x]]),
        math.matrix([[2 * x * z - 2 * r * y], [2 * y * z + 2 * r * x], [1 - 2 * x * x - 2 * y * y]]),
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

    canvasPosition(camera){
        const T = math.matrix([[1, 0, 0, -camera.pos.x], [0, 1, 0, -camera.pos.y], [0, 0, 1, -camera.pos.z], [0, 0, 0, 1]]);
        const R = camera.worldAxisRotated();
        const RM = math.matrix([[R.x.get([0,0]), R.y.get([0,0]), R.z.get([0,0]), 0], [R.x.get([1,0]), R.y.get([1,0]), R.z.get([1,0]), 0], [R.x.get([2, 0]), R.y.get([2, 0]), R.z.get([2, 0]), 0], [0, 0, 0, 0]])
        const XYZM = math.multiply(RM, math.multiply(T, math.matrix([[this.pos.x], [this.pos.y], [this.pos.z], [1]])));
        var X = XYZM.get([0, 0]);
        var Y = XYZM.get([1, 0]);
        var Z = XYZM.get([2, 0]);
        let total_rotation = camera.totalRotation();
        let rotated = total_rotation.multiply(new Quaternion(0, this.pos.x - camera.pos.x, this.pos.y - camera.pos.y, this.pos.z - camera.pos.z).multiply(total_rotation.conjugate()));
        //X = rotated.c.x;
        //Y = rotated.c.y;
        //Z = rotated.c.z;
        var x = X / Z;
        var y = Y / Z;
        return new Vector(
            x*canvasWidth/(camera.fov) - 5 + canvasWidth/2,
            -y*canvasWidth/(camera.fov / camera.aspectRatio) - 5 + canvasHeight/2,
            Z,
        );
    }

    render(ctx, camera){
        let pos = this.canvasPosition(camera);
        if(pos.z <= 0) return;
        ctx.fillStyle = this.color;
        ctx.fillRect(pos.x, pos.y, 10, 10);
    }

}

class Polygon{

    constructor(points, color="#000"){
        this.points = points;
        this.points.push(this.points[0]);
        this.color = color;
    }

    distance(camera){
        var td = 0;
        for(var i = 0; i < this.points.length; i++){
            td += this.points[i].distance(camera);
        }
        return td/this.points.length;
    }

    render(ctx, camera){
        var path = new Path2D();
        var p1v = this.points[0].canvasPosition(camera);
        var allz
        path.moveTo(p1v.x, p1v.y);
        for(var i = 1; i < this.points.length; i++){
            var pv = this.points[i].canvasPosition(camera);
            if(pv.z <= 0) return;
            path.lineTo(pv.x, pv.y);
        }
        ctx.fillStyle = this.color;
        ctx.fill(path);
    }
}


var camera = new Camera();

var points = [
    //new Point(0, 0, 0),
]

/*
for(var i = 0.1; i <= 4; i += 0.1) points.push(new Point(i, 0, 0, "#ff0000"));
for(var i = 0.1; i <= 4; i += 0.1) points.push(new Point(0, i, 0, "#00ff00"));
for(var i = 0.1; i <= 4; i += 0.1) points.push(new Point(0, 0, i, "#0000ff"));
*/

var polygons = [
    new Polygon([
        new Point(0, 0, 0),
        new Point(0, 4, 0),
        new Point(0, 4, 4),
        new Point(0, 0, 4),
    ], "#00ff00"),
    new Polygon([
        new Point(0, 0, 0),
        new Point(4, 0, 0),
        new Point(4, 4, 0),
        new Point(0, 4, 0),
    ], "#ff0000"),
    new Polygon([
        new Point(0, 0, 0),
        new Point(0, 0, 4),
        new Point(4, 0, 4),
        new Point(4, 0, 0),
    ], "#0000ff"),
    new Polygon([
        new Point(4, 0, 0),
        new Point(4, 4, 0),
        new Point(4, 4, 4),
        new Point(4, 0, 4),
    ], "#00ff00"),
    new Polygon([
        new Point(0, 0, 4),
        new Point(4, 0, 4),
        new Point(4, 4, 4),
        new Point(0, 4, 4),
    ], "#ff0000"),
    new Polygon([
        new Point(0, 4, 0),
        new Point(0, 4, 4),
        new Point(4, 4, 4),
        new Point(4, 4, 0),
    ], "#0000ff"),
]

function render(){
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    points.forEach((point) => point.render(ctx, camera));
    polygons.forEach((polygon) => polygon.render(ctx, camera));
    ctx.fillStyle = "#000";
    ctx.fillRect(canvasWidth/2 - 2, canvasHeight/2 - 2, 4, 4);
}

const movementSpeed = 0.1;
const rotationSpeed = Math.PI / 100;

let interv = setInterval(function(){
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
    points.sort(function(a,b){
        return b.distance(camera) - a.distance(camera);
    });
    polygons.sort(function(a,b){
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

function stopCode(){
    clearInterval(interv);
}