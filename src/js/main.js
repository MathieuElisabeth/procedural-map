import * as THREE from 'three'
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls"
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
 import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createNoise2D } from 'simplex-noise';
 
 // envmap https://polyhaven.com/a/herkulessaulen
 
 const scene = new THREE.Scene();
 scene.background = new THREE.Color("#FFEECC");
 
 const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
 camera.position.set(-17,31,33);

const sizes = {
   width: window.innerWidth,
   height: window.innerHeight
}
 
 const renderer = new THREE.WebGLRenderer({ antialias: true });
 renderer.setSize(sizes.width, sizes.height)
 renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
 renderer.toneMapping = THREE.ACESFilmicToneMapping;
 renderer.outputEncoding = THREE.sRGBEncoding;
 renderer.physicallyCorrectLights = true;
 renderer.shadowMap.enabled = true;
 renderer.shadowMap.type = THREE.PCFSoftShadowMap;
 document.body.appendChild(renderer.domElement);
 
 const light = new THREE.PointLight( new THREE.Color("#FFCB8E").convertSRGBToLinear().convertSRGBToLinear(), 500, 600 );
 light.position.set(10, 20, 10);
 
 light.castShadow = true; 
 light.shadow.mapSize.width = 512; 
 light.shadow.mapSize.height = 512; 
 light.shadow.camera.near = 0.5; 
 light.shadow.camera.far = 500; 
 scene.add( light );
 
 const controls = new OrbitControls(camera, renderer.domElement);
 controls.target.set(0,0,0);
 controls.dampingFactor = 0.05;
 controls.enableDamping = true;
 
 let pmrem = new THREE.PMREMGenerator(renderer);
 pmrem.compileEquirectangularShader();
 
 let envmap;
 
 const MAX_HEIGHT = 10;
 
 (async function() {
   let envmapTexture = await new RGBELoader().loadAsync("./assets/envmap.hdr");
   let rt = pmrem.fromEquirectangular(envmapTexture);
   envmap = rt.texture;
 
   let textures = {
     dirt: await new THREE.TextureLoader().loadAsync("./assets/dirt.png"),
     dirt2: await new THREE.TextureLoader().loadAsync("./assets/dirt2.jpg"),
     grass: await new THREE.TextureLoader().loadAsync("./assets/grass.jpg"),
     sand: await new THREE.TextureLoader().loadAsync("./assets/sand.jpg"),
     water: await new THREE.TextureLoader().loadAsync("./assets/water.jpg"),
     stone: await new THREE.TextureLoader().loadAsync("./assets/stone.png"),
   };
 
   const noise2D = createNoise2D();
 
   for(let i = -20; i <= 20; i++) {
     for(let j = -20; j <= 20; j++) {
       let position = tileToPosition(i, j);
 
       if(position.length() > 16) continue;
       
       let noise = (noise2D(i * 0.1, j * 0.1) + 1) * 0.5;
       noise = Math.pow(noise, 1.5);
 
       hex(noise * MAX_HEIGHT, position, envmap);
     } 
   }
 
   let stoneMesh = hexMesh(stoneGeo, textures.stone);
   let grassMesh = hexMesh(grassGeo, textures.grass);
   let dirt2Mesh = hexMesh(dirt2Geo, textures.dirt2);
   let dirtMesh  = hexMesh(dirtGeo, textures.dirt);
   let sandMesh  = hexMesh(sandGeo, textures.sand);
   scene.add(stoneMesh, dirtMesh, dirt2Mesh, sandMesh, grassMesh);
 
   let seaTexture = textures.water;
   seaTexture.repeat = new THREE.Vector2(1, 1);
   seaTexture.wrapS = THREE.RepeatWrapping;
   seaTexture.wrapT = THREE.RepeatWrapping;
 
   let seaMesh = new THREE.Mesh(
     new THREE.CylinderGeometry(17, 17, MAX_HEIGHT * 0.2, 50),
     new THREE.MeshPhysicalMaterial({
       envMap: envmap,
       color: new THREE.Color("#55aaff").convertSRGBToLinear().multiplyScalar(3),
       ior: 1.4,
       transmission: 1,
       transparent: true,
       thickness: 1.5,
       envMapIntensity: 0.2, 
       roughness: 1,
       metalness: 0.025,
       roughnessMap: seaTexture,
       metalnessMap: seaTexture,
     })
   );
   seaMesh.receiveShadow = true;
   seaMesh.rotation.y = -Math.PI * 0.333 * 0.5;
   seaMesh.position.set(0, MAX_HEIGHT * 0.1, 0);
   scene.add(seaMesh);
 
 
   let mapContainer = new THREE.Mesh(
     new THREE.CylinderGeometry(17.1, 17.1, MAX_HEIGHT * 0.25, 50, 1, true),
     new THREE.MeshPhysicalMaterial({
       envMap: envmap,
       map: textures.dirt,
       envMapIntensity: 0.2, 
       side: THREE.DoubleSide,
     })
   );
   mapContainer.receiveShadow = true;
   mapContainer.rotation.y = -Math.PI * 0.333 * 0.5;
   mapContainer.position.set(0, MAX_HEIGHT * 0.125, 0);
   scene.add(mapContainer);
 
   let mapFloor = new THREE.Mesh(
     new THREE.CylinderGeometry(18.5, 18.5, MAX_HEIGHT * 0.1, 50),
     new THREE.MeshPhysicalMaterial({
       envMap: envmap,
       map: textures.dirt2,
       envMapIntensity: 0.1, 
       side: THREE.DoubleSide,
     })
   );
   mapFloor.receiveShadow = true;
   mapFloor.position.set(0, -MAX_HEIGHT * 0.05, 0);
   scene.add(mapFloor);
 
   clouds();
 
   renderer.setAnimationLoop(() => {
     controls.update();
     renderer.render(scene, camera);
   });
 })();

 /**
 * Sizes
 */

window.addEventListener('resize', () => {
  // Update sizes
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  // Update camera
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()

  // Update renderer
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

 
 function tileToPosition(tileX, tileY) {
   return new THREE.Vector2((tileX + (tileY % 2) * 0.5) * 1.77, tileY * 1.535);
 }
 
 function hexGeometry(height, position) {
   let geo  = new THREE.CylinderGeometry(1, 1, height, 6, 1, false);
   geo.translate(position.x, height * 0.5, position.y);
 
   return geo;
 }
 
 const STONE_HEIGHT = MAX_HEIGHT * 0.8;
 const DIRT_HEIGHT = MAX_HEIGHT * 0.7;
 const GRASS_HEIGHT = MAX_HEIGHT * 0.5;
 const SAND_HEIGHT = MAX_HEIGHT * 0.3;
 const DIRT2_HEIGHT = MAX_HEIGHT * 0;
 
 let stoneGeo = new THREE.BoxGeometry(0,0,0);
 let dirtGeo = new THREE.BoxGeometry(0,0,0);
 let dirt2Geo = new THREE.BoxGeometry(0,0,0);
 let sandGeo = new THREE.BoxGeometry(0,0,0);
 let grassGeo = new THREE.BoxGeometry(0,0,0);
 
 function hex(height, position) {
   let geo = hexGeometry(height, position);
 
   if(height > STONE_HEIGHT) {
     stoneGeo = mergeBufferGeometries([geo, stoneGeo]);
 
     if(Math.random() > 0.8) {
       stoneGeo = mergeBufferGeometries([stoneGeo, stone(height, position)]);
     }
   } else if(height > DIRT_HEIGHT) {
     dirtGeo = mergeBufferGeometries([geo, dirtGeo]);
 
     if(Math.random() > 0.8) {
       grassGeo = mergeBufferGeometries([grassGeo, tree(height, position)]);
     }
   } else if(height > GRASS_HEIGHT) {
     grassGeo = mergeBufferGeometries([geo, grassGeo]);
   } else if(height > SAND_HEIGHT) { 
     sandGeo = mergeBufferGeometries([geo, sandGeo]);
 
     if(Math.random() > 0.8 && stoneGeo) {
       stoneGeo = mergeBufferGeometries([stoneGeo, stone(height, position)]);
     }
   } else if(height > DIRT2_HEIGHT) {
     dirt2Geo = mergeBufferGeometries([geo, dirt2Geo]);
   } 
 }
 
 function hexMesh(geo, map) {
   let mat = new THREE.MeshPhysicalMaterial({ 
     envMap: envmap, 
     envMapIntensity: 0.135, 
     flatShading: true,
     map
   });
 
   let mesh = new THREE.Mesh(geo, mat);
   mesh.castShadow = true; //default is false
   mesh.receiveShadow = true; //default
 
   return mesh;
 }
 
 function tree(height, position) {
   const treeHeight = Math.random() * 1 + 1.25;
 
   const geo = new THREE.CylinderGeometry(0, 1.5, treeHeight, 3);
   geo.translate(position.x, height + treeHeight * 0 + 1, position.y);
   
   const geo2 = new THREE.CylinderGeometry(0, 1.15, treeHeight, 3);
   geo2.translate(position.x, height + treeHeight * 0.6 + 1, position.y);
   
   const geo3 = new THREE.CylinderGeometry(0, 0.8, treeHeight, 3);
   geo3.translate(position.x, height + treeHeight * 1.25 + 1, position.y);
 
   return mergeBufferGeometries([geo, geo2, geo3]);
 }
 
 function stone(height, position) {
   const px = Math.random() * 0.4;
   const pz = Math.random() * 0.4;
 
   const geo = new THREE.SphereGeometry(Math.random() * 0.3 + 0.1, 7, 7);
   geo.translate(position.x + px, height, position.y + pz);
 
   return geo;
 }
 
 function clouds() {
   let geo = new THREE.SphereGeometry(0, 0, 0); 
   let count = Math.floor(Math.pow(Math.random(), 0.45) * 4);
 
   for(let i = 0; i < count; i++) {
     const puff1 = new THREE.SphereGeometry(1.2, 7, 7);
     const puff2 = new THREE.SphereGeometry(1.5, 7, 7);
     const puff3 = new THREE.SphereGeometry(0.9, 7, 7);
    
     puff1.translate(-1.85, Math.random() * 0.3, 0);
     puff2.translate(0,     Math.random() * 0.3, 0);
     puff3.translate(1.85,  Math.random() * 0.3, 0);
 
     const cloudGeo = mergeBufferGeometries([puff1, puff2, puff3]);
     cloudGeo.translate( 
       Math.random() * 20 - 10, 
       Math.random() * 7 + 7, 
       Math.random() * 20 - 10
     );
     cloudGeo.rotateY(Math.random() * Math.PI * 2);
 
     geo = mergeBufferGeometries([geo, cloudGeo]);
   }
   
   const mesh = new THREE.Mesh(
     geo,
     new THREE.MeshStandardMaterial({
       envMap: envmap, 
       envMapIntensity: 0.75, 
       flatShading: true,
       // transparent: true,
       // opacity: 0.85,
     })
   );
 
   scene.add(mesh);
 }