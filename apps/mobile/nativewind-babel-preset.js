// react-native-css-interop@0.2.2 has one issue when used with babel-preset-expo:
//
// 1. It includes @babel/plugin-transform-react-jsx with
//    importSource:'react-native-css-interop', which conflicts with the
//    jsxImportSource:'nativewind' set in babel-preset-expo. The duplicate JSX
//    transform overrides nativewind and causes Metro to look for
//    react-native-css-interop/jsx-runtime instead of nativewind/jsx-runtime.
//
// We keep only the css-interop babel-plugin (className → style transform) and
// let babel-preset-expo own the JSX runtime transform. The worklets plugin must
// remain enabled because libraries like react-native-toast depend on it.
module.exports = function () {
  const config = require('react-native-css-interop/babel')();

  config.plugins = config.plugins.filter((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === '@babel/plugin-transform-react-jsx') return false;
    return true;
  });

  return config;
};
