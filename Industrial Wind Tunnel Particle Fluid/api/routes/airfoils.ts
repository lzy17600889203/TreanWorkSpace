
import express from 'express';
import { db } from '../db.js';

const router = express.Router();

router.get('/', (req, res) =&gt; {
  const airfoils = db.getAllAirfoils();
  res.json({
    success: true,
    data: airfoils
  });
});

router.get('/:id', (req, res) =&gt; {
  const id = parseInt(req.params.id);
  const airfoil = db.getAirfoilById(id);
  
  if (!airfoil) {
    return res.status(404).json({
      success: false,
      error: 'Airfoil not found'
    });
  }
  
  res.json({
    success: true,
    data: airfoil
  });
});

router.post('/', (req, res) =&gt; {
  const data = req.body;
  
  if (!data.name || !data.reynoldsNumber || !data.coordinates) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    });
  }
  
  const airfoil = db.createAirfoil(data);
  res.status(201).json({
    success: true,
    data: airfoil
  });
});

router.put('/:id', (req, res) =&gt; {
  const id = parseInt(req.params.id);
  const data = req.body;
  
  const airfoil = db.updateAirfoil(id, data);
  
  if (!airfoil) {
    return res.status(404).json({
      success: false,
      error: 'Airfoil not found'
    });
  }
  
  res.json({
    success: true,
    data: airfoil
  });
});

router.delete('/:id', (req, res) =&gt; {
  const id = parseInt(req.params.id);
  const success = db.deleteAirfoil(id);
  
  if (!success) {
    return res.status(404).json({
      success: false,
      error: 'Airfoil not found'
    });
  }
  
  res.json({
    success: true
  });
});

export default router;
