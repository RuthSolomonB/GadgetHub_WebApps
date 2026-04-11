import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";

const hasStaticCredentials =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
export const hasS3UploadConfig = Boolean(process.env.AWS_REGION && process.env.S3_BUCKET_NAME);
const s3PublicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, "");

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  ...(hasStaticCredentials
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

export const buildS3ObjectUrl = (key) => {
  if (s3PublicBaseUrl) {
    return new URL(encodeURI(key), `${s3PublicBaseUrl}/`).toString();
  }

  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${encodeURI(key)}`;
};

export const uploadBufferToS3 = async ({ key, body, contentType, cacheControl }) => {
  if (!hasS3UploadConfig) {
    throw new Error("S3 uploads are not configured for this environment.");
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
      ACL: "public-read",
    })
  );

  return buildS3ObjectUrl(key);
};

const fileFilter = (_req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    cb(new Error("Only image uploads are allowed."));
    return;
  }

  cb(null, true);
};

const storage = hasS3UploadConfig
  ? multerS3({
      s3,
      bucket: process.env.S3_BUCKET_NAME,
      acl: "public-read",
      metadata: (_req, file, cb) => {
        cb(null, { fieldName: file.fieldname });
      },
      key: (_req, file, cb) => {
        cb(null, `products/${Date.now()}_${file.originalname}`);
      },
    })
  : multer.memoryStorage();

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
