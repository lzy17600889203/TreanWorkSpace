
import { create } from 'zustand';

const presetConfigs = {
  smooth: {
    count: 100000,
    speed: 0.5,
    windAngle: 0,
    turbulence: 0.1,
    color: '#00d4ff',
    showPressure: false
  },
  stall: {
    count: 120000,
    speed: 0.6,
    windAngle: 25,
    turbulence: 0.8,
    color: '#ff6b35',
    showPressure: true
  },
  underpressure: {
    count: 80000,
    speed: 0.4,
    windAngle: 0,
    turbulence: 0.5,
    color: '#fff44f',
    showPressure: true
  },
  crosswind: {
    count: 110000,
    speed: 0.7,
    windAngle: 45,
    turbulence: 0.6,
    color: '#888888',
    showPressure: false
  }
};

export const useAppStore = create((set) =&gt; ({
  currentPreset: 'smooth',
  particleConfig: {
    count: 100000,
    speed: 0.5,
    windAngle: 0,
    turbulence: 0.1,
    color: '#00d4ff',
    showPressure: false
  },
  
  setPreset: (preset) =&gt; set((state) =&gt; ({
    currentPreset: preset,
    particleConfig: {
      ...state.particleConfig,
      ...presetConfigs[preset]
    }
  })),
  
  updateParticleConfig: (config) =&gt; set((state) =&gt; ({
    particleConfig: {
      ...state.particleConfig,
      ...config
    }
  }))
}));
