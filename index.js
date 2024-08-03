function setLoadAllCallback(elems, callback) {
    let count = 0;
    for (let i = 0; i < elems.length; ++i) {
        elems[i].onload = function () {
            ++count;
            if (count == elems.length) {
                callback(elems);
            }
        };
    }
}

function getURLParameter(key, fallback) {
    let params = new URLSearchParams(document.location.search);
    if (params.has(key) == false) {
        return fallback;
    }
    return params.get(key);
}

function showError(message) {
    let errorElement = document.createElement('div');
    errorElement.textContent = message;
    errorElement.classList.add('error');
    document.getElementById('log-list').appendChild(errorElement);
}

function hideLoading() {
    document.getElementById('loading').hidden = true;
}

function getPixelRGBA(imageData, x, y) {
    let baseIndex = (y * imageData.width + x) * 4;
    return {
        r: imageData.data[baseIndex + 0],
        g: imageData.data[baseIndex + 1],
        b: imageData.data[baseIndex + 2],
        a: imageData.data[baseIndex + 3]
    }
}

function setPixelRGBA(imageData, x, y, rgba) {
    let baseIndex = (y * imageData.width + x) * 4;
    imageData.data[baseIndex + 0] = rgba.r;
    imageData.data[baseIndex + 1] = rgba.g;
    imageData.data[baseIndex + 2] = rgba.b;
    imageData.data[baseIndex + 3] = rgba.a;
}

function RGB2Vector(rgba) {
    return [
        (rgba.r - 128) / 127,
        (rgba.g - 128) / 127,
        (rgba.b - 128) / 127
    ];
}

function vector2RGB(vector3) {
    return {
        r: Math.floor(vector3[0] * 127 + 128),
        g: Math.floor(vector3[1] * 127 + 128),
        b: Math.floor(vector3[2] * 127 + 128)
    };
}

function rotateVectorByZ(vector3, angle) {
    let rad = angle * Math.PI / 180;
    let sin = Math.sin(rad);
    let cos = Math.cos(rad);
    return [
        vector3[0] * cos - vector3[1] * sin,
        vector3[0] * sin + vector3[1] * cos,
        vector3[2]
    ];
}

function rotateNormalMap(srcImageData, angle) {
    let dstImageData = new ImageData(srcImageData.width, srcImageData.height);
    for (let y = 0; y < srcImageData.height; y++) {
        for (let x = 0; x < srcImageData.width; x++) {
            let srcPixel = getPixelRGBA(srcImageData, x, y);
            let vec3 = RGB2Vector(srcPixel);
            let rotatedVec3 = rotateVectorByZ(vec3, angle);
            let dstPixel = vector2RGB(rotatedVec3);
            dstPixel.a = srcPixel.a;
            setPixelRGBA(dstImageData, x, y, dstPixel);
        }
    }
    return dstImageData;
}

function img2Canvas(srcImage) {
    const canvas = document.createElement('canvas');
    canvas.width = srcImage.width;
    canvas.height = srcImage.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(srcImage, 0, 0);
    return canvas;
}

function getPartImageData(srcCanvas, column, row, index) {
    const partWidth = srcCanvas.width / column;
    const partHeight = srcCanvas.height / row;
    const x = (index % column) * partWidth;
    const y = Math.floor(index / column) * partHeight;

    const srcCanvasCtx = srcCanvas.getContext('2d');
    return srcCanvasCtx.getImageData(x, y, partWidth, partHeight);
}

function drawRotatedImage(canvas, image, angle, pivot_x, pivot_y, offset_x = 0, offset_y = 0, size = 0) {
    let context = canvas.getContext('2d');
    context.save();
    context.translate(pivot_x, pivot_y);
    context.rotate(angle * Math.PI / 180);
    const dwidth = image.width * size;
    const dheight = image.height * size;
    context.drawImage(
        image,
        -(dwidth / 2) + offset_x,
        -(dheight / 2) + offset_y,
        dwidth,
        dheight
    );
    context.restore();
}

function typeChar(text, angle, dstcanvas, fontCanvas, offset) {

    if (CHARS.includes(text) == false) return;
    const index = CHARS.indexOf(text);

    partImageData = getPartImageData(fontCanvas, FONT_COLUMN, FONT_ROW, index);

    let rotatedImageData = rotateNormalMap(partImageData, angle);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = fontCanvas.width / FONT_COLUMN;
    tempCanvas.height = fontCanvas.height / FONT_ROW;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(rotatedImageData, 0, 0);

    drawRotatedImage(
        dstcanvas, tempCanvas, angle,
        MEDAL_CENTER[0], MEDAL_CENTER[1],
        offset[0], offset[1],
        0.15
    );
}

const MEDAL_CENTER = [256, 512 + 256];
const OFFSET = [0, -202];
const OFFSET_REV = [0, 202];
const ADVANCE_ANGLE = 9;
const ADVANCE_ANGLE_REV = -9;
const FONT_COLUMN = 8;
const FONT_ROW = 8;

function load() {
    const version = getURLParameter('v', '0');
    if (version != '1') {
        showError('UdonMedalPressから生成したURLでアクセスしてください。');
        return;
    }

    const normalUrl = getURLParameter('nm', './resources/medal_default_normal.png');
    const upperStr = getURLParameter('up', '');
    const lowerStr = getURLParameter('lw', '');
    const reverseLower = getURLParameter('rev', 'false');
    const resourceURL = getURLParameter('res', '');

    const baseNormalImg = new Image();
    const fontNormalImg = new Image();

    setLoadAllCallback([baseNormalImg, fontNormalImg], function (elems) {
        let canvas = document.createElement('canvas');
        canvas.width = baseNormalImg.width;
        canvas.height = baseNormalImg.height;
        let ctx = canvas.getContext('2d');
        ctx.drawImage(baseNormalImg, 0, 0);

        const fontCanvas = img2Canvas(fontNormalImg);

        const upperOffsetAngle = -ADVANCE_ANGLE * (upperStr.length - 1) / 2;
        for (let i = 0; i < upperStr.length; i++)
        {
            const angle = upperOffsetAngle + i * ADVANCE_ANGLE;
            typeChar(upperStr[i], angle, canvas, fontCanvas, OFFSET);
        }

        if (reverseLower == 'true') {
            const lowerOffsetAngle = -ADVANCE_ANGLE_REV * (lowerStr.length - 1) / 2;
            for (let i = 0; i < lowerStr.length; i++)
            {
                const angle = lowerOffsetAngle + i * ADVANCE_ANGLE_REV;
                typeChar(lowerStr[i], angle, canvas, fontCanvas, OFFSET_REV);
            }
        }
        else
        {
            const lowerOffsetAngle = -ADVANCE_ANGLE * (lowerStr.length - 1) / 2 + 180;
            for (let i = 0; i < lowerStr.length; i++)
                {
                const angle = lowerOffsetAngle + i * ADVANCE_ANGLE;
                typeChar(lowerStr[i], angle, canvas, fontCanvas, OFFSET);
            }
        }

        const normalDlLink = document.getElementById('normal-dl-link');
        canvas.toBlob(function (blob) {
            normalDlLink.href = window.URL.createObjectURL(blob);
            normalDlLink.download = 'normalmap.png';
            normalDlLink.hidden = false;
        });
        

        if (resourceURL) {
            const resourceDlLink = document.getElementById('resource-dl-link');
            resourceDlLink.href = resourceURL;
            resourceDlLink.hidden = false;
            document.getElementById('notice').hidden = false;
        }
    });

    // メダルのベース法線マップの読み込み
    baseNormalImg.onerror = function () {
        showError('メダル法線マップの読み込みに失敗しました。');
    }
    baseNormalImg.crossOrigin = 'Anonymous';
    baseNormalImg.src = normalUrl;
    // フォントの法線マップの読み込み
    fontNormalImg.onerror = function () {
        showError('フォント法線マップの読み込みに失敗しました。');
    }
    fontNormalImg.crossOrigin = 'Anonymous';
    fontNormalImg.src = './resources/font_normal.png';
}

window.addEventListener('DOMContentLoaded', function () {
    load();
    hideLoading();
});

const CHARS = [
    '0', '1', '2', '3', '4', '5', '6', '7',
    '8', '9', 'A', 'B', 'C', 'D', 'E', 'F',
    'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
    'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V',
    'W', 'X', 'Y', 'Z', '-', '・', '/', '♡',
    '&', ':'
];
