
document.onpaste = function (event) {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    console.log(JSON.stringify(items)); // will give you the mime types
    for (const [id, item] of Object.entries(items)) {
        if (item.kind === 'file') {
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = function (event) {
                const dataUrl = event.target.result;
                console.log(dataUrl)
                loadImage(dataUrl).then(img => process(img));
            }; // data url!
            reader.readAsDataURL(blob);
        }
    }
}

const topRoot = document.createElement('div');
document.body.appendChild(topRoot);

function process(img) {
    console.log({ img });
    const root = document.createElement('div');
    topRoot.appendChild(root);
    Object.assign(root.style, {
        border: '1px dashed black',
        width: 'min-content',
    });

    function close() {
        rendering = false;
        topRoot.removeChild(root);
    }
    const closeButton = document.createElement('button');
    closeButton.innerHTML = 'close';
    closeButton.onclick = close;
    root.appendChild(closeButton);

    const canvas = document.createElement('canvas');
    root.appendChild(canvas);
    canvas.width = img.width;
    canvas.height = img.height;

    let pointerBox = undefined;
    const blurBoxes = [];

    let rendering = true;
    function render() {
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.fillStyle = 'black';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.closePath();

        if (pointerBox) {
            ctx.beginPath();
            ctx.strokeStyle = 'red';
            ctx.strokeRect(pointerBox.topLeft.x, pointerBox.topLeft.y, pointerBox.width, pointerBox.height);
            ctx.closePath();
            ctx.stroke();
        }

        for (const box of blurBoxes) {
            ctx.beginPath();
            ctx.filter = "blur(7px)";
            const { topLeft: { x, y }, width, height } = box;
            ctx.drawImage(img, x, y, width, height, x, y, width, height);
            ctx.closePath();
        }
        ctx.filter = "none";


        if (rendering) requestAnimationFrame(render);
    }

    requestAnimationFrame(render);

    let downP = undefined;
    function onDown(event) {
        const p = Point.fromEvent(event);
        const result = mapToCanvas(p);
        if (result.inBounds) {
            downP = result.p;
            pointerBox = { topLeft: result.p, width: 0, height: 0 };
        }
    }

    function onMove(event) {
        if (!downP) return;
        const p = Point.fromEvent(event);
        const result = mapToCanvas(p);
        const box = Point.boxFromPoints(result.p, downP);
        pointerBox = box;
    }

    function onUp(p) {
        if (downP) {
            downP = undefined;
            blurBoxes.push(pointerBox);
            pointerBox = undefined;
        }
    }

    function mapToCanvas(p) {
        const canvasBox = canvas.getBoundingClientRect();
        const p2 = Point.from({ x: p.x - canvasBox.left, y: p.y - canvasBox.top });

        const safe = Point.from({ x: clamp(p2.x, 0, canvasBox.width), y: clamp(p2.y, 0, canvasBox.height) });
        if (!p2.equals(safe)) return { p: p2, inBounds: false, safe };
        return { p: p2, inBounds: true };
    }

    window.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    const copyToClipboardButton = document.createElement('button');
    copyToClipboardButton.innerHTML = 'copy to clipboard';
    copyToClipboardButton.onclick = copyToClipboard;
    root.appendChild(copyToClipboardButton);

    async function copyToClipboard() {
        const blob = await canvas.toBlob();
        navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
        ]);
    }

}


async function loadImage(src) {
    const image = new Image();
    image.src = src;
    await image.decode();
    return image;
}

function clamp(v, mn, mx) {
    return Math.min(Math.max(v, mn), mx);
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    static from(p) {
        return new Point(p.x, p.y);
    }

    static fromEvent(event) {
        return new Point(event.clientX, event.clientY);
    }

    equals(p2) {
        return Math.abs(this.x - p2.x) < Number.EPSILON && Math.abs(this.y - p2.y) < Number.EPSILON;
    }

    static boxFromPoints(p1, p2) {
        const topLeft = Point.from({
            x: Math.min(p1.x, p2.x),
            y: Math.min(p1.y, p2.y),
        });
        const bottomRight = Point.from({
            x: Math.max(p1.x, p2.x),
            y: Math.max(p1.y, p2.y),
        });
        return {
            topLeft,
            bottomRight,
            width: bottomRight.x - topLeft.x,
            height: bottomRight.y - topLeft.y,
        };
    }
}