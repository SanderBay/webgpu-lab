/**
 * Initializes WebGPU by default, creating a device and configuring a canvas context.
 * @returns {Promise<{device: GPUDevice, context: GPUCanvasContext, canvas: HTMLCanvasElement}>}
 */
async function simpleWInit() {
  if (!navigator.gpu) {
    throw new Error("WebGPU is not supported");
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("Failed to get WebGPU adapter");
  }

  const device = await adapter.requestDevice();

  device.addEventListener('uncapturederror', (event) => {
                const errDiv = document.createElement('div');
                errDiv.style.position = 'absolute';
                errDiv.style.top = '50px';
                errDiv.style.right = '10px';
                errDiv.style.background = 'darkred';
                errDiv.style.color = 'white';
                errDiv.style.padding = '10px';
                errDiv.style.zIndex = '9999';
                errDiv.textContent = 'WebGPU Error: ' + event.error.message;
                document.body.appendChild(errDiv);
    });

    const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('webgpu-canvas'));
    if (!canvas) {
        throw new Error("Canvas element with id 'webgpu-canvas' not found");
    }

    const context = canvas.getContext('webgpu');
    if (!context) {
        throw new Error("Failed to get WebGPU context from canvas");
    }

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device: device,
        format: presentationFormat,
        alphaMode: 'premultiplied'
    });

    return {device, context, canvas, presentationFormat};
}

/**
 * Loads a shader from a .wgsl file.
 * @param {string} path The path to the .wgsl file
 * @returns {Promise<string>}
 */
async function loadShader(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to load shader: ${path} (Status: ${response.status})`);
    }
    return await response.text();
}

export { simpleWInit, loadShader };