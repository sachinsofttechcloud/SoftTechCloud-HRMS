import fs from "fs";
import path from "path";

/**
 * Converts a base64 media payload into a high-quality binary file on disk
 * and returns the short URL format path (e.g., "/uploads/photos/passport_STC-43_1726748900.png").
 * If the payload is already a URL or path, it returns it as is.
 */
export function saveBase64Media(base64Data, subfolder = "photos", prefix = "file") {
  if (!base64Data || typeof base64Data !== "string") {
    return base64Data || null;
  }

  const trimmed = base64Data.trim();
  if (!trimmed.startsWith("data:")) {
    return trimmed;
  }

  try {
    const matches = trimmed.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return trimmed;
    }

    const mimeType = matches[1];
    const base64Buffer = Buffer.from(matches[2], "base64");

    let extension = "png";
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
      extension = "jpg";
    } else if (mimeType.includes("webp")) {
      extension = "webp";
    } else if (mimeType.includes("pdf")) {
      extension = "pdf";
    } else if (mimeType.includes("svg")) {
      extension = "svg";
    }

    const cleanPrefix = (prefix || "file").replace(/[^a-zA-Z0-9_-]/g, "_");
    const uploadsDir = path.join(process.cwd(), "uploads", subfolder);

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${cleanPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;
    const filePath = path.join(uploadsDir, filename);

    // Save high quality buffer file
    fs.writeFileSync(filePath, base64Buffer);

    // Return short URL format path
    return `/uploads/${subfolder}/${filename}`;
  } catch (err) {
    console.error("Error saving base64 media:", err);
    return trimmed;
  }
}
