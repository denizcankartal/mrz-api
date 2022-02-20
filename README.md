# Getting Started

## Setting up OpenCV

1.  First, install node-gyp

    ```bash
    $ npm install -g node-gyp
    ```

    follow the instructions for installing node-gyp at [https://github.com/nodejs/node-gyp](https://github.com/nodejs/node-gyp)

2. Then install [CMake](https://cmake.org/) if you havent yet

3.  on Windows: Install windows build tools

    ```bash
    $ npm install --global windows-build-tools
    ```

    on Linux and Mac follow the instructions of the following link at [https://www.npmjs.com/package/opencv4nodejs](https://www.npmjs.com/package/opencv4nodejs)

4. Install opencv-build

    ```bash
    $ npm install opencv-build --save
    ```

    or alternatively Follow the instructions given at [https://www.npmjs.com/package/opencv4nodejs](https://www.npmjs.com/package/opencv4nodejs) to install opencv4nodejs.

## Setting up Tesseract

1.  Follow the Tesseract Installation instructions at [https://tesseract-ocr.github.io/tessdoc/Home.html](https://tesseract-ocr.github.io/tessdoc/Home.html)

2.  Add Tesseract to path.

3.  Download Tessdata_best and replace the old tessdata folder inside the Tesseract-Ocr folder with the cloned tessdata_best folder. Then rename the folder `tessdata_best` to `tessdata`. https://github.com/tesseract-ocr/tessdata_best

4.  Put `.traineddata` files from tessdata_ocrb into new tessdata folder. https://github.com/Shreeshrii/tessdata_ocrb

5.  In code add the value `ocrb` for the l option. (Call tesseract with `-l ocrb`)

## Using the Server

1.  After setting everything else, starting the Server is as simple as running:

    ```bash
    $ npm run start
    ```

2. The command `app.listen(3000)` inside `src/server.js` defines what port is used.

3. Make your request to `<your_url>/mrz` to parse an image. A request should include:

    ```js
    {
        'file': File,
        'verbose': boolean
    }
    ```

    The server will give back a json response which can vary based on the input given. Feel free to test it out and check the response yourself.

## With help from:

*   Extract Machine Readable Zone: https://www.pyimagesearch.com/2015/11/30/detecting-machine-readable-zones-in-passport-images/

*   Image Preprocessing: https://medium.com/cashify-engineering/improve-accuracy-of-ocr-using-image-preprocessing-8df29ec3a033

*   Text Skew Correction: https://www.pyimagesearch.com/2017/02/20/text-skew-correction-opencv-python/

\
@ Authors:\
Jonathan Indetzki\
Deniz Kartal