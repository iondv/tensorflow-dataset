module.exports = {
  gatherDataset,
  gatherConsistentDataset
};

const imageConverter = require('./imageConverter');
const tf = require('@tensorflow/tfjs-node');
const modelUtils = require('./modelUtils');
const objectPreprocessor = require('./objectPreprocessor');

async function gatherDataset(modelSnapshotItem, importSize, importOffset, objectClass, forTraining, batchSize = null, dataRepo, types = null) {
  if (!modelSnapshotItem.base.modelFile || !modelSnapshotItem.base.weightsFile)
    throw new Error('Model has to be compiled first.');
  if (!modelSnapshotItem.base.typesToLearn)
    throw new Error('There are no types for this model to learn.');

  const typesToLearnCodes = modelSnapshotItem.base.typesToLearn;
  const newLabelsObject = await modelUtils.reviewLabels(modelSnapshotItem, dataRepo);
  modelSnapshotItem = newLabelsObject.modelSnapshotItem;
  const labelsSet = newLabelsObject.labelsSet;

  const modelFileStream = (await modelSnapshotItem.files.modelFile.getContents()).stream;
  const modelFilePath = modelFileStream.path;
  modelFileStream.close();
  const modelFileUrl = `file://${modelFilePath}`;

  const model = await tf.loadLayersModel(modelFileUrl);

  const filter = {
    and: [
      {eq: ['$verified', true]}
    ]
  };
  forTraining?
    filter.and.push({eq: ['$state', 'learn']})
    : filter.and.push({eq: ['$state', 'check']})

  const typeFilter = [];
  for (const typeCode of typesToLearnCodes)
    if (!types || (types.includes(typeCode)))
      typeFilter.push({eq: ['$type', typeCode]})

  filter.and.push({or: typeFilter});

  const itemList = await dataRepo.getList(objectClass, {
    offset: importOffset,
    count: importSize,
    filter
  });

  const modelItem = await dataRepo.getItem(
    `model@${modelSnapshotItem.classMeta.namespace}`,
    modelSnapshotItem.base.model
  );

  // check if the number of types corresponds to the number of model outputs
  if (typesToLearnCodes.length !== model.outputs[0].shape[1])
    throw new Error(`The number of types to learn (${typesToLearnCodes.length}) and the number of model outputs (${model.outputs[0].shape[1]}) do not match.`);

  if (batchSize)
    return (await objectItemsToData(itemList, labelsSet, modelItem, typesToLearnCodes.length, dataRepo))
      .batch(batchSize);
  else
    return (await objectItemsToData(itemList, labelsSet, modelItem, typesToLearnCodes.length, dataRepo));
}

async function gatherConsistentDataset(
  modelSnapshotItem,
  importSize,
  partialImportOffsets,
  objectClass,
  forTraining,
  batchSize,
  dataRepo
) {
  if (!modelSnapshotItem.base.modelFile || !modelSnapshotItem.base.weightsFile)
    throw new Error('Model has to be compiled first.');
  if (!modelSnapshotItem.base.typesToLearn)
    throw new Error('There are no types for this model to learn.');

  const typesToLearnCodes = modelSnapshotItem.base.typesToLearn;

  let data;
  for (const typeCode of typesToLearnCodes) {
    if (!partialImportOffsets[typeCode])
      partialImportOffsets[typeCode] = 0;
    // console.log('reading', Math.floor(importSize/typesToLearnCodes.length), 'patterns for label', typeCode, 'starting at', partialImportOffsets[typeCode]);
    const newData = await gatherDataset(modelSnapshotItem, Math.floor(importSize/typesToLearnCodes.length), partialImportOffsets[typeCode], objectClass, forTraining, null, dataRepo, typeCode);
    if (newData.size < (Math.floor(importSize/typesToLearnCodes.length/2)))
      return new tf.data.array([]);
    partialImportOffsets[typeCode] += newData.size;
    if (!data)
      data = newData;
    else {
      data = data.concatenate(newData);
    }
  }

  return data
    .shuffle(Math.floor(importSize/2))
    .batch(batchSize);
}

async function objectItemsToData(itemList, labelList, modelItem, numberOfOutputs, dataRepo) {
  const sourceArray = itemList
    .map(async (item) => {

      const imagePreprocessingOptions = await dataRepo.getItem(
        `imagePreprocessingOptions@${modelItem.classMeta.plain.namespace}`,
        modelItem.base.imagePreprocessingOptions
      );

      const normalizedImage = await objectPreprocessor(item, imagePreprocessingOptions);

      // const imageStream = (await item.files.normalizedImage.getContents()).stream;
      // const imagePath = imageStream.path;
      // imageStream.close();
      const {
        imageWidth,
        imageHeight,
        imageChannels
      } = imagePreprocessingOptions;

      const pixelData = await imageConverter.toPixelData(normalizedImage, {
        imageWidth,
        imageHeight,
        imageChannels
      });
      const normalizedData = [];
      for (let i = 0; i < pixelData.length; i += 4)
        normalizedData.push(pixelData[i] / 255);

      const imageTensor = tf.tensor(normalizedData, [
        imageWidth,
        imageHeight,
        imageChannels
      ]);

      const dataLabel = labelList[item.base.type];
      const outputsTemplate = (new Array(numberOfOutputs)).fill(0);
      const outputsTensor = tf.tensor1d(outputsTemplate.map((output, num) => {
        return num === dataLabel ? 1 : 0;
      }));
      return {
        xs: imageTensor,
        ys: outputsTensor
      };
    });

  return tf.data.array(await Promise.all(sourceArray));
}
