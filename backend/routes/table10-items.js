const express = require('express');
const {
  listTable10Items,
  listTable10Groups,
  createTable10Item,
  updateTable10Item,
  deleteTable10Item,
  importTable10Workbook,
} = require('../services/table10-items');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const items = await listTable10Items({
      search: req.query.search,
      group: req.query.group,
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
});

router.get('/groups', async (req, res, next) => {
  try {
    const groups = await listTable10Groups();
    res.json(groups);
  } catch (error) {
    next(error);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    const { fileContentBase64 } = req.body || {};
    if (!String(fileContentBase64 || '').trim()) {
      return res.status(400).json({ message: 'fileContentBase64 is required' });
    }

    const result = await importTable10Workbook(fileContentBase64);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const item = await createTable10Item(req.body || {});
    res.status(201).json({
      success: true,
      item,
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const item = await updateTable10Item(req.params.id, req.body || {});
    res.json({
      success: true,
      item,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteTable10Item(req.params.id);
    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
