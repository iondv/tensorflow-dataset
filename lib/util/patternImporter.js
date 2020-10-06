const imageConverter = require('./imageConverter');
const tf = require('@tensorflow/tfjs-node');

module.exports = {
  gatherDataset
};

async function gatherDataset(modelSnapshotItem, importSize, importOffset, objectClass, forTraining, dataRepo) {
  if (!modelSnapshotItem.base.typesToLearn)
    throw new Error('There are no types for this model to learn.');

  const namespace = modelSnapshotItem.classMeta.plain.namespace;
  const typesToLearnCodes = modelSnapshotItem.base.typesToLearn;
  // const typesToLearnClass = `${modelSnapshotItem.properties.typesToLearn.meta.itemsClass}@${namespace}`;

  // review the type labels of the snapshot
  const typeLabelsClass = `${modelSnapshotItem.properties.typeLabels.meta.itemsClass}@${namespace}`;
  const labels = [];
  const labelsTaken = {};
  for (const typeCode of typesToLearnCodes) {
    const existingLabels = await dataRepo.getList(typeLabelsClass, {
      filter: {
        eq: ['$type', typeCode]
      }
    });
    for (const label of existingLabels) {
      if (!Object.keys(labelsTaken).includes(label.base.label)) {
        labels.push(label.id);
        labelsTaken[label.base.label] = typeCode;
        break;
      }
    }
    if (!Object.values(labelsTaken).includes(typeCode)) {
      // search for the next empty label
      for (let i = 0; i < typesToLearnIds.length; i += 1) {
        if (!Object.keys(labelsTaken).includes(i)) {
          const label = await dataRepo.createItem(typeLabelsClass, {
            type: typeCode,
            label: i
          });
          labels.push(label.id);
          labelsTaken[i] = typeCode;
          break;
        }
      }
    }
  }
  modelSnapshotItem = await dataRepo.saveItem(`${modelSnapshotItem.classMeta.plain.name}@${modelSnapshotItem.classMeta.plain.namespace}`, modelSnapshotItem.id, {
    typeLabels: labels,
  })

  const modelFile = modelSnapshotItem.files.modelFile;
  const modelFilePath = (await modelFile.getContents()).stream.path;
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
    throw new Error(`The number of types to learn (${typesToLearnCodes.length}) and the number of model outputs (${model.outputs[0].shape[1]}) don't match.`);

  const sourceArray = itemList
    .map(async (item) => {
      const normalizedImagePath = (await item.files.normalizedImage.getContents()).stream.path;
      const pixelData = imageConverter.toPixelData(normalizedImagePath, {
        imageWidth,
        imageHeight,
        imageChannels
      });
      const normalizedData = [];
      for (let i = 0; i < pixelData.length; i += 4)
        normalizedData.push(pixelData[i]/255);

      const imageTensor = tf.tensor(normalizedData, [
        imageWidth,
        imageHeight,
        imageChannels
      ]);
    });
  //console.log(sourceArray);
  // tf.data.array
}
