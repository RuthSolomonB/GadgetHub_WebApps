import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";

const hasStaticCredentials =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
const hasS3UploadConfig = process.env.AWS_REGION && process.env.S3_BUCKET_NAME;

const s3 = new S3Client({
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
