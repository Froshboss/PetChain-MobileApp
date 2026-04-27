import express from 'express';

import { ok, sendError } from '../response';
import { petRepository } from '../../src/repositories/petRepository';
import { userRepository } from '../../src/repositories/userRepository';
import { type StoredMedicalRecord, type StoredPet, store } from '../store';

const router = express.Router();

async function ownerSummary(ownerId: string) {
  const u = await userRepository.findById(ownerId);
  if (!u) return undefined;
  return { id: u.id, name: u.name, email: u.email };
}

async function toPetResponse(p: any) {
  return {
    id: p.id,
    name: p.name,
    species: p.species,
    breed: p.breed,
    dateOfBirth: p.date_of_birth,
    microchipId: p.microchip_id,
    photoUrl: p.photo_url,
    thumbnailUrl: p.thumbnail_url,
    ownerId: p.owner_id,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    owner: await ownerSummary(p.owner_id),
  };
}

function mapMobileRecordType(t: string): 'vaccination' | 'treatment' | 'diagnosis' {
  if (t === 'vaccination') return 'vaccination';
  if (t === 'treatment') return 'treatment';
  return 'diagnosis';
}

function medicalToMobileRow(r: StoredMedicalRecord) {
  return {
    id: r.id,
    petId: r.petId,
    type: mapMobileRecordType(r.type),
    date: r.visitDate,
    veterinarian: store.users.get(r.vetId)?.name ?? r.vetId,
    notes: r.notes ?? r.diagnosis ?? '',
    createdAt: r.createdAt,
  };
}

router.get('/owner/:ownerId', async (req, res) => {
  const pets = await petRepository.findByOwnerId(req.params.ownerId);
  const list = await Promise.all(pets.map(toPetResponse));
  return res.json(ok(list));
});

router.get('/qr/:qrCode', async (req, res) => {
  const raw = decodeURIComponent(req.params.qrCode);
  let pet = await petRepository.findById(raw);
  if (!pet && raw.includes('pet/')) {
    const tail = raw.split('pet/').pop()?.trim();
    if (tail) {
      pet = (await petRepository.findById(tail)) || (await petRepository.findById(decodeURIComponent(tail)));
    }
  }
  if (!pet) return sendError(res, 404, 'NOT_FOUND', 'Pet not found for QR code');
  return res.json(ok(await toPetResponse(pet)));
});

router.get('/:petId/medical-records', (req, res) => {
  // Keeping medical records on in-memory store for now as specified in the partial refactor plan
  const { petId } = req.params;
  const type = req.query.type as string | undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  let rows = [...store.medicalRecords.values()].filter((r) => r.petId === petId);
  if (type) rows = rows.filter((r) => r.type === type);
  rows.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
  const total = rows.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const slice = rows.slice(start, start + limit).map(medicalToMobileRow);

  return res.json({
    data: slice,
    total,
    page,
    limit,
    totalPages,
  });
});

router.get('/', async (req, res) => {
  const ownerId = req.query.ownerId as string | undefined;
  let pets;
  if (ownerId) {
    pets = await petRepository.findByOwnerId(ownerId);
  } else {
    pets = await petRepository.findAll();
  }
  const list = await Promise.all(pets.map(toPetResponse));
  return res.json(ok(list));
});

router.get('/:id', async (req, res) => {
  const pet = await petRepository.findById(req.params.id);
  if (!pet) return sendError(res, 404, 'NOT_FOUND', 'Pet not found');
  return res.json(ok(await toPetResponse(pet)));
});

router.post('/', async (req, res) => {
  const { name, species, breed, dateOfBirth, microchipId, photoUrl, thumbnailUrl, ownerId } = req.body;
  if (!name?.trim() || !species?.trim() || !ownerId?.trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'name, species, and ownerId are required');
  }
  
  const user = await userRepository.findById(ownerId.trim());
  if (!user) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'ownerId must reference an existing user');
  }

  const id = store.newId();
  const pet = await petRepository.create({
    id,
    name: name.trim(),
    species: species.trim(),
    breed: breed?.trim(),
    date_of_birth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    microchip_id: microchipId?.trim(),
    photo_url: photoUrl?.trim(),
    thumbnail_url: thumbnailUrl?.trim(),
    owner_id: ownerId.trim(),
  });

  return res.status(201).json(ok(await toPetResponse(pet), 'Pet created'));
});

router.put('/:id', async (req, res) => {
  const pet = await petRepository.findById(req.params.id);
  if (!pet) return sendError(res, 404, 'NOT_FOUND', 'Pet not found');
  
  const body = req.body;
  const updates: any = {};
  if (body.name !== undefined) updates.name = String(body.name);
  if (body.species !== undefined) updates.species = String(body.species);
  if (body.breed !== undefined) updates.breed = body.breed ? String(body.breed) : null;
  if (body.dateOfBirth !== undefined) updates.date_of_birth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
  if (body.microchipId !== undefined) updates.microchip_id = body.microchipId ? String(body.microchipId) : null;
  if (body.photoUrl !== undefined) updates.photo_url = body.photoUrl ? String(body.photoUrl) : null;
  if (body.thumbnailUrl !== undefined) updates.thumbnail_url = body.thumbnailUrl ? String(body.thumbnailUrl) : null;
  if (body.ownerId !== undefined) updates.owner_id = String(body.ownerId);

  const next = await petRepository.update(req.params.id, updates);
  return res.json(ok(await toPetResponse(next), 'Pet updated'));
});

router.delete('/:id', async (req, res) => {
  const deleted = await petRepository.delete(req.params.id);
  if (!deleted) {
    return sendError(res, 404, 'NOT_FOUND', 'Pet not found');
  }
  return res.json(ok(null, 'Pet deleted'));
});

export default router;
