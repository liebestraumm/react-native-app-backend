import { v2 as cloudinary } from "cloudinary";
import envs from "../env";

const CLOUD_NAME = envs.CLOUD_NAME!;
const CLOUD_KEY = envs.CLOUD_KEY!;
const CLOUD_SECRET = envs.CLOUD_SECRET!;

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: CLOUD_KEY,
  api_secret: CLOUD_SECRET,
  secure: true,
});

const cloudUploader = cloudinary.uploader;

export const cloudApi = cloudinary.api;
export default cloudUploader;