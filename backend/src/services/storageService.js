const fs = require("fs");
const path = require("path");

const DEFAULT_STORAGE_ROOT = path.resolve(__dirname, "../../storage");

const getStorageRoot = () => {
  if (process.env.STORAGE_ROOT_DIR) {
    return path.resolve(process.env.STORAGE_ROOT_DIR);
  }
  return DEFAULT_STORAGE_ROOT;
};

/**
 * Resolves storage key safely against storage root directory.
 * Throws if the resolved path escapes the storage root (path traversal prevention).
 */
const resolveSafePath = (storageKey) => {
  if (!storageKey || typeof storageKey !== "string") {
    const error = new Error("Invalid storage key provided");
    error.statusCode = 400;
    throw error;
  }

  const root = getStorageRoot();
  // Normalize and resolve path against root
  const safePath = path.resolve(root, storageKey);

  // Check if safePath starts with root directory
  const normalizedRoot = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (!safePath.startsWith(normalizedRoot) && safePath !== root) {
    const error = new Error("Path traversal detected: storage key escapes storage root");
    error.statusCode = 400;
    throw error;
  }

  return safePath;
};

/**
 * Saves binary file buffer to disk under given storageKey.
 * Creates intermediate directories recursively as needed.
 */
const saveFile = async (storageKey, buffer) => {
  if (!Buffer.isBuffer(buffer)) {
    const error = new Error("File content must be a valid Buffer");
    error.statusCode = 400;
    throw error;
  }

  const targetPath = resolveSafePath(storageKey);
  const targetDir = path.dirname(targetPath);

  await fs.promises.mkdir(targetDir, { recursive: true });
  await fs.promises.writeFile(targetPath, buffer);

  return {
    storageKey,
    path: targetPath,
    bytesWritten: buffer.length,
  };
};

/**
 * Retrieves the full file buffer from storage.
 * Returns null if file does not exist.
 */
const getFile = async (storageKey) => {
  const targetPath = resolveSafePath(storageKey);
  try {
    return await fs.promises.readFile(targetPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

/**
 * Returns a readable stream for the file.
 * Returns null if the file does not exist.
 */
const getFileStream = (storageKey) => {
  const targetPath = resolveSafePath(storageKey);
  if (!fs.existsSync(targetPath)) {
    return null;
  }
  return fs.createReadStream(targetPath);
};

/**
 * Deletes physical file from storage.
 * Returns true if deleted, false if file did not exist (safe ENOENT handling).
 */
const deleteFile = async (storageKey) => {
  try {
    const targetPath = resolveSafePath(storageKey);
    await fs.promises.unlink(targetPath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
};

/**
 * Checks whether a physical file exists on disk.
 */
const fileExists = (storageKey) => {
  try {
    const targetPath = resolveSafePath(storageKey);
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
};

module.exports = {
  getStorageRoot,
  resolveSafePath,
  saveFile,
  getFile,
  getFileStream,
  deleteFile,
  fileExists,
};
