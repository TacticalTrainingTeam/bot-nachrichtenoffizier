const log =
  (fn, level) =>
  (...args) =>
    fn(new Date().toISOString(), level, ...args);

export default {
  info: log(console.log, 'INFO'),
  warn: log(console.warn, 'WARN'),
  error: log(console.error, 'ERROR'),
};
