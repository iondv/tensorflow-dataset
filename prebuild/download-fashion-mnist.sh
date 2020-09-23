#!/bin/bash
scriptDir="$(dirname "$0")"
dir="${scriptDir}/fashion-mnist"
links=( \
#	"http://fashion-mnist.s3-website.eu-central-1.amazonaws.com/train-images-idx3-ubyte.gz" \
#	"http://fashion-mnist.s3-website.eu-central-1.amazonaws.com/train-labels-idx1-ubyte.gz" \
#	"http://fashion-mnist.s3-website.eu-central-1.amazonaws.com/t10k-images-idx3-ubyte.gz" \
#	"http://fashion-mnist.s3-website.eu-central-1.amazonaws.com/t10k-labels-idx3-ubyte.gz" \ 
	"https://dax-cdn.cdn.appdomain.cloud/dax-fashion-mnist/1.0.2/fashion-mnist.tar.gz"
)
if ! [ -d "${dir}"  ]; then mkdir "${dir}"; fi
i=0
for link in "${links[@]}"; do
	filename="${link##*/}"
	i+=1
	curl --output "${dir}/${filename}" "${link}" &
	pids["$i"]="$!"
done

for pid in "${pids[@]}"; do
	wait "${pid}"
done

i=0
for link in "${links[@]}"; do
	filename="${link##*/}"
	tarFilename="${filename%.*}"
	i+=1
	echo "unpacking ${filename}"
	gunzip -c "${dir}/${filename}" | tar -C "${dir}" -xf -
	rm "${dir}/${filename}"
done

echo "downloaded & unpacked"