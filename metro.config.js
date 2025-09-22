const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Agregar extensiones .bin para que Metro las incluya
config.resolver.assetExts.push(
  'bin',
  'txt',
  'jpg',
  'png',
  'json'
);

// Agregar soporte para archivos de modelos
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;