module.exports = {
  reviewLabels
}

async function reviewLabels(modelSnapshotItem, dataRepo) {
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

  return {
    modelSnapshotItem: await dataRepo.saveItem(`${modelSnapshotItem.classMeta.plain.name}@${modelSnapshotItem.classMeta.plain.namespace}`, modelSnapshotItem.id, {
      typeLabels: labels,
    }),
    labelsSet
  };
}