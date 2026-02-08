import * as THREE from 'three';

// Configuration
const config = {
    audioReaction: false,      // Enable/Disable audio reactivity
    movement: true,           // Enable/Disable figure-8 movement
    rotation: true,           // Enable/Disable cube spinning
    particleColors: true,     // Enable/Disable multicolored sparks (true = random, false = gold)
    particles: true           // Enable/Disable particle system entirely
};

// Scene setup
const scene = new THREE.Scene();
// Add fog to hide particle spawn/death and enhance depth
scene.fog = new THREE.FogExp2(0x000000, 0.1);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create Cube
const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshNormalMaterial(); 
const cube = new THREE.Mesh(geometry, material);

// Initial angle (tilted)
cube.rotation.x = 0.5;
cube.rotation.z = 0.5;

scene.add(cube);

// --- Particle System for Sparks ---
const particleCount = 100; // Reduced count for majesty
const particlesGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);
const particleColors = new Float32Array(particleCount * 3);
const particleVelocities = []; // Store custom velocity per particle

for (let i = 0; i < particleCount; i++) {
    // Reset function helper
    resetParticle(i, true);
}

function resetParticle(i, initial = false) {
    // Spawn particles relative to the cube's current position and scale
    // If it's the initial setup, we don't have a valid scale/position history, 
    // but the cube starts at 0,0,0 with scale 1.
    
    // Get current scale (use x as representative since it's uniform)
    // We access the cube object directly. 
    // Note: cube.scale might be 0 initially if not set, but we set it in animate.
    // However, animate hasn't run yet during initial setup.
    const currentScale = cube.scale.x || 1.0; 
    
    // Random position within the cube's volume (or slightly larger)
    // We want them to spawn "at" the cube.
    const range = 1.0 * currentScale;
    
    const xOffset = (Math.random() - 0.5) * range;
    const yOffset = (Math.random() - 0.5) * range;
    const zOffset = (Math.random() - 0.5) * range;
    
    // Base position is the cube's position
    const startX = cube.position.x + xOffset;
    const startY = cube.position.y + yOffset;
    const startZ = cube.position.z + zOffset;
    
    // If initial, scatter them along the Z path so they don't all start at 0
    const initialZScatter = initial ? Math.random() * 10 : 0;

    particlePositions[i * 3] = startX;
    particlePositions[i * 3 + 1] = startY;
    particlePositions[i * 3 + 2] = startZ + initialZScatter;
    
    // Velocity: Moving towards camera (+Z) but slower ("majestic")
    // More randomness in direction
    particleVelocities[i] = {
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: 0.05 + Math.random() * 0.05 // Slower speed towards camera
    };

    // Random Color: Blue, Purple, Red or Gold based on config
    let color;
    if (config.particleColors) {
        const colors = [
            new THREE.Color(0x0000ff), // Blue
            new THREE.Color(0x800080), // Purple
            new THREE.Color(0xff0000)  // Red
        ];
        color = colors[Math.floor(Math.random() * colors.length)];
    } else {
        color = new THREE.Color(0xffaa00); // Gold
    }
    
    particleColors[i * 3] = color.r;
    particleColors[i * 3 + 1] = color.g;
    particleColors[i * 3 + 2] = color.b;
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
particlesGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

// Create a simple texture for the spark
const sprite = new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/spark1.png');

const particlesMaterial = new THREE.PointsMaterial({
    vertexColors: true,
    size: 0.2,
    map: sprite,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.6 // Slightly more transparent
});

const particles = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particles);


// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Keyboard controls state
const keyState = {
    grow: false,
    shrink: false
};

// Event listeners for keyboard
window.addEventListener('keydown', (event) => {
    if (event.key === '1') {
        keyState.grow = true;
    }
    if (event.key.toLowerCase() === 'q') {
        keyState.shrink = true;
    }
});

window.addEventListener('keyup', (event) => {
    if (event.key === '1') {
        keyState.grow = false;
    }
    if (event.key.toLowerCase() === 'q') {
        keyState.shrink = false;
    }
});

// --- Audio Visualizer Setup ---
let analyser;
let dataArray;
let isAudioInitialized = false;

async function initAudio() {
    if (isAudioInitialized) return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; // Controls the detail of the frequency data
        
        source.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        isAudioInitialized = true;
        
        // Hide overlay
        const overlay = document.getElementById('overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        
        console.log("Audio initialized");
    } catch (err) {
        console.error("Error initializing audio:", err);
        alert("Could not access microphone. Please ensure you have granted permission.");
    }
}

// Initialize audio on first click
window.addEventListener('click', () => {
    initAudio();
});

// Base scale variable to separate manual scaling from audio reaction
let baseScale = 1.0;
let scaleFactor = 70;

// Movement variables
let time = 0;

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Spin the cube
    if (config.rotation) {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
    }

    // --- Figure 8 Movement ---
    // x = A * sin(t)
    // z = B * sin(2t)
    // Adjust speed based on depth (z). 
    // If z is negative (deep), we want it slower.
    
    if (config.movement) {
        // Calculate current depth from previous frame (or approximation) to adjust speed
        // Normalized depth: when z is -2 (deep), we want speed ~0.5. When z is 0 or +2, speed ~1.0.
        // Our z range is roughly -2 to +2.
        // Let's create a speed modifier.
        const currentZ = cube.position.z;
        // Map -2..2 to 0.5..1.5 roughly
        // When z is low (-2), factor is small.
        const speedMod = 0.005 * (1 + (currentZ + 2) / 4); 
        
        time += speedMod;
        
        cube.position.x = 4 * Math.sin(time);
        // Use cos(2t) or sin(2t) for figure 8. 
        // Standard Lemniscate is x = cos(t), y = sin(2t) / 2.
        // We want XZ plane.
        cube.position.z = 2 * Math.sin(2 * time);
    }

    
    // Animate Particles
    particles.visible = config.particles;
    if (config.particles) {
        const positions = particles.geometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
            // Update position based on velocity
            positions[i * 3] += particleVelocities[i].x;
            positions[i * 3 + 1] += particleVelocities[i].y;
            positions[i * 3 + 2] += particleVelocities[i].z;
            
            // If particle passes the camera or goes too far, respawn it at the cube
            // Camera is at z=5.
            if (positions[i * 3 + 2] > 6) {
                resetParticle(i);
            }
        }
        particles.geometry.attributes.position.needsUpdate = true;
        particles.geometry.attributes.color.needsUpdate = true;
    }

    // Handle manual scaling (updates baseScale)
    const scaleSpeed = 0.02;
    if (keyState.grow) {
        baseScale += scaleSpeed;
    }
    if (keyState.shrink) {
        if (baseScale > 0.1) {
            baseScale -= scaleSpeed;
        }
    }

    // Audio reactivity
    let audioScale = 0;
    if (config.audioReaction && isAudioInitialized && analyser) {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // Map average volume to a scale factor
        audioScale = average / scaleFactor; 
    }

    // Apply combined scale
    const finalScale = baseScale + audioScale;
    
    cube.scale.set(finalScale, finalScale, finalScale);

    renderer.render(scene, camera);
}

animate();
