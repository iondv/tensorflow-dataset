Эта страница на [Русском](./README_RU.md)

# IONDV. Tensorflow dataset app 
**IONDV. Tensorflow dataset app** - is an application based on the [IONDV. Framework](https://iondv.com) ([code repository](https://github.com/iondv/framework)) to accumulate data, normalize and mark up images, create, train and compare [Tensor Flow](https://www.tensorflow.org/) models without programming for standard functionality. It’s also possible to fully customize the logic in the form of model modifications and dataset processing using the Node.js code development.


The application uses the [Fashion-MNIST](https://github.com/zalandoresearch/fashion-mnist) dataset as an example for data import. 

### IONDV. Framework in brief

**IONDV. Framework** is a node.js open source application that implements the functionality of a digital tool platform for rapid development of web applications and micro-services based on metadata and can be extended with modules. 
The main purpose of the complex of solutions is to speed up the development of accounting web applications (ERP) using low-code technology. 
This platform consists of the following open-source components: the [IONDV. Framework](https://github.com/iondv/framework), 
the [modules](https://github.com/topics/iondv-module) and the ready-made applications expanding its functionality, as well as the [Studio](https://studio.iondv.com) ([repository](https://github.com/iondv/studio)) 
open source visual development environment to create metadata of an application. The UML-scheme modeled applications can be launched [in 80 seconds](https://youtu.be/s7q9_YXkeEo).

* For more details, see [IONDV. Framework site](https://iondv.com). 

* Documentation is available at [Github repository](https://github.com/iondv/framework/blob/master/docs/en/index.md).

## Demo
Watch a brief video about creating and marking up a dataset, creating a neural network model, teaching a model and verifying the quality of recognition - all without a single line of code - https://www.youtube.com/watch?v=529TwrJoEKQ

Demo access to the system without registration: https://tensorflow-dataset.iondv.com. User login demo, password ion-demo. Demo mode has learning capabilities restricted to 30 patterns per run and dataset imports limited to 50 objects per run. You can build the app locally at your computer and use it without restrictions. Read the instruction below.


## Description of features

Dataset is formed as system objects that can be created, loaded, deleted, or edited.

For each object, it is possible to determine whether it is included in the training sample or in the sample for verification.

The system allows creating models and parameterizing them, as well as creating various trained models on the current dataset.

Trained models can be downloaded in tensorflow format.

For trained models, reports can be generated to compare the recognition quality.

TODO

## How to use the demo

### Fill the database with objects for training

The first thing to do is to fill the database with objects for training. The easiest way is to import ready-made objects. To do this, go to the datasets navigation tab and open the fashion-mnist set.
This set should contain all import settings and two files attached: 
- 2k_train. csv for network training (consisting of a sample of 2000 elements from fashion-mnist)
- 300_test.csv for training verification (300 elements from fashion-mnist).
To import, click the Import data button in the object window. The import takes place in the background window. It takes about 30-40 seconds for all 2300 objects to be imported (you can check it at the Object navigation tab).

### Train the model
The next step is to train the model. The Model tab should contain a ready-made model from the tensorflow review from IBM. You can make your own, but since the metadata for the model isn’t yet perfectly formed, it is better to use this one for the demo. 

Having decided on the model, go to the Model snapshot tab. This tab is for snapshots of the model States and there should be one created in advance, you need to open it. The snapshot contains a link to the model and sets all 10 types of objects from fashion-mnist. If you only need to train for certain types, you can edit the list. 
Next, you need to compile the model in the snapshot editing window, click Compile. After that, the files of the compiled model should appear in the Model file and Weights file fields. 

At this stage, you can start training by clicking the Teach button. The model is trained on data in parts, each part goes through 10 epochs. Part sizes and number of epochs are set in IMPORT_BATCH_SIZE, TRAINING_BATCH_SIZE and EPOCHS. The training and verification logs are soon also to be developed. 

### Object recognition

When the model is finished training, it can be used for object recognition. For this, a new recognition object is created in the objectClassification tab. You need to attach a snapshot of the model in the Model snapshot field. In the Object field, a new object is created (or an existing one is attached). Then fill out a in the Object field. It can be any name. Then you need to attach a picture in the image or normalized image fields. If the picture is not normalized before loading, then it should be in image. You can set crop settings in the crop settings field. After the name and picture have been set, the object must be saved (without closing).

After saving, click the Verify button in the upper-right corner of the screen to normalize the image and check for its uniqueness. If the verification is passed, the object will be added to the set. After that it can be used it in training. For this you need to set the type in the Type field and specify Learn or Check in the State field depending on whether the model will be trained or verified with this image. 

When everything is ready, close the object, return to object Prediction and click save.

After that, the "Process with tensorflow" action will become available. When click this button, the network will try to recognize the object based on what it has learned. In the "Logs" field it will be written for each type how likely it is that the object belongs to this type. 
The "Prediction" field will display the probability with which the network is confident in the decision, and the "recognized type" field shows the type that the object was eventually assigned to.

-------

If the results are unsatisfactory, the network needs more examples for training. You can download the entire fashion-mnist dataset, which contains 61,000 elements. You can find the instructions in prebuild/readme.txt, paragraph 1. The sets will be loaded to a subfolder. You need to attach them to the dataset object and import and retrain the model after that.


## Loading and recognizing an object

Create an instance of the object class, upload the image to image field, or, if the image is already normalized, upload it to normalizedImage. After loading, follow the workflow using the Verify button. If necessary, the image will be normalized or checked for its uniqueness in the set. If everything is successful, the Verified field will be ticked. After that, the object can be recognized.

## Importing data from a ready-made set

In the Dataset class specify the data source and click the object editing button at the top of the window. In demo mode (NODE_ENV = demo) 50 random patterns are loaded (or less, if the random selection fell on a pattern that is already in the set).
- the amount is regulated in lib/util/importFromDataset.js by the DEMO_IMPORT_LIMIT constant.

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
