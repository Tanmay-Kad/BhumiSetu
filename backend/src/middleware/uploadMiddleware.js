const multer = require("multer");
const { MAX_DOCUMENT_FILE_SIZE } = require("../utils/fileValidation");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_DOCUMENT_FILE_SIZE,
    files: 1,
  },
});

/**
 * Middleware that handles single file upload named 'file'.
 * If request is multipart/form-data, parses the file and handles multer errors.
 * If request is not multipart (e.g. legacy application/json), passes through to next handler.
 */
const documentUploadMiddleware = (req, res, next) => {
  const isMultipart =
    req.is("multipart/form-data") ||
    (typeof req.headers["content-type"] === "string" &&
      req.headers["content-type"].includes("multipart/form-data"));

  if (!isMultipart) {
    return next();
  }

  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            status: "error",
            message: `File size exceeds the maximum allowed limit of ${MAX_DOCUMENT_FILE_SIZE / (1024 * 1024)}MB`,
          });
        }
        return res.status(400).json({
          status: "error",
          message: err.message,
        });
      }

      return res.status(err.statusCode || 400).json({
        status: "error",
        message: err.message || "File upload failed",
      });
    }

    next();
  });
};

module.exports = {
  documentUploadMiddleware,
};
