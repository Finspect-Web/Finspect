const asyncHandler = require("../utils/asyncHandler");
const { createDocument, getDocumentById, getDocumentsByClient, deleteDocument } = require("../services/documents.service");

const createDocumentController = asyncHandler(async (req, res) => {
  const data = await createDocument(req.body, req.user.id);
  res.status(201).json({
    success: true,
    message: "Document uploaded successfully.",
    data
  });
});

const getDocumentsByClientController = asyncHandler(async (req, res) => {
  const data = await getDocumentsByClient(req.params.clientId, req.user);
  res.status(200).json({
    success: true,
    data
  });
});

const getDocumentByIdController = asyncHandler(async (req, res) => {
  const data = await getDocumentById(req.params.id, req.user);
  res.status(200).json({
    success: true,
    data
  });
});

const deleteDocumentController = asyncHandler(async (req, res) => {
  const data = await deleteDocument(req.params.id, req.user.id, req.user);
  res.status(200).json({
    success: true,
    message: "Document deleted successfully.",
    data
  });
});

module.exports = {
  createDocumentController,
  getDocumentByIdController,
  getDocumentsByClientController,
  deleteDocumentController
};