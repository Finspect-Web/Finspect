const express = require("express");
const {
  createDocumentController,
  getDocumentByIdController,
  getDocumentsByClientController
} = require("../controllers/documents.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { checkClientAccess } = require("../middleware/role.middleware");

const router = express.Router();

router.use(authenticate);

router.post("/", checkClientAccess, createDocumentController);
router.get("/client/:clientId", checkClientAccess, getDocumentsByClientController);
router.get("/:id", getDocumentByIdController);

module.exports = router;