// TensorFlow.js for Node,js
const tf = require('@tensorflow/tfjs-node');

// Fashion-MNIST training & test data
const trainDataUrl = 'file://./fashion-mnist/fashion-mnist_train.csv';
const testDataUrl = 'file://./fashion-mnist/fashion-mnist_test.csv';

// Build, train a model with a subset of the data
const numOfClasses = 5;

const imageWidth = 28;
const imageHeight = 28;
const imageChannels = 1;

const batchSize = 100;
const epochsValue = 15;

// load and normalize data
const loadData = function (dataUrl, batches=batchSize) {
  // normalize data values between 0-1
  const normalize = ({xs, ys}) => {
    return {
        xs: Object.values(xs).map(x => x / 255),
        ys: ys.label
    };
  };

  // transform input array (xs) to 3D tensor
  // binarize output label (ys)
  const transform = ({xs, ys}) => {
    // array of zeros
    const zeros = (new Array(numOfClasses)).fill(0);

    return {
        xs: tf.tensor(xs, [imageWidth, imageHeight, imageChannels]),
        ys: tf.tensor1d(zeros.map((z, i) => {
            return i === ys ? 1 : 0;
        }))
    };
  };

  // load, normalize, transform, batch
  return tf.data
    .csv(dataUrl, {columnConfigs: {label: {isLabel: true}}})
    .map(normalize)
    .filter(f => f.ys < numOfClasses) // only use a subset of the data
    .map(transform)
    .batch(batchSize);
};

// Define the model architecture
const buildModel = function () {
  const model = tf.sequential();

  // add the model layers
  model.add(tf.layers.conv2d({
    inputShape: [imageWidth, imageHeight, imageChannels],
    filters: 8,
    kernelSize: 5,
    padding: 'same',
    activation: 'relu'
  }));
  model.add(tf.layers.maxPooling2d({
    poolSize: 2,
    strides: 2
  }));
  model.add(tf.layers.conv2d({
    filters: 16,
    kernelSize: 5,
    padding: 'same',
    activation: 'relu'
  }));
  model.add(tf.layers.maxPooling2d({
    poolSize: 3,
    strides: 3
  }));
  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({
    units: numOfClasses,
    activation: 'softmax'
  }));

  // compile the model
  model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });

  return model;
}

// train the model against the training data
const trainModel = async function (model, trainingData, epochs=epochsValue) {
  const options = {
    epochs: epochs,
    verbose: 0,
    callbacks: {
      onEpochBegin: async (epoch, logs) => {
        console.log(`Epoch ${epoch + 1} of ${epochs} ...`)
      },
      onEpochEnd: async (epoch, logs) => {
        console.log(`  train-set loss: ${logs.loss.toFixed(4)}`)
        console.log(`  train-set accuracy: ${logs.acc.toFixed(4)}`)
      }
    }
  };

  return await model.fitDataset(trainingData, options);
};

// verify the model against the test data
const evaluateModel = async function (model, testingData) {
  const result = await model.evaluateDataset(testingData);
  const testLoss = result[0].dataSync()[0];
  const testAcc = result[1].dataSync()[0];

  console.log(`  test-set loss: ${testLoss.toFixed(4)}`);
  console.log(`  test-set accuracy: ${testAcc.toFixed(4)}`);
};



// run
const run = async function () {
  const trainData = loadData(trainDataUrl);
  const testData = loadData(testDataUrl);
  const saveModelPath = 'file://../models/fashion-mnist-tfjs';

  const model = buildModel();
  model.summary();

  const info = await trainModel(model, trainData);
  console.log(info);

  console.log('Evaluating model...');
  await evaluateModel(model, testData);

  console.log('Saving model...');
  await model.save(saveModelPath);
};

run();