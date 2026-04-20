import { simpleWInit, loadShader } from "../../utils/utils.js";

async function main() {
    const { device, context, canvas } = await simpleWInit();
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    const computeModule = device.createShaderModule({
        code: await loadShader('../shaders/compute.wgsl'),
    });

    const renderModule = device.createShaderModule({
        code: await loadShader('../shaders/raster.wgsl'),
    });

    const cPipe = device.createComputePipeline({ 
        layout: 'auto', 
        compute: { module: computeModule, entryPoint: 'cs_main' } });
    
    const rPipe = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: renderModule, entryPoint: 'vs' },
        fragment: {
            module: renderModule, entryPoint: 'fs',
            targets: [{
                format: presentationFormat, 
                blend: {
                    color: { operation: 'add', srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
                    alpha: { operation: 'add', srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }
                }
            }]
        }
    });

    const max = 100000;
    const data = new Float32Array(max * 6);
    for (let i = 0; i < max; i++) {
        const o = i * 6;
        data[o + 0] = Math.random() * 2.8 - 1.4;
        data[o + 1] = Math.random() * 2.8 - 1.4;
        data[o + 2] = 0;
        data[o + 3] = Math.random() * 0.004 + 0.002;
        data[o + 4] = Math.random() * 0.004 + 0.002;
        data[o + 5] = 0;
    }

    const sBuf = device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(sBuf, 0, data);
    const pBuf = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const cBG = device.createBindGroup({ layout: cPipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: pBuf } }, { binding: 1, resource: { buffer: sBuf } }] });
    const rBG = device.createBindGroup({ layout: rPipe.getBindGroupLayout(0), entries: [{ binding: 1, resource: { buffer: sBuf } }] });

    function sync(id) {
        const r = document.getElementById(id + '-range');
        const n = document.getElementById(id + '-number');
        r.oninput = () => n.value = r.value;
        n.oninput = () => r.value = n.value;
        return n;
    }

    const ui = { count: sync('count'), angle: sync('angle'), power: sync('strength'), gust: sync('gust') };
    let mouse = { x: 0, y: 0, down: false };

    window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = (1 - (e.clientY - rect.top) / rect.height) * 2 - 1;
    });
    window.addEventListener('mousedown', (e) => { if (e.target.id === 'gpu-canvas') mouse.down = true; });
    window.addEventListener('mouseup', () => mouse.down = false);

    const pData = new Float32Array(8);
    let lastTime = performance.now();
    function frame() {
        const now = performance.now();
        const delta = Math.min((now - lastTime) / 1000, 0.1); // Cap delta to prevent huge jumps
        lastTime = now;

        const count = Math.min(max, parseInt(ui.count.value) || 0);
        pData[0] = now / 1000;
        pData[1] = mouse.x; pData[2] = mouse.y;
        pData[3] = mouse.down ? 1 : 0;
        pData[4] = parseFloat(ui.angle.value) || 0;
        pData[5] = parseFloat(ui.power.value) || 0;
        pData[6] = parseFloat(ui.gust.value) || 0;
        pData[7] = delta;
        device.queue.writeBuffer(pBuf, 0, pData);

        const encoder = device.createCommandEncoder();
        const passC = encoder.beginComputePass();
        passC.setPipeline(cPipe);
        passC.setBindGroup(0, cBG);
        passC.dispatchWorkgroups(Math.ceil(count / 64));
        passC.end();

        const passR = encoder.beginRenderPass({
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                clearValue: { r: 0.05, g: 0.1, b: 0.2, a: 1.0 }, // Distinct visible dark blue
                loadOp: 'clear', storeOp: 'store'
            }]
        });
        passR.setPipeline(rPipe);
        passR.setBindGroup(0, rBG);
        passR.draw(6, count);
        passR.end();

        device.queue.submit([encoder.finish()]);
        requestAnimationFrame(frame);
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    context.configure({ device, format: presentationFormat, alphaMode: 'premultiplied' });

    const obs = new ResizeObserver(() => {
        if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            context.configure({ device, format: presentationFormat, alphaMode: 'premultiplied' });
        }
    });
    obs.observe(document.body);
    frame();
}

main();