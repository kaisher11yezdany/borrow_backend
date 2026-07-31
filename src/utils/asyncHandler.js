// Express 4 doesn't catch rejected promises from async route handlers —
// an unhandled rejection becomes an uncaught exception and crashes the
// whole process. Wrapping every handler routes the error to next() instead.
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Wraps every function on a controller module in one call, so route files
// can do `const ctrl = wrapAll(require("../controllers/xController"))`
// instead of wrapping each handler at every router.get/post/... call site.
function wrapAll(controller) {
  const wrapped = {};
  Object.keys(controller).forEach((key) => {
    wrapped[key] = typeof controller[key] === "function" ? asyncHandler(controller[key]) : controller[key];
  });
  return wrapped;
}

module.exports = asyncHandler;
module.exports.wrapAll = wrapAll;
