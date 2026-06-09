const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/scenes', async (req, res) => {
  try {
    const scenes = await db.all('SELECT * FROM scenes');
    const scenesWithDetails = [];
    
    for (const scene of scenes) {
      const actors = await db.all(
        'SELECT a.* FROM actors a JOIN scene_actors sa ON a.id = sa.actor_id WHERE sa.scene_id = ?',
        [scene.id]
      );
      const equipment = await db.all(
        'SELECT e.* FROM equipment e JOIN scene_equipment se ON e.id = se.equipment_id WHERE se.scene_id = ?',
        [scene.id]
      );
      const location = scene.location_id 
        ? await db.get('SELECT * FROM locations WHERE id = ?', [scene.location_id])
        : null;
      
      scenesWithDetails.push({
        id: scene.id,
        name: scene.name,
        startDate: scene.start_date,
        endDate: scene.end_date,
        location: location,
        actors: actors,
        equipment: equipment,
        color: scene.color
      });
    }
    
    res.json(scenesWithDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/scenes', async (req, res) => {
  try {
    const { name, startDate, endDate, locationId, color, actorIds, equipmentIds } = req.body;
    const result = await db.run(
      'INSERT INTO scenes (name, start_date, end_date, location_id, color) VALUES (?, ?, ?, ?, ?)',
      [name, startDate, endDate, locationId, color]
    );
    
    if (actorIds && actorIds.length > 0) {
      for (const actorId of actorIds) {
        await db.run('INSERT INTO scene_actors (scene_id, actor_id) VALUES (?, ?)', [result.lastID, actorId]);
      }
    }
    
    if (equipmentIds && equipmentIds.length > 0) {
      for (const equipId of equipmentIds) {
        await db.run('INSERT INTO scene_equipment (scene_id, equipment_id) VALUES (?, ?)', [result.lastID, equipId]);
      }
    }
    
    res.json({ id: result.lastID, name, startDate, endDate, color });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/scenes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate, locationId, color, actorIds, equipmentIds } = req.body;
    
    await db.run(
      'UPDATE scenes SET name = ?, start_date = ?, end_date = ?, location_id = ?, color = ? WHERE id = ?',
      [name, startDate, endDate, locationId, color, id]
    );
    
    await db.run('DELETE FROM scene_actors WHERE scene_id = ?', [id]);
    await db.run('DELETE FROM scene_equipment WHERE scene_id = ?', [id]);
    
    if (actorIds && actorIds.length > 0) {
      for (const actorId of actorIds) {
        await db.run('INSERT INTO scene_actors (scene_id, actor_id) VALUES (?, ?)', [id, actorId]);
      }
    }
    
    if (equipmentIds && equipmentIds.length > 0) {
      for (const equipId of equipmentIds) {
        await db.run('INSERT INTO scene_equipment (scene_id, equipment_id) VALUES (?, ?)', [id, equipId]);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/scenes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM scene_actors WHERE scene_id = ?', [id]);
    await db.run('DELETE FROM scene_equipment WHERE scene_id = ?', [id]);
    await db.run('DELETE FROM scenes WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/actors', async (req, res) => {
  try {
    const actors = await db.all('SELECT * FROM actors');
    res.json(actors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/locations', async (req, res) => {
  try {
    const locations = await db.all('SELECT * FROM locations');
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/equipment', async (req, res) => {
  try {
    const equipment = await db.all('SELECT * FROM equipment');
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function datesOverlap(start1, end1, start2, end2) {
  const s1 = new Date(start1);
  const e1 = new Date(end1);
  const s2 = new Date(start2);
  const e2 = new Date(end2);
  return s1 <= e2 && s2 <= e1;
}

router.get('/conflicts', async (req, res) => {
  try {
    const scenes = await db.all('SELECT * FROM scenes');
    const actors = await db.all('SELECT * FROM actors');
    const locations = await db.all('SELECT * FROM locations');
    const conflicts = [];
    
    for (let i = 0; i < scenes.length; i++) {
      for (let j = i + 1; j < scenes.length; j++) {
        const s1 = scenes[i];
        const s2 = scenes[j];
        
        if (datesOverlap(s1.start_date, s1.end_date, s2.start_date, s2.end_date)) {
          const scene1Actors = await db.all(
            'SELECT a.* FROM actors a JOIN scene_actors sa ON a.id = sa.actor_id WHERE sa.scene_id = ?',
            [s1.id]
          );
          const scene2Actors = await db.all(
            'SELECT a.* FROM actors a JOIN scene_actors sa ON a.id = sa.actor_id WHERE sa.scene_id = ?',
            [s2.id]
          );
          
          for (const a1 of scene1Actors) {
            for (const a2 of scene2Actors) {
              if (a1.id === a2.id) {
                conflicts.push({
                  type: a1.is_lead ? 'lead_actor' : 'actor',
                  description: `${a1.name} 档期冲突`,
                  sceneIds: [s1.id, s2.id]
                });
              }
            }
          }
          
          if (s1.location_id && s2.location_id) {
            const loc1 = locations.find(l => l.id === s1.location_id);
            const loc2 = locations.find(l => l.id === s2.location_id);
            if (loc1 && loc2 && loc1.lat && loc1.lng && loc2.lat && loc2.lng) {
              const distance = calculateDistance(loc1.lat, loc1.lng, loc2.lat, loc2.lng);
              if (distance > 50) {
                conflicts.push({
                  type: 'distance',
                  description: `${loc1.name} 和 ${loc2.name} 距离过远 (${Math.round(distance)}km)`,
                  sceneIds: [s1.id, s2.id]
                });
              }
            }
          }
        }
      }
    }
    
    const uniqueConflicts = [];
    const seen = new Set();
    for (const conflict of conflicts) {
      const key = `${conflict.type}-${conflict.sceneIds.sort().join('-')}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueConflicts.push(conflict);
      }
    }
    
    res.json(uniqueConflicts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
