
const airfoils = [
  {
    id: 1,
    name: 'NACA 0012',
    description: '对称翼型，基础研究用',
    reynoldsNumber: 500000,
    coordinates: [
      { x: 0, y: 0 },
      { x: 0.1, y: 0.06 },
      { x: 0.2, y: 0.08 },
      { x: 0.3, y: 0.09 },
      { x: 0.4, y: 0.09 },
      { x: 0.5, y: 0.08 },
      { x: 0.6, y: 0.07 },
      { x: 0.7, y: 0.05 },
      { x: 0.8, y: 0.03 },
      { x: 0.9, y: 0.01 },
      { x: 1, y: 0 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Clark Y',
    description: '经典通用翼型',
    reynoldsNumber: 300000,
    coordinates: [
      { x: 0, y: 0 },
      { x: 0.1, y: 0.07 },
      { x: 0.2, y: 0.1 },
      { x: 0.3, y: 0.11 },
      { x: 0.4, y: 0.1 },
      { x: 0.5, y: 0.09 },
      { x: 0.6, y: 0.07 },
      { x: 0.7, y: 0.05 },
      { x: 0.8, y: 0.03 },
      { x: 0.9, y: 0.01 },
      { x: 1, y: 0 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let nextId = 3;

export const db = {
  getAllAirfoils: () =&gt; [...airfoils],
  
  getAirfoilById: (id) =&gt; 
    airfoils.find(a =&gt; a.id === id),
  
  createAirfoil: (data) =&gt; {
    const airfoil = {
      ...data,
      id: nextId++,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    airfoils.push(airfoil);
    return airfoil;
  },
  
  updateAirfoil: (id, data) =&gt; {
    const index = airfoils.findIndex(a =&gt; a.id === id);
    if (index === -1) return null;
    
    airfoils[index] = {
      ...airfoils[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    return airfoils[index];
  },
  
  deleteAirfoil: (id) =&gt; {
    const index = airfoils.findIndex(a =&gt; a.id === id);
    if (index === -1) return false;
    
    airfoils.splice(index, 1);
    return true;
  }
};
