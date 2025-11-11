import { validationResult } from "express-validator";

const validationError = (req, res, next) => {
  const errors = validationResult(req); //errors là một object chứa thông tin các lỗi validation , express-validator sẽ tự động nhét các lỗi vào req sau khi kiểm tra theo rule.

  if (!errors.isEmpty()) {
    res.status(400).json({
      code: "ValidationError",
      errors: errors.mapped(),
    });
    return;
  }
  next();
};

export default validationError;
