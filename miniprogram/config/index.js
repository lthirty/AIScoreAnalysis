const config = {
  projectName: 'AIScoreAnalysis',
  date: '2026-05-12',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  framework: 'react',
  compiler: 'webpack5',
  mini: {},
  h5: {}
}

module.exports = function () {
  return config
}
