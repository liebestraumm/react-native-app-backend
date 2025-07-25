import { RequestHandler } from "express";
import formidable, { File } from "formidable";

declare global {
  namespace Express {
    interface Request {
      files: { [key: string]: File | File[] };
    }
  }
}

const fileParser: RequestHandler = async (request, response, next) => {
  const form = formidable();
  try {
    const [fields, files] = await form.parse(request);
    if (!request.body) request.body = {};

    for (let key in fields) {
      request.body[key] = fields[key]![0];
    }

    if (!request.files) request.files = {};

    for (let key in files) {
      const actualFiles = files[key];
      if (!actualFiles) break;

      if (actualFiles.length > 1) {
        request.files[key] = actualFiles;
      } else {
        request.files[key] = actualFiles[0];
      }
    }
    next();
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

export default fileParser;
