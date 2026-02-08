# 🎛️ Three.js Audio Reactive Cube Visualizer

A real-time WebGL visual built with **Three.js** featuring a spinning cube, figure-8 motion, microphone-driven scaling, and a particle spark system.

Designed for live visuals, experiments with audiovisual interaction, and easy modification for performances or installations.

---

## Preview

![Demo GIF](./media/demo.gif)

---

## ✨ Features

- 🎥 Perspective camera with depth fog for cinematic falloff  
- 🧊 Rotating cube using normal shading  
- ♾️ Figure-8 movement path in 3D space  
- 🎆 Additive particle sparks that respawn from the cube  
- 🎨 Optional multicolor or gold particles  
- 🎙️ Microphone input → real-time scale reaction  
- ⌨️ Keyboard control for manual growth / shrink  
- 🧩 Modular config flags to quickly enable / disable systems

---

## ⚙️ Configuration

All major systems can be toggled from the config object at the top of the file:

```js
const config = {
    audioReaction: false,
    movement: true,
    rotation: true,
    particleColors: true,
    particles: true
};