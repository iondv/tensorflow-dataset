const imageConverter = require('./imageConverter');
const tf = require('@tensorflow/tfjs-node');

module.exports = {
  gatherDataset
};

async function gatherDataset(modelSnapshotItem, importSize, importOffset, objectClass, forTraining, batchSize, dataRepo) {
  if (!modelSnapshotItem.base.modelFile || !modelSnapshotItem.base.weightsFile)
    throw new Error('Model has to be compiled first.');
  if (!modelSnapshotItem.base.typesToLearn)
    throw new Error('There are no types for this model to learn.');

  const namespace = modelSnapshotItem.classMeta.plain.namespace;
  const typesToLearnCodes = modelSnapshotItem.base.typesToLearn;
  // const typesToLearnClass = `${modelSnapshotItem.properties.typesToLearn.meta.itemsClass}@${namespace}`;

  // review the type labels of the snapshot
  const typeLabelsClass = `${modelSnapshotItem.properties.typeLabels.meta.itemsClass}@${namespace}`;
  const labels = [];
  const labelsSet = {};
  for (const typeCode of typesToLearnCodes) {
    const existingLabels = await dataRepo.getList(typeLabelsClass, {
      filter: {
        eq: ['$type', typeCode]
      }
    });
    for (const label of existingLabels) {
      if (!Object.values(labelsSet).includes(label.base.label)) {
        labels.push(label.id);
        labelsSet[typeCode] = label.base.label;
        break;
      }
    }
    if (!Object.keys(labelsSet).includes(typeCode)) {
      // search for the next empty label
      for (let i = 0; i < typesToLearnCodes.length; i += 1) {
        if (!Object.values(labelsSet).includes(i)) {
          const label = await dataRepo.createItem(typeLabelsClass, {
            type: typeCode,
            label: i
          });
          labels.push(label.id);
          labelsSet[typeCode] = i;
          break;
        }
      }
    }
  }
  modelSnapshotItem = await dataRepo.saveItem(`${modelSnapshotItem.classMeta.plain.name}@${modelSnapshotItem.classMeta.plain.namespace}`, modelSnapshotItem.id, {
    typeLabels: labels,
  })

  const modelFileStream = (await modelSnapshotItem.files.modelFile.getContents()).stream;
  const modelFilePath = modelFileStream.path;
  modelFileStream.close();
  const modelFileUrl = `file://${modelFilePath}`;

  const model = await tf.loadLayersModel(modelFileUrl);

  const filter = {
    and: [
      {nempty: ['$normalizedImage']},
      {eq: ['$verified', true]}
    ]
  };
  forTraining?
    filter.and.push({eq: ['$state', 'learn']})
    : filter.and.push({eq: ['$state', 'check']})

  const typeFilter = [];
  for (const typeCode of typesToLearnCodes)
    typeFilter.push({eq: ['$type', typeCode]})

  filter.and.push({or: typeFilter});

  const itemList = await dataRepo.getList(objectClass, {
    offset: importOffset,
    count: importSize,
    filter
  });

  const [
    ,
    imageWidth,
    imageHeight,
    imageChannels
    ] = model.inputs[0].shape;

  // check if the number of types corresponds to the number of model outputs
  if (typesToLearnCodes.length !== model.outputs[0].shape[1])
    throw new Error(`The number of types to learn (${typesToLearnCodes.length}) and the number of model outputs (${model.outputs[0].shape[1]}) do not match.`);

  return (await objectItemsToData(itemList, labelsSet, [imageWidth, imageHeight, imageChannels], typesToLearnCodes.length))
    .batch(batchSize);
}

async function objectItemsToData(itemList, labelList, [imageWidth, imageHeight, imageChannels], numberOfOutputs) {
  const sourceArray = itemList
    .map(async (item) => {
      const normalizedImageStream = (await item.files.normalizedImage.getContents()).stream;
      const normalizedImagePath = normalizedImageStream.path;
      normalizedImageStream.close();
      const pixelData = await imageConverter.toPixelData(normalizedImagePath, {
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
