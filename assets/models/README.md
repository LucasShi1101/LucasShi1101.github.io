# Plato portrait scan

`plato-portrait.glb` and `plato-poster.png` come from [Portrait of Plato](https://zenodo.org/records/21692807) by Scan-the-World (DOI: 10.5281/zenodo.21692807), licensed [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). The model is the normalized 0.100 GLB supplied by the archive. The poster is its r270 preview. The page recolors and animates the 3D mesh, and displays attribution beside it.

The rotating line drawing is rendered from this GLB's mesh edges and silhouette. Line art is a rendering style rather than a separate 3D file format; a fixed view could instead be exported as SVG.

The local Three.js modules and Draco decoder in `../js/third-party/three/` are from [Three.js 0.160.1](https://github.com/mrdoob/three.js/tree/r160) under the MIT license.
