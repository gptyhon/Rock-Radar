(function (global) {
    'use strict';

    const VERTEX_SHADER = `
        attribute vec2 aPosition;
        varying vec2 vUv;

        void main() {
            vUv = aPosition * 0.5 + 0.5;
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `;

    const FRAGMENT_SHADER = `
        precision highp float;

        varying vec2 vUv;
        uniform vec2 uResolution;
        uniform float uTime;
        uniform float uOpacity;
        uniform float uFlowScale;
        uniform float uDistortion;
        uniform float uFilament;
        uniform float uChromatic;
        uniform float uGrain;
        uniform float uBeatImpact;
        uniform float uIdleMotion;
        uniform float uSafeMask;
        uniform vec4 uAudio;
        uniform vec3 uAccent;
        uniform vec3 uBg1;
        uniform vec3 uBg2;

        float hash21(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
        }

        float noise2(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            float a = hash21(i);
            float b = hash21(i + vec2(1.0, 0.0));
            float c = hash21(i + vec2(0.0, 1.0));
            float d = hash21(i + vec2(1.0, 1.0));
            return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }

        float fbm(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;
            for (int i = 0; i < 4; i++) {
                value += amplitude * noise2(p);
                p = mat2(1.62, 1.18, -1.18, 1.62) * p;
                amplitude *= 0.5;
            }
            return value;
        }

        float lobe(vec2 uv, vec2 center, vec2 shape) {
            vec2 delta = (uv - center) * shape;
            return exp(-dot(delta, delta) * 3.1);
        }

        void main() {
            vec2 uv = vUv;
            float aspect = uResolution.x / max(1.0, uResolution.y);
            float bass = uAudio.x;
            float mid = uAudio.y;
            float treble = uAudio.z;
            float beat = uAudio.w;

            float cycle24 = sin(uTime * 0.261799 + 0.35);
            float cycle31 = sin(uTime * 0.202683 + 2.1);
            float cycle43 = cos(uTime * 0.146121 + 4.0);
            vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * (2.15 * uFlowScale);

            float baseNoise = fbm(p * 0.72 + vec2(cycle31, cycle43) * 0.22);
            vec2 curlLike = vec2(
                fbm(p + vec2(2.7, uTime * 0.028 + baseNoise)),
                fbm(p + vec2(-1.9, -uTime * 0.023 - baseNoise))
            ) - 0.5;
            float audioWarp = 0.7 + bass * 1.25 + beat * 0.7 * uBeatImpact;
            vec2 warped = p + curlLike * uDistortion * audioWarp;
            warped += vec2(cycle24, cycle31) * (0.08 + uIdleMotion * 0.12);

            float flow = fbm(warped * 1.23 + vec2(uTime * 0.035, -uTime * 0.021));
            float secondary = noise2(warped * 2.7 - vec2(uTime * 0.055, uTime * 0.03));
            float ridge = 1.0 - abs(sin((flow * 10.5 + secondary * 2.2) + uTime * 0.23));
            float filament = pow(clamp(ridge, 0.0, 1.0), 7.0) * uFilament;
            filament *= 0.35 + treble * 1.45 + beat * 0.55 * uBeatImpact;

            vec2 driftA = vec2(cycle31 * 0.035, cycle43 * 0.028);
            vec2 driftB = vec2(cycle43 * 0.028, cycle24 * 0.032);
            float zones = 0.0;
            zones += lobe(uv, vec2(0.07, 0.18) + driftA, vec2(2.2, 3.1));
            zones += lobe(uv, vec2(0.91, 0.21) - driftB, vec2(2.4, 3.4));
            zones += lobe(uv, vec2(0.12, 0.84) - driftA, vec2(2.0, 3.5));
            zones += lobe(uv, vec2(0.88, 0.79) + driftB, vec2(2.2, 3.0));
            zones += lobe(uv, vec2(0.51, 0.93) + vec2(cycle24 * 0.02, 0.0), vec2(3.6, 3.1)) * 0.55;
            zones = clamp(zones, 0.0, 1.0);

            float radarOutside = smoothstep(0.16, 0.34, length((uv - vec2(0.37, 0.51)) * vec2(0.88, 1.0)));
            float photoOutside = smoothstep(0.14, 0.31, length((uv - vec2(0.70, 0.45)) * vec2(0.86, 1.0)));
            float safeOutside = min(radarOutside, photoOutside);
            float subjectSafe = mix(1.0, mix(0.18, 1.0, safeOutside), uSafeMask);

            float sweepCoordinate = fract(uv.x * 0.58 + uv.y * 0.24 - uTime * 0.026);
            float beatSweep = exp(-abs(sweepCoordinate - 0.5) * 23.0) * beat * uBeatImpact;
            float energy = 0.22 + uIdleMotion * 0.16 + bass * 0.48 + mid * 0.25;
            float body = zones * (0.15 + flow * 0.5 + secondary * 0.12) * energy;
            body += zones * filament * 0.34;
            body += zones * beatSweep * 0.28;
            body *= subjectSafe;

            float tintMix = clamp(flow * 0.72 + mid * 0.22 + cycle43 * 0.06, 0.0, 1.0);
            vec3 color = mix(uBg1 * 2.2, uBg2 * 2.6, tintMix);
            color = mix(color, uAccent, clamp(flow * 0.55 + filament * 0.42 + beatSweep * 0.32, 0.0, 0.88));
            float spectral = (filament * 0.42 + beatSweep * 0.34) * uChromatic;
            color.r += spectral * (0.32 + treble * 0.22);
            color.b += spectral * (0.52 + mid * 0.14);

            float grain = hash21(gl_FragCoord.xy + floor(uTime * 12.0)) - 0.5;
            color += grain * uGrain * (0.38 + body);
            float vignette = 1.0 - smoothstep(0.32, 0.82, length((uv - 0.5) * vec2(0.78, 1.0))) * 0.58;
            float alpha = clamp(body * uOpacity * vignette, 0.0, 0.74);

            color = max(color, vec3(0.0));
            color = color / (color + vec3(1.0));
            color = pow(color, vec3(1.0 / 2.2));
            gl_FragColor = vec4(color * alpha, alpha);
        }
    `;

    function clamp(value, min, max, fallback) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.max(min, Math.min(max, number));
    }

    function hexToLinear(hex, fallback) {
        const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ''))
            || /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fallback);
        return [match[1], match[2], match[3]].map(value => Math.pow(parseInt(value, 16) / 255, 2.2));
    }

    function createEffect({ canvas, fallbackElement }) {
        if (!canvas) throw new Error('LivingFieldEffect requires a canvas.');

        let gl = null;
        let program = null;
        let positionBuffer = null;
        let uniforms = null;
        let initialized = false;
        let initializationFailed = false;
        let disposed = false;
        let fallbackActive = false;
        let time = 0;
        let frameEma = 16.7;
        let qualityCeiling = 0.58;
        let renderScale = 0.58;
        let resizeCooldown = 0;
        let fastFrameDuration = 0;
        let lastCssWidth = 0;
        let lastCssHeight = 0;
        const audio = { energy: 0, bass: 0, mid: 0, treble: 0, beat: 0 };

        function compileShader(type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                const message = gl.getShaderInfoLog(shader) || 'Unknown shader compile error';
                gl.deleteShader(shader);
                throw new Error(message);
            }
            return shader;
        }

        function setFallback(active, reason = '') {
            fallbackActive = active;
            canvas.classList.toggle('is-active', !active);
            canvas.dataset.renderer = active ? 'fallback' : 'webgl';
            if (reason) canvas.dataset.fallbackReason = reason;
            else delete canvas.dataset.fallbackReason;
            if (fallbackElement) {
                fallbackElement.classList.toggle('is-active', active);
                fallbackElement.dataset.reason = reason;
            }
        }

        function initialize() {
            if (initialized || disposed || initializationFailed) return initialized;
            try {
                gl = canvas.getContext('webgl', {
                    alpha: true,
                    antialias: false,
                    premultipliedAlpha: true,
                    depth: false,
                    stencil: false,
                    powerPreference: 'high-performance'
                });
                if (!gl) throw new Error('WebGL is not available');

                const vertexShader = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
                const fragmentShader = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
                program = gl.createProgram();
                gl.attachShader(program, vertexShader);
                gl.attachShader(program, fragmentShader);
                gl.linkProgram(program);
                gl.deleteShader(vertexShader);
                gl.deleteShader(fragmentShader);
                if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                    throw new Error(gl.getProgramInfoLog(program) || 'Unknown program link error');
                }

                gl.useProgram(program);
                positionBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
                const position = gl.getAttribLocation(program, 'aPosition');
                gl.enableVertexAttribArray(position);
                gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
                uniforms = Object.fromEntries([
                    'uResolution', 'uTime', 'uOpacity', 'uFlowScale', 'uDistortion',
                    'uFilament', 'uChromatic', 'uGrain', 'uBeatImpact', 'uIdleMotion',
                    'uSafeMask', 'uAudio', 'uAccent', 'uBg1', 'uBg2'
                ].map(name => [name, gl.getUniformLocation(program, name)]));
                gl.disable(gl.BLEND);
                gl.clearColor(0, 0, 0, 0);
                initialized = true;
                initializationFailed = false;
                setFallback(false);
            } catch (error) {
                console.warn('Living field WebGL initialization failed; using fallback.', error);
                initialized = false;
                initializationFailed = true;
                setFallback(true, 'webgl-unavailable');
            }
            return initialized;
        }

        function updateFallback(env, config) {
            if (!fallbackElement) return;
            const pulse = audio.beat * config.livingField.beatImpact;
            fallbackElement.style.setProperty('--living-field-accent', env.accent);
            fallbackElement.style.setProperty('--living-field-bg-1', env.palette.bg1);
            fallbackElement.style.setProperty('--living-field-bg-2', env.palette.bg2);
            fallbackElement.style.setProperty('--living-field-speed', `${Math.max(12, 38 / Math.max(0.2, config.common.speed))}s`);
            fallbackElement.style.opacity = String(clamp(
                (0.22 + audio.energy * 0.18 + pulse * 0.12) * config.common.opacity,
                0,
                0.72,
                0.28
            ));
        }

        function resizeInternal(force = false) {
            if (!initialized || !gl) return;
            const cssWidth = Math.max(2, Math.round(canvas.clientWidth || global.innerWidth || 1920));
            const cssHeight = Math.max(2, Math.round(canvas.clientHeight || global.innerHeight || 1080));
            const nextWidth = Math.max(2, Math.round(cssWidth * renderScale));
            const nextHeight = Math.max(2, Math.round(cssHeight * renderScale));
            if (
                !force
                && cssWidth === lastCssWidth
                && cssHeight === lastCssHeight
                && canvas.width === nextWidth
                && canvas.height === nextHeight
            ) return;
            lastCssWidth = cssWidth;
            lastCssHeight = cssHeight;
            canvas.width = nextWidth;
            canvas.height = nextHeight;
            canvas.style.width = `${cssWidth}px`;
            canvas.style.height = `${cssHeight}px`;
            canvas.dataset.renderScale = renderScale.toFixed(2);
            gl.viewport(0, 0, nextWidth, nextHeight);
        }

        function updateAdaptiveResolution(deltaSeconds, env) {
            qualityCeiling = clamp(env.qualityScale, 0.42, 0.72, 0.58);
            if (renderScale > qualityCeiling) {
                renderScale = qualityCeiling;
                resizeInternal(true);
            }

            const frameMilliseconds = deltaSeconds * 1000;
            frameEma = frameEma * 0.94 + frameMilliseconds * 0.06;
            resizeCooldown = Math.max(0, resizeCooldown - deltaSeconds);
            fastFrameDuration = frameEma < 17.4 ? fastFrameDuration + deltaSeconds : 0;
            if (resizeCooldown > 0) return;

            if (frameEma > 22.5 && renderScale > 0.42) {
                renderScale = Math.max(0.42, renderScale - 0.07);
                resizeCooldown = 3;
                fastFrameDuration = 0;
                resizeInternal(true);
            } else if (fastFrameDuration > 6 && renderScale < qualityCeiling) {
                renderScale = Math.min(qualityCeiling, renderScale + 0.05);
                resizeCooldown = 4;
                fastFrameDuration = 0;
                resizeInternal(true);
            }
            canvas.dataset.frameTime = frameEma.toFixed(1);
        }

        function smoothAudio(deltaSeconds, env, config) {
            const response = config.common.audioResponse;
            const follow = 1 - Math.exp(-deltaSeconds / 0.11);
            ['energy', 'bass', 'mid', 'treble'].forEach(key => {
                const target = clamp(env.audio[key], 0, 1, 0) * response;
                audio[key] += (target - audio[key]) * follow;
            });
            const beatTarget = clamp(env.audio.beat, 0, 1, 0) * response;
            audio.beat = Math.max(beatTarget, audio.beat * Math.exp(-deltaSeconds / 0.4));
            canvas.dataset.audioEnergy = audio.energy.toFixed(3);
            canvas.dataset.audioBeat = audio.beat.toFixed(3);
        }

        function onContextLost(event) {
            event.preventDefault();
            initialized = false;
            initializationFailed = true;
            setFallback(true, 'context-lost');
        }

        function onContextRestored() {
            gl = null;
            program = null;
            positionBuffer = null;
            uniforms = null;
            initializationFailed = false;
            initialize();
            resizeInternal(true);
        }

        canvas.addEventListener('webglcontextlost', onContextLost, false);
        canvas.addEventListener('webglcontextrestored', onContextRestored, false);

        return {
            resize() {
                initialize();
                resizeInternal(true);
            },
            update(deltaSeconds, env, config) {
                if (disposed) return;
                initialize();
                smoothAudio(deltaSeconds, env, config);
                const idleRate = 0.35 + config.livingField.idleMotion * 0.65;
                time += deltaSeconds * config.common.speed * idleRate;
                updateFallback(env, config);
                if (initialized) {
                    updateAdaptiveResolution(deltaSeconds, env);
                    resizeInternal();
                }
            },
            draw(_context, env, config) {
                if (!initialized || !gl || fallbackActive) return;
                gl.useProgram(program);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
                gl.uniform1f(uniforms.uTime, time);
                gl.uniform1f(uniforms.uOpacity, config.common.opacity);
                gl.uniform1f(uniforms.uFlowScale, config.livingField.flowScale);
                gl.uniform1f(uniforms.uDistortion, config.livingField.distortion);
                gl.uniform1f(uniforms.uFilament, config.livingField.filament);
                gl.uniform1f(uniforms.uChromatic, config.livingField.chromatic);
                gl.uniform1f(uniforms.uGrain, config.livingField.grain);
                gl.uniform1f(uniforms.uBeatImpact, config.livingField.beatImpact);
                gl.uniform1f(uniforms.uIdleMotion, config.livingField.idleMotion);
                gl.uniform1f(uniforms.uSafeMask, config.livingField.safeMask);
                gl.uniform4f(uniforms.uAudio, audio.bass, audio.mid, audio.treble, audio.beat);
                gl.uniform3fv(uniforms.uAccent, hexToLinear(env.accent, '#63e6ff'));
                gl.uniform3fv(uniforms.uBg1, hexToLinear(env.palette.bg1, '#07121c'));
                gl.uniform3fv(uniforms.uBg2, hexToLinear(env.palette.bg2, '#050508'));
                gl.drawArrays(gl.TRIANGLES, 0, 3);
            },
            dispose() {
                disposed = true;
                canvas.classList.remove('is-active');
                if (fallbackElement) {
                    fallbackElement.classList.remove('is-active');
                    fallbackElement.style.removeProperty('opacity');
                }
                canvas.removeEventListener('webglcontextlost', onContextLost, false);
                canvas.removeEventListener('webglcontextrestored', onContextRestored, false);
                if (gl) {
                    if (positionBuffer) gl.deleteBuffer(positionBuffer);
                    if (program) gl.deleteProgram(program);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                }
                gl = null;
                program = null;
                initialized = false;
            }
        };
    }

    global.RockRadarLivingFieldEffect = Object.freeze({
        createEffect
    });
})(typeof window !== 'undefined' ? window : globalThis);
