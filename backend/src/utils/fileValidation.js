const path = require("path");

const MAX_DOCUMENT_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_FILE_NAME_LENGTH = 255;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);

const FORBIDDEN_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".ps1",
  ".js",
  ".mjs",
  ".cjs",
  ".html",
  ".htm",
  ".php",
  ".sh",
  ".bash",
  ".vbs",
  ".dll",
  ".scr",
  ".jar",
  ".py",
  ".msi",
  ".com",
  ".wsf",
  ".cpl",
  ".reg",
]);

/**
 * Validates file buffer magic bytes against supported document formats.
 * Returns the detected MIME type if valid, or null if unrecognized.
 */
const detectMagicBytesMime = (buffer) => {
  if (!buffer || buffer.length < 4) {
    return null;
  }

  // PDF: %PDF (0x25 0x50 0x44 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return "application/pdf";
  }

  // JPEG: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WEBP: RIFF....WEBP (RIFF at 0..3, WEBP at 8..11)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
};

/**
 * Sanitizes original file name, stripping directory components, control chars, null bytes.
 */
const sanitizeFileName = (fileName) => {
  if (typeof fileName !== "string") {
    return "document";
  }

  // Strip path traversal and path separators
  let cleanName = path.basename(fileName).trim();

  // Remove null bytes and non-printable control characters
  cleanName = cleanName.replace(/[\x00-\x1f\x7f]/g, "");

  // Prevent dot-only names
  if (cleanName === "" || cleanName === "." || cleanName === "..") {
    return "document";
  }

  if (cleanName.length > MAX_FILE_NAME_LENGTH) {
    const ext = path.extname(cleanName);
    const base = cleanName.slice(0, MAX_FILE_NAME_LENGTH - ext.length);
    cleanName = `${base}${ext}`;
  }

  return cleanName;
};

/**
 * Validates file upload buffer and metadata.
 * Returns { valid: true, sanitizedFileName, mimeType, fileSize } or { valid: false, error: string }
 */
const validateUploadedFile = (file) => {
  if (!file || !file.buffer) {
    return { valid: false, error: "file is required" };
  }

  const { buffer, originalname, size, mimetype } = file;

  // 1. File size check
  const actualSize = buffer.length;
  if (actualSize <= 0) {
    return { valid: false, error: "Uploaded file is empty" };
  }

  if (actualSize > MAX_DOCUMENT_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${actualSize} bytes) exceeds maximum limit of ${MAX_DOCUMENT_FILE_SIZE} bytes (20MB)`,
    };
  }

  // 2. Extension check
  const rawFileName = originalname || "";
  const ext = path.extname(rawFileName).toLowerCase();

  if (FORBIDDEN_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Files with extension '${ext}' are not permitted for security reasons`,
    };
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `File extension '${ext}' is not supported. Supported extensions: .pdf, .jpg, .jpeg, .png, .webp`,
    };
  }

  // 3. MIME validation (client-declared)
  const normalizedMime = (mimetype || "").toLowerCase().trim();
  if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
    return {
      valid: false,
      error: `MIME type '${normalizedMime}' is not supported. Supported types: application/pdf, image/jpeg, image/png, image/webp`,
    };
  }

  // 4. Magic-byte / content inspection
  const detectedMime = detectMagicBytesMime(buffer);
  if (!detectedMime) {
    return {
      valid: false,
      error: "File content signature does not match any supported document type (PDF, JPEG, PNG, WEBP)",
    };
  }

  // Cross-check detected signature with declared MIME
  if (detectedMime !== normalizedMime) {
    // Exception: image/jpg declared with image/jpeg detected is acceptable
    const isJpegVariant =
      (normalizedMime === "image/jpeg" || normalizedMime === "image/jpg") &&
      detectedMime === "image/jpeg";
    if (!isJpegVariant) {
      return {
        valid: false,
        error: `File signature (${detectedMime}) does not match declared MIME type (${normalizedMime})`,
      };
    }
  }

  const sanitizedFileName = sanitizeFileName(rawFileName);

  return {
    valid: true,
    sanitizedFileName,
    mimeType: detectedMime,
    fileSize: actualSize,
  };
};

module.exports = {
  MAX_DOCUMENT_FILE_SIZE,
  MAX_FILE_NAME_LENGTH,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  FORBIDDEN_EXTENSIONS,
  detectMagicBytesMime,
  sanitizeFileName,
  validateUploadedFile,
};
