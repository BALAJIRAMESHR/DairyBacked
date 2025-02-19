const express = require("express");
const router = express.Router();
const medController = require("../controllers/medController.js");

router.get('/med',medController.getAllMed);
router.post("/newmed",medController.AddNeedMed);
router.post('/medgiven',medController.getAllMed);

module.exports = router;

