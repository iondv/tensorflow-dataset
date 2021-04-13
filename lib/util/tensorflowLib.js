const tf = require('@tensorflow/tfjs-node');
const imageConverter = require('./imageConverter');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

module.exports = {
  classifyItem,
  compileModel,
  saveModel,
  teachModel,
  testModel,
  getModelInputShape
};

function runPrediction (model, img, options) {
  return imageConverter.toPixelData(img, options)
    .then(pixelData => {

      const normalizedData = [];
      for (let i = 0; i < pixelData.length; i += 4)
        normalizedData.push(pixelData[i]/255);

      const imageTensor = tf.tensor(normalizedData, [options.imageWidth, options.imageHeight, options.imageChannels]);
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
        typeCode: maxScoreIndex,
        predictionScore: maxScore,
        scores: labelScores
      };
    });
}

async function classifyItem(img, modelUrl, options) {
  let log = '';

  log += "Loading model...\n";

  const model = await tf.loadLayersModel(modelUrl);
  model.summary();

  log += "Running prediction...\n";
  const prediction = await runPrediction(model, img, options);
  log += `prediction: ${prediction.prediction}\n`;
  for (const score of Object.keys(prediction.scores))
    log += `${score}: ${prediction.scores[score]}\n`;

  return {
    log,
    typeCode: prediction.typeCode,
    predictionScore: prediction.predictionScore,
    scores: prediction.scores
  };
}

async function compileModel(model) {

  const compiledModel = tf[model.type]();

  for (const layer of model.layers)
    compiledModel.add(tf.layers[layer.type](layer.options))

  compiledModel.compile(model.options);
  compiledModel.summary();

  return compiledModel;
}

async function saveModel(model, modelSnapshotItem, dataRepo) {
  const tempSavePath = path.resolve('./temp', crypto.randomBytes(8).toString('hex'));
  if (!fs.existsSync(tempSavePath))
    fs.mkdirSync(tempSavePath, {recursive: true});
  const snapshotId = modelSnapshotItem.id;
  const snapshotClass = modelSnapshotItem.classMeta.plain.name;
  const namespace = modelSnapshotItem.classMeta.plain.namespace;
  const tempSavePathUrl = `file://${tempSavePath}`;
  await model.save(tempSavePathUrl, {
    includeOptimizer: true
  });
  const modelPath = path.join(tempSavePath, 'model.json');
  const weightsPath = path.join(tempSavePath, 'weights.bin');
  await dataRepo.editItem(`${snapshotClass}@${namespace}`, snapshotId, {
    weightsFile: fs.readFileSync(weightsPath)
  });
  const weightsFileName = (await dataRepo.getItem(`${snapshotClass}@${namespace}`, snapshotId)).files.weightsFile.name;
  const modelJson = require(modelPath);
  modelJson.weightsManifest[0].paths[0] = weightsFileName;
  fs.writeFileSync(modelPath, JSON.stringify(modelJson));
  modelSnapshotItem = await dataRepo.editItem(`${snapshotClass}@${namespace}`, snapshotId, {
    modelFile: fs.readFileSync(modelPath)
  });
  fs.unlinkSync(modelPath);
  fs.unlinkSync(weightsPath);
  fs.rmdirSync(tempSavePath);
  return modelSnapshotItem;
}

async function teachModel(modelSnapshotItem, trainingData, epochs) {
  const modelStream = (await modelSnapshotItem.files.modelFile.getContents()).stream;
  const modelPath = modelStream.path;
  modelStream.close();
  const modelUrl = `file://${modelPath}`;

  const model = await tf.loadLayersModel(modelUrl);

  let log = '';

  const options = {
    epochs: epochs,
    verbose: 0,
    callbacks: {
      onEpochBegin: async (epoch, logs) => {
        log += `Epoch ${epoch + 1} of ${epochs} ...\n`;
        console.log(`Epoch ${epoch + 1} of ${epochs} ...`)
      },
      onEpochEnd: async (epoch, logs) => {
        log += `  train-set loss: ${logs.loss.toFixed(4)}\n`;
        console.log(`  train-set loss: ${logs.loss.toFixed(4)}`)
        log += `  train-set accuracy: ${logs.acc.toFixed(4)}\n`;
        console.log(`  train-set accuracy: ${logs.acc.toFixed(4)}`)
      }
    }
  };

  await model.fitDataset(trainingData, options);

  return {model, log};
}

async function testModel(modelSnapshotItem, testingData) {
  const modelPath = (await modelSnapshotItem.files.modelFile.getContents()).stream.path;
  const modelUrl = `file://${modelPath}`;

  const model = await tf.loadLayersModel(modelUrl);

  const result = await model.evaluateDataset(testingData);
  const testLoss = result[0].dataSync()[0];
  const testAcc = result[1].dataSync()[0];

  let log = `  test-set loss: ${testLoss.toFixed(4)}\n`;
  console.log(`  test-set loss: ${testLoss.toFixed(4)}`);
  log += `  test-set accuracy: ${testAcc.toFixed(4)}\n`;
  console.log(`  test-set accuracy: ${testAcc.toFixed(4)}`);

  return {
    log,
    loss: testLoss,
    accuracy: testAcc
  };
}

async function getModelInputShape(modelSnapshotItem) {
  const modelStream = (await modelSnapshotItem.files.modelFile.getContents()).stream;
  const modelPath = modelStream.path;
  const modelUrl = `file://${modelPath}`;
  modelStream.close();
  const model = await tf.loadLayersModel(modelUrl);
  return model.inputs[0].shape;
}
