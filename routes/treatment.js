const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const treatmentController = require("../controllers/treatmentController.js");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./images";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, "temp_" + Date.now() + path.extname(file.originalname)); // Temporary filename
  },
});

const upload = multer({ storage: storage });

router.post("/treatment", upload.single("image"), async (req, res) => {
  try {
    await treatmentController.addTreatment(req, res);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
router.put("/treatment/:treatmentId", treatmentController.updateTreatment);
router.post("/followup", treatmentController.addFollowUp);
router.get("/treatmentbyid/:id",treatmentController.getTreatmentById);
router.post("/vettreatment",treatmentController.addTreatment1);

module.exports = router;
