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

## Demo
Watch a brief video about application - https://www.youtube.com/watch?v=529TwrJoEKQ

Demo access to the system without registration: https://tensorflow-dataset.iondv.com. User login demo, password ion-demo. Demo mode has learning capabilities restricted to 30 patterns per run and dataset imports limited to 50 objects per run.


## Description of features

Dataset is formed as system objects that can be created, loaded, deleted, or edited.

For each object, it is possible to determine whether it is included in the training sample or in the sample for verification.

The system allows creating models and parameterizing them, as well as creating various trained models on the current dataset.

Trained models can be downloaded in tensorflow format.

For trained models, reports can be generated to compare the recognition quality.

TODO

## Description of metadata

See metadata structure at the picture

<img src="/data_model.png">

The functions of the main classes:
* object – dataset data object – contains an original image, a normalized image, the classification type specified by operator, and a link to the prediction results.
* object prediction – a class that links the data object to the training result – contains a link with training result and the object, prediction percentage, type, and logs.
* learning result – contains the date of creation and editing, trained model file, and logs.
* models – contains information about the model type, compilation parameters, and a collection of related layers.
* layers – model layer – contains information about the layer name, activation, content, and others, depending on the specified layer.
* dataset – contains information about the name, type of source, source of training and testing, and type of marked label.

## Building the application

Building this application on linux may require the g++ to be installed (to build tfjs-node). Usually it can be found in the OS' package tree by itself or contained in a basic development bundle like build-essential on Ubuntu.

Ubuntu g++ installation example:
```
apt install g++
```
or
```
apt install build-essential
```

## Configuring the application

**Maximum file size.**

Allows to set the maximum size of uploaded files. The configuration is performed for the "File" type attribute on the view form.

_Example:_
```
"options": {
    "maxSize": 256000000
} 
```

The size is indicated in KB.

**Allowed file types.**

Allows to specify valid extensions for uploaded files. The configuration is performed for the `"allowedFileTypes"` property of the "File collection" attribute on the class form.

_Example:_
```
"allowedFileTypes":  ["csv", "zip"] 
```
 --------------------------------------------------------------------------  
 
 
  #### [Licence](/LICENSE) &ensp;  [Contact us](https://iondv.ru) &ensp;  [Russian](./README_RU.md)   &ensp;           
 
 
 --------------------------------------------------------------------------  
 
 Copyright (c) 2020 **LLC "ION DV"**.  
 All rights reserved. 
