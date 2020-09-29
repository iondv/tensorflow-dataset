Эта страница на [Русском](./README_RU.md)

# IONDV. Tensorflow dataset app 
**IONDV. Tensorflow dataset app** - is an application based on the [IONDV. Framework](https://iondv.com) ([code repository](https://github.com/iondv/framework)) to accumulate data, normalize and mark up images, create, train and compare [Tensor Flow](https://www.tensorflow.org/) models without programming for standard functionality. It’s also possible to fully customize the logic in the form of model modifications and dataset processing using the Node.js code development.


See the example of data import of dataset in the [Fashion-MNIST](https://github.com/zalandoresearch/fashion-mnist) application

### IONDV. Framework in brief

**IONDV. Framework** is a node.js open source application that implements the functionality of a digital tool platform for rapid development of web applications and micro-services based on metadata and can be extended with modules. 
The main purpose of the complex of solutions is to speed up the development of accounting web applications (ERP) using low-code technology. 
This platform consists of the following open-source components: the [IONDV. Framework](https://github.com/iondv/framework), 
the [modules](https://github.com/topics/iondv-module) and the ready-made applications expanding its functionality, as well as the [Studio](https://studio.iondv.com) ([repository](https://github.com/iondv/studio)) 
open source visual development environment to create metadata of an application. The UML-scheme modeled applications can be launched [in 80 seconds](https://youtu.be/s7q9_YXkeEo).

* For more details, see [IONDV. Framework site](https://iondv.com). 

* Documentation is available at [Github repository](https://github.com/iondv/framework/blob/master/docs/en/index.md).


## Description of features

Dataset is formed as system objects that can be created, loaded, deleted, or edited.

For each object, it is possible to determine whether it is included in the training sample or in the sample for verification.

The system allows creating models and parameterizing them, as well as creating various trained models on the current dataset.

Trained models can be downloaded in tensorflow format.

For trained models, reports can be generated to compare the recognition quality.

TODO

## Description of metadata

See metadata structure at the picture

The functions of main classes:
* object - dataset data object - contains the original image, a normalized image, the classification type specified by the operator, and a link to the prediction results
* 


 --------------------------------------------------------------------------  
 
 
  #### [Licence](/LICENSE) &ensp;  [Contact us](https://iondv.ru) &ensp;  [Russian](./README_RU.md)   &ensp;           
 
 
 --------------------------------------------------------------------------  
 
 Copyright (c) 2020 **LLC "ION DV"**.  
 All rights reserved. 
