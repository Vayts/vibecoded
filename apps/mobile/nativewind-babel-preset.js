// react-native-css-interop@0.2.2 has two issues when used with babel-preset-expo:
//
// 1. It unconditionally includes 'react-native-worklets/plugin' (reanimated 4
//    only) which causes a module-not-found crash on reanimated 3.x.
//
// 2. It includes @babel/plugin-transform-react-jsx with
//    importSource:'react-native-css-interop', which conflicts with the
//    jsxImportSource:'nativewind' set in babel-preset-expo. The duplicate JSX
//    transform overrides nativewind and causes Metro to look for
//    react-native-css-interop/jsx-runtime instead of nativewind/jsx-runtime.
//
// We keep only the css-interop babel-plugin (className → style transform) and
// let babel-preset-expo own the JSX runtime transform.
module.exports = function () {
  const config = require('react-native-css-interop/babel')();

  config.plugins = config.plugins.filter((plugin) => {
    if (plugin === 'react-native-worklets/plugin') return false;
    if (Array.isArray(plugin) && plugin[0] === '@babel/plugin-transform-react-jsx') return false;
    return true;
  });

  return config;
};
