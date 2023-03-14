var gl;
var points = [];
var normals = [];
var texCoords = [];

var program0, program1, program2;
var modelMatrixLoc0, viewMatrixLoc0, modelMatrixLoc1, viewMatrixLoc1, modelMatrixLoc2, viewMatrixLoc2;

var trballMatrix = mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
var vertCubeStart, numVertCubeTri, vertPyraStart, numVertPyraTri, vertGroundStart, numVertGroundTri, vertGoalStart, numVertGoalTri;

var eyePos = vec3(0.0, 0.0, 20.0);
var atPos = vec3(0.0, 0.0, 0.0);
var upVec = vec3(0.0, 1.0, 0.0);
var cameraVec = vec3(0.0, 0.0, -0.5); 

const moveLeft = 0;
const moveRight = 1;
const moveUp = 2;
const moveDown = 3;

var theta = 0;
var prevTime = new Date();

var objectPos = [];
var goalPos = [];
var objectDirection = true;

const groundScale = 20;
var audio = new Audio('../source/artoo.wav');

function detectCollision(newPosX, newPosZ) {
    if (newPosX < -4 || newPosX > 4 || newPosZ < -groundScale || newPosZ > groundScale)
        
    return true;
    
    for (var index = 0; index < objectPos.length-5; index++){
        if (Math.abs(newPosX - objectPos[index][0]) < 1.2 &&  Math.abs(newPosZ - objectPos[index][2]) < 1.2) {
            audio.play();
            alert("GAME OVER .. ");
            
            document.location.href = "project.html";
            return true;
        }
    }
    for (var index = 0; index < goalPos.length-5; index++){
        if (Math.abs(newPosX - goalPos[index][0]) < 5.0 &&  Math.abs(newPosZ - goalPos[index][2]) < 1.0) {
            alert("GAME CLEAR !!");
            document.location.href = "project.html";
            return true;
        }
    }
    return false;
};

window.onload = function init()
{
    var canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if( !gl ) {
        alert("WebGL isn't available!");
    }

    generateTexGround(groundScale);
    generateTexCube();
    generateGoal();

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Enable hidden-surface removal
    gl.enable(gl.DEPTH_TEST);

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(0.01, 1);

    // Load shaders and initialize attribute buffers
    program0 = initShaders(gl, "colorVS", "colorFS");
    gl.useProgram(program0);

    // Load the data into the GPU
    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    // Associate our shader variables with our data buffer
    var vPosition = gl.getAttribLocation(program0, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    modelMatrixLoc0 = gl.getUniformLocation(program0, "modelMatrix");
    viewMatrixLoc0 = gl.getUniformLocation(program0, "viewMatrix");
    
    // 3D perspective viewing
    var aspect = canvas.width / canvas.height;
    var projectionMatrix = perspective(90, aspect, 0.1, 100); 

    var projectionMatrixLoc = gl.getUniformLocation(program0, "projectionMatrix");
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    // program1 : Phong Shading
    program1 = initShaders(gl, "phongVS", "phongFS");
    gl.useProgram(program1);

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    vPosition = gl.getAttribLocation(program1, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var nBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(program1, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    modelMatrixLoc1 = gl.getUniformLocation(program1, "modelMatrix");
    viewMatrixLoc1 = gl.getUniformLocation(program1, "viewMatrix");

    projectionMatrixLoc = gl.getUniformLocation(program1, "projectionMatrix");
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
    setLighting(program1);

    // Texture Mapping
    program2 = initShaders(gl, "texMapVS", "texMapFS");
    gl.useProgram(program2);

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    vPosition = gl.getAttribLocation(program2, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, nBufferId);
    vNormal = gl.getAttribLocation(program2, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    var tBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);

    var vTexCoord = gl.getAttribLocation(program2, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    modelMatrixLoc2 = gl.getUniformLocation(program2, "modelMatrix");
    viewMatrixLoc2 = gl.getUniformLocation(program2, "viewMatrix");

    projectionMatrixLoc = gl.getUniformLocation(program2, "projectionMatrix");
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
    
    setLighting(program2);
    setTexture();

    render();
};

function cameraMove(direction) {
    var sinTheta = Math.sin(0.1);
    var cosTheta = Math.cos(0.1);
    switch (direction) {
        case moveLeft:
            var newVecX = cosTheta * cameraVec[0] + sinTheta * cameraVec[2];
            var newVecZ = -sinTheta * cameraVec[0] + cosTheta * cameraVec[2];
            cameraVec[0] = newVecX;
            cameraVec[2] = newVecZ;
            break;
        case moveRight:
            var newVecX = cosTheta * cameraVec[0] - sinTheta * cameraVec[2];
            var newVecZ = sinTheta * cameraVec[0] + cosTheta * cameraVec[2];
            cameraVec[0] = newVecX;
            cameraVec[2] = newVecZ;
            break;
        case moveUp:
            var newPosX = eyePos[0] + 0.5 * cameraVec[0];
            var newPosZ = eyePos[2] + 0.5 * cameraVec[2];
            if (!detectCollision(newPosX, newPosZ)) {
                eyePos[0] = newPosX;
                eyePos[2] = newPosZ;
            }
            break;
        case moveDown:
            var newPosX = eyePos[0] - 0.5 * cameraVec[0];
            var newPosZ = eyePos[2] - 0.5 * cameraVec[2];
            if (!detectCollision(newPosX, newPosZ)) {
                eyePos[0] = newPosX;
                eyePos[2] = newPosZ;
            }
            break;
    }
    render();
};

window.onkeydown = function(event) { 
    switch (event.keyCode) {
        case 37:    // left arrow
        case 65:    // 'A'
        case 97:    // 'a'
            cameraMove(moveLeft);
            break;
        case 39:    // right arrow
        case 68:    // 'D'
        case 100:   // 'd'
            cameraMove(moveRight);
            break;
        case 38:    // up arrow
        case 87:    // 'W'
        case 119:   // 'w'
            cameraMove(moveUp);
            break;
        case 40:    // down arrow
        case 83:    // 'S'
        case 115:   // 's'
            cameraMove(moveDown);
            break;
    }
    render();
};

function setLighting(program) {
    var lightSrc = [0.0, 1.0, 0.0, 0.0];
    var lightAmbient = [0.0, 0.0, 0.0, 1.0];
    var lightDiffuse = [1.0, 1.0, 1.0, 1.0];
    var lightSpecular = [1.0, 1.0, 1.0, 1.0];
    
    var matAmbient = [1.0, 1.0, 1.0, 1.0];
    var matDiffuse = [1.0, 1.0, 1.0, 1.0];
    var matSpecular = [1.0, 1.0, 1.0, 1.0];
    
    var ambientProduct = mult(lightAmbient, matAmbient);
    var diffuseProduct = mult(lightDiffuse, matDiffuse);
    var specularProduct = mult(lightSpecular, matSpecular);

    gl.uniform4fv(gl.getUniformLocation(program, "lightSrc"), lightSrc);
    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), ambientProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), diffuseProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), specularProduct);

    gl.uniform1f(gl.getUniformLocation(program, "shininess"), 100.0);
    gl.uniform3fv(gl.getUniformLocation(program, "eyePos"), flatten(eyePos));

    gl.uniform1f(gl.getUniformLocation(program, "fogStart"), 0.0);
    gl.uniform1f(gl.getUniformLocation(program, "fogEnd"), 8.0);
    gl.uniform1f(gl.getUniformLocation(program, "fogColor"), 1.0, 0.0, 0.0, 0.0);
};

// 텍스처
function setTexture() {
    var image0 = new Image();
    image0.src = "../source/desert.bmp"

    var texture0 = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image0);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    var image1 = new Image();
    image1.src = "../source/monster.bmp"

    var texture1 = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image1);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

var render = function () {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let currTime = new Date();
    let elapsedTime = currTime.getTime() - prevTime.getTime();
    theta += (elapsedTime / 10); 
    prevTime = currTime;

    atPos[0] = eyePos[0] + cameraVec[0];
    atPos[1] = eyePos[1] + cameraVec[1];
    atPos[2] = eyePos[2] + cameraVec[2];
    var viewMatrix = lookAt(eyePos, atPos, upVec);
    gl.useProgram(program0);
    gl.uniformMatrix4fv(viewMatrixLoc0, false, flatten(viewMatrix));
    gl.useProgram(program1);
    gl.uniformMatrix4fv(viewMatrixLoc1, false, flatten(viewMatrix));
    gl.uniform3fv(gl.getUniformLocation(program1, "eyePos"), flatten(eyePos));
    gl.useProgram(program2);
    gl.uniformMatrix4fv(viewMatrixLoc2, false, flatten(viewMatrix));
    gl.uniform3fv(gl.getUniformLocation(program2, "eyePos"), flatten(eyePos));

    var textureLoc = gl.getUniformLocation(program2, "texture");

    // draw the ground
    gl.useProgram(program2);
    gl.uniform1i(textureLoc, 0);

    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(trballMatrix));
    gl.drawArrays(gl.TRIANGLES, vertGroundStart, numVertGroundTri);

    //// draw the goal
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(trballMatrix));
    gl.drawArrays(gl.TRIANGLES, vertGoalStart, numVertGoalTri);

    // draw a cube
    gl.uniform1i(textureLoc, 1);
    var rMatrix = mult(rotateY(theta), rotateZ(90));

    modelMatrix = mult(translate(-1, -0.5, 5), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(-1, -0.5, 5));

    modelMatrix = mult(translate(2, -0.5, 7), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, 10, 7);
    objectPos.push(vec3(2, -0.5, 7));

    modelMatrix = mult(translate(-1, -0.5, 5), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, 10, 7);
    objectPos.push(vec3(-1, -0.5, 5));

    modelMatrix = mult(translate(2, -0.5, 7), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(2, -0.5, 7));

    modelMatrix = mult(translate(3, -0.5, -2), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(3, -0.5, -2));

    modelMatrix = mult(translate(-2, -0.5, -4), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(-2, -0.5, -4));

    modelMatrix = mult(translate(-3, -0.5, 8), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(-3, -0.5, 8));

    modelMatrix = mult(translate(-1, -0.5, 13), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(-1, -0.5, 13));

    modelMatrix = mult(translate(-3, -0.5, 16), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(3, -0.5, 16));

    modelMatrix = mult(translate(1, -0.5, -16), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(1, -0.5, -16));

    modelMatrix = mult(translate(2, -0.5, 17), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(2, -0.5, 17));

    modelMatrix = mult(translate(1, -0.5, -16), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(-1, -0.5, 13));

    modelMatrix = mult(translate(-2, -0.5, -12), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(-2, -0.5, 12));

    modelMatrix = mult(translate(-2, 0.5, -12), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(-2, 0.5, 12));

    modelMatrix = mult(translate(-1, 0.5, 5), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(-1, 0.5, 5));

    modelMatrix = mult(translate(2, 0.5, 7), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(2,  0.5, 7));

    modelMatrix = mult(translate(3,  0.5, -2), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(3,  0.5, -2));

    modelMatrix = mult(translate(-2,  0.5, -4), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(-2,  0.5, -4));

    modelMatrix = mult(translate(-3, 0.5, 8), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(-3,  0.5, 8));

    modelMatrix = mult(translate(-1, 0.5, 13), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(-1, 0.5, 13));

    modelMatrix = mult(translate(-3, 0.5, 16), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(3, 0.5, 16));

    modelMatrix = mult(translate(1, 0.5, -16), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(1, 0.5, -16));

    modelMatrix = mult(translate(2, 0.5, 17), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(2, 0.5, 17));

    modelMatrix = mult(translate(1, 0.5, -16), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(1, 0.5, -16));
    
    modelMatrix = mult(translate(2, -0.5, -11), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(2, -0.5, -11));
    
    modelMatrix = mult(translate(2, 0.5, -11), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(2, 0.5, -11));
    
    modelMatrix = mult(translate(1, -0.7, 0), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(1, -0.5, 0));
    
    modelMatrix = mult(translate(-2, -0.5, 2), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(-2, -0.5, 2));

    modelMatrix = mult(translate(2, -0.5, 11), rMatrix);
    modelMatrix = mult(trballMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc2, false, flatten(modelMatrix));
    gl.drawArrays(gl.TRIANGLES, vertCubeStart, numVertCubeTri);
    objectPos.push(vec3(2, -0.5, 11));

    window.requestAnimationFrame(render);
}

function generateTexCube() {
    vertCubeStart = points.length;
    numVertCubeTri = 0;
    texQuad(1, 0, 3, 2);
    texQuad(2, 3, 7, 6);
    texQuad(3, 0, 4, 7);
    texQuad(4, 5, 6, 7);
    texQuad(5, 4, 0, 1);
    texQuad(6, 5, 1, 2);
}

function texQuad(a, b, c, d) {
    vertexPos = [
        vec4(-0.5, -1, -0.5, 1.0),
        vec4( 0.5, -1, -0.5, 1.0),
        vec4( 0.5,  1, -0.5, 1.0),
        vec4(-0.5,  1, -0.5, 1.0),
        vec4(-0.5, -1,  0.5, 1.0),
        vec4( 0.5, -1,  0.5, 1.0),
        vec4( 0.5,  1,  0.5, 1.0),
        vec4(-0.5,  1,  0.5, 1.0)
    ];

    vertexNormals = [
        vec4(-0.2, -0.2 -0.2, 0.0),
        vec4( -0.2, -0.2, -0.2, 0.0),
        vec4( -0.2,  0.2, -0.2, 0.0),
        vec4(-0.2,  0.2, -0.2, 0.0),
        vec4(-0.2, -0.2,  0.2, 0.0),
        vec4( -0.2, -0.2,  0.2, 0.0),
        vec4( -0.2,  0.2,  0.2, 0.0),
        vec4(-0.2,  0.2,  0.2, 0.0)
    ];

    var texCoord = [
        vec2(0, 0),
        vec2(0, 1),
        vec2(1, 1),
        vec2(1, 0)
    ];

    points.push(vertexPos[a]);
    normals.push(vertexNormals[a]);
    texCoords.push(texCoord[0]);
    numVertCubeTri++;

    points.push(vertexPos[b]);
    normals.push(vertexNormals[b]);
    texCoords.push(texCoord[1]);
    numVertCubeTri++;

    points.push(vertexPos[c]);
    normals.push(vertexNormals[c]);
    texCoords.push(texCoord[2]);
    numVertCubeTri++;

    points.push(vertexPos[a]);
    normals.push(vertexNormals[a]);
    texCoords.push(texCoord[0]);
    numVertCubeTri++;

    points.push(vertexPos[c]);
    normals.push(vertexNormals[c]);
    texCoords.push(texCoord[2]);
    numVertCubeTri++;

    points.push(vertexPos[d]);
    normals.push(vertexNormals[d]);
    texCoords.push(texCoord[3]);
    numVertCubeTri++;
}

function generateTexGround(scale) {
    vertGroundStart = points.length;
    numVertGroundTri = 0;
    for(var x=-4; x<4; x++) {
        for(var z=-scale; z<scale; z++) {
            points.push(vec4(x, -1.0, z, 1.0));
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(0, 0));
            numVertGroundTri++;

            points.push(vec4(x, -1.0, z+1, 1.0));
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(0, 1));
            numVertGroundTri++;

            points.push(vec4(x+1, -1.0, z+1, 1.0));
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(1, 1));
            numVertGroundTri++;

            points.push(vec4(x, -1.0, z, 1.0));
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(0, 0));
            numVertGroundTri++;

            points.push(vec4(x+1, -1.0, z+1, 1.0));
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(1, 1));
            numVertGroundTri++;

            points.push(vec4(x+1, -1.0, z, 1.0));
            normals.push(vec4(0.0, 1.0, 0.0, 0.0));
            texCoords.push(vec2(1, 0));
            numVertGroundTri++;
        }
    }
}

function generateGoal() {
    vertGoalStart = points.length;
    numVertGoalTri = 0;
    quad(1, 0, 3, 2);
    quad(2, 3, 7, 6);
    quad(3, 0, 4, 7);
    quad(4, 5, 6, 7);
    quad(5, 4, 0, 1);
    quad(6, 5, 1, 2);
}

function quad(a, b, c, d) {
    vertexPos = [
        vec4(-3.8, -0.2, -19.0, 1.0),
        vec4( 3.8, -0.2, -19.0, 1.0),
        vec4( 3.8,  0.0, -19.0, 1.0),
        vec4(-3.8,  0.0, -19.0, 1.0),
        vec4(-3.8, -0.2, -20.0, 1.0),
        vec4( 3.8, -0.2, -20.0, 1.0),
        vec4( 3.8,  0.0, -20.0, 1.0),
        vec4(-3.8,  0.0, -20.0, 1.0)
    ];

    vertexNormals = [
        vec4(-0.2, -0.2 -0.2, 0.0),
        vec4( -0.2, -0.2, -0.2, 0.0),
        vec4( -0.2,  0.2, -0.2, 0.0),
        vec4(-0.2,  0.2, -0.2, 0.0),
        vec4(-0.2, -0.2,  0.2, 0.0),
        vec4( -0.2, -0.2,  0.2, 0.0),
        vec4( -0.2,  0.2,  0.2, 0.0),
        vec4(-0.2,  0.2,  0.2, 0.0)
    ];

    var texCoord = [
        vec2(0, 0),
        vec2(0, 1),
        vec2(1, 1),
        vec2(1, 0)
    ];

    goalPos.push(vec3(-3.8, -0.2, -19.0));
    goalPos.push(vec3( 3.8, -0.2, -19.0));
    goalPos.push(vec3( 3.8,  0.0, -19.0));
    goalPos.push(vec3(-3.8,  0.0, -19.0));
    goalPos.push(vec3(-3.8, -0.2, -20.0));
    goalPos.push(vec3( 3.8, -0.2, -20.0));
    goalPos.push(vec3( 3.8,  0.0, -20.0));
    goalPos.push(vec3(-3.8,  0.0, -20.0));

    points.push(vertexPos[a]);
    normals.push(vertexNormals[a]);
    texCoords.push(texCoord[0]);
    numVertGoalTri++;

    points.push(vertexPos[b]);
    normals.push(vertexNormals[b]);
    texCoords.push(texCoord[1]);
    numVertGoalTri++;

    points.push(vertexPos[c]);
    normals.push(vertexNormals[c]);
    texCoords.push(texCoord[2]);
    numVertGoalTri++;

    points.push(vertexPos[a]);
    normals.push(vertexNormals[a]);
    texCoords.push(texCoord[0]);
    numVertGoalTri++;

    points.push(vertexPos[c]);
    normals.push(vertexNormals[c]);
    texCoords.push(texCoord[2]);
    numVertGoalTri++;

    points.push(vertexPos[d]);
    normals.push(vertexNormals[d]);
    texCoords.push(texCoord[3]);
    numVertGoalTri++;
}