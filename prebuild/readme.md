# Перенастройка модели

1. ``bash download-fashion-mnist.sh`` - загружает шаблоны для обучения и проверки
2. ``node buildModel.js`` - инициализирует сеть, обучает ее и проверяет
модель сохраняется в tensorflow-dataset/models/fashion-mnist-tfjs

в buildModel.js есть несколько констант, которые управляют процессом создания и обучения сети.