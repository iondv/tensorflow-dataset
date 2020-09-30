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
//      labelScores[i] = parseFloat(s.toFixed(4));
    });

    return {
      prediction: `${options.labels[maxScoreIndex]} (${parseInt(maxScore * 100)}%)`,
      typeCode: maxScoreIndex,
      predictionScore: maxScore,
      scores: labelScores
    };
  });
};

const classify = async function (img, options) {
  let log = '';
  const modelPath = path.join(__dirname, '../../models/fashion-mnist-tfjs/model.json');
  const modelUrl = `file://${modelPath}`;

  log += "Loading model...\n";

  const model = await tf.loadLayersModel(modelUrl);
  model.summary();

  log += "Running prediction...\n";
  const prediction = await runPrediction(model, img, options);
  log += `prediction: ${prediction.prediction}\n`;
  for (const score of Object.keys(prediction.scores)) {
    log += `${score}: ${prediction.scores[score]}\n`;
  }
  return {
    log,
    typeCode: prediction.typeCode,
    predictionScore: prediction.predictionScore,
    scores: prediction.scores
  };
}

module.exports = {
  classify
}