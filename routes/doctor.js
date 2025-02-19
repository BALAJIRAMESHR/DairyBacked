const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorController.js");

router.post('/getDoctors',doctorController.getDoctor);
router.post('/registerDoc',doctorController.RegisterDoc);
router.post('/loginemail',doctorController.GetDocByEmail);
router.post('/loginphno',doctorController.GetDocByPhno);
router.post('/loginid',doctorController.GetDocByID);
router.get('/notifications/:docid',doctorController.GetNotById);
router.post('/updatePassword/:doctorId',doctorController.updatePassword);
router.post('/updateDoctorPreferences',doctorController.updatePre);
router.post('/forgot',doctorController.resentlink);
router.post('/reset-password',doctorController.resetpass);
router.post('/status/:doctorId',doctorController.updatestatus)

module.exports = router;

