const tf = require('@tensorflow/tfjs-node');
const imageConverter = require('./imageConverter');
const path = require('path');

const runPrediction = function (model, img, options) {
  return imageConverter.toPixelData(img, options).then(pixeldata => {
    const imageTensor = tf.tensor(pixeldata, [options.imageWidth, options.imageHeight, options.imageChannels]);
    const inputTensor = imageTensor.expandDims();
    const prediction = model.predict(inputTensor);
    const scores = prediction.arraySync()[0];

    const maxScore = prediction.max().arraySync();
    const maxScoreIndex = scores.indexOf(maxScore);

    const labelScores = {};

    scores.forEach((s, i) => {
      labelScores[options.labels[i]] = parseFloat(s.toFixed(4));
    });

    return {
      prediction: `${options.labels[maxScoreIndex]} (${parseInt(maxScore * 100)}%)`,
      scores: labelScores
    };
  });
};

const classify = async function (img) {
  const modelPath = path.join(__dirname, '../../models/fashion-mnist-tfjs/model.json');
  const modelUrl = `file://${modelPath}`;

  console.log('Loading model...');
  const model = await tf.loadLayersModel(modelUrl);
  model.summary();

  const options = require('../../models/fashion-mnist-tfjs/processingOptions.json');

  console.log('Running prediction...');
  const prediction = await runPrediction(model, img, options);
  console.log(prediction);
}

module.exports = {
  classify
}