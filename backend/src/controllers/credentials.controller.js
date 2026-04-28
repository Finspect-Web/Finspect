const asyncHandler = require("../utils/asyncHandler");
const {
  createCredential,
  getCredentialsByClient,
  updateCredential,
  deleteCredential
} = require("../services/credentials.service");

const createCredentialController = asyncHandler(async (req, res) => {
  const data = await createCredential(req.body, req.user.id);
  res.status(201).json({
    success: true,
    message: "Credential saved successfully.",
    data
  });
});

const getCredentialsByClientController = asyncHandler(async (req, res) => {
  const data = await getCredentialsByClient(req.params.clientId);
  res.status(200).json({
    success: true,
    data
  });
});

const updateCredentialController = asyncHandler(async (req, res) => {
  const data = await updateCredential(req.params.id, req.body, req.user.id);
  res.status(200).json({
    success: true,
    message: "Credential updated successfully.",
    data
  });
});

const deleteCredentialController = asyncHandler(async (req, res) => {
  await deleteCredential(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message: "Credential deleted successfully."
  });
});

module.exports = {
  createCredentialController,
  getCredentialsByClientController,
  updateCredentialController,
  deleteCredentialController
};
