import path from "path";
import { fileURLToPath } from "url";
import ejs from "ejs";

// Get Directory

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const formatError = (error) => {
  let errors = {};
  error.errors?.map((error) => {
    errors[error.path?.[0]] = error.message;
  });

  return errors;
};

// Render Email

export const renderEmailEjs = async (fileName, payload) => {
  const html = await ejs.renderFile(
    __dirname + `/views/${fileName}.ejs`,
    payload
  );
  return html;
};

// Handle Try Catch Errors

export const handleCatchReturnError = (error, res, errorMessage) => {
  if (error instanceof ZodError) {
    const formattedError = formatError(error);
    return res.status(400).json({
      message: "Validation error.",
      errors: formattedError,
    });
  }

  return res.status(500).json({
    message: errorMessage || "An error occurred.",
    errors: error.message || "Unknown error.",
  });
};

export const handleTryReturnError = (res, status, message, data) => {
  if (data) {
    return res
      .status(status || 200)
      .json({ message: message || "Common Error Handler", data: data });
  }

  return res
    .status(status || 200)
    .json({ message: message || "Common Error Handler" });
};
