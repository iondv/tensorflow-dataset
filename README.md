# fashion-goods
Demo AIB and tensorflow

## Russian description

Демонстрационное приложение на основе [IONDV. Framework](https://iondv.com) реализующее автоматическую классификацию загруженных товаров используя TensorFlow. На основе верификации распознаваний оператором возможно переобучение модели путем формирования размеченного датасета и новой модели.

Логика работы приложения:
* создается объект товара, внём вводится наименование и загружается изображение
* при сохранении объекта, система автоматически распознает тип изображения первично на основе датасета Fashion-MNIST https://github.com/zalandoresearch/fashion-mnist
* объект товара можно перераспознать в любой момент
* правильность распознания можно подтвердить оператором или изменить. Подтвержденные товары используются в последующем для формирования размеченного датасета для распознования новых товаров
* на основе подтвержденных классификаторов товаров можно переобучить модель TensorFlow
* на основе переобученной модели можно перераспознать все товары.

## English description

Demo application based on [IONDV. Framework](https://iondv.com) that implements automatic classification of uploaded products using TensorFlow. Based on the operator's recognition verification, the model can be retrained by forming a marked-up dataset and a new model.

Application logic:
* a product object is created, a name is entered, and an image is uploaded
* when saving an object, the system automatically recognizes the image type primarily based on the Fashion-MNIST dataset https://github.com/zalandoresearch/fashion-mnist
* product object can be re-recognized at any time
* the correct recognition can be verified by the operator or changed. Verified products are then used to create a marked-up dataset for recognizing new products
* TensorFlow model can be retrained based on verified product classifiers
* all products can be re-recognized based on the retrained model 


 --------------------------------------------------------------------------  
 
 
  #### [Licence](/LICENSE) &ensp;  [Contact us](https://iondv.ru) &ensp;  [Russian](./README_RU.md)   &ensp;           
 
 
 --------------------------------------------------------------------------  
 
 Copyright (c) 2020 **LLC "ION DV"**.  
 All rights reserved. 
