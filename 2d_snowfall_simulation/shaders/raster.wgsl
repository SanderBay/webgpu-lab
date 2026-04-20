struct Snow {
    pos: vec2f,
    vel: vec2f,
    size: f32,
    momY: f32,
}
@group(0) @binding(1) var<storage, read> snow: array<Snow>;

struct Out {
    @builtin(position) p: vec4f,
    @location(0) uv: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> Out {
    let quad = array<vec2f, 6>(
        vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
        vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
    );
    let f = snow[ii];
    var o: Out;
    o.p = vec4f(f.pos + (quad[vi] * f.size), 0.0, 1.0);
    o.uv = quad[vi];
    return o;
}

@fragment
fn fs(i: Out) -> @location(0) vec4f {
    let d = length(i.uv);
    let a = 1.0 - smoothstep(0.4, 1.0, d);
    return vec4f(0.9, 0.95, 1.0, a);
}