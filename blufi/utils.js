export const ab2hex = buffer => {
    var hexArr = Array.prototype.map.call(
        new Uint8Array(buffer),
        function (bit) {
            return ('00' + bit.toString(16)).slice(-2)
        }
    )
    return hexArr;
}

export const hexToBinArray = str => {
    var dec = parseInt(str, 16),
        bin = dec.toString(2),
        len = bin.length;
    if (len < 8) {
        var diff = 8 - len,
            zeros = "";
        for (var i = 0; i < diff; i++) {
            zeros += "0";
        }
        bin = zeros + bin;
    }
    return bin.split("");
}

export const uint8ArrayToArray = uint8Array => {
    var array = [];
    for (var i = 0; i < uint8Array.byteLength; i++) {
        array[i] = uint8Array[i];
    }
    return array;
}

export const uint8ArrayToHexArray = (uint8Array) => {
    if (!uint8Array || uint8Array.length === 0) {
        console.log('[]');
        return;
    }

    const hexArray = Array.from(uint8Array, byte =>
        '0x' + byte.toString(16).padStart(2, '0').toUpperCase()
    );

    return hexArray;
}

export const parseTLVWithLoop = (arr) => {
    const result = [];
    let i = 0;
    while (i < arr.length) {
        // 获取当前数据块的 type 和 length
        const type = arr[i];
        const len = arr[i + 1];
        // 验证数据是否足够
        if (i + 2 + len > arr.length) {
            break;
        }
        // 提取数据
        const data = [];
        for (let j = 0; j < len; j++) {
            data.push(arr[i + 2 + j]);
        }
        // 保存到结果数组
        result.push({
            type: type,
            length: len,
            data: data,
        });
        // 移动到下一个数据块
        i += 2 + len;
    }
    return result;
}


export const getCharCodeat = (str) => {
    var list = [];
    for (var i = 0; i < str.length; i++) {
        list.push(str.charCodeAt(i));
    }
    return list;
}