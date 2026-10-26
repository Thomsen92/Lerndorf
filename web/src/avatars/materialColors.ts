import { Color, Mesh, Material, Object3D, MeshStandardMaterial } from 'three';
import type { AvatarLook, ColorChannel } from './look';
type TintUniforms = {
  shopTint: { value: Color };
  shopEnabled: { value: number };
  shopHairTint: { value: Color };
  shopHairEnabled: { value: number };
  shopRef: { value: number };
};
/** Each instance owns materials, while cached geometries and textures remain shared. */
export function prepareColors(root: Object3D): { apply(look: AvatarLook): void; dispose(): void } {
  const materials: Material[] = [],
    entries: Array<{ mode: string; u: TintUniforms }> = [];
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const clone = (source: Material) => {
      const mat = source.clone() as MeshStandardMaterial;
      materials.push(mat);
      const mode = String(mat.userData.customizationChannel ?? '');
      if (!['tshirt', 'pants', 'shoes', 'hair', 'skin', 'mixed', 'pantsSolid', 'skinSolid'].includes(mode))
        return mat;
      const u: TintUniforms = {
        shopTint: { value: new Color(1, 1, 1) },
        shopEnabled: { value: 0 },
        shopHairTint: { value: new Color(1, 1, 1) },
        shopHairEnabled: { value: 0 },
        shopRef: { value: Number(mat.userData.referenceLuminance) || 0.3 },
      };
      entries.push({ mode, u });
      mat.customProgramCacheKey = () => `wardrobe-v1-${mode}`;
      mat.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, u);
        shader.fragmentShader = `uniform vec3 shopTint;uniform vec3 shopHairTint;uniform float shopEnabled;uniform float shopHairEnabled;uniform float shopRef;\n${shader.fragmentShader}`;
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <map_fragment>',
          `#include <map_fragment>
vec3 shopOriginal=diffuseColor.rgb;
float shopLum=dot(shopOriginal,vec3(.2126,.7152,.0722));
float shopMask=1.;
${
  mode === 'skin' || mode === 'mixed'
    ? `vec3 shopSRGB=pow(max(shopOriginal,vec3(0.)),vec3(1./2.2));
float shopMax=max(shopSRGB.r,max(shopSRGB.g,shopSRGB.b));float shopMin=min(shopSRGB.r,min(shopSRGB.g,shopSRGB.b));
shopMask=smoothstep(.28,.43,shopMax)*smoothstep(.035,.10,shopMax-shopMin);
shopMask*=smoothstep(.01,.06,shopSRGB.r-shopSRGB.b)*smoothstep(.012,.055,shopSRGB.g-shopSRGB.b);`
    : ''
}
float shopShade=clamp(pow(max(shopLum,.001)/shopRef,.62),.12,1.55);
diffuseColor.rgb=mix(shopOriginal,shopTint*shopShade,shopMask*shopEnabled);
${
  mode === 'mixed'
    ? `float shopBrown=(1.-shopMask)*smoothstep(.025,.065,shopSRGB.r-shopSRGB.b);
float shopHairShade=clamp(pow(max(shopLum,.001)/.07,.62),.12,1.55);
diffuseColor.rgb=mix(diffuseColor.rgb,shopHairTint*shopHairShade,shopBrown*shopHairEnabled);`
    : ''
}`,
        );
      };
      return mat;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clone) : clone(mesh.material);
  });
  return {
    apply(look) {
      for (const { mode, u } of entries) {
        const channel = (
          mode === 'tshirt'
            ? 'top'
            : mode.startsWith('pants')
              ? 'bottoms'
              : mode === 'skinSolid' || mode === 'mixed'
                ? 'skin'
                : mode
        ) as ColorChannel;
        const color = look.colors[channel];
        u.shopEnabled.value = color ? 1 : 0;
        if (color) u.shopTint.value.set(color);
        u.shopHairEnabled.value = mode === 'mixed' && look.colors.hair ? 1 : 0;
        if (look.colors.hair) u.shopHairTint.value.set(look.colors.hair);
      }
    },
    dispose() {
      for (const m of materials) m.dispose();
    },
  };
}
