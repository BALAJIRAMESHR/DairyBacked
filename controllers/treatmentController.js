const connection = require("../connection.js");
const fs = require("fs");
const path = require("path");
const { format } = require("date-fns");

exports.addTreatment = async (req, res) => {
  const requiredFields = [
    "ticketid",
    "cowid",
    "formerid",
    "docid",
    "status",
    "bulltype",
    "price",
  ];

  for (const field of requiredFields) {
    if (!req.body[field]) {
      return res.status(400).json({ error: `Invalid ${field} values` });
    }
  }

  if (!req.file) {
    return res.status(400).json({ error: "Invalid file values" });
  }

  let { ticketid, cowid, formerid, docid, status, comment, bulltype, price } = req.body;

  status = status === "1"; // Converts '1' to true, otherwise false

  try {
    const query = `
      INSERT INTO Treatment (ticketid, cowid, formerid, docid, status, comment, bulltype, price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const [result] = await connection.execute(query, [
      ticketid,
      cowid,
      formerid,
      docid,
      status,
      comment,
      bulltype,
      price,
    ]);

    const treatmentId = result.insertId;
    const newImageName = `img_${treatmentId}${path.extname(req.file.originalname)}`;

    // Rename the file
    fs.renameSync(req.file.path, path.join("images", newImageName));

    const updateQuery = `UPDATE Treatment SET pic_name = ? WHERE id = ?`;
    await connection.execute(updateQuery, [newImageName, treatmentId]);

    return res.status(201).json({
      message: "New treatment record added successfully",
      id: treatmentId,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err });
  }
};

exports.updateTreatment = async (req, res) => {
  const treatmentId = req.params.treatmentId;
  const { comment, price } = req.body;

  if (!comment || !price || isNaN(price)) {
    return res.status(400).json({
      error:
        "Invalid input values. Comment must be a string and price must be a number.",
    });
  }

  const query = `
      UPDATE Treatment
      SET comment = ?, price = ?
      WHERE id = ?`;

  try {
    const [result] = await connection.execute(query, [
      comment,
      price,
      treatmentId,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Treatment record not found" });
    }

    return res.json({ message: "Treatment record updated successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database query failed" });
  }
};

exports.addFollowUp = async (req, res) => {
  const { treatmentId, nextDate } = req.body;

  if (!treatmentId || !nextDate) {
    return res.status(400).json({
      error: "Invalid input values. treatmentId and nextDate are required.",
    });
  }

  const todayDate = format(new Date(), "yyyy-MM-dd");

  const query = `
      INSERT INTO FollowUp (treatment_id, date, next_date)
      VALUES (?, ?, ?)`;

  try {
    await connection.execute(query, [treatmentId, todayDate, nextDate]);

    res.status(201).json({ message: "FollowUp record added successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Database query failed", details: err.message });
  }
};

exports.getTreatmentById = async (req, res) => {
  const treatmentId = req.params.id;

  const query = `
      SELECT 
        T.id AS treatmentId,
        T.ticketid,
        T.cowid,
        T.formerid,
        T.docid,
        T.status,
        T.comment,
        T.bulltype,
        T.price,
        T.pic_name,
        F.Name AS farmerName,
        F.VLCC,
        F.Address_line1,
        F.Address_line2,
        F.Address_line3,
        C.Breed AS cowType,
        FU.next_date AS nextFollowUpDate,
        TK.Comments AS ticketComments
      FROM Treatment T
      LEFT JOIN Former F ON T.formerid = F.Former_id
      LEFT JOIN Cow C ON T.cowid = C.Cow_id
      LEFT JOIN FollowUp FU ON T.id = FU.treatment_id
      LEFT JOIN Ticket TK ON T.ticketid = TK.Ticket_id
      WHERE T.id = ?`;

  try {
    const [results] = await connection.execute(query, [treatmentId]);

    if (results.length === 0) {
      return res.status(404).json({ error: "Treatment record not found" });
    }

    const treatmentDetails = results[0];
    const imageUrl = `${req.protocol}://${req.get("host")}/images/${
      treatmentDetails.pic_name
    }`;

    return res.status(200).json({
      treatmentId: treatmentDetails.treatmentId,
      ticketId: treatmentDetails.ticketid,
      cowId: treatmentDetails.cowid,
      cowType: treatmentDetails.cowType,
      formerId: treatmentDetails.formerid,
      farmerName: treatmentDetails.farmerName,
      VLCC: treatmentDetails.VLCC,
      address: {
        line1: treatmentDetails.Address_line1,
        line2: treatmentDetails.Address_line2,
        line3: treatmentDetails.Address_line3,
      },
      comment: treatmentDetails.comment,
      bullType: treatmentDetails.bulltype,
      price: treatmentDetails.price,
      picName: treatmentDetails.pic_name,
      imageUrl: imageUrl,
      nextFollowUpDate: treatmentDetails.nextFollowUpDate,
      ticketComments: treatmentDetails.ticketComments,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database query failed" });
  }
};

exports.addTreatment1 = async (req, res) => {
  const { ticketid, cowid, formerid, docid, status, comment, price } =
    req.body;

  if (
    !ticketid ||
    !cowid ||
    !formerid ||
    !docid ||
    typeof status !== "boolean" ||
    !price 
  ) {
    return res.status(400).json({ error: "Invalid input values" });
  }

  const query = `
      INSERT INTO Treatment (ticketid, cowid, formerid, docid, status, comment, price)
      VALUES (?, ?, ?, ?, ?, ?, ?)`;

  try {
    const [result] = await connection.execute(query, [
      ticketid,
      cowid,
      formerid,
      docid,
      status,
      comment,
      price,
    ]);
    const treatmentId = result.insertId;

    return res.status(201).json({
      message: "New treatment record added successfully",
      id: treatmentId,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database query failed" });
  }
};