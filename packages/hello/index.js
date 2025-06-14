import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const textureLoader = new THREE.TextureLoader();

function main() {
  // 创建场景
  const scene = new THREE.Scene();

  // 创建相机
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(10, 8, 10);
  camera.lookAt(0, 0, 0);

  // 创建渲染器
  const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#webgl'),
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  // 添加轨道控制器
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  // controls.enableZoom = true;
  // controls.enablePan = true;
  // controls.enableRotate = true;
  // controls.enableDamping = true;
  // controls.dampingFactor = 0.25;

  // 修改拖拽相关变量，支持多个可移动物体
  let isDragging = false;
  let selectedObject = null;
  const mouse = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersectionPoint = new THREE.Vector3();
  const offset = new THREE.Vector3();
  let targetPosition = new THREE.Vector3();
  
  // 可移动物体列表
  const draggableObjects = new Set();

  function makeObjectDraggable(object) {
    draggableObjects.add(object);
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.cursor = 'pointer';
      }
    });
  }

  // 添加鼠标事件监听器
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('mouseup', onMouseUp);

  function onMouseDown(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      const object = intersects[0].object;
      // 检查是否点击的是可拖动物体的一部分
      let parent = object;
      while (parent.parent && !(parent instanceof THREE.Scene)) {
        if (draggableObjects.has(parent)) {
          controls.enabled = false;
          isDragging = true;
          selectedObject = parent;

          raycaster.ray.intersectPlane(plane, intersectionPoint);
          offset.copy(selectedObject.position).sub(intersectionPoint);
          break;
        }
        parent = parent.parent;
      }
    }
  }

  function onMouseMove(event) {
    if (isDragging && selectedObject) {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      raycaster.ray.intersectPlane(plane, intersectionPoint);
      
      targetPosition.copy(intersectionPoint).add(offset);
      // 限制沙发在房间范围内移动
      targetPosition.x = Math.max(-4, Math.min(4, targetPosition.x));
      targetPosition.z = Math.max(-4, Math.min(4, targetPosition.z));
      
      selectedObject.position.copy(targetPosition);
    }
  }

  function onMouseUp() {
    isDragging = false;
    selectedObject = null;
    controls.enabled = true;
  }

  // 创建房间
  function createRoom() {
    const room = new THREE.Group();

    // 地板
    const gridSize = 100; // 网格大小
    const gridDivisions = 100; // 网格分割数
    
    // 创建网格辅助对象
    const grid = new THREE.GridHelper(gridSize, gridDivisions, 0x888888, 0x888888);
    grid.position.y = 0.01; // 稍微抬高一点，避免z-fighting
    room.add(grid);

    // 圆形地板
    const floorGeometry = new THREE.CircleGeometry(50, 64); // 半径50，64个分段
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.8,
      transparent: true,
      opacity: 0.9
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI * 0.5;
    floor.receiveShadow = true;
    room.add(floor);

    // 墙壁
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x404040,
      roughness: 0.7
    });

    // 后墙
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 4),
      wallMaterial
    );
    backWall.position.z = -5;
    backWall.position.y = 2;
    room.add(backWall);

    // 左墙
    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 4),
      wallMaterial
    );
    leftWall.position.x = -5;
    leftWall.position.y = 2;
    leftWall.rotation.y = Math.PI * 0.5;
    room.add(leftWall);

    // 右墙
    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 4),
      wallMaterial
    );
    rightWall.position.x = 5;
    rightWall.position.y = 2;
    rightWall.rotation.y = -Math.PI * 0.5;
    room.add(rightWall);

    return room;
  }

  // 创建乒乓球桌
  function createPingPongTable() {
    const table = new THREE.Group();

    // 桌面
    const tableTop = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.1, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x2e8b57 })
    );
    tableTop.position.y = 0.76;
    table.add(tableTop);

    // 桌子腿
    const legGeometry = new THREE.BoxGeometry(0.1, 0.75, 0.1);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });

    const positions = [
      [-1.4, 0.375, 0.8],
      [1.4, 0.375, 0.8],
      [-1.4, 0.375, -0.8],
      [1.4, 0.375, -0.8]
    ];

    positions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(...pos);
      table.add(leg);
    });

    // 网
    const net = new THREE.Mesh(
      new THREE.PlaneGeometry(0.01, 0.15, 1.8),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
      })
    );
    net.position.y = 0.86;
    net.rotation.y = Math.PI * 0.5;
    table.add(net);

    return table;
  }

  // 创建门
  function createDoor() {
    const door = new THREE.Group();

    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.2, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    door.add(doorFrame);

    return door;
  }

  // 创建窗户
  function createWindow(width = 1.5, height = 1.2) {
    const window = new THREE.Group();

    // 加载窗户纹理
    const windowTexture = textureLoader.load('https://www.shutterstock.com/image-photo/young-woman-stands-on-wooden-600w-585464885.jpg');
    windowTexture.wrapS = THREE.RepeatWrapping;
    windowTexture.wrapT = THREE.RepeatWrapping;
    windowTexture.repeat.set(1, 1);

    const windowMaterial = new THREE.MeshStandardMaterial({
      map: windowTexture,
      transparent: true,
      opacity: 0.8,
      metalness: 0.3,
      roughness: 0.2
    });

    const windowFrame = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 0.1),
      windowMaterial
    );
    window.add(windowFrame);

    // 添加调整尺寸的方法
    window.resize = function(newWidth, newHeight) {
      windowFrame.geometry.dispose();
      windowFrame.geometry = new THREE.BoxGeometry(newWidth, newHeight, 0.1);
    };

    return window;
  }

  // 创建沙发
  function createSofa() {
    const sofa = new THREE.Group();

    // 加载沙发纹理
    const sofaTexture = textureLoader.load('https://www.shutterstock.com/image-photo/young-woman-stands-on-wooden-600w-585464885.jpg');
    sofaTexture.wrapS = THREE.RepeatWrapping;
    sofaTexture.wrapT = THREE.RepeatWrapping;
    sofaTexture.repeat.set(2, 2);

    const sofaMaterial = new THREE.MeshStandardMaterial({
      map: sofaTexture,
      roughness: 0.8,
      metalness: 0.2
    });

    // 沙发座位
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.5, 0.8),
      sofaMaterial
    );
    sofa.add(seat);

    // 沙发靠背
    const backrest = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.8, 0.2),
      sofaMaterial
    );
    backrest.position.z = -0.3;
    backrest.position.y = 0.4;
    sofa.add(backrest);

    return sofa;
  }
  // 创建床
  function createBed() {
    const bed = new THREE.Group();

    const bedFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.5, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x404040 })
    );
    bed.add(bedFrame);
  }

  // 添加灯光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 5, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // 创建并添加所有物体
  const room = createRoom();
  scene.add(room);

  const table = createPingPongTable();
  table.position.set(0, 0, 0);
  scene.add(table);
  makeObjectDraggable(table);  // 使乒乓球桌可拖动

  const door = createDoor();
  door.position.set(-2, 1.1, -4.9);
  scene.add(door);

  const windowMesh = createWindow(2, 1.5);
  windowMesh.position.set(4, 1.8, -4.9);
  scene.add(windowMesh);

  // 示例：3秒后改变窗户大小
  setTimeout(() => {
    windowMesh.resize(1.5, 1.2);
  }, 3000);

  const sofa = createSofa();
  sofa.position.set(4, 0.25, 2);
  sofa.rotation.y = Math.PI * 0.5;
  scene.add(sofa);
  makeObjectDraggable(sofa);  // 使沙发可拖动

  // const bed = createBed();
  // bed.position.set(4, 0.25, 2);
  // scene.add(bed);

  // 动画循环
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  // 处理窗口大小变化
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();

}

window.addEventListener('load', main);