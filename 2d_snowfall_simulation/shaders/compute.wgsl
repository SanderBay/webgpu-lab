struct Params {
    time: f32,
    mouseX: f32,
    mouseY: f32,
    isPressed: f32,
    angle: f32,
    power: f32,
    gust: f32,
    delta: f32,
}
@group(0) @binding(0) var<uniform> p: Params;

struct Snow {
    pos: vec2f,
    vel: vec2f,
    size: f32,
    momY: f32,
}
@group(0) @binding(1) var<storage, read_write> snow: array<Snow>;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) id_vec: vec3u) {
    let i = id_vec.x;
    if (i >= arrayLength(&snow)) { return; }

    var s = snow[i];
                    
    // Wind calculations
    let rad = p.angle * 3.14159 / 180.0;
    let wind_dir = vec2f(cos(rad), sin(rad));
    let gust_val = (sin(p.time * 1.5) * cos(p.time * 0.5) * 0.5 + 0.5) * p.gust * 0.001;
    let dt = p.delta * 60.0; // Normalized to 60fps base
    
    // Organic sway and swirls 
    let sway = sin(p.time + s.pos.y) * 0.001;
    let swirlX = sin(s.pos.y * 10.0 + p.time) * 0.001;
    let swirlY = cos(s.pos.x * 10.0 + p.time) * 0.0005;

    let wind_force = wind_dir * (p.power * 0.0002 + gust_val);

    if (p.isPressed == 1.0) {
        let diff = s.pos - vec2f(p.mouseX, p.mouseY);
        let d = length(diff);
        if (d < 0.3 && d > 0.0001) {
            let f = (0.3 - d) / 0.3;
            let push = normalize(diff) * f * f * 0.01;
            s.vel.x += push.x * dt;
            s.momY += push.y * dt;
        }
    }

    s.pos += wind_force * (1.1 - s.size * 10.0) * dt;
    s.pos.x += (s.vel.x + sway + swirlX) * dt;
    s.pos.y += (s.momY - (s.vel.y * 0.5) - swirlY) * dt;
    
    s.vel.x *= pow(0.95, dt);
    s.momY *= pow(0.95, dt);

    // Bounds wrapping
    let m = 1.4;
    let seed = f32(i) + p.time;
    let rnd = fract(sin(seed) * 43758.5453) * 2.8 - 1.4;

    // X-axis wrapping
    if (s.pos.x < -m) {
        s.pos.x = m;
        s.pos.y = rnd;
        s.vel.x = 0.0; s.momY = 0.0;
    } else if (s.pos.x > m) {
        s.pos.x = -m;
        s.pos.y = rnd;
        s.vel.x = 0.0; s.momY = 0.0;
    }

    // Y-axis wrapping
    if (s.pos.y < -m) {
        s.pos.y = m;
        s.pos.x = fract(sin(seed * 1.5) * 43758.5453) * 2.8 - 1.4;
        s.vel.x = 0.0; s.momY = 0.0;
    } else if (s.pos.y > m) {
        s.pos.y = -m;
        s.pos.x = fract(sin(seed * 1.5) * 43758.5453) * 2.8 - 1.4;
        s.vel.x = 0.0; s.momY = 0.0;
    }

    snow[i] = s;
}