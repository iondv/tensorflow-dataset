module.exports = {
  getLayerConfiguration,
  getCompilationOptions
}

async function getLayerConfiguration(modelItem, dataRepo) {
  const namespace = modelItem.classMeta.plain.namespace;
  const layerIds = modelItem.base.layers;
  const layerClass = `${modelItem.properties.layers.meta.itemsClass}@${namespace}`;
  const layers = [];
  for (const layerId of layerIds) {
    const layerItem = await dataRepo.getItem(layerClass, layerId);
    const layerType = layerItem.classMeta.plain.name;
    const layer = {
      type: layerType
    };

    const layerOptions = {};
    if (layerItem.base.inputShape) { // gather together the inputShape, if available
      const inputShapeItem = await dataRepo.getItem(`${layerItem.properties.inputShape.meta.refClass}@${namespace}`, layerItem.base.inputShape);
      const inputShape = [];
      for (const inputVectorId of inputShapeItem.base.tensorDimensions) {
        const inputVectorItem = await dataRepo.getItem(`${inputShapeItem.properties.tensorDimensions.meta.itemsClass}@${namespace}`, inputVectorId);
        inputShape.push(inputVectorItem.base.dimensionality);
      }
      layerOptions['inputShape'] = inputShape;
    }

    switch(layerType) {
      case "conv2d":
        layerOptions['filters'] = layerItem.base.filters;
        layerOptions['kernelSize'] = layerItem.base.kernelSize;
        layerOptions['padding'] = layerItem.base.padding;
        layerOptions['activation'] = layerItem.base.activation;
        break;
      case "maxPooling2d":
        layerOptions['poolSize'] = layerItem.base.poolSize;
        layerOptions['strides'] = layerItem.base.strides;
        break;
      case "flatten":
        break;
      case "dense":
        layerOptions['units'] = layerItem.base.units;
        layerOptions['activation'] = layerItem.base.activation;
    }

    layer['options'] = layerOptions;

    layers.push(layer);
  }

  return layers;
}

async function getCompilationOptions(modelItem, dataRepo) {
  const namespace = modelItem.classMeta.plain.namespace;

  let compilationOptions;
  if (modelItem.base.useCompilationOptionsJSON)
    compilationOptions = JSON.parse(modelItem.base.compilationOptionsJSON);
  else {
    const compilationOptionsItem = await dataRepo.getItem(`${modelItem.properties.compilationOptions.meta.name}@${namespace}`, modelItem.base.compilationOptions);
    compilationOptions = {
      optimizer: compilationOptionsItem.base.optimizer,
      loss: compilationOptionsItem.base.loss
    }
    const metrics = [];
    if (compilationOptionsItem.base.metrics) {
      for (const metricId of compilationOptionsItem.base.metrics) {
        const metricsItem = await dataRepo.getItem(`${compilationOptionsItem.properties.metrics.meta.itemsClass}@${namespace}`, metricId);
        metrics.push(metricsItem.base.metric);
      }
    }
    compilationOptions['metrics'] = metrics;
  }

  return compilationOptions;
}
